"""Health check response schema."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response for the health check endpoint."""

    status: str = Field(..., description="Health status of the application")

    model_config = {"json_schema_extra": {"example": {"status": "healthy"}}}
