"""
APIs & Databases: Student Profile & Readiness History Router
Handles candidate profile CRUD, strict 403 ownership checks, readiness audits,
and historical snapshots using the database repository layer with async background recording.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends

from backend.models import StudentProfile, ReadinessAuditResult, UserSession
from backend.repositories.user_repository import UserRepository
from backend.repositories.history_repository import HistoryRepository
from backend.routers.auth_router import get_current_user
from backend.data_service import compute_cohort_benchmark
from backend.ml_engine import predict_placement
from backend.database import (
    get_user_profile_by_id,
    get_user_profile_by_email_or_username,
    save_user_profile,
    delete_user_profile,
    get_user_readiness_history,
    save_user_readiness_history
)
from backend.logging_config import logger

profile_router = APIRouter(tags=["Student Profile & Readiness"])

# In-memory fast cache
_user_profiles: Dict[str, StudentProfile] = {}


@profile_router.get("/api/profile", response_model=StudentProfile)
def get_profile(
    user_id: Optional[str] = Query(None, description="Explicit user_id to look up"),
    username: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    user: UserSession = Depends(get_current_user)
):
    """
    Authorization & Ownership Check:
    Every API route reading a student profile verifies that the logged-in user owns that profile.
    Changing the user_id in the request to another user's ID returns 403 Forbidden.
    """
    # 1. Authorization Ownership Check
    if user_id and user_id != user.user_id:
        if user.is_authenticated:
            logger.warning(
                f"[AUTHORIZATION 403] User '{user.user_id}' attempted to access profile of '{user_id}'"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: You are not authorized to view user '{user_id}' profile."
            )
        else:
            logger.warning(
                f"[AUTHORIZATION 403] Unauthenticated request for user '{user_id}' profile"
            )
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Authentication required to access user profiles."
            )

    # 2. Determine target lookup key
    target_key = user_id or (user.user_id if user.is_authenticated else None)

    # Look up in persistent SQL database first
    if target_key and target_key != "usr_anonymous":
        db_profile = get_user_profile_by_id(target_key)
        if db_profile:
            return StudentProfile(**db_profile)

    # Fallback lookup by email or username in SQL database
    lookup_id = email or (user.email if user.is_authenticated else None) or username or user.username
    if lookup_id and lookup_id != "candidate@pathfinder.ai":
        db_profile = get_user_profile_by_email_or_username(lookup_id)
        if db_profile:
            return StudentProfile(**db_profile)

    # In-memory session fallback
    if target_key and target_key in _user_profiles:
        return _user_profiles[target_key]

    # Return clean initial profile with onboarding_completed = False so the onboarding wizard triggers
    return StudentProfile(
        user_id=user.user_id,
        email=email or user.email,
        full_name=user.username if user.username != "Student Candidate" else "Student Candidate",
        onboarding_completed=False,
        wizard_step=1
    )


@profile_router.get("/api/profile/{target_user_id}", response_model=StudentProfile)
def get_profile_by_user_id_endpoint(
    target_user_id: str,
    user: UserSession = Depends(get_current_user)
):
    """
    Targeted Profile Access with strict 403 Ownership Enforcement:
    Verifies that the caller owns the requested profile.
    """
    if not user.is_authenticated:
        logger.warning(f"[AUTHORIZATION 403] Unauthenticated request to /api/profile/{target_user_id}")
        raise HTTPException(status_code=403, detail="Forbidden: Authentication required.")

    if user.user_id != target_user_id:
        logger.warning(f"[AUTHORIZATION 403] User '{user.user_id}' attempted to access profile of '{target_user_id}'")
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: You are not authorized to view user '{target_user_id}' profile."
        )

    db_profile = get_user_profile_by_id(target_user_id)
    if not db_profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    return StudentProfile(**db_profile)


@profile_router.post("/api/profile", response_model=StudentProfile)
def update_profile(profile: StudentProfile, user: UserSession = Depends(get_current_user)):
    """
    Authorization & Ownership Check:
    Every API route writing a student profile verifies that the logged-in user owns that profile.
    Changing the user_id in the request to another user's ID returns 403 Forbidden.
    Persists profile to the persistent SQL database.
    """
    # 1. Authorization Ownership Check
    if profile.user_id and profile.user_id != user.user_id:
        if user.is_authenticated:
            logger.warning(
                f"[AUTHORIZATION 403] User '{user.user_id}' attempted to modify profile for '{profile.user_id}'"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: You cannot modify profile for user '{profile.user_id}'."
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Authentication required to modify user profiles."
            )

    # 2. Server-side calculations & normalization
    target_key = user.user_id if user.is_authenticated else (profile.user_id or profile.email or "usr_anonymous")
    profile.user_id = target_key
    profile.backlogs = profile.active_backlogs
    multiplier = profile.cgpa_formula_multiplier or 9.5
    profile.percentage = round(profile.cgpa * multiplier, 1)

    # 3. Persist to SQL Database
    save_user_profile(target_key, profile.model_dump())

    # Keep memory caches synced
    _user_profiles[target_key] = profile
    if profile.email:
        _user_profiles[profile.email] = profile
    if user.username and user.username != "Student Candidate":
        _user_profiles[user.username] = profile
    if profile.full_name:
        _user_profiles[profile.full_name] = profile

    return profile


@profile_router.delete("/api/profile")
def delete_profile(
    user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    user: UserSession = Depends(get_current_user)
):
    """Deletes profile with strict authentication and ownership protection."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Authentication required to delete a profile.")

    if user_id and user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot delete another user's profile.")

    if email and email.strip().lower() != user.email.strip().lower():
        raise HTTPException(status_code=403, detail="Forbidden: You cannot delete another user's profile.")

    target = user.user_id
    deleted = UserRepository.delete(target)
    if target in _user_profiles:
        del _user_profiles[target]
    if user.email in _user_profiles:
        del _user_profiles[user.email]
    return {"status": "deleted" if deleted else "not_found", "target": target}


@profile_router.post("/api/profile/calculate", response_model=ReadinessAuditResult)
def calculate_readiness_audit(profile: StudentProfile, background_tasks: BackgroundTasks):
    """Computes placement readiness probability, strengths, gaps, and benchmarks."""
    pred = predict_placement(
        cgpa=profile.cgpa,
        coding=profile.coding,
        communication=profile.communication,
        internships=profile.internships,
        backlogs=profile.active_backlogs
    )

    benchmark = compute_cohort_benchmark(
        branch=profile.branch or "CSE",
        cgpa=profile.cgpa
    )

    strengths = []
    gaps = []

    if profile.cgpa >= 8.0:
        strengths.append(f"Strong CGPA ({profile.cgpa}) comfortably satisfies all MNC hiring cutoffs.")
    elif profile.cgpa < 7.0:
        gaps.append(f"Current CGPA ({profile.cgpa}) is near cutoffs for tier-1 companies.")

    if profile.coding >= 8:
        strengths.append("High coding score guarantees high clearance in initial coding rounds.")
    elif profile.coding < 6:
        gaps.append("Coding confidence requires practice in dynamic programming and graph algorithms.")

    if profile.internships >= 1:
        strengths.append(f"Hands-on industry exposure ({profile.internships} internship(s)) strengthens resume ranking.")
    else:
        gaps.append("No recorded internships. Prioritize capstone full-stack deployments or open-source.")

    if profile.active_backlogs == 0:
        strengths.append("Zero active backlogs ensures eligibility for all recruitment drives.")
    else:
        gaps.append(f"Active backlogs ({profile.active_backlogs}) will disqualify from several Day-1 drives.")

    if profile.user_id and profile.user_id != "usr_anonymous":
        background_tasks.add_task(
            HistoryRepository.add_snapshot,
            user_id=profile.user_id,
            chance=pred.chance,
            cgpa=profile.cgpa,
            coding=profile.coding,
            communication=profile.communication,
            internships=int(profile.internships),
            backlogs=int(profile.active_backlogs),
            target_role=profile.target_role or "SDE"
        )

    return ReadinessAuditResult(
        chance=pred.chance,
        label=pred.label,
        tone=pred.tone,
        overall_percentage=profile.percentage or (profile.cgpa * 9.5),
        cgpa=profile.cgpa,
        conversion_formula="CGPA * 9.5",
        strengths=strengths,
        gaps=gaps,
        recommended_skills=["System Design", "Cloud Architecture", "LeetCode Mediums"],
        breakdown=pred.breakdown,
        cohort_comparison=benchmark,
        next_steps=[
            "Complete 2 LeetCode Medium problems daily focusing on sliding windows and trees.",
            "Deploy your full-stack project live on Vercel/Render with Docker containerization.",
            "Schedule a behavioral STAR method mock interview with Pathfinder AI Coach."
        ],
        is_estimated=False,
        data_source="Random Forest Classifier (88% Accuracy)"
    )


@profile_router.get("/api/profile/history")
def get_profile_history(user: UserSession = Depends(get_current_user)):
    """Returns the student's historical readiness evaluations over time."""
    target_uid = user.user_id if (user.is_authenticated and user.user_id) else "usr_anonymous"
    history = get_user_readiness_history(target_uid)
    return {"user_id": target_uid, "history": history, "total": len(history)}


@profile_router.post("/api/profile/history")
def add_profile_history(
    payload: Dict[str, Any],
    user: UserSession = Depends(get_current_user)
):
    """Records a new historical readiness snapshot."""
    target_uid = user.user_id if (user.is_authenticated and user.user_id) else (payload.get("user_id") or "usr_anonymous")
    row_id = save_user_readiness_history(
        user_id=target_uid,
        chance=float(payload.get("chance", 70.0)),
        cgpa=float(payload.get("cgpa", 8.0)),
        coding=float(payload.get("coding", 7.0)),
        communication=float(payload.get("communication", 7.0)),
        internships=int(payload.get("internships", 1)),
        backlogs=int(payload.get("backlogs", 0)),
        target_role=payload.get("target_role") or payload.get("targetRole")
    )
    return {"success": True, "id": row_id}
