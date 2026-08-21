"""Custom exception classes for the MoneyTrace API."""

from typing import Any, Optional


class AppException(Exception):
    """Base exception for application-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Any] = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(AppException):
    """Exception raised when a resource is not found."""

    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None) -> None:
        super().__init__(message, status_code=404, details=details)


class ValidationError(AppException):
    """Exception raised when input validation fails."""

    def __init__(self, message: str = "Validation error", details: Optional[Any] = None) -> None:
        super().__init__(message, status_code=422, details=details)


class AuthenticationError(AppException):
    """Exception raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed", details: Optional[Any] = None) -> None:
        super().__init__(message, status_code=401, details=details)


class AuthorizationError(AppException):
    """Exception raised when authorization fails."""

    def __init__(self, message: str = "Insufficient permissions", details: Optional[Any] = None) -> None:
        super().__init__(message, status_code=403, details=details)


class ConflictError(AppException):
    """Exception raised when there's a conflict (e.g., duplicate resource)."""

    def __init__(self, message: str = "Conflict", details: Optional[Any] = None) -> None:
        super().__init__(message, status_code=409, details=details)


# Aliases for compatibility
UnauthorizedError = AuthenticationError
ForbiddenError = AuthorizationError
