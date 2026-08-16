"""Dashboard Analytics Pydantic schemas — Phase 8."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class OverviewResponse(BaseModel):
    """Executive KPI summary overview."""
    model_config = ConfigDict(from_attributes=True)

    total_transactions: int
    total_amount_processed: float
    fraud_alerts: int
    critical_alerts: int
    open_cases: int
    recovered_cases: int
    money_at_risk: float
    money_recovered: float


class LiveDashboardResponse(BaseModel):
    """Real-time Security Operations Center (SOC) summary."""
    model_config = ConfigDict(from_attributes=True)

    active_alerts: int
    transactions_last_minute: int
    critical_alerts: int
    money_at_risk: float


class VolumeTrendPoint(BaseModel):
    """Single date point for transaction volume trend."""
    date: str
    count: int
    volume: float


class TransactionAnalyticsResponse(BaseModel):
    """Detailed transaction analytics and volume metrics."""
    daily_transactions: int
    weekly_transactions: int
    monthly_transactions: int
    daily_volume: float
    weekly_volume: float
    monthly_volume: float
    average_transaction_amount: float
    highest_transaction: float
    lowest_transaction: float
    volume_trend: List[VolumeTrendPoint]


class FraudAnalyticsResponse(BaseModel):
    """Fraud intelligence and rule breakdown analytics."""
    severity_breakdown: Dict[str, int]
    rule_breakdown: Dict[str, int]
    total_flagged_transactions: int
    fraud_rate_percentage: float


class RecoveryAnalyticsResponse(BaseModel):
    """Asset recovery intelligence analytics."""
    high_probability_cases: int
    medium_probability_cases: int
    low_probability_cases: int
    recovery_success_rate: float
    recovered_amount: float
    amount_at_risk: float
    average_recovery_score: float


class LocationAnalyticsResponse(BaseModel):
    """Geographic fraud distributions and impossible travel corridors."""
    top_locations: Dict[str, int]
    travel_corridors: Dict[str, int]
    flagged_by_location: Dict[str, int]


class RiskyAccountResponse(BaseModel):
    """Account ranked by intelligent composite risk scoring."""
    model_config = ConfigDict(from_attributes=True)

    account_number: str
    user_name: Optional[str] = None
    composite_score: float
    alerts: int
    recovery_cases: int
    avg_risk_score: float
    total_volume: float


class TopRiskyAccountsResponse(BaseModel):
    """List of top ranked risky accounts."""
    accounts: List[RiskyAccountResponse]
    total: int


class TrendPoint(BaseModel):
    """Daily point for 30-day fraud line charts."""
    date: str
    alerts: int
    critical: int
    total_volume: float = 0.0


class FraudTrendsResponse(BaseModel):
    """Historical fraud trends time series."""
    trends: List[TrendPoint]
    days: int


class InvestigatorStatsItem(BaseModel):
    """Performance metrics for an individual investigator."""
    investigator_id: str
    name: str
    email: str
    cases_assigned: int
    cases_closed: int
    recovery_success_rate: float
    average_resolution_time_hours: float


class InvestigatorLeaderboardResponse(BaseModel):
    """Investigator performance leaderboard."""
    leaderboard: List[InvestigatorStatsItem]
    total_investigators: int
