"""Authentication service — register, login, refresh, logout."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import random
from uuid import UUID, uuid4

from sqlalchemy import select, insert, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.account import Account, AccountStatus
from app.models.user import User, UserRole
from app.schemas.auth import AuthDataResponse, LoginRequest, RegisterRequest, TokenResponse, UserResponse

# In-memory store of revoked refresh tokens (Phase3 placeholder — later move to Redis)
_revoked_refresh_tokens: set[str] = set()


class AuthService:
    """Business logic for authentication."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Register
    # ------------------------------------------------------------------

    async def register(self, data: RegisterRequest) -> AuthDataResponse:
        """Register a new user, create default account, and issue JWT tokens."""
        # Check for duplicate email (case-insensitive)
        email_clean = data.email.strip().lower()
        existing = await self.session.execute(
            select(User).where(func.lower(User.email) == email_clean)
        )
        if existing.scalar_one_or_none() is not None:
            raise exceptions.ConflictError("Email already registered")

        user = User(
            id=uuid4(),
            full_name=data.full_name.strip(),
            email=email_clean,
            password_hash=hash_password(data.password),
            role=data.role,
            is_active=True,
        )
        self.session.add(user)
        await self.session.flush()

        # Create a default bank account for simulator
        acc_num = f"ACC{random.randint(100000, 999999)}"
        account = Account(
            id=uuid4(),
            account_number=acc_num,
            user_id=user.id,
            balance=Decimal("100000.00"),
            status=AccountStatus.ACTIVE.value,
        )
        self.session.add(account)

        await self.session.commit()
        await self.session.refresh(user)

        # Broadcast new user registration event over WebSocket
        try:
            from app.core.websocket import ws_manager
            await ws_manager.broadcast("USER_REGISTERED", {
                "user_id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "account_number": acc_num,
                "role": user.role,
                "status": "active",
            })
        except Exception:
            pass

        # Issue tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        tokens = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

        return AuthDataResponse(
            user=UserResponse.model_validate(user),
            tokens=tokens,
        )

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    async def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate a user and return JWT tokens."""
        user = await self._get_user_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise exceptions.UnauthorizedError("Invalid email or password")

        if not user.is_active:
            raise exceptions.ForbiddenError("Account is inactive")

        # Broadcast login status event over WebSocket
        try:
            from app.core.websocket import ws_manager
            await ws_manager.broadcast("USER_LOGIN", {
                "user_id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "status": "online",
            })
        except Exception:
            pass

        # Remember me can grant a longer expiry in future
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    # ------------------------------------------------------------------
    # Refresh Token
    # ------------------------------------------------------------------

    async def refresh(self, refresh_token_str: str) -> TokenResponse:
        """Exchange a valid refresh token for new access and refresh tokens."""
        if refresh_token_str in _revoked_refresh_tokens:
            raise exceptions.AuthenticationError("Refresh token has been revoked")

        from app.core.security import decode_token

        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise exceptions.AuthenticationError("Invalid token type")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise exceptions.AuthenticationError("Invalid token subject")

        from uuid import UUID
        user = await self._get_user_by_id(UUID(user_id_str))
        if not user or not user.is_active:
            raise exceptions.AuthenticationError("User not found or inactive")

        # Revoke old refresh token (token rotation)
        _revoked_refresh_tokens.add(refresh_token_str)

        new_access_token = create_access_token(user.id)
        new_refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    async def logout(self, refresh_token_str: str) -> None:
        """Revoke a refresh token."""
        _revoked_refresh_tokens.add(refresh_token_str)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_user_by_email(self, identifier: str) -> User | None:
        ident_clean = identifier.strip().lower()
        if "@" not in ident_clean:
            if ident_clean in ("admin", "administrator"):
                ident_clean = "admin@moneytrace.dev"

        # 1. Exact email match or default domain match
        stmt = select(User).where(
            (func.lower(User.email) == ident_clean) |
            (func.lower(User.email) == f"{ident_clean}@moneytrace.dev")
        )
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            return user

        # 2. Match by Account Number (e.g. ACC123456)
        acc_stmt = select(User).join(Account, Account.user_id == User.id).where(
            func.lower(Account.account_number) == ident_clean
        )
        acc_res = await self.session.execute(acc_stmt)
        user_by_acc = acc_res.scalar_one_or_none()
        if user_by_acc:
            return user_by_acc

        # 3. Match by exact full_name
        name_stmt = select(User).where(func.lower(User.full_name) == ident_clean)
        name_res = await self.session.execute(name_stmt)
        return name_res.scalar_one_or_none()

    async def _get_user_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
