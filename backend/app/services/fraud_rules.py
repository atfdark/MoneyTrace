"""Fraud Rules Engine — Phase 5.

Evaluates transactions against configured fraud rules and computes risk scores.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.fraud_alert import Severity
from app.models.transaction import Transaction


@dataclass
class RuleEvaluationResult:
    """Result of running fraud rules against a transaction."""
    risk_score: float
    severity: Severity
    triggered_rules: List[str] = field(default_factory=list)
    score_breakdown: Dict[str, float] = field(default_factory=dict)
    rule_breakdown: Dict = field(default_factory=dict)
    description: str = ""
    is_flagged: bool = False


class FraudRulesEngine:
    """Rule-based Fraud Detection Engine."""

    @staticmethod
    def calculate_severity(score: float) -> Severity:
        """
        Map risk score to Severity level:
        0 - 29   = LOW
        30 - 59  = MEDIUM
        60 - 79  = HIGH
        80 - 100 = CRITICAL
        """
        if score >= 80.0:
            return Severity.CRITICAL
        elif score >= 60.0:
            return Severity.HIGH
        elif score >= 30.0:
            return Severity.MEDIUM
        else:
            return Severity.LOW

    @classmethod
    async def evaluate_transaction(
        cls,
        session: AsyncSession,
        transaction: Transaction,
        sender_account: Optional[Account] = None,
        sender_balance_before: Optional[Decimal] = None,
    ) -> RuleEvaluationResult:
        """
        Evaluate 8 fraud rules for a given transaction.

        Rules:
        1. Large Transaction (> 50k -> +30)
        2. Very Large Transaction (> 100k -> +50)
        3. Rapid Transfers (3+ txns in 5 mins -> +25)
        4. New Account Activity (Age < 7d & Amount > 20k -> +20)
        5. Balance Drain (> 80% balance transferred -> +40)
        6. Impossible Travel (Location change within < 15 mins -> +20)
        7. Device Change (Sudden device fingerprint change within 24h -> +15)
        8. Mule Account Activity (Deposit rapidly forwarded > 70% in 2h -> +40)
        """
        triggered_rules: List[str] = []
        score_breakdown: Dict[str, float] = {}
        rule_descriptions: List[str] = []
        total_risk: float = 0.0

        # Fetch sender account if not provided
        if sender_account is None:
            stmt = select(Account).where(Account.id == transaction.sender_account_id)
            result = await session.execute(stmt)
            sender_account = result.scalar_one_or_none()

        # Determine balance before transaction if not explicitly provided
        if sender_balance_before is None and sender_account is not None:
            sender_balance_before = sender_account.balance + transaction.amount

        txn_time = transaction.timestamp or datetime.now(timezone.utc)
        if txn_time.tzinfo is None:
            txn_time = txn_time.replace(tzinfo=timezone.utc)

        amount_val = float(transaction.amount)

        # ------------------------------------------------------------------
        # RULE 1 & 2: Large / Very Large Transaction
        # ------------------------------------------------------------------
        if amount_val > 100000.0:
            total_risk += 50.0
            triggered_rules.append("Very Large Transaction")
            score_breakdown["Very Large Transaction"] = 50.0
            rule_descriptions.append("Very Large Transaction: Amount exceeds INR 100,000 (+50 Risk)")
        elif amount_val > 50000.0:
            total_risk += 30.0
            triggered_rules.append("Large Transaction")
            score_breakdown["Large Transaction"] = 30.0
            rule_descriptions.append("Large Transaction: Amount exceeds INR 50,000 (+30 Risk)")

        # ------------------------------------------------------------------
        # RULE 3: Rapid Transfers (3+ transactions in 5 minutes)
        # ------------------------------------------------------------------
        if transaction.sender_account_id:
            five_mins_ago = txn_time - timedelta(minutes=5)
            recent_count_stmt = select(func.count(Transaction.id)).where(
                Transaction.sender_account_id == transaction.sender_account_id,
                Transaction.timestamp >= five_mins_ago,
                Transaction.timestamp <= txn_time,
            )
            count_res = await session.execute(recent_count_stmt)
            recent_txn_count = count_res.scalar_one() or 0

            if recent_txn_count >= 3:
                total_risk += 25.0
                triggered_rules.append("Rapid Transfers")
                score_breakdown["Rapid Transfers"] = 25.0
                rule_descriptions.append(
                    f"Rapid Transfers: {recent_txn_count} transactions within 5 minutes (+25 Risk)"
                )

        # ------------------------------------------------------------------
        # RULE 4: New Account Activity (Account age < 7 days & amount > 20,000)
        # ------------------------------------------------------------------
        if sender_account and sender_account.created_at:
            account_created = sender_account.created_at
            if account_created.tzinfo is None:
                account_created = account_created.replace(tzinfo=timezone.utc)

            account_age_days = (txn_time - account_created).total_seconds() / 86400.0

            if account_age_days < 7.0 and amount_val > 20000.0:
                total_risk += 20.0
                triggered_rules.append("New Account Activity")
                score_breakdown["New Account Activity"] = 20.0
                rule_descriptions.append(
                    f"New Account Activity: Account created {account_age_days:.1f} days ago with transfer > INR 20,000 (+20 Risk)"
                )

        # ------------------------------------------------------------------
        # RULE 5: Balance Drain (More than 80% balance transferred)
        # ------------------------------------------------------------------
        if sender_balance_before and float(sender_balance_before) > 0:
            drain_percentage = (amount_val / float(sender_balance_before)) * 100.0
            if drain_percentage > 80.0:
                total_risk += 40.0
                triggered_rules.append("Balance Drain")
                score_breakdown["Balance Drain"] = 40.0
                rule_descriptions.append(
                    f"Balance Drain: {drain_percentage:.1f}% of balance transferred (+40 Risk)"
                )

        # ------------------------------------------------------------------
        # RULE 6: Impossible Travel (Location change within < 15 mins)
        # ------------------------------------------------------------------
        if transaction.sender_account_id and transaction.location:
            fifteen_mins_ago = txn_time - timedelta(minutes=15)
            prev_loc_stmt = (
                select(Transaction)
                .where(
                    Transaction.sender_account_id == transaction.sender_account_id,
                    Transaction.id != transaction.id,
                    Transaction.timestamp >= fifteen_mins_ago,
                    Transaction.timestamp <= txn_time,
                    Transaction.location.is_not(None),
                )
                .order_by(Transaction.timestamp.desc())
                .limit(1)
            )
            prev_loc_res = await session.execute(prev_loc_stmt)
            prev_loc_txn = prev_loc_res.scalar_one_or_none()

            if prev_loc_txn and prev_loc_txn.location and prev_loc_txn.location.strip().lower() != transaction.location.strip().lower():
                total_risk += 20.0
                triggered_rules.append("Impossible Travel")
                score_breakdown["Impossible Travel"] = 20.0
                rule_descriptions.append(
                    f"Impossible Travel: Location shifted from '{prev_loc_txn.location}' to '{transaction.location}' in < 15 mins (+20 Risk)"
                )

        # ------------------------------------------------------------------
        # RULE 7: Device Change (Sudden device fingerprint change within 24h)
        # ------------------------------------------------------------------
        if transaction.sender_account_id and transaction.device_info:
            one_day_ago = txn_time - timedelta(hours=24)
            prev_dev_stmt = (
                select(Transaction)
                .where(
                    Transaction.sender_account_id == transaction.sender_account_id,
                    Transaction.id != transaction.id,
                    Transaction.timestamp >= one_day_ago,
                    Transaction.timestamp <= txn_time,
                    Transaction.device_info.is_not(None),
                )
                .order_by(Transaction.timestamp.desc())
                .limit(1)
            )
            prev_dev_res = await session.execute(prev_dev_stmt)
            prev_dev_txn = prev_dev_res.scalar_one_or_none()

            if prev_dev_txn and prev_dev_txn.device_info and prev_dev_txn.device_info.strip().lower() != transaction.device_info.strip().lower():
                total_risk += 15.0
                triggered_rules.append("Device Change")
                score_breakdown["Device Change"] = 15.0
                rule_descriptions.append(
                    f"Device Change: Device changed from '{prev_dev_txn.device_info}' to '{transaction.device_info}' within 24h (+15 Risk)"
                )

        # ------------------------------------------------------------------
        # RULE 8: Mule Account Activity (Inbound deposit forwarded > 70% in 2h)
        # ------------------------------------------------------------------
        if transaction.sender_account_id:
            two_hours_ago = txn_time - timedelta(hours=2)
            inbound_stmt = (
                select(func.sum(Transaction.amount))
                .where(
                    Transaction.receiver_account_id == transaction.sender_account_id,
                    Transaction.timestamp >= two_hours_ago,
                    Transaction.timestamp <= txn_time,
                )
            )
            inbound_res = await session.execute(inbound_stmt)
            total_inbound = inbound_res.scalar_one() or Decimal("0.00")

            if float(total_inbound) > 0 and (amount_val / float(total_inbound)) >= 0.70:
                total_risk += 40.0
                triggered_rules.append("Mule Account Activity")
                score_breakdown["Mule Account Activity"] = 40.0
                rule_descriptions.append(
                    f"Mule Account Activity: Transferring {(amount_val / float(total_inbound))*100:.1f}% of recent deposit within 2 hours (+40 Risk)"
                )

        # Cap score between 0.0 and 100.0
        final_score = min(max(total_risk, 0.0), 100.0)
        severity = cls.calculate_severity(final_score)
        is_flagged = final_score >= 30.0

        if rule_descriptions:
            desc_text = "\n".join([f"- {d}" for d in rule_descriptions])
        else:
            desc_text = "No suspicious risk patterns detected."

        rule_breakdown_dict = {
            "rules_triggered": triggered_rules,
            "score_breakdown": score_breakdown,
        }

        return RuleEvaluationResult(
            risk_score=final_score,
            severity=severity,
            triggered_rules=triggered_rules,
            score_breakdown=score_breakdown,
            rule_breakdown=rule_breakdown_dict,
            description=desc_text,
            is_flagged=is_flagged,
        )
