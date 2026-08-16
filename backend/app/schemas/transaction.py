"""Transaction and Account request/response schemas (Pydantic v2)."""

from datetime import datetime
from uuid import UUID
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.transaction import TransactionStatus
from app.models.account import AccountStatus


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class SendTransactionRequest(BaseModel):
    """Payload for POST /transactions/send."""
    receiver_account_number: str = Field(..., min_length=3, max_length=20)
    amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=18)
    remark: Optional[str] = Field(default=None, max_length=500)
    device_info: Optional[str] = Field(default=None, max_length=500)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    location: Optional[str] = Field(default=None, max_length=255)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Ensure amount is positive and has at most 2 decimal places."""
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return v


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class AccountResponse(BaseModel):
    """Account representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_number: str
    user_id: UUID
    balance: Decimal
    status: AccountStatus
    created_at: datetime
    updated_at: datetime


class TransactionResponse(BaseModel):
    """Transaction representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    transaction_id: str
    sender_account_id: UUID
    receiver_account_id: UUID
    amount: Decimal
    remark: Optional[str]
    status: TransactionStatus
    device_info: Optional[str]
    ip_address: Optional[str]
    location: Optional[str]
    risk_score: Optional[float]
    is_flagged: bool
    timestamp: datetime
    created_at: datetime


class TransactionHistoryResponse(BaseModel):
    """Paginated transaction history."""
    transactions: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class LiveTransactionResponse(BaseModel):
    """Live feed transaction item (simplified)."""
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    sender_account_number: str
    receiver_account_number: str
    amount: Decimal
    timestamp: datetime