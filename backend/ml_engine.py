from pathlib import Path
from typing import Dict, List, Tuple
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from backend.models import StudentProfile, PredictionResult

ROOT_DIR = Path(__file__).resolve().parent.parent
STUDENTS_CSV = ROOT_DIR / "students.csv"
PLACEMENT_CSV = ROOT_DIR / "sample-placement-2024-2026.csv"

_cached_model = None
_cached_features = None


def get_trained_model() -> Tuple[RandomForestClassifier, List[str]]:
    global _cached_model, _cached_features
    if _cached_model is not None and _cached_features is not None:
        return _cached_model, _cached_features

    features = ["cgpa", "backlogs", "internships", "communication_score", "coding_score"]
    training_file = STUDENTS_CSV if STUDENTS_CSV.exists() else PLACEMENT_CSV

    if not training_file.exists():
        raise FileNotFoundError("Neither students.csv nor sample-placement-2024-2026.csv was found.")

    training = pd.read_csv(training_file)
    col_map = {
        "communicationScore": "communication_score",
        "codingScore": "coding_score"
    }
    training = training.rename(columns=col_map)

    # Validate required columns
    for col in features + ["placed"]:
        if col not in training.columns:
            # Fall back to placement data if columns missing
            training = pd.read_csv(PLACEMENT_CSV).rename(columns=col_map)
            break

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
        breakdown=breakdown
    )
