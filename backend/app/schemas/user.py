"""User schemas — Search, Autocomplete and Profile representation."""

from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr


class UserSearchResult(BaseModel):
    """Result for UPI-style live user autocomplete search."""
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    full_name: str
    email: str
    role: str
    account_number: str
    balance: float
    status: str
    avatar_color: Optional[str] = "#3B82F6"


class UserSearchResponse(BaseModel):
    """Response containing list of matching users."""
    results: List[UserSearchResult]
    total: int
