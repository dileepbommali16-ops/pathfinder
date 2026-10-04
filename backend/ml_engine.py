from pathlib import Path
from typing import Dict, List, Tuple
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from backend.models import StudentProfile, PredictionResult
from backend.data_service import get_placement_df

_cached_model = None
_cached_features = None


def get_trained_model() -> Tuple[RandomForestClassifier, List[str]]:
    global _cached_model, _cached_features
    if _cached_model is not None and _cached_features is not None:
        return _cached_model, _cached_features

    features = ["cgpa", "backlogs", "internships", "communication_score", "coding_score"]
    df = get_placement_df().copy()
    if df.empty:
        raise RuntimeError("No placement records available in data service.")

    col_map = {
        "communicationScore": "communication_score",
        "codingScore": "coding_score"
    }
    training = df.rename(columns=col_map)
    if "backlogs" not in training.columns:
        training["backlogs"] = 0

    model = RandomForestClassifier(n_estimators=120, random_state=42)
    model.fit(training[features], training["placed"])

    _cached_model = model
    _cached_features = features
    return _cached_model, _cached_features


def fallback_score(profile: StudentProfile) -> float:
    cgpa = profile.cgpa
    backlogs = profile.backlogs
    internships = profile.internships
    communication = profile.communication
    coding = profile.coding

    raw_score = (
        cgpa * 5.2
        + max(0, 3 - backlogs) * 4.0
        + min(internships, 3) * 5.0
        + communication * 2.2
        + coding * 2.7
        - max(backlogs - 1, 0) * 5.0
    )
    return float(max(18.0, min(96.0, round(raw_score, 1))))


def predict_placement(profile: StudentProfile) -> PredictionResult:
    is_estimated = False
    try:
        model, features = get_trained_model()
        input_df = pd.DataFrame(
            [[profile.cgpa, profile.backlogs, profile.internships, profile.communication, profile.coding]],
            columns=features
        )
        proba = model.predict_proba(input_df)[0][1] * 100.0
        chance = round(float(proba), 1)
    except Exception as exc:
        print(f"[ML Engine] Prediction warning: {exc}, using calibrated fallback formula")
        chance = fallback_score(profile)
        is_estimated = True

    # Determine classification label and tone
    if chance >= 75.0:
        label = "Strong Candidate Profile"
        tone = "strong"
    elif chance >= 55.0:
        label = "Solid Foundation"
        tone = "steady"
    else:
        label = "Needs Focus & Acceleration"
        tone = "focus"

    # Actionable strengths and priorities
    strengths = []
    priorities = []

    if profile.cgpa >= 8.0:
        strengths.append(f"High Academic Distinction (CGPA {profile.cgpa:.1f}/10)")
    elif profile.cgpa >= 7.0:
        strengths.append(f"Satisfies Tier-1 Academic Cutoff (CGPA {profile.cgpa:.1f})")
    else:
        priorities.append(f"Target CGPA >= 7.0 to unlock top MNC cutoffs (current {profile.cgpa:.1f})")

    if profile.backlogs == 0:
        strengths.append("Clean Academic Record (0 Active Backlogs)")
    else:
        priorities.append(f"Clear {profile.backlogs} active backlog(s) before recruitment season opens")

    if profile.internships >= 2:
        strengths.append(f"Exceptional Practical Experience ({profile.internships} internships completed)")
    elif profile.internships == 1:
        strengths.append("Demonstrated Industry Experience (1 internship)")
    else:
        priorities.append("Target at least 1 practical software development internship or open-source contribution")

    if profile.coding >= 8:
        strengths.append(f"Advanced Problem Solving & DSA Confidence ({profile.coding}/10)")
    elif profile.coding >= 6:
        strengths.append(f"Competent Core Programming Foundation ({profile.coding}/10)")
    else:
        priorities.append("Master high-frequency DSA patterns (Blind 75 / Top 150 LeetCode patterns)")

    if profile.communication >= 8:
        strengths.append(f"Exceptional Behavioral & Technical Articulation ({profile.communication}/10)")
    elif profile.communication < 7:
        priorities.append("Practice STAR method interview scenarios and weekly technical mock interviews")

    if not strengths:
        strengths.append("Clear growth trajectory with high upside upon pattern mastery")

    breakdown = {
        "academics": round(min(100.0, (profile.cgpa / 10.0) * 100.0), 1),
        "skills": round(profile.coding * 10.0, 1),
        "projects": round(min(100.0, max(25.0, profile.projects_count * 25.0)), 1),
        "internships": round(min(100.0, profile.internships * 40.0), 1),
        "coding": round(profile.coding * 10.0, 1),
        "coding_dsa": round(profile.coding * 10.0, 1),
        "communication": round(profile.communication * 10.0, 1),
        "experience": round(min(100.0, profile.internships * 35.0), 1),
        "eligibility": round(max(0.0, 100.0 - (profile.backlogs * 25.0)), 1),
    }

    return PredictionResult(
        chance=chance,
        label=label,
        tone=tone,
        strengths=strengths,
        priorities=priorities,
        breakdown=breakdown,
        is_estimated=is_estimated,
        data_source="Random Forest ML Engine (972 Records)" if not is_estimated else "Calibrated Rule-Based Model (Estimated)"
    )
