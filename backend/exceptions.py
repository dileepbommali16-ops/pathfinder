"""
Backend Fundamentals: Application Exceptions & Uniform Response Envelopes
Defines custom domain exceptions, standard HTTP error responses, and
consistent API envelope wrappers for resilient communication.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Generic, Optional, TypeVar
from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.logging_config import get_current_request_id, logger

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standardized API response envelope for data and success states."""
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    request_id: str = Field(default_factory=get_current_request_id)


class ApiErrorDetail(BaseModel):
    """Detailed error object attached to ApiErrorResponse."""
    code: str
    message: str
    details: Optional[Any] = None


class ApiErrorResponse(BaseModel):
    """Standardized error envelope returned on failure."""
    success: bool = False
    error: ApiErrorDetail
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    request_id: str = Field(default_factory=get_current_request_id)


# ============================================================================
# Domain Exception Hierarchy
# ============================================================================

class PathfinderException(Exception):
    """Base exception for all Pathfinder application errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, code: str = "INTERNAL_ERROR", details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


class NotFoundError(PathfinderException):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, code="NOT_FOUND", details=details)


class UnauthorizedError(PathfinderException):
    def __init__(self, message: str = "Authentication required or token expired", details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED, code="UNAUTHORIZED", details=details)


class ForbiddenError(PathfinderException):
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN, code="FORBIDDEN", details=details)


class ValidationError(PathfinderException):
    def __init__(self, message: str = "Input validation failed", details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, code="VALIDATION_ERROR", details=details)


class RateLimitExceededError(PathfinderException):
    def __init__(self, message: str = "Rate limit exceeded. Please wait before retrying.", details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_429_TOO_MANY_REQUESTS, code="RATE_LIMIT_EXCEEDED", details=details)


class UpstreamServiceError(PathfinderException):
    def __init__(self, message: str = "External service is temporarily unavailable", details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE, code="UPSTREAM_SERVICE_ERROR", details=details)


# ============================================================================
# Exception Handlers
# ============================================================================

async def pathfinder_exception_handler(request: Request, exc: PathfinderException) -> JSONResponse:
    """Handles all domain-specific application exceptions."""
    req_id = get_current_request_id()
    logger.warning(f"Domain exception [{exc.code}] on {request.method} {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": req_id,
        }
    )
