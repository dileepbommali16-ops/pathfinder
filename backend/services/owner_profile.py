"""
Owner profile re-export module for backward compatibility.
The canonical module is backend.owner_profile to avoid circular import issues.
"""

from backend.owner_profile import (
    OWNER_PROFILE,
    OWNER_PUBLIC_BIO,
    get_owner_emails,
    is_owner_user,
    get_context_for_user,
)

__all__ = [
    "OWNER_PROFILE",
    "OWNER_PUBLIC_BIO",
    "get_owner_emails",
    "is_owner_user",
    "get_context_for_user",
]
