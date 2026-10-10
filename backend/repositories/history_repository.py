"""
Databases & Database Performance: Readiness History Repository
Handles storage and time-series retrieval for student readiness audit snapshots.
"""

import time
from typing import List, Dict, Any
from backend.database import get_db_connection
from backend.logging_config import logger


class HistoryRepository:
    """Repository handling assessment history and progression tracking."""

    @staticmethod
    def add_snapshot(
        user_id: str,
        chance: float,
        cgpa: float,
        coding: float,
        communication: float,
        internships: int = 0,
        backlogs: int = 0,
        target_role: str = "SDE"
    ) -> bool:
        """Saves a timestamped readiness assessment record."""
        start = time.perf_counter()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO readiness_history (
                    user_id, chance, cgpa, coding, communication,
                    internships, backlogs, target_role, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
            """, (user_id, chance, cgpa, coding, communication, internships, backlogs, target_role))
            conn.commit()

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] HistoryRepository.add_snapshot took {elapsed_ms:.2f}ms")
        return True

    @staticmethod
    def get_user_history(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Retrieves chronological progression history for a candidate."""
        start = time.perf_counter()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, chance, cgpa, coding, communication,
                       internships, backlogs, target_role, created_at
                FROM readiness_history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?;
            """, (user_id, limit))
            rows = cursor.fetchall()

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] HistoryRepository.get_user_history took {elapsed_ms:.2f}ms")

        return [dict(row) for row in rows]
