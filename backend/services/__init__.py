"""
Backend Architecture: Services Package (Photo 2)
Implements core business logic, predictive algorithms, data persistence, and external service calls.
"""

from backend.data_service import (
    get_placement_df,
    get_roles,
    get_skills,
    get_projects,
    get_branches,
    get_cohort_analytics_data,
    get_branch_deep_analytics,
    get_skills_deep_analytics,
    compute_cohort_benchmark,
    warm_up_data_caches
)
from backend.ml_engine import predict_placement
from backend.gemini_engine import (
    chat_with_mentor,
    generate_structured_ai
)
from backend.pdf_engine import (
    extract_text_from_pdf,
    generate_analytics_pdf,
    generate_resume_pdf
)
from backend.cache import cache

__all__ = [
    "get_placement_df",
    "get_roles",
    "get_skills",
    "get_projects",
    "get_branches",
    "get_cohort_analytics_data",
    "get_branch_deep_analytics",
    "get_skills_deep_analytics",
    "compute_cohort_benchmark",
    "warm_up_data_caches",
    "predict_placement",
    "chat_with_mentor",
    "generate_structured_ai",
    "handle_voice_turn",
    "generate_spoken_briefing",
    "extract_text_from_pdf",
    "generate_analytics_pdf",
    "generate_resume_pdf",
    "cache",
]
