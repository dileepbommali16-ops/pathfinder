"""
Databases & Database Performance: User Profile Repository
Encapsulates all SQL persistence for candidate profiles with indexing,
parameterized queries, and execution profiling.
"""

import json
import time
from typing import Optional, Dict, Any, List
from backend.database import get_db_connection
from backend.logging_config import logger


class UserRepository:
    """Repository handling candidate profile persistence in SQL database."""

    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile by unique user ID."""
        start = time.perf_counter()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT profile_data FROM user_profiles WHERE user_id = ? LIMIT 1;", (user_id,))
            row = cursor.fetchone()

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] UserRepository.get_by_id took {elapsed_ms:.2f}ms")

        if row and row["profile_data"]:
            try:
                return json.loads(row["profile_data"])
            except json.JSONDecodeError:
                return None
        return None

    @staticmethod
    def get_by_email_or_username(identifier: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile by email or username using indexed columns."""
        clean = identifier.strip().lower()
        start = time.perf_counter()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT profile_data FROM user_profiles 
                WHERE LOWER(email) = ? OR LOWER(username) = ? OR user_id = ? 
                LIMIT 1;
            """, (clean, clean, identifier.strip()))
            row = cursor.fetchone()

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] UserRepository.get_by_email_or_username took {elapsed_ms:.2f}ms")

        if row and row["profile_data"]:
            try:
                return json.loads(row["profile_data"])
            except json.JSONDecodeError:
                return None
        return None

    @staticmethod
    def save(user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Upserts a candidate profile into SQLite with indexed columns extracted."""
        start = time.perf_counter()
        email = str(profile_data.get("email") or "").strip()
        username = str(profile_data.get("username") or profile_data.get("full_name") or "").strip()
        full_name = str(profile_data.get("full_name") or "").strip()
        branch = str(profile_data.get("branch") or "").strip()
        cgpa = float(profile_data.get("cgpa") or 0.0)
        percentage = float(profile_data.get("percentage") or 0.0)
        active_backlogs = int(profile_data.get("active_backlogs") or profile_data.get("backlogs") or 0)
        onboarding_completed = 1 if profile_data.get("onboarding_completed") else 0
        raw_json = json.dumps(profile_data)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_profiles (
                    user_id, username, email, full_name, branch, cgpa, percentage,
                    active_backlogs, onboarding_completed, profile_data, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    username = excluded.username,
                    email = excluded.email,
                    full_name = excluded.full_name,
                    branch = excluded.branch,
                    cgpa = excluded.cgpa,
                    percentage = excluded.percentage,
                    active_backlogs = excluded.active_backlogs,
                    onboarding_completed = excluded.onboarding_completed,
                    profile_data = excluded.profile_data,
                    updated_at = CURRENT_TIMESTAMP;
            """, (user_id, username, email, full_name, branch, cgpa, percentage, active_backlogs, onboarding_completed, raw_json))
            conn.commit()

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] UserRepository.save took {elapsed_ms:.2f}ms")
        return True

    @staticmethod
    def delete(user_id: str) -> bool:
        """Deletes a candidate profile by user ID or associated email."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_profiles WHERE user_id = ? OR email = ?;", (user_id, user_id))
            affected = cursor.rowcount
            conn.commit()
            return affected > 0
