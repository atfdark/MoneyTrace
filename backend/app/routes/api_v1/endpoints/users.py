"""Users, Accounts, Presence and Emergency Freeze endpoints."""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, status, Body
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.core.websocket_events import ws_events_manager, WSEventTypes
from app.database import get_session
from app.models.account import Account, AccountStatus
from app.models.user import User, UserRole
from app.schemas.user import UserSearchResult, UserSearchResponse

router = APIRouter()

AVATAR_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
    "#EC4899", "#6366F1", "#14B8A6", "#F97316"
]


# ---------------------------------------------------------------------------
# 1. Live Recipient / Account Autocomplete Search
# ---------------------------------------------------------------------------

@router.get("/search", response_model=UserSearchResponse)
async def search_users_and_accounts(
    q: str = Query(..., min_length=1, max_length=100, description="Search term for name, email or account number"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> UserSearchResponse:
    """
    Live autocomplete search across registered users and bank accounts.
    Matches full_name, email, or account_number (e.g. ACC1001).
    """
    clean_q = f"%{q.strip().lower()}%"

    # Query accounts joined with users (excluding current user)
    stmt = (
        select(Account, User)
        .join(User, Account.user_id == User.id)
        .where(
            and_(
                Account.user_id != current_user.id,
                or_(
                    func.lower(User.full_name).like(clean_q),
                    func.lower(User.email).like(clean_q),
                    func.lower(Account.account_number).like(clean_q),
                )
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


# ---------------------------------------------------------------------------
# 2. Frequent Recipients
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# 3. Active Online Users (Presence Monitoring)
# ---------------------------------------------------------------------------

@router.get("/active")
async def get_active_users():
    """Return all currently active / online users connected to MoneyTrace."""
    users = ws_events_manager.get_active_users()
    return {
        "active_users": users,
        "total_online": len(users),
        "timestamp": func.now(),
    }


# ---------------------------------------------------------------------------
# 4. Emergency Account Freeze Action
# ---------------------------------------------------------------------------

@router.post("/accounts/{account_number}/freeze")
async def freeze_account(
    account_number: str,
    reason: str = Body("Emergency freeze directive issued by SOC Investigator under Section 91 CrPC", embed=True),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Issue an immediate freeze directive on a suspect or mule holding account.
    Halts all outbound/inbound transactions and broadcasts ACCOUNT_FROZEN.
    """
    stmt = select(Account).where(Account.account_number == account_number)
    res = await session.execute(stmt)
    account = res.scalar_one_or_none()

    if not account:
        raise exceptions.NotFoundError(f"Account '{account_number}' not found")

    account.status = AccountStatus.FROZEN.value
    await session.commit()
    await session.refresh(account)

    # Broadcast real-time ACCOUNT_FROZEN event
    await ws_events_manager.broadcast(
        WSEventTypes.ACCOUNT_FROZEN,
        {
            "account_number": account_number,
            "status": "FROZEN",
            "frozen_by": current_user.full_name,
            "reason": reason,
            "balance": float(account.balance),
        }
    )

    return {
        "success": True,
        "message": f"Account {account_number} successfully frozen.",
        "account_number": account_number,
        "status": "FROZEN",
    }
