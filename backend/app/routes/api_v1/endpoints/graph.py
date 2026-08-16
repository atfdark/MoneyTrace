"""Money Flow Graph Analysis endpoints — Phase 6."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.graph import (
    MoneyTraceResponse,
    NetworkGraphResponse,
    SuspiciousNetworkResponse,
)
from app.services.graph_engine import GraphEngine

router = APIRouter()


# ---------------------------------------------------------------------------
# Money Trace API
# ---------------------------------------------------------------------------

@router.get("/trace/{transaction_id}", response_model=MoneyTraceResponse)
async def trace_money_flow(
    transaction_id: str,
    max_hops: int = Query(10, ge=1, le=50, description="Maximum number of downstream hops to trace"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> MoneyTraceResponse:
    """
    Trace downstream money flow path starting from a transaction_id or account_number.

    Returns source account, visited money path, current holder, and hop details.
    """
    engine = GraphEngine(session)
    return await engine.trace_money_flow(transaction_id, max_hops=max_hops)


# ---------------------------------------------------------------------------
# Account Subgraph Neighborhood
# ---------------------------------------------------------------------------

@router.get("/account/{account_number}", response_model=NetworkGraphResponse)
async def get_account_subgraph(
    account_number: str,
    radius: int = Query(2, ge=1, le=5, description="Neighborhood search radius (hops)"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> NetworkGraphResponse:
    """Get N-hop neighborhood graph centered around a specific account."""
    engine = GraphEngine(session)
    return await engine.get_account_subgraph(account_number, radius=radius)


# ---------------------------------------------------------------------------
# Full Network Graph
# ---------------------------------------------------------------------------

@router.get("/network", response_model=NetworkGraphResponse)
async def get_network_graph(
    limit: int = Query(1000, ge=10, le=5000, description="Max transactions to include in graph"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> NetworkGraphResponse:
    """Get full network graph (nodes & edges) for visual UI graph rendering."""
    engine = GraphEngine(session)
    return await engine.get_network_graph(limit=limit)


# ---------------------------------------------------------------------------
# Suspicious Graph Pattern Detection
# ---------------------------------------------------------------------------

@router.get("/suspicious", response_model=SuspiciousNetworkResponse)
async def get_suspicious_patterns(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> SuspiciousNetworkResponse:
    """Detect circular laundering chains (cycles), mule accounts, and collector nodes."""
    engine = GraphEngine(session)
    return await engine.detect_suspicious_patterns()
