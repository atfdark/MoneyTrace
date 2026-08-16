"""Dashboard Analytics API Endpoints — Phase 8."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.dashboard import (
    FraudAnalyticsResponse,
    FraudTrendsResponse,
    InvestigatorLeaderboardResponse,
    LiveDashboardResponse,
    LocationAnalyticsResponse,
    OverviewResponse,
    RecoveryAnalyticsResponse,
    TopRiskyAccountsResponse,
    TransactionAnalyticsResponse,
)
from app.services.dashboard_service import DashboardService

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. Executive Overview Statistics
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=OverviewResponse)
async def get_overview_stats(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> OverviewResponse:
    """Get high-level executive KPI overview."""
    service = DashboardService(session)
    return await service.get_overview_stats()


# ---------------------------------------------------------------------------
# 2. Real-Time SOC Live Monitoring Feed
# ---------------------------------------------------------------------------

@router.get("/live", response_model=LiveDashboardResponse)
async def get_live_dashboard(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> LiveDashboardResponse:
    """Get real-time SOC monitoring metrics."""
    service = DashboardService(session)
    return await service.get_live_stats()


# ---------------------------------------------------------------------------
# 3. Transaction Analytics & Volume Trends
# ---------------------------------------------------------------------------

@router.get("/transactions", response_model=TransactionAnalyticsResponse)
async def get_transaction_analytics(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionAnalyticsResponse:
    """Get transaction volume metrics and daily volume trends."""
    service = DashboardService(session)
    return await service.get_transaction_analytics()


# ---------------------------------------------------------------------------
# 4. Fraud Analytics & Rule Breakdown
# ---------------------------------------------------------------------------

@router.get("/fraud", response_model=FraudAnalyticsResponse)
async def get_fraud_analytics(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudAnalyticsResponse:
    """Get fraud detection breakdown by severity and rule types."""
    service = DashboardService(session)
    return await service.get_fraud_analytics()


# ---------------------------------------------------------------------------
# 5. Recovery Intelligence Analytics
# ---------------------------------------------------------------------------

@router.get("/recovery", response_model=RecoveryAnalyticsResponse)
async def get_recovery_analytics(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryAnalyticsResponse:
    """Get asset recovery success rates, risk balances, and probability distributions."""
    service = DashboardService(session)
    return await service.get_recovery_analytics()


# ---------------------------------------------------------------------------
# 6. Geographic / Location Analytics
# ---------------------------------------------------------------------------

@router.get("/locations", response_model=LocationAnalyticsResponse)
async def get_location_analytics(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> LocationAnalyticsResponse:
    """Get geographic fraud concentrations and impossible travel corridors."""
    service = DashboardService(session)
    return await service.get_location_analytics()


# ---------------------------------------------------------------------------
# 7. Top Risky Accounts (Composite Ranking)
# ---------------------------------------------------------------------------

@router.get("/risky-accounts", response_model=TopRiskyAccountsResponse)
async def get_top_risky_accounts(
    limit: int = Query(20, ge=1, le=100, description="Number of top risky accounts to return"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> TopRiskyAccountsResponse:
    """Get top risky accounts ranked by intelligent composite score."""
    service = DashboardService(session)
    return await service.get_top_risky_accounts(limit=limit)


# ---------------------------------------------------------------------------
# 8. Fraud Trends (30 Days Time-Series)
# ---------------------------------------------------------------------------

@router.get("/trends", response_model=FraudTrendsResponse)
async def get_fraud_trends(
    days: int = Query(30, ge=7, le=90, description="Number of historical days for trendline"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FraudTrendsResponse:
    """Get historical daily fraud and critical alert counts for charts."""
    service = DashboardService(session)
    return await service.get_fraud_trends(days=days)


# ---------------------------------------------------------------------------
# 9. Investigator Leaderboard & Resolution Metrics
# ---------------------------------------------------------------------------

@router.get("/investigators", response_model=InvestigatorLeaderboardResponse)
async def get_investigator_leaderboard(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> InvestigatorLeaderboardResponse:
    """Get investigator performance leaderboard and resolution times."""
    service = DashboardService(session)
    return await service.get_investigator_stats()


# ---------------------------------------------------------------------------
# 10. Dashboard Export (JSON / CSV)
# ---------------------------------------------------------------------------

@router.get("/export")
async def export_dashboard(
    format: str = Query("json", description="Export format: json or csv"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Export dashboard analytics report in JSON or CSV format."""
    service = DashboardService(session)
    content, media_type = await service.export_dashboard_data(export_format=format)
    filename = f"moneytrace_analytics_{format.lower()}.{'csv' if format.lower() == 'csv' else 'json'}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
