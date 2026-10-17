"""
Backend Architecture: Middlewares Package (Photo 2)
Processes requests before controllers: authentication, rate limiting, logging, security headers.
"""

from backend.routers.auth_router import (
    get_current_user,
    require_authenticated,
    require_admin
)
from backend.security import (
    require_role,
    rate_limiter,
    ai_budget_manager,
    SECURITY_HEADERS,
    get_client_ip
)

__all__ = [
    "get_current_user",
    "require_authenticated",
    "require_admin",
    "require_role",
    "rate_limiter",
    "ai_budget_manager",
    "SECURITY_HEADERS",
    "get_client_ip",
]
