"""
Backend Models Package
Defines database models, Pydantic schemas, and API contracts.
"""

from backend.models.schemas import (
    StudentProfile,
    ReadinessAuditResult,
    PredictionResult,
    Roadmap,
    CohortInsight,
    ResumeFeedback,
    ChatMessage,
    ChatRequest,
    CohortFilters,
    PaginatedCohortResponse,
    UserSession,
    LoginRequest,
    WebhookPayload,
    LoginResponse,
    OAuthUrlsResponse,
    SkillGapItem,
    SkillGapAnalysis,
)

__all__ = [
    "StudentProfile",
    "ReadinessAuditResult",
    "PredictionResult",
    "Roadmap",
    "CohortInsight",
    "ResumeFeedback",
    "ChatMessage",
    "ChatRequest",
    "CohortFilters",
    "PaginatedCohortResponse",
    "UserSession",
    "LoginRequest",
    "WebhookPayload",
    "LoginResponse",
    "OAuthUrlsResponse",
    "SkillGapItem",
    "SkillGapAnalysis",
]
