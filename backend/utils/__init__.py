"""
Backend Architecture: Utils Package (Photo 2)
Reusable helper functions, loggers, string sanitizers, crypto, and formatters.
"""

from backend.logging_config import (
    logger,
    setup_logging,
    set_current_request_id,
    get_current_request_id,
    get_log_records
)
from backend.security import (
    sanitize_user_input,
    get_client_ip,
    validate_resume_upload,
    verify_webhook_signature,
    check_bot_protection,
    log_admin_action,
    validate_private_storage_access
)

__all__ = [
    "logger",
    "setup_logging",
    "set_current_request_id",
    "get_current_request_id",
    "get_log_records",
    "sanitize_user_input",
    "get_client_ip",
    "validate_resume_upload",
    "verify_webhook_signature",
    "check_bot_protection",
    "log_admin_action",
    "validate_private_storage_access",
]
