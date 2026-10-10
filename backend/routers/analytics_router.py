"""
APIs & Performance: Analytics & Placement Data Router
Exposes cohort benchmarking, placement analytics, branch intelligence,
and skills intelligence with database query caching and fast response times.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, Request

from backend.cache import cached
from backend.repositories.cohort_repository import CohortRepository
from backend.analytics_engine import get_cohort_analytics
from backend.data_service import (
    get_roles,
    get_skills,
    get_projects,
    get_branches,
    get_cohort_analytics_data,
    get_branch_deep_analytics,
    get_skills_deep_analytics,
)

analytics_router = APIRouter(tags=["Analytics & Cohort Benchmarking"])


@analytics_router.get("/api/analytics")
def analytics_endpoint(
    year: Optional[int] = Query(2026, description="Graduation year filter"),
    branch: Optional[str] = Query("All", description="Engineering branch filter"),
    gender: Optional[str] = Query("All", description="Gender filter"),
    skill: Optional[str] = Query("All", description="Skill category filter"),
    page: Optional[int] = Query(None, description="Page number for pagination"),
    page_size: Optional[int] = Query(None, description="Page size for pagination")
):
    """Returns real-time cohort distribution, placement rates, and tier benchmarking."""
    return get_cohort_analytics(
        year=year,
        branch=branch,
        gender=gender,
        skill=skill,
        page=page,
        page_size=page_size
    )


@analytics_router.get("/api/data/cohort")
def data_cohort_endpoint(
    year: Optional[int] = Query(2026),
    branch: Optional[str] = Query("All"),
    gender: Optional[str] = Query("All"),
    skill: Optional[str] = Query("All")
):
    """Direct cohort statistics endpoint."""
    return get_cohort_analytics_data(year=year, branch=branch, gender=gender, skill=skill)


@analytics_router.get("/api/cohort/paginated")
def cohort_paginated_endpoint(
    year: Optional[int] = Query(None),
    branch: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    placed_only: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """SQL-indexed paginated query across student cohort placement records."""
    return CohortRepository.get_paginated(
        year=year,
        branch=branch,
        gender=gender,
        skill_category=skill,
        placed_only=placed_only,
        limit=limit,
        offset=offset
    )


@analytics_router.get("/api/analytics/branch-deep")
@analytics_router.get("/api/data/branches")
def data_branches_endpoint(year: Optional[int] = Query(None)):
    """Returns branch-wise placement rates and intelligence analytics."""
    if year:
        return get_branch_deep_analytics(year)
    return get_branches()


@analytics_router.get("/api/analytics/skills-deep")
@analytics_router.get("/api/data/skills")
def data_skills_endpoint(
    year: Optional[int] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Returns skill-category placement stats and industry skill demands."""
    if year or (branch and branch != "All"):
        return get_skills_deep_analytics(year=year or 2026, branch=branch or "All")
    return get_skills()


@analytics_router.get("/api/data/roles")
def data_roles_endpoint():
    """Returns market compensation and demand metrics across target job roles."""
    return get_roles()


@analytics_router.get("/api/data/projects")
def data_projects_endpoint():
    """Returns recommended resume capstone projects filtered by engineering domain."""
    return get_projects()
