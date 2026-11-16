"""
Databases & Database Performance: Readiness History Repository
Handles storage and time-series retrieval for student readiness audit snapshots.
"""

import time
from typing import List, Dict, Any
from backend.database import save_user_readiness_history, get_user_readiness_history
from backend.logging_config import logger


class HistoryRepository:
    """Repository handling assessment history and progression tracking across SQLite & Supabase."""

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
        save_user_readiness_history(
            user_id=user_id,
            chance=chance,
            cgpa=cgpa,
            coding=coding,
            communication=communication,
            internships=internships,
            backlogs=backlogs,
            target_role=target_role,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] HistoryRepository.add_snapshot took {elapsed_ms:.2f}ms")
        return True

    @staticmethod
    def get_user_history(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Retrieves chronological progression history for a candidate."""
        start = time.perf_counter()
        rows = get_user_readiness_history(user_id, limit=limit)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] HistoryRepository.get_user_history took {elapsed_ms:.2f}ms")
        return list(reversed(rows))
