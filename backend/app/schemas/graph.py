"""Graph Pydantic schemas — Phase 6 Money Flow Graph Analysis."""

from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, Field


class MoneyTraceHop(BaseModel):
    """Represents a single step / hop in a money trail."""
    model_config = ConfigDict(from_attributes=True)

    hop_number: int
    from_account: str
    to_account: str
    transaction_id: str
    amount: float
    timestamp: datetime
    delay_seconds: Optional[float] = None
    risk_score: Optional[float] = None


class MoneyTraceResponse(BaseModel):
    """Response payload for GET /api/v1/graph/trace/{transaction_id}."""
    model_config = ConfigDict(from_attributes=True)

    source_account: str
    money_path: List[str]
    current_holder: str
    total_hops: int
    initial_amount: float
    remaining_amount: float
    hops: List[MoneyTraceHop]


class GraphNode(BaseModel):
    """Represents an account node in the financial graph."""
    model_config = ConfigDict(from_attributes=True)

    id: str  # Account number
    label: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    balance: float
    status: str
    risk_score: Optional[float] = None
    is_flagged: bool = False
    is_mule: bool = False


class GraphEdge(BaseModel):
    """Represents a transaction edge between two accounts."""
    model_config = ConfigDict(from_attributes=True)

    id: str  # Transaction ID
    source: str  # Sender account number
    target: str  # Receiver account number
    amount: float
    timestamp: datetime
    risk_score: Optional[float] = None
    is_flagged: bool = False


class NetworkGraphResponse(BaseModel):
    """Network graph payload for visualization (Nodes + Edges)."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int


class SuspiciousNetworkResponse(BaseModel):
    """Response containing detected suspicious graph patterns."""
    circular_chains: List[List[str]]  # List of account cycles
    mule_accounts: List[GraphNode]
    collector_accounts: List[GraphNode]
    total_suspicious_chains: int
