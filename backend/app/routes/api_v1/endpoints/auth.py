"""Authentication endpoints — Phase 3."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.core.deps import get_current_user, get_current_active_user
from app.database import get_session
from app.schemas.auth import (
    AuthDataResponse,
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=AuthDataResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthDataResponse:
    """Register a new user, create their bank account, and return tokens."""
    service = AuthService(session)
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Authenticate user and return access/refresh tokens."""
    service = AuthService(session)
    tokens = await service.login(data)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    data: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Exchange refresh token for a new pair of access/refresh tokens."""
    service = AuthService(session)
    tokens = await service.refresh(data.refresh_token)
    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Revoke the refresh token (logout)."""
    service = AuthService(session)
    await service.logout(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user = Depends(get_current_active_user),
) -> UserResponse:
    """Get current user profile."""
    return UserResponse.model_validate(current_user)
