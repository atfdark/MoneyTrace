"""Alerts endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.fraud import (
    FraudAlertListResponse,
    FraudAlertResponse,
    UpdateAlertStatusRequest,
)
from app.services.fraud_service import FraudService

router = APIRouter()


@router.get("", response_model=FraudAlertListResponse, name="alerts-list")
@router.get("/", response_model=FraudAlertListResponse)
async def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, UNDER_REVIEW, CLOSED, FALSE_POSITIVE"),
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertListResponse:
    """List fraud alerts."""
    service = FraudService(session)
    alerts, total = await service.get_alerts(
        page=page,
        page_size=page_size,
        status=status,
        severity=severity,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return FraudAlertListResponse(
        alerts=[FraudAlertResponse.model_validate(a) for a in alerts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{alert_id}", response_model=FraudAlertResponse, name="alerts-detail")
async def get_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertResponse:
    """Get alert by ID."""
    service = FraudService(session)
    alert = await service.get_alert_by_id(alert_id)
    return FraudAlertResponse.model_validate(alert)


@router.post("/{alert_id}/acknowledge", response_model=FraudAlertResponse, name="alerts-acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertResponse:
    """Acknowledge an alert."""
    service = FraudService(session)
    alert = await service.update_alert_status(alert_id, "UNDER_REVIEW")

    # Record Audit Log
    try:
        from app.services.audit_service import AuditService
        from app.models.audit_log import AuditAction
        audit_svc = AuditService(session)
        await audit_svc.log_event(
            action=AuditAction.ALERT_ACKNOWLEDGED,
            target_type="ALERT",
            target_id=alert.alert_id,
            user=current_user,
            details={
                "status": "UNDER_REVIEW",
                "risk_score": alert.risk_score,
                "severity": alert.severity,
                "alert_type": alert.alert_type,
            },
            commit=True,
        )
    except Exception:
        pass

    # Broadcast ALERT_ACKNOWLEDGED event to immediately silence all connected SOC dashboards & mobile controllers
    try:
        from app.core.websocket_events import ws_events_manager, WSEventTypes
        await ws_events_manager.broadcast(WSEventTypes.ALERT_ACKNOWLEDGED, {
            "alert_id": alert.alert_id,
            "status": alert.status,
            "acknowledged_by": current_user.email,
        })
    except Exception:
        pass

    return FraudAlertResponse.model_validate(alert)


@router.post("/{alert_id}/resolve", response_model=FraudAlertResponse, name="alerts-resolve")
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertResponse:
    """Resolve an alert."""
    service = FraudService(session)
    alert = await service.update_alert_status(alert_id, "CLOSED")

    # Record Audit Log
    try:
        from app.services.audit_service import AuditService
        from app.models.audit_log import AuditAction
        audit_svc = AuditService(session)
        await audit_svc.log_event(
            action=AuditAction.ALERT_RESOLVED,
            target_type="ALERT",
            target_id=alert.alert_id,
            user=current_user,
            details={
                "status": "CLOSED",
                "risk_score": alert.risk_score,
                "severity": alert.severity,
                "alert_type": alert.alert_type,
            },
            commit=True,
        )
    except Exception:
        pass

    try:
        from app.core.websocket_events import ws_events_manager, WSEventTypes
        await ws_events_manager.broadcast(WSEventTypes.ALERT_ACKNOWLEDGED, {
            "alert_id": alert.alert_id,
            "status": alert.status,
            "resolved_by": current_user.email,
        })
    except Exception:
        pass

    return FraudAlertResponse.model_validate(alert)
