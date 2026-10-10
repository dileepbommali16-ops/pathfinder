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
    """Computes placement readiness probability via trained Random Forest ML Engine."""
    cgpa = float(payload.get("cgpa", 7.5))
    coding = float(payload.get("coding", 7))
    communication = float(payload.get("communication", 7))
    internships = float(payload.get("internships", 0))
    backlogs = float(payload.get("backlogs", payload.get("active_backlogs", 0)))

    return predict_placement(
        cgpa=cgpa,
        coding=coding,
        communication=communication,
        internships=internships,
        backlogs=backlogs
    )


@predictions_router.post("/api/skill-gap")
def skill_gap_endpoint(payload: Dict[str, Any] = Body(...)):
    """Identifies candidate skill deficits against recruitment market requirements."""
    user_skills = set(s.strip().lower() for s in payload.get("skills", []))
    target_role = payload.get("target_role", "Software Development Engineer (SDE)")

    industry_skills = get_skills()
    gaps: List[Dict[str, Any]] = []

    for item in industry_skills:
        skill_name = item.get("skill", "")
        if skill_name.lower() not in user_skills:
            gaps.append({
                "skill": skill_name,
                "importance": item.get("importance", "High"),
                "placement_rate": item.get("placement_rate", 85.0),
                "recommendation": f"Add {skill_name} project to your portfolio."
            })

    return {
        "target_role": target_role,
        "total_gaps": len(gaps),
        "gap_analysis": gaps[:6]
    }
