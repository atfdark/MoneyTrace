"""Standard API response format utilities."""

from typing import Any, Generic, Optional, TypeVar

from pydantic import Field
from pydantic.generics import GenericModel

T = TypeVar("T")


class APIResponse(GenericModel, Generic[T]):
    """Standard API response wrapper.

    All API endpoints return responses in this format for consistency.
    """

    success: bool = Field(default=True, description="Whether the request was successful")
    message: Optional[str] = Field(default=None, description="Human-readable message")
    data: Optional[T] = Field(default=None, description="Response data payload")


class ErrorResponse(GenericModel, Generic[T]):
    """Standard error response format."""

    success: bool = Field(default=False, description="Always false for errors")
    message: str = Field(..., description="Error description")
    details: Optional[T] = Field(default=None, description="Additional error details")
