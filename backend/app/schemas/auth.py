"""Authentication request/response schemas (Pydantic v2)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class TokenPayload(BaseModel):
    """Decoded JWT payload."""
    sub: str | None = None
    type: str | None = None
    exp: int | None = None


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    """Payload for POST /auth/register."""
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(default=UserRole.CUSTOMER)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Enforce minimal password policy."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    """Payload for POST /auth/login."""
    email: EmailStr
    password: str
    # Optional — used to return a longer-lived token
    remember_me: bool = False


class RefreshRequest(BaseModel):
    """Payload for POST /auth/refresh."""
    refresh_token: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    """Returned after login or token refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class UserResponse(BaseModel):
    """Public user representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime | None = None
