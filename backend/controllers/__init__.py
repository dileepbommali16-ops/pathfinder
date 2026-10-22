"""
Backend Architecture: Controllers Package (Photo 4)
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
from backend.controllers.profile_controller import (
    get_student_profile,
    save_student_profile
)
from backend.controllers.prediction_controller import (
    calculate_placement_prediction
)
from backend.controllers.agent_controller import (
    process_agent_query
)

__all__ = [
    "handle_login",
    "handle_logout",
    "handle_get_system_stats",
    "handle_webhook_event",
    "get_student_profile",
    "save_student_profile",
    "calculate_placement_prediction",
    "process_agent_query"
]
