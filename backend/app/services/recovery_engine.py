"""Recovery Engine Service — Phase 7 Recovery Intelligence Engine."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
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
    score_breakdown: Dict[str, float] = field(default_factory=dict)


class RecoveryEngine:
    """Recovery Intelligence Engine for calculating asset recovery potential."""

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
        > 80     : "Freeze destination account immediately"
        50 - 79  : "Monitor account and request transaction hold"
        < 50     : "Escalate to law enforcement and continue tracing"
        """
        if score >= 80.0:
            return "Freeze destination account immediately"
        elif score >= 50.0:
            return "Monitor account and request transaction hold"
        else:
            return "Escalate to law enforcement and continue tracing"

    @classmethod
    async def evaluate_recovery(
        cls,
        session: AsyncSession,
        alert: FraudAlert,
        transaction: Transaction,
        trace_result: Optional[MoneyTraceResponse] = None,
        suspicious_result: Optional[SuspiciousNetworkResponse] = None,
    ) -> RecoveryAnalysisResult:
        """
        Evaluate recovery score using 8 intelligence rules.

        Rules:
        1. Money still in same account (+50)
        2. Only 1 hop away (+30)
        3. 2–3 hops away (+15)
        4. More than 5 hops (-20)
        5. Collector Account Found (-15)
        6. Circular Laundering Ring Found (-25)
        7. Money Split Into Multiple Accounts (-30)
        8. Account Already Flagged (+20)
        """
        graph_engine = GraphEngine(session)

        # Get money trace if not provided
        if trace_result is None:
            trace_result = await graph_engine.trace_money_flow(transaction.transaction_id)

        # Get suspicious network patterns if not provided
        if suspicious_result is None:
            suspicious_result = await graph_engine.detect_suspicious_patterns()

        applied_rules: List[str] = []
        score_breakdown: Dict[str, float] = {}
        total_score: float = 50.0  # Base starting score for recovery analysis

        source_acc = trace_result.source_account
        current_holder = trace_result.current_holder
        total_hops = trace_result.total_hops
        amount_at_risk = float(transaction.amount)

        # ------------------------------------------------------------------
        # RULE 1: Money still in same account (+50)
        # ------------------------------------------------------------------
        if current_holder == source_acc or total_hops == 0:
            total_score += 50.0
            applied_rules.append("Money still in same account")
            score_breakdown["Money still in same account"] = 50.0

        # ------------------------------------------------------------------
        # RULE 2: Only 1 hop away (+30)
        # ------------------------------------------------------------------
        elif total_hops == 1:
            total_score += 30.0
            applied_rules.append("Only 1 hop away")
            score_breakdown["Only 1 hop away"] = 30.0

        # ------------------------------------------------------------------
        # RULE 3: 2–3 hops away (+15)
        # ------------------------------------------------------------------
        elif 2 <= total_hops <= 3:
            total_score += 15.0
            applied_rules.append("2-3 hops away")
            score_breakdown["2-3 hops away"] = 15.0

        # ------------------------------------------------------------------
        # RULE 4: More than 5 hops (-20)
        # ------------------------------------------------------------------
        elif total_hops > 5:
            total_score -= 20.0
            applied_rules.append("More than 5 hops")
            score_breakdown["More than 5 hops"] = -20.0

        # ------------------------------------------------------------------
        # RULE 5: Collector Account Found (-15)
        # ------------------------------------------------------------------
        collector_node_ids = {c.id for c in suspicious_result.collector_accounts}
        if current_holder in collector_node_ids:
            total_score -= 15.0
            applied_rules.append("Collector Account Found")
            score_breakdown["Collector Account Found"] = -15.0

        # ------------------------------------------------------------------
        # RULE 6: Circular Laundering Ring Found (-25)
        # ------------------------------------------------------------------
        is_in_ring = False
        for cycle in suspicious_result.circular_chains:
            if current_holder in cycle or source_acc in cycle:
                is_in_ring = True
                break

        if is_in_ring:
            total_score -= 25.0
            applied_rules.append("Circular Laundering Ring Found")
            score_breakdown["Circular Laundering Ring Found"] = -25.0

        # ------------------------------------------------------------------
        # RULE 7: Money Split Into Multiple Accounts (-30)
        # ------------------------------------------------------------------
        # Check if transaction or sender account has multiple outgoing transactions
        if len(trace_result.hops) > 1 and trace_result.remaining_amount < trace_result.initial_amount * 0.7:
            total_score -= 30.0
            applied_rules.append("Money Split Into Multiple Accounts")
            score_breakdown["Money Split Into Multiple Accounts"] = -30.0

        # ------------------------------------------------------------------
        # RULE 8: Account Already Flagged (+20)
        # ------------------------------------------------------------------
        # Check if current holder account has flagged transactions or prior alerts
        if alert.risk_score >= 60.0 or transaction.is_flagged:
            total_score += 20.0
            applied_rules.append("Account Already Flagged")
            score_breakdown["Account Already Flagged"] = 20.0

        # Cap score between 0.0 and 100.0
        final_score = min(max(total_score, 0.0), 100.0)
        probability = cls.calculate_probability(final_score)
        action = cls.get_recommended_action(final_score)

        return RecoveryAnalysisResult(
            recovery_score=final_score,
            recovery_probability=probability,
            current_holder_account=current_holder,
            amount_at_risk=amount_at_risk,
            recommended_action=action,
            applied_rules=applied_rules,
            score_breakdown=score_breakdown,
        )
