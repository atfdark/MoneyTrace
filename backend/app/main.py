"""MoneyTrace – AI Financial Crime Intelligence Platform.

Main FastAPI application entry point with real-time WebSocket support.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from app.config import settings
from app.core.exceptions import AppException
from app.core.websocket import ws_manager
from app.routes.root import router as root_router
from app.routes.api_v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting MoneyTrace AI Banking & Crime Intelligence Platform...")
    yield
    # Shutdown
    print("Shutting down MoneyTrace API...")


app = FastAPI(
    title="MoneyTrace API",
    description="AI Financial Crime Intelligence & Banking Simulation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS Middleware — Permissive for multi-student local network access
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Real-Time WebSocket Endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/live")
@app.websocket("/api/v1/ws/live")
async def websocket_live_endpoint(
    websocket: WebSocket,
    user_id: str | None = None,
    username: str | None = None,
    account_number: str | None = None,
    role: str | None = None,
):
    """WebSocket endpoint for broadcasting live transactions, alerts, recovery cases & presence."""
    # Query parameters can also be extracted from URL query string if not parsed by FastAPI
    query_params = websocket.query_params
    uid = user_id or query_params.get("user_id") or "anonymous"
    uname = username or query_params.get("username") or "Investigator / Client"
    acc = account_number or query_params.get("account_number") or "ACC_NODE"
    user_role = role or query_params.get("role") or "ANALYST"

    await ws_manager.connect(
        websocket=websocket,
        user_id=uid,
        username=uname,
        account_number=acc,
        role=user_role,
    )
    try:
        while True:
            # Keep connection open & handle incoming client pings, heartbeats, or events
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                await ws_manager.update_activity(websocket)
            elif data.startswith("{"):
                await ws_manager.update_activity(websocket)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Global Exception Handlers
# ---------------------------------------------------------------------------


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application-specific exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(PydanticValidationError)
async def pydantic_validation_handler(
    request: Request, exc: PydanticValidationError
) -> JSONResponse:
    """Handle Pydantic v2 validation errors."""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "details": exc.errors(),
        },
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle FastAPI request validation errors."""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "details": str(exc) if settings.ENVIRONMENT == "development" else None,
        },
    )


# ---------------------------------------------------------------------------
# Include Routers
# ---------------------------------------------------------------------------

app.include_router(root_router)
app.include_router(api_router, prefix="/api/v1")
