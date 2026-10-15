"""Audit Logs endpoints — Activity trail for compliance and SOC review."""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, Query, status, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditAction
from app.services.audit_service import AuditService, sanitize_audit_details

router = APIRouter()

# Authorized roles allowed to view compliance audit logs
AUTHORIZED_AUDIT_ROLES = {
    UserRole.ADMIN.value,
    UserRole.INVESTIGATOR.value,
    UserRole.ANALYST.value,
    UserRole.SUPERVISOR.value,
    UserRole.EXECUTIVE.value,
}


def require_audit_role(current_user: User) -> User:
    """Validate that the requesting user has an authorized role to inspect audit logs."""
    user_role = (
        current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    ).lower()
    if user_role not in AUTHORIZED_AUDIT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Audit records are restricted to compliance and security personnel.",
        )
    return current_user


class CreateAuditLogRequest(BaseModel):
    """Schema for manual audit log entry creation."""
    action: str = Field(..., max_length=50)
    target_type: str = Field("SYSTEM", max_length=50)
    target_id: str = Field("SYS-001", max_length=100)
    details: Optional[Dict[str, Any]] = None


@router.get("", include_in_schema=True)
@router.get("/", include_in_schema=False)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=150),
    action: Optional[str] = Query(None, max_length=50),
    target_type: Optional[str] = Query(None, max_length=50),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """Retrieve paginated audit logs for compliance tracking."""
    require_audit_role(current_user)

    filters = []

    if search:
        s = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(AuditLog.user_name).like(s),
                func.lower(AuditLog.user_email).like(s),
                func.lower(AuditLog.target_id).like(s),
                func.lower(AuditLog.target_type).like(s),
                func.lower(AuditLog.action).like(s),
                func.lower(AuditLog.ip_address).like(s),
            )
        )

    if action:
        filters.append(func.lower(AuditLog.action) == action.strip().lower())

    if target_type:
        filters.append(func.lower(AuditLog.target_type) == target_type.strip().lower())

    if from_date:
        try:
            f_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
            filters.append(AuditLog.timestamp >= f_dt)
        except ValueError:
            pass

    if to_date:
        try:
            t_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
            filters.append(AuditLog.timestamp <= t_dt)
        except ValueError:
            pass

    # Build query
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if filters:
        combined = and_(*filters)
        query = query.where(combined)
        count_query = count_query.where(combined)

    total_res = await session.execute(count_query)
    total = total_res.scalar_one() or 0

    query = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(query)
    logs = result.scalars().all()

    # Redact sensitive details for presentation
    sanitized_logs = []
    for log in logs:
        clean_details = sanitize_audit_details(log.details) if log.details else {}
        sanitized_logs.append(
            {
                "id": str(log.id),
                "user_name": log.user_name,
                "user_email": log.user_email,
                "user_role": log.user_role,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": clean_details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
        )

    return {
        "logs": sanitized_logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/actions/types")
async def get_audit_action_types(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all distinct audit actions present in the database + defined enums."""
    require_audit_role(current_user)

    stmt = select(AuditLog.action).distinct().order_by(AuditLog.action.asc())
    res = await session.execute(stmt)
    db_actions = {r[0] for r in res.all() if r[0]}

    enum_actions = {a.value for a in AuditAction}
    all_actions = sorted(list(db_actions.union(enum_actions)))

    return {"actions": all_actions}


@router.post("", status_code=status.HTTP_201_CREATED, include_in_schema=True)
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_audit_log(
    data: CreateAuditLogRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """Record an audit log entry (restricted to admin and supervisor roles)."""
    user_role = (
        current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    ).lower()
    if user_role not in {UserRole.ADMIN.value, UserRole.SUPERVISOR.value}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or supervisors can record manual audit entries.",
        )

    audit_svc = AuditService(session)
    entry = await audit_svc.log_event(
        action=data.action,
        target_type=data.target_type,
        target_id=data.target_id,
        user=current_user,
        details=data.details,
        commit=True,
    )
    return {"success": True, "id": str(entry.id)}
