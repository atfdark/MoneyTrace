"""Recovery Pydantic schemas — Phase 7 Recovery Intelligence Engine."""

from datetime import datetime
from uuid import UUID
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from app.models.recovery import RecoveryProbability, CaseStatus
from app.schemas.fraud import FraudAlertResponse
from app.schemas.transaction import TransactionResponse


class RecoveryCaseResponse(BaseModel):
    """Recovery case representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: str
    alert_id: UUID
    transaction_id: UUID
    recovery_score: float
    recovery_probability: RecoveryProbability
    current_holder_account: str
    amount_at_risk: float
    recommended_action: str
    status: CaseStatus
    created_at: datetime
    updated_at: datetime
    alert: Optional[FraudAlertResponse] = None
    transaction: Optional[TransactionResponse] = None


class RecoveryCaseListResponse(BaseModel):
    """Paginated list of recovery cases."""
    cases: List[RecoveryCaseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class RecoveryStatsResponse(BaseModel):
    """Summary statistics for recovery cases."""
    total_cases: int
    high_probability: int
    medium_probability: int
    low_probability: int
    recovered: int
