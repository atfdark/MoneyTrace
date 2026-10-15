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
    from datetime import datetime, timezone
    users = ws_events_manager.get_active_users()
    return {
        "active_users": users,
        "total_online": len(users),
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
    ALLOWED_FREEZE_ROLES = {"admin", "supervisor", "investigator"}
    user_role = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)).lower()
    if user_role not in ALLOWED_FREEZE_ROLES:
        raise exceptions.AuthorizationError("Only investigators, supervisors, or administrators can issue freeze directives")

    is_uuid = False
    val_uuid = None
    try:
        from uuid import UUID as PyUUID
        val_uuid = PyUUID(account_number)
        is_uuid = True
    except (ValueError, TypeError, AttributeError):
        pass

    if is_uuid and val_uuid:
        stmt = select(Account).where(or_(Account.id == val_uuid, Account.account_number == account_number))
    else:
        stmt = select(Account).where(Account.account_number == account_number)

    res = await session.execute(stmt)
    account = res.scalar_one_or_none()

    if not account:
        raise exceptions.NotFoundError(f"Account '{account_number}' not found")

    account.status = AccountStatus.FROZEN.value
    
    # Record Audit Log
    from app.services.audit_service import AuditService
    from app.models.audit_log import AuditAction

    audit_svc = AuditService(session)
    await audit_svc.log_event(
        action=AuditAction.ACCOUNT_FROZEN,
        target_type="ACCOUNT",
        target_id=account.account_number,
        user=current_user,
        details={
            "reason": reason,
            "balance_preserved": float(account.balance),
            "status": "FROZEN",
        },
        commit=False,
    )

    # Sync any related RecoveryCase to ACTION_TAKEN
    try:
        from app.models.recovery import RecoveryCase, CaseStatus
        rec_stmt = select(RecoveryCase).where(
            or_(
                RecoveryCase.current_holder_account == account.account_number,
                RecoveryCase.current_holder_account == str(account.id)
            )
        )
        rec_res = await session.execute(rec_stmt)
        for rc in rec_res.scalars().all():
            rc.status = CaseStatus.ACTION_TAKEN.value
            rc.updated_at = datetime.now(timezone.utc)
    except Exception:
        pass

    await session.commit()
    await session.refresh(account)

    # Broadcast real-time ACCOUNT_FROZEN event
    await ws_events_manager.broadcast(
        WSEventTypes.ACCOUNT_FROZEN,
        {
            "account_number": account.account_number,
            "account_id": str(account.id),
            "status": "FROZEN",
            "frozen_by": current_user.full_name,
            "reason": reason,
            "balance": float(account.balance),
        }
    )

    return {
        "success": True,
        "message": f"Account {account.account_number} successfully frozen under emergency directive.",
        "account_number": account.account_number,
        "account_id": str(account.id),
        "status": "FROZEN",
        "balance_preserved": float(account.balance),
    }


# ---------------------------------------------------------------------------
# 5. Account Unfreeze Action
# ---------------------------------------------------------------------------

@router.post("/accounts/{account_number}/unfreeze")
async def unfreeze_account(
    account_number: str,
    reason: str = Body("Account verified and unfrozen by compliance authority", embed=True),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Lift freeze directive on an account after clearance or false positive verification.
    Restricted to investigators, supervisors, and administrators.
    """
    ALLOWED_UNFREEZE_ROLES = {"admin", "supervisor", "investigator"}
    user_role = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)).lower()
    if user_role not in ALLOWED_UNFREEZE_ROLES:
        raise exceptions.AuthorizationError("Only investigators, supervisors, or administrators can unfreeze accounts")

    is_uuid = False
    val_uuid = None
    try:
        from uuid import UUID as PyUUID
        val_uuid = PyUUID(account_number)
        is_uuid = True
    except (ValueError, TypeError, AttributeError):
        pass

    if is_uuid and val_uuid:
        stmt = select(Account).where(or_(Account.id == val_uuid, Account.account_number == account_number))
    else:
        stmt = select(Account).where(Account.account_number == account_number)

    res = await session.execute(stmt)
    account = res.scalar_one_or_none()

    if not account:
        raise exceptions.NotFoundError(f"Account '{account_number}' not found")

    account.status = AccountStatus.ACTIVE.value

    # Record Audit Log
    from app.services.audit_service import AuditService
    from app.models.audit_log import AuditAction

    audit_svc = AuditService(session)
    await audit_svc.log_event(
        action=AuditAction.ACCOUNT_UNFROZEN,
        target_type="ACCOUNT",
        target_id=account.account_number,
        user=current_user,
        details={
            "reason": reason,
            "previous_status": "FROZEN",
            "status": "ACTIVE",
            "balance": float(account.balance),
        },
        commit=True,
    )

    await session.refresh(account)

    # Broadcast real-time ACCOUNT_UNFROZEN event
    try:
        await ws_events_manager.broadcast(
            "ACCOUNT_UNFROZEN",
            {
                "account_number": account.account_number,
                "account_id": str(account.id),
                "status": "ACTIVE",
                "unfrozen_by": current_user.full_name,
                "reason": reason,
                "balance": float(account.balance),
            }
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Account {account.account_number} successfully restored to active status.",
        "account_number": account.account_number,
        "account_id": str(account.id),
        "status": "ACTIVE",
        "balance": float(account.balance),
    }


# ---------------------------------------------------------------------------
# 6. Administrative Role Management
# ---------------------------------------------------------------------------

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: UUID,
    new_role: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """Update a user's role (admin and supervisor only)."""
    user_role = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)).lower()
    if user_role not in {"admin", "supervisor"}:
        raise exceptions.AuthorizationError("Only administrators or supervisors can modify user roles")

    valid_roles = [r.value for r in UserRole]
    clean_role = new_role.strip().lower()
    if clean_role not in valid_roles:
        raise exceptions.ValidationError(f"Invalid role '{new_role}'. Valid roles: {valid_roles}")

    stmt = select(User).where(User.id == user_id)
    target_user_res = await session.execute(stmt)
    target_user = target_user_res.scalar_one_or_none()
    if not target_user:
        raise exceptions.NotFoundError("User not found")

    old_role = target_user.role
    target_user.role = clean_role
    await session.commit()
    await session.refresh(target_user)

    from app.services.audit_service import AuditService
    from app.models.audit_log import AuditAction
    audit_svc = AuditService(session)
    await audit_svc.log_event(
        action=AuditAction.USER_ROLE_CHANGED,
        target_type="USER",
        target_id=str(target_user.id),
        user=current_user,
        details={
            "target_user_email": target_user.email,
            "old_role": str(old_role),
            "new_role": clean_role,
        },
        commit=True,
    )

    return {
        "success": True,
        "user_id": str(target_user.id),
        "old_role": old_role,
        "new_role": target_user.role,
    }
