"""Fraud Pydantic schemas — Phase 5."""

from datetime import datetime
from uuid import UUID
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from app.models.fraud_alert import Severity, AlertStatus
from app.schemas.transaction import TransactionResponse


class FraudAlertResponse(BaseModel):
    """Fraud alert representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alert_id: str
    transaction_id: UUID
    account_id: UUID
    alert_type: str
    risk_score: float
    severity: Severity
    description: str
    rule_breakdown: Optional[dict] = None
    status: AlertStatus
    created_at: datetime
    transaction: Optional[TransactionResponse] = None


class FraudAlertListResponse(BaseModel):
    """Paginated list of fraud alerts."""
    alerts: List[FraudAlertResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FraudStatsResponse(BaseModel):
    """Summary statistics for fraud alerts."""
    total_alerts: int
    high_risk: int
    critical: int
    open_alerts: int = 0
    under_review: int = 0
    closed: int = 0
    false_positives: int = 0


class UpdateAlertStatusRequest(BaseModel):
    """Request payload for updating an alert's status."""
    status: AlertStatus


class AnalyzeTransactionResponse(BaseModel):
    """Result of running fraud analysis on a transaction."""
    transaction_id: str
    risk_score: float
    severity: Severity
    is_flagged: bool
    triggered_rules: List[str]
    rule_breakdown: Optional[dict] = None
    description: str
    alert: Optional[FraudAlertResponse] = None
