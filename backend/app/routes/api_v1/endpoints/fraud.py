"""Fraud Detection Engine endpoints — Phase 5."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.fraud import (
    FraudAlertResponse,
    FraudAlertListResponse,
    FraudStatsResponse,
    AnalyzeTransactionResponse,
    UpdateAlertStatusRequest,
)
from app.services.fraud_service import FraudService

router = APIRouter()


# ---------------------------------------------------------------------------
# Fraud Summary Statistics
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=FraudStatsResponse)
async def get_fraud_stats(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudStatsResponse:
    """Get dashboard summary of fraud alert statistics."""
    service = FraudService(session)
    stats = await service.get_fraud_stats()
    return FraudStatsResponse(**stats)


# ---------------------------------------------------------------------------
# List Fraud Alerts
# ---------------------------------------------------------------------------

@router.get("/alerts", response_model=FraudAlertListResponse)
async def list_fraud_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, UNDER_REVIEW, CLOSED, FALSE_POSITIVE"),
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertListResponse:
    """Get paginated list of fraud alerts."""
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


# ---------------------------------------------------------------------------
# High Risk Alerts & Transactions
# ---------------------------------------------------------------------------

@router.get("/high-risk", response_model=FraudAlertListResponse)
async def get_high_risk_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertListResponse:
    """Get alerts with HIGH or CRITICAL risk severity."""
    service = FraudService(session)
    alerts, total = await service.get_high_risk_alerts_and_transactions(
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return FraudAlertListResponse(
        alerts=[FraudAlertResponse.model_validate(a) for a in alerts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# Alert Detail & Status Update
# ---------------------------------------------------------------------------

@router.get("/alerts/{alert_id}", response_model=FraudAlertResponse)
async def get_fraud_alert_detail(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertResponse:
    """Get detailed fraud alert by alert_id or UUID."""
    service = FraudService(session)
    alert = await service.get_alert_by_id(alert_id)
    return FraudAlertResponse.model_validate(alert)


@router.patch("/alerts/{alert_id}/status", response_model=FraudAlertResponse)
async def update_fraud_alert_status(
    alert_id: str,
    data: UpdateAlertStatusRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAlertResponse:
    """Update fraud alert status (OPEN, UNDER_REVIEW, CLOSED, FALSE_POSITIVE)."""
    service = FraudService(session)
    alert = await service.update_alert_status(alert_id, data.status.value)
    return FraudAlertResponse.model_validate(alert)


# ---------------------------------------------------------------------------
# Re-analyze / Analyze Transaction On-Demand
# ---------------------------------------------------------------------------

@router.post("/analyze/{transaction_id}", response_model=AnalyzeTransactionResponse)
async def analyze_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> AnalyzeTransactionResponse:
    """Run fraud rules analysis on a transaction and create/update alerts if flagged."""
    service = FraudService(session)
    result, alert = await service.analyze_transaction_by_id(transaction_id)

    alert_resp = FraudAlertResponse.model_validate(alert) if alert else None

    return AnalyzeTransactionResponse(
        transaction_id=transaction_id,
        risk_score=result.risk_score,
        severity=result.severity,
        is_flagged=result.is_flagged,
        triggered_rules=result.triggered_rules,
        rule_breakdown=result.rule_breakdown,
        description=result.description,
        alert=alert_resp,
    )
