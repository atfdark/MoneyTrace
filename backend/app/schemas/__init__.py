"""Schemas package — request/response models."""

from app.schemas.health import HealthResponse
from app.schemas.auth import (
    TokenPayload,
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)

from app.schemas.fraud import (
    FraudAlertResponse,
    FraudAlertListResponse,
    FraudStatsResponse,
    AnalyzeTransactionResponse,
    UpdateAlertStatusRequest,
)

from app.schemas.graph import (
    MoneyTraceHop,
    MoneyTraceResponse,
    GraphNode,
    GraphEdge,
    NetworkGraphResponse,
    SuspiciousNetworkResponse,
)

from app.schemas.recovery import (
    RecoveryCaseResponse,
    RecoveryCaseListResponse,
    RecoveryStatsResponse,
)

__all__ = [
    "HealthResponse",
    "TokenPayload",
    "RegisterRequest",
    "LoginRequest",
    "RefreshRequest",
    "TokenResponse",
    "UserResponse",
    "FraudAlertResponse",
    "FraudAlertListResponse",
    "FraudStatsResponse",
    "AnalyzeTransactionResponse",
    "UpdateAlertStatusRequest",
    "MoneyTraceHop",
    "MoneyTraceResponse",
    "GraphNode",
    "GraphEdge",
    "NetworkGraphResponse",
    "SuspiciousNetworkResponse",
    "RecoveryCaseResponse",
    "RecoveryCaseListResponse",
    "RecoveryStatsResponse",
]
