"""Root and health check routes."""

from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/", response_model=dict[str, str])
async def root() -> dict[str, str]:
    """Root endpoint providing a welcome message.

    Returns:
        A dictionary with a welcome message.
    """
    return {"message": "MoneyTrace API Running"}


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint.

    Returns:
        HealthResponse containing the health status.
    """
    return HealthResponse(status="healthy")
