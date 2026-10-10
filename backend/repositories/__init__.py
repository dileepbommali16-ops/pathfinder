"""
Database Repositories Package: Clean Data Access Layer with Query Optimization
"""
from backend.repositories.user_repository import UserRepository
from backend.repositories.cohort_repository import CohortRepository
from backend.repositories.history_repository import HistoryRepository

__all__ = ["UserRepository", "CohortRepository", "HistoryRepository"]
