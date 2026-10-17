"""
Backend Architecture: Controllers Package (Photo 2)
Receives requests, handles input validation, and sends final responses.
"""

from backend.controllers.auth_controller import (
    handle_login,
    handle_logout,
    handle_get_system_stats
)
from backend.controllers.webhook_controller import (
    handle_webhook_event
)

__all__ = [
    "handle_login",
    "handle_logout",
    "handle_get_system_stats",
    "handle_webhook_event",
]
