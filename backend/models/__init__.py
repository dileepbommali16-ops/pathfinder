"""
Backend Models Package (Photo 4 Architecture)
Defines the structure and validation of database collections, tables, and API schemas.
"""

from backend.models import (
    StudentProfile,
    PredictionResult,
    ChatMessage,
    UserSession,
    ProjectBlueprint,
    SkillGapItem,
    PlacementInsight
)

__all__ = [
    "StudentProfile",
    "PredictionResult",
    "ChatMessage",
    "UserSession",
    "ProjectBlueprint",
    "SkillGapItem",
    "PlacementInsight"
]
