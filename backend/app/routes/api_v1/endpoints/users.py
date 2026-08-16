"""Users and Account Live Search endpoints."""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.account import Account, AccountStatus
from app.models.user import User
from app.schemas.user import UserSearchResult, UserSearchResponse

router = APIRouter()

AVATAR_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
    "#EC4899", "#6366F1", "#14B8A6", "#F97316"
]


@router.get("/search", response_model=UserSearchResponse)
async def search_users_and_accounts(
    q: str = Query(..., min_length=1, max_length=100, description="Search term for name, email or account number"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> UserSearchResponse:
    """
    Live autocomplete search across users and bank accounts.
    Matches full_name, email, or account_number (e.g. ACC1001).
    """
    clean_q = f"%{q.strip().lower()}%"

    # Query accounts joined with users
    stmt = (
        select(Account, User)
        .join(User, Account.user_id == User.id)
        .where(
            or_(
                func.lower(User.full_name).like(clean_q),
                func.lower(User.email).like(clean_q),
                func.lower(Account.account_number).like(clean_q),
            )
        )
        .limit(limit)
    )

    result = await session.execute(stmt)
    rows = result.all()

    results: List[UserSearchResult] = []
    for idx, (account, user) in enumerate(rows):
        color = AVATAR_COLORS[hash(str(user.id)) % len(AVATAR_COLORS)]
        results.append(
            UserSearchResult(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                role=user.role if isinstance(user.role, str) else user.role.value,
                account_number=account.account_number,
                balance=float(account.balance),
                status=account.status,
                avatar_color=color,
            )
        )

    return UserSearchResponse(results=results, total=len(results))


@router.get("/recipients", response_model=UserSearchResponse)
async def get_frequent_recipients(
    limit: int = Query(8, ge=1, le=20),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> UserSearchResponse:
    """Get active bank accounts for quick recipient chips (excluding current user)."""
    stmt = (
        select(Account, User)
        .join(User, Account.user_id == User.id)
        .where(Account.user_id != current_user.id)
        .order_by(Account.created_at.desc())
        .limit(limit)
    )

    result = await session.execute(stmt)
    rows = result.all()

    results: List[UserSearchResult] = []
    for idx, (account, user) in enumerate(rows):
        color = AVATAR_COLORS[hash(str(user.id)) % len(AVATAR_COLORS)]
        results.append(
            UserSearchResult(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                role=user.role if isinstance(user.role, str) else user.role.value,
                account_number=account.account_number,
                balance=float(account.balance),
                status=account.status,
                avatar_color=color,
            )
        )

    return UserSearchResponse(results=results, total=len(results))
