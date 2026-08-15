"""Dashboard endpoints - placeholder."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/", name="dashboard-overview")
async def get_dashboard_overview() -> dict[str, str]:
    """Get dashboard overview data."""
    return {"message": "Dashboard overview endpoint placeholder"}


@router.get("/stats", name="dashboard-stats")
async def get_dashboard_stats() -> dict[str, str]:
    """Get dashboard statistics."""
    return {"message": "Dashboard stats endpoint placeholder"}


@router.get("/recent-activity", name="dashboard-recent-activity")
async def get_recent_activity() -> dict[str, str]:
    """Get recent activity feed."""
    return {"message": "Recent activity endpoint placeholder"}


@router.get("/risk-distribution", name="dashboard-risk-distribution")
async def get_risk_distribution() -> dict[str, str]:
    """Get risk distribution data."""
    return {"message": "Risk distribution endpoint placeholder"}
