"""API v1 routes package."""

from fastapi import APIRouter

from app.routes.api_v1.endpoints import (
    auth,
    transactions,
    dashboard,
    alerts,
    fraud,
    investigation,
    graph,
    recovery,
    reports,
    assistant,
    users,
    simulation,
    watchlist,
    audit_logs,
    scenarios,
)

api_router = APIRouter()

# Include all endpoint routers under /api/v1
api_router.include_router(auth.router, tags=["auth"], prefix="/auth")
api_router.include_router(users.router, tags=["users"], prefix="/users")
api_router.include_router(transactions.router, tags=["transactions"], prefix="/transactions")
api_router.include_router(dashboard.router, tags=["dashboard"], prefix="/dashboard")
api_router.include_router(alerts.router, tags=["alerts"], prefix="/alerts")
api_router.include_router(fraud.router, tags=["fraud"], prefix="/fraud")
api_router.include_router(investigation.router, tags=["investigation"], prefix="/investigation")
api_router.include_router(graph.router, tags=["graph"], prefix="/graph")
api_router.include_router(recovery.router, tags=["recovery"], prefix="/recovery")
api_router.include_router(reports.router, tags=["reports"], prefix="/reports")
api_router.include_router(assistant.router, tags=["assistant"], prefix="/assistant")
api_router.include_router(simulation.router, tags=["simulation"], prefix="/simulation")
api_router.include_router(watchlist.router, tags=["watchlist"], prefix="/watchlist")
api_router.include_router(audit_logs.router, tags=["audit-logs"], prefix="/audit-logs")
api_router.include_router(scenarios.router, tags=["scenarios"], prefix="/scenarios")

__all__ = ["api_router"]
