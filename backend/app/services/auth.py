"""Authentication service — register, login, refresh, logout."""

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

# In-memory store of revoked refresh tokens (Phase3 placeholder — later move to Redis)
_revoked_refresh_tokens: set[str] = set()


class AuthService:
    """Business logic for authentication."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Register
    # ------------------------------------------------------------------

    async def register(self, data: RegisterRequest) -> User:
        """Register a new user.

        Raises:
            ValidationError — if email already exists.
        """
        # Check for duplicate email
        existing = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none() is not None:
            raise exceptions.ValidationError("Email already registered")

        user = User(
            id=uuid4(),
            full_name=data.full_name,
            email=data.email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    async def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate a user and return JWT tokens."""
        user = await self._get_user_by_email(data.email)
        if user is None:
            raise exceptions.AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise exceptions.AuthenticationError("User account is disabled")

        if not verify_password(data.password, user.password_hash):
            raise exceptions.AuthenticationError("Invalid email or password")

        return self._create_tokens(user.id)

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """Exchange a refresh token for a new pair of tokens."""
        from app.core.security import decode_token
        from uuid import UUID

        try:
            payload = decode_token(refresh_token)
            user_id = payload.get("sub")
            if user_id is None or payload.get("type") != "refresh":
                raise exceptions.AuthenticationError("Invalid refresh token")
            if refresh_token in _revoked_refresh_tokens:
                raise exceptions.AuthenticationError("Refresh token has been revoked")
        except Exception:
            raise exceptions.AuthenticationError("Invalid or expired refresh token")

        # Verify user still exists
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise exceptions.AuthenticationError("Invalid user ID in token")
        result = await self.session.execute(select(User).where(User.id == user_uuid))
        user = result.scalar_one_or_none()
        if user is None:
            raise exceptions.AuthenticationError("User not found")

        return self._create_tokens(user.id)

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    async def logout(self, refresh_token: str) -> None:
        """Revoke a refresh token."""
        _revoked_refresh_tokens.add(refresh_token)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    def _create_tokens(self, user_id: str) -> TokenResponse:
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)
        expires_in = int(
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds()
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )
