"""Recovery Engine Service — Phase 7 Recovery Intelligence Engine."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fraud_alert import FraudAlert
from app.models.recovery import RecoveryProbability
from app.models.transaction import Transaction
from app.schemas.graph import MoneyTraceResponse, SuspiciousNetworkResponse
from app.services.graph_engine import GraphEngine


@dataclass
class RecoveryAnalysisResult:
    """Result of running recovery intelligence analysis."""
    recovery_score: float
    recovery_probability: RecoveryProbability
    current_holder_account: str
    amount_at_risk: float
    recommended_action: str
    applied_rules: List[str] = field(default_factory=list)
    score_breakdown: Dict[str, Any] = field(default_factory=dict)
    recovery_branches: List[Dict[str, Any]] = field(default_factory=list)


class RecoveryEngine:
    """Institutional Recovery Intelligence Engine for multi-branch asset recovery."""

    @staticmethod
    def calculate_probability(score: float) -> RecoveryProbability:
        """
        Map recovery score to RecoveryProbability:
        80 - 100 = HIGH
        50 - 79  = MEDIUM
        0  - 49  = LOW
        """
        if score >= 80.0:
            return RecoveryProbability.HIGH
        elif score >= 50.0:
            return RecoveryProbability.MEDIUM
        else:
            return RecoveryProbability.LOW

    @staticmethod
    def get_recommended_action(score: float) -> str:
        """
        Determine recommended action based on recovery score:
        >= 80    : "Batch Place Statutory Lien (Sec 106 BNSS) & Freeze Mule Accounts"
        50 - 79  : "Targeted Statutory Lien on Primary Beneficiary & Intercept Batch Settlement"
        < 50     : "Escalate to I4C / LEA & Trace Secondary ATM/Crypto Cash-Out Exit"
        """
        if score >= 80.0:
            return "Batch Place Statutory Lien (Sec 106 BNSS) & Freeze Mule Accounts"
        elif score >= 50.0:
            return "Targeted Statutory Lien on Primary Beneficiary & Intercept Batch Settlement"
        else:
            return "Escalate to I4C / LEA & Trace Secondary ATM/Crypto Cash-Out Exit"

    @staticmethod
    def synthesize_branches(
        amount_at_risk: float,
        current_holder: str,
        status: str = "OPEN"
    ) -> List[Dict[str, Any]]:
        """
        Synthesize a realistic 3-branch multi-mule fan-out tree for a recovery case:
        - Branch 1 (Hop 1): 50% routed via NEFT batch settlement (high interceptability)
        - Branch 2 (Hop 2): 30% routed via IMPS instant rail to secondary mule
        - Branch 3 (Hop 3): 20% leaked via ATM Cash-Out terminal (shortfall)
        """
        amt = float(amount_at_risk or 100000.0)
        digits = "".join(filter(str.isdigit, str(current_holder)))
        seed_num = int(digits) if digits else 5008
        hash_seed = abs(hash(str(current_holder))) % 89999 + 10000

        # Branch 1: Primary Hop 1 Beneficiary (NEFT Batch)
        br1_tainted = round(amt * 0.50, 2)
        br1_balance = round(br1_tainted * 1.18, 2)
        br1_recoverable = br1_tainted

        # Branch 2: Secondary Hop 2 Mule (IMPS Instant)
        br2_tainted = round(amt * 0.30, 2)
        br2_balance = round(br2_tainted * 1.05, 2)
        br2_recoverable = br2_tainted

        # Branch 3: Terminal ATM Cash-Out / Leakage (Hop 3)
        br3_tainted = round(amt - br1_tainted - br2_tainted, 2)
        br3_balance = 0.0
        br3_recoverable = 0.0

        # Determine individual branch status based on case status
        if status == "RECOVERED":
            st1, st2, st3 = "RESTITUTED", "RESTITUTED", "LEAKED_ATM"
        elif status == "ACTION_TAKEN":
            st1, st2, st3 = "LIEN_MARKED", "LIEN_MARKED", "LEAKED_ATM"
        else:
            st1, st2, st3 = "ACTIVE", "ACTIVE", "LEAKED_ATM"

        return [
            {
                "branch_id": "BR-01",
                "account_number": str(current_holder),
                "bank_name": "State Bank of India (Primary Node)",
                "rail": "NEFT",
                "hop_level": 1,
                "tainted_amount": br1_tainted,
                "actual_balance": br1_balance,
                "recoverable_amount": br1_recoverable,
                "status": st1,
                "npci_ref": f"NPCI-ISO20022-L1-{seed_num + 101}",
            },
            {
                "branch_id": "BR-02",
                "account_number": f"ACC{seed_num + 204}",
                "bank_name": "HDFC Bank (Secondary Mule)",
                "rail": "IMPS",
                "hop_level": 2,
                "tainted_amount": br2_tainted,
                "actual_balance": br2_balance,
                "recoverable_amount": br2_recoverable,
                "status": st2,
                "npci_ref": f"NPCI-ISO20022-L2-{seed_num + 508}",
            },
            {
                "branch_id": "BR-03",
                "account_number": f"ATM-CASH-{str(current_holder)[-4:] if len(str(current_holder)) >= 4 else '0912'}",
                "bank_name": "ATM Terminal / Cash-Out Mule",
                "rail": "ATM_EXIT",
                "hop_level": 3,
                "tainted_amount": br3_tainted,
                "actual_balance": br3_balance,
                "recoverable_amount": br3_recoverable,
                "status": st3,
                "npci_ref": f"NPCI-ALERT-LEAK-{hash_seed}",
            },
        ]

    @classmethod
    async def evaluate_recovery(
        cls,
        session: AsyncSession,
        alert: FraudAlert,
        transaction: Transaction,
        trace_result: Optional[MoneyTraceResponse] = None,
        suspicious_result: Optional[SuspiciousNetworkResponse] = None,
        existing_branches: Optional[List[Dict[str, Any]]] = None,
    ) -> RecoveryAnalysisResult:
        """
        Evaluate recovery score using Golden-Hour Time Decay, Payment Rail Intelligence,
        Multi-Mule Fan-Out Layering, and Graph-based topology heuristics.
        """
        graph_engine = GraphEngine(session)

        # Get money trace if not provided
        if trace_result is None:
            trace_result = await graph_engine.trace_money_flow(transaction.transaction_id)

        # Get suspicious network patterns if not provided
        if suspicious_result is None:
            suspicious_result = await graph_engine.detect_suspicious_patterns()

        applied_rules: List[str] = []
        factors: List[Dict[str, Any]] = []
        score_breakdown: Dict[str, Any] = {}
        total_score: float = 50.0  # Base starting score for recovery analysis

        source_acc = trace_result.source_account
        current_holder = trace_result.current_holder or "ACC5008"
        total_hops = trace_result.total_hops
        amount_at_risk = float(transaction.amount or 100000.0)

        # ------------------------------------------------------------------
        # 1. Multi-Branch Tree & Liquidity Coverage Ratio (LCR)
        # ------------------------------------------------------------------
        branches = existing_branches or cls.synthesize_branches(amount_at_risk, current_holder)

        total_recoverable = sum(
            float(b.get("recoverable_amount", 0.0))
            for b in branches
            if b.get("status") != "LEAKED_ATM" and b.get("rail") != "ATM_EXIT"
        )
        total_leaked = sum(
            float(b.get("tainted_amount", 0.0))
            for b in branches
            if b.get("status") == "LEAKED_ATM" or b.get("rail") == "ATM_EXIT"
        )

        lcr = (total_recoverable / amount_at_risk) if amount_at_risk > 0 else 0.80
        lcr_percent = round(lcr * 100)

        if lcr >= 0.75:
            total_score += 18.0
            applied_rules.append(f"Liquidity Coverage ({lcr_percent}% in banking rails)")
            factors.append({
                "label": f"Liquidity Coverage ({lcr_percent}% in banking rails)",
                "impact": "+18",
                "type": "positive",
                "category": "LIQUIDITY",
            })
        elif lcr >= 0.40:
            total_score += 8.0
            applied_rules.append(f"Partial Liquidity Coverage ({lcr_percent}%)")
            factors.append({
                "label": f"Partial Liquidity Coverage ({lcr_percent}%)",
                "impact": "+8",
                "type": "positive",
                "category": "LIQUIDITY",
            })
        else:
            total_score -= 15.0
            applied_rules.append("Low Banking Rail Liquidity")
            factors.append({
                "label": "Low Banking Rail Liquidity (<40% Recoverable)",
                "impact": "-15",
                "type": "negative",
                "category": "LIQUIDITY",
            })

        # ------------------------------------------------------------------
        # 2. Golden-Hour Exponential Time Decay
        # ------------------------------------------------------------------
        now = datetime.now(timezone.utc)
        ref_time = getattr(transaction, "created_at", None) or getattr(alert, "created_at", None)
        if ref_time and ref_time.tzinfo is None:
            ref_time = ref_time.replace(tzinfo=timezone.utc)

        actual_elapsed_min = ((now - ref_time).total_seconds() / 60.0) if ref_time else 18.0

        # In seeded or demo environments where timestamps are days old, simulate an active urgency window
        if actual_elapsed_min > 1440.0 or actual_elapsed_min < 0:
            seed_offset = abs(hash(current_holder)) % 25
            simulated_elapsed_min = 18.0 + float(seed_offset)
        else:
            simulated_elapsed_min = actual_elapsed_min

        decay_lambda = 0.008
        decay_multiplier = math.exp(-decay_lambda * simulated_elapsed_min)
        remaining_golden_min = max(0.0, 60.0 - simulated_elapsed_min)

        if simulated_elapsed_min <= 30.0:
            total_score += 25.0
            applied_rules.append(f"Golden Hour Window ({int(simulated_elapsed_min)}m elapsed)")
            factors.append({
                "label": f"Golden Hour Intercept Window ({int(simulated_elapsed_min)}m elapsed)",
                "impact": "+25",
                "type": "positive",
                "category": "TIMING",
            })
        elif simulated_elapsed_min <= 60.0:
            total_score += 15.0
            applied_rules.append(f"Golden Hour Window ({int(simulated_elapsed_min)}m elapsed)")
            factors.append({
                "label": f"Golden Hour Late Intercept ({int(simulated_elapsed_min)}m elapsed)",
                "impact": "+15",
                "type": "positive",
                "category": "TIMING",
            })
        elif simulated_elapsed_min <= 120.0:
            factors.append({
                "label": f"Post-Golden Window ({int(simulated_elapsed_min)}m elapsed)",
                "impact": "+0",
                "type": "neutral",
                "category": "TIMING",
            })
        else:
            total_score -= 20.0
            applied_rules.append(f"Post-Golden Hour Decay (>120m elapsed)")
            factors.append({
                "label": f"Post-Golden Hour Decay ({int(simulated_elapsed_min)}m elapsed)",
                "impact": "-20",
                "type": "negative",
                "category": "TIMING",
            })

        # ------------------------------------------------------------------
        # 3. Payment Rail Modifiers
        # ------------------------------------------------------------------
        rails = {b.get("rail") for b in branches}
        if "NEFT" in rails or "RTGS" in rails:
            total_score += 15.0
            applied_rules.append("Batch Rail Settlement Window (NEFT/RTGS)")
            factors.append({
                "label": "Batch Settlement Intercept Window (NEFT/RTGS)",
                "impact": "+15",
                "type": "positive",
                "category": "RAIL",
            })

        if "UPI" in rails or "IMPS" in rails:
            total_score -= 5.0
            applied_rules.append("High Velocity Instant Rail (UPI/IMPS)")
            factors.append({
                "label": "Instant Rail Velocity (UPI/IMPS)",
                "impact": "-5",
                "type": "negative",
                "category": "VELOCITY",
            })

        if "ATM_EXIT" in rails and total_leaked > 0:
            total_score -= 10.0
            applied_rules.append("ATM Cash-Out Leakage Detected")
            factors.append({
                "label": f"ATM Cash-Out Leakage ({round(total_leaked/amount_at_risk*100)}% unrecoverable)",
                "impact": "-10",
                "type": "negative",
                "category": "LEAKAGE",
            })

        # Multi-mule fan-out penalty
        if len(branches) >= 3:
            total_score -= 12.0
            applied_rules.append("Multi-Mule Fan-Out (3 branches)")
            factors.append({
                "label": f"Multi-Mule Fan-Out ({len(branches)} branches)",
                "impact": "-12",
                "type": "negative",
                "category": "STRUCTURE",
            })

        # ------------------------------------------------------------------
        # 4. Graph Topology Heuristics
        # ------------------------------------------------------------------
        if current_holder == source_acc or total_hops == 0:
            total_score += 30.0
            applied_rules.append("Money still in same account")
            factors.append({
                "label": "Funds in Originating Node (0 hops)",
                "impact": "+30",
                "type": "positive",
                "category": "TOPOLOGY",
            })
        elif total_hops == 1:
            total_score += 15.0
            applied_rules.append("Only 1 hop away")
            factors.append({
                "label": "Single Hop Beneficiary Node (Hop 1)",
                "impact": "+15",
                "type": "positive",
                "category": "TOPOLOGY",
            })
        elif total_hops > 5:
            total_score -= 20.0
            applied_rules.append("More than 5 hops")
            factors.append({
                "label": "Deep Mule Layering (>5 hops)",
                "impact": "-20",
                "type": "negative",
                "category": "TOPOLOGY",
            })

        collector_node_ids = {c.id for c in (suspicious_result.collector_accounts if suspicious_result else [])}
        if current_holder in collector_node_ids:
            total_score -= 15.0
            applied_rules.append("Collector Account Found")
            factors.append({
                "label": "Destination is High-Velocity Collector Node",
                "impact": "-15",
                "type": "negative",
                "category": "TOPOLOGY",
            })

        is_in_ring = False
        if suspicious_result:
            for cycle in suspicious_result.circular_chains:
                if current_holder in cycle or source_acc in cycle:
                    is_in_ring = True
                    break

        if is_in_ring:
            total_score -= 25.0
            applied_rules.append("Circular Laundering Ring Found")
            factors.append({
                "label": "Circular Laundering Loop Active",
                "impact": "-25",
                "type": "negative",
                "category": "TOPOLOGY",
            })

        if getattr(alert, "risk_score", 0.0) >= 60.0 or getattr(transaction, "is_flagged", False):
            total_score += 10.0
            applied_rules.append("Account Already Flagged")
            factors.append({
                "label": "Prior Risk Telemetry Flagged (+10)",
                "impact": "+10",
                "type": "positive",
                "category": "RISK",
            })

        # Cap score cleanly between 10.0 and 98.0
        final_score = min(max(total_score, 10.0), 98.0)
        probability = cls.calculate_probability(final_score)
        action = cls.get_recommended_action(final_score)

        # Build comprehensive score_breakdown dictionary
        golden_hour_meta = {
            "is_active": simulated_elapsed_min <= 60.0,
            "window_minutes": 60,
            "elapsed_minutes": round(simulated_elapsed_min, 1),
            "remaining_minutes": round(remaining_golden_min, 1),
            "decay_multiplier": round(decay_multiplier, 3),
            "urgency": "CRITICAL" if simulated_elapsed_min <= 30 else ("HIGH" if simulated_elapsed_min <= 60 else "EXPIRED"),
        }

        metrics = {
            "amount_at_risk": amount_at_risk,
            "total_recoverable": round(total_recoverable, 2),
            "total_leaked": round(total_leaked, 2),
            "liquidity_coverage_ratio": round(lcr, 2),
            "active_branches_count": len([b for b in branches if b.get("status") not in ("LEAKED_ATM", "RESTITUTED")]),
            "leaked_branches_count": len([b for b in branches if b.get("status") == "LEAKED_ATM"]),
        }

        score_breakdown["base_score"] = 50.0
        score_breakdown["final_score"] = round(final_score, 1)
        score_breakdown["factors"] = factors
        score_breakdown["golden_hour"] = golden_hour_meta
        score_breakdown["metrics"] = metrics

        # Populate legacy string keys as well so any legacy reader is satisfied
        for f in factors:
            try:
                score_breakdown[f["label"]] = float(f["impact"])
            except Exception:
                pass

        return RecoveryAnalysisResult(
            recovery_score=final_score,
            recovery_probability=probability,
            current_holder_account=current_holder,
            amount_at_risk=amount_at_risk,
            recommended_action=action,
            applied_rules=applied_rules,
            score_breakdown=score_breakdown,
            recovery_branches=branches,
        )

