"""Recovery Intelligence endpoints — Phase 7."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.recovery import (
    RecoveryCaseResponse,
    RecoveryCaseListResponse,
    RecoveryStatsResponse,
)
from app.services.recovery_service import RecoveryService

router = APIRouter()


# ---------------------------------------------------------------------------
# Recovery Statistics API
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=RecoveryStatsResponse)
async def get_recovery_stats(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryStatsResponse:
    """Get summary statistics for recovery cases."""
    service = RecoveryService(session)
    stats = await service.get_recovery_stats()
    return RecoveryStatsResponse(**stats)


# ---------------------------------------------------------------------------
# List Recovery Cases
# ---------------------------------------------------------------------------

@router.get("/cases", response_model=RecoveryCaseListResponse)
async def list_recovery_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, ACTION_TAKEN, RECOVERED, FAILED"),
    probability: Optional[str] = Query(None, description="Filter by probability: LOW, MEDIUM, HIGH"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseListResponse:
    """Get paginated list of recovery cases."""
    service = RecoveryService(session)
    cases, total = await service.get_all_cases(
        page=page,
        page_size=page_size,
        status=status,
        probability=probability,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return RecoveryCaseListResponse(
        cases=[RecoveryCaseResponse.model_validate(c) for c in cases],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# High Probability Recovery Cases
# ---------------------------------------------------------------------------

@router.get("/high-probability", response_model=RecoveryCaseListResponse)
async def get_high_probability_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseListResponse:
    """Get cases with HIGH recovery probability."""
    service = RecoveryService(session)
    cases, total = await service.get_high_probability_cases(page=page, page_size=page_size)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return RecoveryCaseListResponse(
        cases=[RecoveryCaseResponse.model_validate(c) for c in cases],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# Recovery Case Detail
# ---------------------------------------------------------------------------

@router.get("/cases/{case_id}", response_model=RecoveryCaseResponse)
async def get_recovery_case_detail(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseResponse:
    """Get detailed recovery case by case_id or UUID."""
    service = RecoveryService(session)
    case = await service.get_case(case_id)
    return RecoveryCaseResponse.model_validate(case)


# ---------------------------------------------------------------------------
# Analyze Fraud Alert for Recovery
# ---------------------------------------------------------------------------

@router.post("/analyze/{alert_id}", response_model=RecoveryCaseResponse)
async def analyze_recovery_for_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseResponse:
    """Run Recovery Intelligence Engine on a fraud alert and return RecoveryCase."""
    service = RecoveryService(session)
    case = await service.analyze_recovery(alert_id)
    return RecoveryCaseResponse.model_validate(case)


# ---------------------------------------------------------------------------
# Recalculate Recovery Case
# ---------------------------------------------------------------------------

@router.post("/recalculate/{case_id}", response_model=RecoveryCaseResponse)
async def recalculate_recovery_case(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseResponse:
    """Re-analyze and update an existing recovery case with fresh graph data."""
    service = RecoveryService(session)
    case = await service.recalculate_case(case_id)
    return RecoveryCaseResponse.model_validate(case)
