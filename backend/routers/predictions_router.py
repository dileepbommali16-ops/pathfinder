"""
APIs & ML: Prediction & Readiness Assessment Router
Exposes machine learning placement probability calculations and skill gap evaluations.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, Body

from backend.models import PredictionResult, SkillGapAnalysis, SkillGapItem
from backend.ml_engine import predict_placement
from backend.data_service import get_skills

predictions_router = APIRouter(tags=["ML Readiness & Predictions"])


@predictions_router.post("/api/predict", response_model=PredictionResult)
def predict_endpoint(payload: Dict[str, Any] = Body(...)):
    """Computes placement readiness probability via trained Random Forest ML Engine + Senior Hiring calibration."""
    try:
        cgpa = max(0.0, min(10.0, float(payload.get("cgpa", 7.5))))
        coding = max(0.0, min(10.0, float(payload.get("coding", 7))))
        communication = max(0.0, min(10.0, float(payload.get("communication", 7))))
        internships = max(0.0, min(20.0, float(payload.get("internships", 0))))
        backlogs = max(0.0, min(50.0, float(payload.get("backlogs", payload.get("active_backlogs", 0)))))
        projects_count = max(0, min(25, int(payload.get("projects_count", payload.get("projectsCount", 2)) or 0)))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid numeric metrics provided for prediction.")

    raw_skills = payload.get("skills") or payload.get("technicalSkills") or []
    skills = [str(s).strip() for s in raw_skills if str(s).strip()] if isinstance(raw_skills, list) else []
    raw_certs = payload.get("certifications") or []
    certs = [str(c).strip() for c in raw_certs if str(c).strip()] if isinstance(raw_certs, list) else []

    return predict_placement(
        cgpa=cgpa,
        coding=coding,
        communication=communication,
        internships=internships,
        backlogs=backlogs,
        projects_count=projects_count,
        skills=skills,
        certifications=certs,
        github_url=str(payload.get("github_url", payload.get("githubUrl", "")) or ""),
        leetcode_url=str(payload.get("leetcode_url", payload.get("leetcodeUrl", "")) or ""),
        target_role=str(payload.get("target_role", payload.get("targetRole", "Software Development Engineer (SDE)")) or "Software Development Engineer (SDE)"),
        ats_score=payload.get("ats_score"),
        github_verified_score=payload.get("github_verified_score"),
        tenth_percentage=payload.get("tenth_percentage"),
        twelfth_percentage=payload.get("twelfth_percentage"),
    )


@predictions_router.post("/api/skill-gap")
def skill_gap_endpoint(payload: Dict[str, Any] = Body(...)):
    """Identifies calibrated candidate strengths, hiring blockers, and role skill deficits."""
    raw_skills = payload.get("skills") or payload.get("technicalSkills") or []
    user_skills = set(str(s).strip().lower() for s in raw_skills if str(s).strip())
    target_role = str(payload.get("target_role", payload.get("targetRole", "Software Development Engineer (SDE)")) or "Software Development Engineer (SDE)")

    pred = predict_endpoint(payload)

    industry_skills = get_skills()
    gaps: List[Dict[str, Any]] = []

    for item in industry_skills:
        skill_name = item.get("skill", "")
        if skill_name.lower() not in user_skills:
            gaps.append({
                "skill": skill_name,
                "importance": item.get("importance", "High"),
                "placement_rate": item.get("placement_rate", 85.0),
                "recommendation": f"Add verifiable {skill_name} evidence in a deployed repo."
            })

    return {
        "target_role": target_role,
        "total_gaps": len(gaps),
        "gap_analysis": gaps[:6],
        "strengths": pred.strengths,
        "priorities": pred.priorities,
        "category_breakdown": pred.breakdown,
    }
