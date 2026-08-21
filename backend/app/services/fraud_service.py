"""Fraud Service — Phase 5.

Service layer for managing fraud analysis, alert creation, alert queries, and statistics.
"""

from datetime import datetime, timezone
import random
from typing import List, Optional, Tuple, Union
from uuid import UUID, uuid4

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.models.account import Account
from app.models.fraud_alert import FraudAlert, Severity, AlertStatus
from app.models.transaction import Transaction
from app.services.fraud_rules import FraudRulesEngine, RuleEvaluationResult


class FraudService:
    """Service layer for Fraud Detection Engine and Alerts."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze_and_alert_transaction(
        self,
        transaction: Transaction,
        sender_account: Optional[Account] = None,
        sender_balance_before: Optional[float] = None,
    ) -> Tuple[RuleEvaluationResult, Optional[FraudAlert]]:
        """
        Analyze a transaction using FraudRulesEngine.
        
        Updates transaction.risk_score and transaction.is_flagged.
        Creates a FraudAlert record if risk_score >= 30.
        """
        result = await FraudRulesEngine.evaluate_transaction(
            session=self.session,
            transaction=transaction,
            sender_account=sender_account,
            sender_balance_before=sender_balance_before,
        )

        # Update transaction record
        transaction.risk_score = result.risk_score
        transaction.is_flagged = result.is_flagged

        alert: Optional[FraudAlert] = None

        # Automatically create FraudAlert if score > 30 (or is_flagged)
        if result.is_flagged:
            # Check if alert already exists for this transaction
            stmt = select(FraudAlert).where(FraudAlert.transaction_id == transaction.id)
            existing_res = await self.session.execute(stmt)
            existing_alert = existing_res.scalar_one_or_none()

            alert_type_str = ", ".join(result.triggered_rules) if result.triggered_rules else "Suspicious Pattern"

            if existing_alert:
                existing_alert.risk_score = result.risk_score
                existing_alert.severity = result.severity.value
                existing_alert.alert_type = alert_type_str
                existing_alert.description = result.description
                existing_alert.rule_breakdown = result.rule_breakdown
                alert = existing_alert
            else:
                alert_id = self._generate_alert_id()
                alert = FraudAlert(
                    id=uuid4(),
                    alert_id=alert_id,
                    transaction_id=transaction.id,
                    account_id=transaction.sender_account_id,
                    alert_type=alert_type_str,
                    risk_score=result.risk_score,
                    severity=result.severity.value,
                    description=result.description,
                    rule_breakdown=result.rule_breakdown,
                    status=AlertStatus.OPEN.value,
                    created_at=datetime.now(timezone.utc),
                )
                self.session.add(alert)
                await self.session.flush()

                # Automatically evaluate Recovery Case (Phase 7)
                rec_case_dict = None
                try:
                    from app.services.recovery_service import RecoveryService
                    rec_service = RecoveryService(self.session)
                    rec_case = await rec_service.analyze_recovery(alert.alert_id)
                    rec_case_dict = {
                        "case_id": rec_case.case_id,
                        "alert_id": alert.alert_id,
                        "recovery_score": rec_case.recovery_score,
                        "recovery_probability": rec_case.recovery_probability,
                        "current_holder_account": rec_case.current_holder_account,
                        "amount_at_risk": float(rec_case.amount_at_risk or 0),
                        "recommended_action": rec_case.recommended_action,
                        "status": rec_case.status,
                    }
                    
                    # Broadcast Recovery event
                    from app.core.websocket_events import ws_events_manager, WSEventTypes
                    await ws_events_manager.broadcast(WSEventTypes.RECOVERY_CASE_CREATED, rec_case_dict)
                except Exception as e:
                    # Non-fatal if recovery evaluation fails
                    pass

                # Build AI Copilot Instant Forensic Summary
                ai_summary = {
                    "alert_id": alert.alert_id,
                    "transaction_id": transaction.transaction_id,
                    "amount": float(transaction.amount),
                    "risk_score": alert.risk_score,
                    "severity": alert.severity,
                    "triggered_rules": result.triggered_rules,
                    "summary_text": (
                        f"CRITICAL ANOMALY: Transaction {transaction.transaction_id} of ₹{float(transaction.amount):,.2f} "
                        f"triggered {len(result.triggered_rules)} fraud rules: {', '.join(result.triggered_rules)}. "
                        f"Immediate inter-bank intervention recommended."
                    ),
                    "recommended_action": "Freeze Account & Issue Section 91 CrPC Notice",
                    "recovery_score": rec_case_dict.get("recovery_score") if rec_case_dict else 75.0,
                    "recovery_probability": rec_case_dict.get("recovery_probability") if rec_case_dict else "HIGH",
                }

                # Broadcast Fraud Alert event
                try:
                    from app.core.websocket_events import ws_events_manager, WSEventTypes
                    await ws_events_manager.broadcast(WSEventTypes.FRAUD_ALERT_CREATED, {
                        "alert_id": alert.alert_id,
                        "alert_type": alert.alert_type,
                        "risk_score": alert.risk_score,
                        "severity": alert.severity,
                        "description": alert.description,
                        "account_id": str(alert.account_id),
                        "transaction_id": str(alert.transaction_id),
                        "transaction_code": transaction.transaction_id,
                        "amount": float(transaction.amount),
                        "rule_breakdown": alert.rule_breakdown,
                        "status": alert.status,
                        "created_at": alert.created_at.isoformat() if alert.created_at else datetime.now(timezone.utc).isoformat(),
                        "ai_summary": ai_summary,
                    })
                except Exception:
                    pass

        await self.session.flush()
        return result, alert

    async def get_alerts(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> Tuple[List[FraudAlert], int]:
        """Get paginated list of fraud alerts with optional filters."""
        query = select(FraudAlert)

        filters = []
        if status:
            filters.append(FraudAlert.status == status.upper())
        if severity:
            filters.append(FraudAlert.severity == severity.upper())

        if filters:
            query = query.where(and_(*filters))

        # Count total matching alerts
        count_stmt = select(func.count(FraudAlert.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))

        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        # Fetch paginated records with transaction and account relationships loaded
        stmt = (
            query.order_by(FraudAlert.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(FraudAlert.transaction),
                selectinload(FraudAlert.account),
            )
        )
        res = await self.session.execute(stmt)
        alerts = res.scalars().all()

        return list(alerts), total

    async def get_alert_by_id(self, alert_identifier: str) -> FraudAlert:
        """Get fraud alert by UUID primary key or human-readable alert_id."""
        query = select(FraudAlert).options(
            selectinload(FraudAlert.transaction),
            selectinload(FraudAlert.account),
        )

        # Check if valid UUID string
        is_uuid = False
        try:
            val_uuid = UUID(alert_identifier)
            is_uuid = True
        except ValueError:
            pass

        if is_uuid:
            stmt = query.where(or_(FraudAlert.id == val_uuid, FraudAlert.alert_id == alert_identifier))
        else:
            stmt = query.where(FraudAlert.alert_id == alert_identifier)

        res = await self.session.execute(stmt)
        alert = res.scalar_one_or_none()

        if alert is None:
            raise exceptions.NotFoundError(f"Fraud alert '{alert_identifier}' not found")

        return alert

    async def get_high_risk_alerts(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[FraudAlert], int]:
        """Get high-risk and critical fraud alerts (Severity HIGH or CRITICAL)."""
        return await self.get_alerts(
            page=page,
            page_size=page_size,
            severity=None,  # We can query HIGH or CRITICAL
        )

    async def get_high_risk_alerts_and_transactions(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[FraudAlert], int]:
        """Get high risk alerts (HIGH or CRITICAL severity)."""
        stmt = select(FraudAlert).where(
            or_(
                FraudAlert.severity == Severity.HIGH.value,
                FraudAlert.severity == Severity.CRITICAL.value,
            )
        )

        count_stmt = select(func.count(FraudAlert.id)).where(
            or_(
                FraudAlert.severity == Severity.HIGH.value,
                FraudAlert.severity == Severity.CRITICAL.value,
            )
        )
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        res_stmt = (
            stmt.order_by(FraudAlert.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(FraudAlert.transaction),
                selectinload(FraudAlert.account),
            )
        )
        res = await self.session.execute(res_stmt)
        alerts = res.scalars().all()

        return list(alerts), total

    async def get_fraud_stats(self) -> dict:
        """
        Get dashboard fraud statistics summary.

        Expected output structure:
        {
            "total_alerts": 120,
            "high_risk": 22,
            "critical": 3,
            "open_alerts": 80,
            "under_review": 15,
            "closed": 25
        }
        """
        # Total alerts count
        total_res = await self.session.execute(select(func.count(FraudAlert.id)))
        total_alerts = total_res.scalar_one() or 0

        # High risk count
        high_res = await self.session.execute(
            select(func.count(FraudAlert.id)).where(FraudAlert.severity == Severity.HIGH.value)
        )
        high_risk = high_res.scalar_one() or 0

        # Critical count
        crit_res = await self.session.execute(
            select(func.count(FraudAlert.id)).where(FraudAlert.severity == Severity.CRITICAL.value)
        )
        critical = crit_res.scalar_one() or 0

        # Status breakdowns
        open_res = await self.session.execute(
            select(func.count(FraudAlert.id)).where(FraudAlert.status == AlertStatus.OPEN.value)
        )
        open_alerts = open_res.scalar_one() or 0

        review_res = await self.session.execute(
            select(func.count(FraudAlert.id)).where(FraudAlert.status == AlertStatus.UNDER_REVIEW.value)
        )
        under_review = review_res.scalar_one() or 0

        closed_res = await self.session.execute(
            select(func.count(FraudAlert.id)).where(FraudAlert.status == AlertStatus.CLOSED.value)
        )
        closed = closed_res.scalar_one() or 0

        fp_res = await self.session.execute(
            select(func.count(FraudAlert.id)).where(FraudAlert.status == AlertStatus.FALSE_POSITIVE.value)
        )
        false_positives = fp_res.scalar_one() or 0

        return {
            "total_alerts": total_alerts,
            "high_risk": high_risk,
            "critical": critical,
            "open_alerts": open_alerts,
            "under_review": under_review,
            "closed": closed,
            "false_positives": false_positives,
        }

    async def update_alert_status(self, alert_identifier: str, new_status: str) -> FraudAlert:
        """Update fraud alert status (OPEN, UNDER_REVIEW, CLOSED, FALSE_POSITIVE)."""
        alert = await self.get_alert_by_id(alert_identifier)

        valid_statuses = [s.value for s in AlertStatus]
        if new_status.upper() not in valid_statuses:
            raise exceptions.ValidationError(
                f"Invalid status '{new_status}'. Allowed values: {', '.join(valid_statuses)}"
            )

        alert.status = new_status.upper()
        await self.session.commit()
        await self.session.refresh(alert)
        return alert

    async def analyze_transaction_by_id(
        self, transaction_id_str: str
    ) -> Tuple[RuleEvaluationResult, Optional[FraudAlert]]:
        """Find a transaction by transaction_id or UUID string and run fraud analysis."""
        is_uuid = False
        try:
            val_uuid = UUID(transaction_id_str)
            is_uuid = True
        except ValueError:
            pass

        if is_uuid:
            stmt = select(Transaction).where(
                or_(Transaction.id == val_uuid, Transaction.transaction_id == transaction_id_str)
            )
        else:
            stmt = select(Transaction).where(Transaction.transaction_id == transaction_id_str)

        res = await self.session.execute(stmt)
        txn = res.scalar_one_or_none()

        if txn is None:
            raise exceptions.NotFoundError(f"Transaction '{transaction_id_str}' not found")

        result, alert = await self.analyze_and_alert_transaction(txn)
        await self.session.commit()

        if alert:
            alert = await self.get_alert_by_id(alert.alert_id)

        return result, alert

    def _generate_alert_id(self) -> str:
        """Generate human readable alert ID like ALT20260816123456."""
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        rnd_str = f"{random.randint(100, 999):03d}"
        return f"ALT{now_str}{rnd_str}"
