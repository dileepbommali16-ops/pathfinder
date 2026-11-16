"""
Databases & Database Performance: User Profile Repository
Encapsulates all SQL persistence for candidate profiles with indexing,
parameterized queries, and execution profiling.
"""

import time
from typing import Optional, Dict, Any
from backend.database import (
    get_user_profile_by_id,
    get_user_profile_by_email_or_username,
    save_user_profile,
    delete_user_profile,
)
from backend.logging_config import logger


class UserRepository:
    """Repository handling candidate profile persistence across SQLite cache and Supabase Postgres."""

    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile by unique user ID."""
        start = time.perf_counter()
        result = get_user_profile_by_id(user_id)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] UserRepository.get_by_id took {elapsed_ms:.2f}ms")
        return result

    @staticmethod
    def get_by_email_or_username(identifier: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile by email or username using indexed columns + cloud hydration."""
        start = time.perf_counter()
        result = get_user_profile_by_email_or_username(identifier)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] UserRepository.get_by_email_or_username took {elapsed_ms:.2f}ms")
        return result

    @staticmethod
    def save(user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Upserts a candidate profile into SQLite cache and durable Supabase Postgres."""
        start = time.perf_counter()
        ok = save_user_profile(user_id, profile_data)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] UserRepository.save took {elapsed_ms:.2f}ms")
        return ok

    @staticmethod
    def delete(user_id: str) -> bool:
        """Deletes a candidate profile by user ID or associated email."""
        return delete_user_profile(user_id)
