from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import pandas as pd

from backend.models import StudentProfile, PredictionResult
from backend.data_service import get_placement_df

import pickle

MODEL_PKL_PATH = Path(__file__).resolve().parent / "model.pkl"
_cached_model = None
_cached_features = None


def get_trained_model() -> Tuple[Any, List[str]]:
    global _cached_model, _cached_features
    if _cached_model is not None and _cached_features is not None:
        return _cached_model, _cached_features

    features = ["cgpa", "backlogs", "internships", "communication_score", "coding_score"]

    # 1. Attempt to load pre-serialized model.pkl for instantaneous startup
    if MODEL_PKL_PATH.exists():
        try:
            with open(MODEL_PKL_PATH, "rb") as f:
                saved = pickle.load(f)
                _cached_model = saved.get("model")
                _cached_features = saved.get("features", features)
                if _cached_model is not None:
                    return _cached_model, _cached_features
        except Exception:
            pass

    # 2. Train dynamically on verified cohort records if pkl not present
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

    from sklearn.ensemble import RandomForestClassifier

    model = RandomForestClassifier(n_estimators=120, random_state=42)
    model.fit(training[features], training["placed"])

    # 3. Cache in memory and persist model.pkl
    _cached_model = model
    _cached_features = features
    try:
        with open(MODEL_PKL_PATH, "wb") as f:
            pickle.dump({"model": model, "features": features}, f)
    except Exception:
        pass

    return _cached_model, _cached_features


def _evaluate_senior_hiring_calibration(
    cgpa: float,
    backlogs: float,
    internships: float,
    communication: float,
    coding: float,
    projects_count: int = 2,
    skills: Optional[List[str]] = None,
    github_url: str = "",
    leetcode_url: str = "",
    certifications: Optional[List[str]] = None,
    ats_score: Optional[float] = None,
    github_verified_score: Optional[float] = None,
    tenth_percentage: Optional[float] = None,
    twelfth_percentage: Optional[float] = None,
    target_role: str = "Software Development Engineer (SDE)",
) -> Tuple[float, Dict[str, float], List[str], List[str]]:
    """
    Applies a Senior Company Hiring Manager (Deloitte / Amazon / Tier-1 Product)
    evidence rubric so inflated self-rated sliders without verified proof never
    yield artificial 90%+ scores or flattering 'no blockers' verdicts.
    """
    normalized_skills = {str(s).strip().lower() for s in (skills or []) if str(s).strip()}
    certs_list = [str(c).strip() for c in (certifications or []) if str(c).strip()]
    has_github = bool((github_url or "").strip())
    has_leetcode = bool((leetcode_url or "").strip())

    # 1. Academics & Strict Tier-1 Cutoff Calibration
    if cgpa >= 8.5:
        acad_score = 92.0
    elif cgpa >= 8.0:
        acad_score = 83.0
    elif cgpa >= 7.5:
        acad_score = 72.0
    elif cgpa >= 7.0:
        acad_score = 62.0
    elif cgpa >= 6.0:
        acad_score = 48.0
    else:
        acad_score = 30.0

    # Active backlog academic drag & eligibility calibration
    acad_score = max(15.0, acad_score - backlogs * 18.0)
    eligibility_score = 95.0 if backlogs == 0 else max(10.0, 95.0 - backlogs * 28.0)
    if tenth_percentage is not None and tenth_percentage < 60.0:
        eligibility_score = min(eligibility_score, 68.0)
    if twelfth_percentage is not None and twelfth_percentage < 60.0:
        eligibility_score = min(eligibility_score, 68.0)

    # 2. Evidence-Backed Technical & DSA Evaluation (sliders alone cap at 62)
    slider_coding_pts = min(62.0, max(0.0, coding) * 6.2)
    core_buckets = [
        ("dsa", {"dsa", "data structures", "algorithms", "leetcode", "competitive programming", "dynamic programming"}),
        ("db", {"sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "dbms", "database"}),
        ("backend", {"fastapi", "django", "flask", "node", "nodejs", "express", "spring", "spring boot", "rest", "graphql", "microservices", "api"}),
        ("cloud", {"docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "git", "linux", "devops"}),
        ("lang_or_ui", {"java", "c++", "python", "typescript", "javascript", "go", "rust", "react", "next.js"}),
    ]
    matched_buckets = sum(1 for _, kws in core_buckets if any(any(k in s for k in kws) for s in normalized_skills))
    stack_pts = matched_buckets * 4.2  # max +21.0
    coding_proof_pts = (10.0 if has_leetcode else 0.0) + (7.0 if has_github else 0.0)
    coding_score = min(96.0, round(slider_coding_pts + stack_pts + coding_proof_pts, 1))

    # 3. Authentic Experience & Portfolio Proof (prevents 10-internship inflation exploit!)
    credible_internships = min(max(0.0, internships), 3.0)
    outlier_internships = internships >= 4
    base_exp = {0: 14.0, 1: 48.0, 2: 68.0, 3: 75.0}.get(int(round(credible_internships)), 75.0)
    if outlier_internships and not has_github:
        # Unsubstantiated >3 internships raises fraud/verification concern rather than giving 100%
        base_exp = min(base_exp, 56.0)
    elif outlier_internships:
        base_exp = min(base_exp, 68.0)

    proj_pts = min(14.0, max(0, projects_count) * 4.0)
    github_pts = 0.0
    if github_verified_score is not None:
        github_pts = min(16.0, (github_verified_score / 100.0) * 16.0)
    elif has_github:
        github_pts = 8.0
    exp_score = min(96.0, round(base_exp + proj_pts + github_pts - (12.0 if not has_github and internships >= 2 else 0.0), 1))
    exp_score = max(12.0, exp_score)

    # 4. Technical Communication, STAR & Resume Proof (slider alone caps at 72)
    comm_base = min(72.0, max(0.0, communication) * 7.2)
    comm_evidence = (
        (10.0 if credible_internships >= 1 else 0.0)
        + (6.0 if projects_count >= 2 else 0.0)
        + (10.0 if (ats_score is not None and ats_score >= 70.0) else (4.0 if certs_list else 0.0))
    )
    comm_score = min(95.0, round(comm_base + comm_evidence, 1))

    # 5. Weighted Evidence Score
    evidence_score = (
        acad_score * 0.24
        + coding_score * 0.28
        + exp_score * 0.24
        + comm_score * 0.14
        + eligibility_score * 0.10
    )

    strengths: List[str] = []
    priorities: List[str] = []

    # Candid Academic & Eligibility Review
    if cgpa >= 8.2:
        strengths.append(f"Strong Academic Record (CGPA {cgpa:.1f}/10 — clears strict 8.0+ Dream/MAANG shortlists)")
    elif cgpa >= 7.5:
        strengths.append(f"Clears Standard Campus Cutoffs (CGPA {cgpa:.1f}/10 for Tier-2 & most product drives)")
        priorities.append(
            f"CGPA {cgpa:.1f} is borderline for strict 8.0+ Dream/Tier-1 shortlists — offset this with verified GitHub repos and DSA proof."
        )
    elif cgpa >= 7.0:
        strengths.append(f"Baseline Academic Eligibility Met (CGPA {cgpa:.1f}/10 for standard recruiters)")
        priorities.append(
            f"Raise CGPA toward >= 7.5–8.0 to unlock stricter Tier-1 MNC and product company screening bars (current {cgpa:.1f})."
        )
    else:
        priorities.append(f"Academic Blocker: CGPA {cgpa:.1f} falls below common 7.0+ Tier-1 MNC cutoff filters.")

    if backlogs == 0:
        strengths.append("Clean Backlog Status (0 Active Backlogs)")
    else:
        priorities.append(f"Critical Eligibility Blocker: Clear {int(backlogs)} active backlog(s) before campus placement drives begin.")

    # Candid Internships & Outlier Check
    if outlier_internships:
        priorities.append(
            f"Verification Red Flag: Claiming {int(internships)} internships triggers recruiter scrutiny — retain only verified 6+ week internships with offer letters/GitHub impact."
        )
    elif internships >= 2:
        if has_github:
            strengths.append(f"Credible Practical Experience ({int(internships)} internships paired with GitHub link)")
        else:
            priorities.append(
                f"{int(internships)} internships listed without a linked GitHub portfolio — attach verifiable repositories or architecture notes."
            )
    elif internships == 1:
        strengths.append("Baseline Industry Exposure (1 internship recorded)")
        priorities.append("Deepen production impact from your internship with measurable latency/scale metrics in STAR & ATS bullets.")
    else:
        priorities.append("Zero recorded internships — compensate with 2 deployed full-stack/backend capstones featuring tests & Docker.")

    # Candid Coding & Stack Proof Check
    if coding >= 8 and not has_leetcode:
        priorities.append(
            f"Unverified High Coding Claim ({coding:.1f}/10): Link a live LeetCode/CodeChef profile and prove problem volume under timed conditions."
        )
    elif coding >= 7 and has_leetcode:
        strengths.append(f"Coding Confidence Backed by Profile Link ({coding:.1f}/10)")
    elif coding < 7:
        priorities.append("Strengthen core DSA patterns (Sliding Window, Trees, Graphs, DP) toward >= 150 solved problems.")

    if not has_github:
        priorities.append("Missing GitHub Profile Link — Senior Hiring Managers audit live commits, tests, and README quality before interviews.")
    elif github_verified_score is not None and github_verified_score < 60:
        priorities.append(f"GitHub Audit Score ({github_verified_score:.0f}/100) indicates small/prototype repos — add tests, modular APIs, and CI/Docker.")

    # Missing Production Engineering Stack Check
    missing_core = []
    if not any("sql" in s or "postgres" in s or "mongo" in s or "dbms" in s for s in normalized_skills):
        missing_core.append("SQL / Query Optimization")
    if not any("docker" in s or "aws" in s or "kubernetes" in s or "cloud" in s for s in normalized_skills):
        missing_core.append("Docker & Cloud Deployment")
    if not any("system design" in s or "api" in s or "fastapi" in s or "spring" in s or "node" in s for s in normalized_skills):
        missing_core.append("Production Backend APIs / System Design")
    if missing_core:
        priorities.append(
            f"Missing High-Weight Production Skills for {target_role}: {', '.join(missing_core[:3])}."
        )

    if ats_score is not None and ats_score < 60:
        priorities.append(f"Latest ATS Resume Audit scored {ats_score:.0f}/100 — rewrite weak starter bullets with production metrics before applying.")
    elif ats_score is None:
        priorities.append("Upload and audit your PDF resume in Tab 5 (ATS Resume Studio) to verify keyword coverage & project rigor.")

    if not certs_list:
        priorities.append("Add at least 1 recognized cloud/backend certification (e.g., AWS Cloud Practitioner, Azure AZ-900, or NPTEL/Meta Backend).")

    if not strengths:
        strengths.append("Clean foundational baseline ready for evidence-backed project and coding upgrades")

    breakdown = {
        "academics": round(acad_score, 1),
        "skills": round(coding_score, 1),
        "projects": round(min(96.0, max(15.0, projects_count * 18.0 + (20.0 if has_github else 0.0))), 1),
        "internships": round(exp_score, 1),
        "coding": round(coding_score, 1),
        "coding_dsa": round(coding_score, 1),
        "communication": round(comm_score, 1),
        "experience": round(exp_score, 1),
        "eligibility": round(eligibility_score, 1),
    }

    return round(evidence_score, 1), breakdown, strengths[:5], priorities[:6]


def fallback_score(profile: StudentProfile) -> float:
    evidence_score, _, _, _ = _evaluate_senior_hiring_calibration(
        cgpa=profile.cgpa,
        backlogs=profile.backlogs,
        internships=profile.internships,
        communication=profile.communication,
        coding=profile.coding,
        projects_count=getattr(profile, "projects_count", 2),
        skills=getattr(profile, "skills", []),
        github_url=getattr(profile, "github_url", ""),
        leetcode_url=getattr(profile, "leetcode_url", ""),
        certifications=getattr(profile, "certifications", []),
    )
    return float(max(15.0, min(91.5, round(evidence_score, 1))))


def predict_placement(
    profile: Optional[Union[StudentProfile, Dict[str, Any]]] = None,
    cgpa: Optional[float] = None,
    coding: Optional[float] = None,
    communication: Optional[float] = None,
    internships: Optional[float] = None,
    backlogs: Optional[float] = None,
    **kwargs
) -> PredictionResult:
    extracted: Dict[str, Any] = {}
    if isinstance(profile, dict):
        extracted.update(profile)
    extracted.update(kwargs)

    if profile is None or not isinstance(profile, StudentProfile):
        p_cgpa = cgpa if cgpa is not None else extracted.get("cgpa", 7.5)
        p_coding = coding if coding is not None else extracted.get("coding", 7.0)
        p_comm = communication if communication is not None else extracted.get("communication", 7.0)
        p_intern = internships if internships is not None else extracted.get("internships", 1)
        p_back = backlogs if backlogs is not None else extracted.get("backlogs", extracted.get("active_backlogs", 0))
        p_skills = extracted.get("skills") or extracted.get("technical_skills") or []
        p_certs = extracted.get("certifications") or []
        p_proj = int(extracted.get("projects_count", extracted.get("projectsCount", 2)) or 0)
        p_gh = str(extracted.get("github_url", extracted.get("githubUrl", "")) or "")
        p_lc = str(extracted.get("leetcode_url", extracted.get("leetcodeUrl", "")) or "")
        p_role = str(extracted.get("target_role", extracted.get("targetRole", "Software Development Engineer (SDE)")) or "Software Development Engineer (SDE)")
        profile = StudentProfile(
            cgpa=float(p_cgpa),
            coding=float(p_coding),
            communication=float(p_comm),
            internships=float(p_intern),
            active_backlogs=float(p_back),
            backlogs=float(p_back),
            projects_count=p_proj,
            skills=list(p_skills) if isinstance(p_skills, list) else [],
            certifications=list(p_certs) if isinstance(p_certs, list) else [],
            github_url=p_gh,
            leetcode_url=p_lc,
            target_role=p_role,
        )

    has_github = bool((getattr(profile, "github_url", "") or "").strip())
    has_leetcode = bool((getattr(profile, "leetcode_url", "") or "").strip())
    ats_score = extracted.get("ats_score")
    gh_verified = extracted.get("github_verified_score")
    tenth_pct = extracted.get("tenth_percentage", getattr(profile, "tenth_percentage", None))
    twelfth_pct = extracted.get("twelfth_percentage", getattr(profile, "twelfth_percentage", None))

    # Calibrate raw Random Forest inputs so inflated/unverified sliders cannot spoof 94%+
    rf_intern = min(float(profile.internships), 3.0)
    if profile.internships >= 4 and not has_github:
        rf_intern = min(rf_intern, 2.0)
    rf_coding = float(profile.coding) if (has_leetcode or has_github) else min(float(profile.coding), 7.2)
    rf_comm = float(profile.communication) if (profile.internships >= 1 or has_github) else min(float(profile.communication), 7.5)

    evidence_score, breakdown, strengths, priorities = _evaluate_senior_hiring_calibration(
        cgpa=float(profile.cgpa),
        backlogs=float(profile.backlogs),
        internships=float(profile.internships),
        communication=float(profile.communication),
        coding=float(profile.coding),
        projects_count=int(getattr(profile, "projects_count", 2) or 0),
        skills=list(getattr(profile, "skills", []) or []),
        github_url=getattr(profile, "github_url", "") or "",
        leetcode_url=getattr(profile, "leetcode_url", "") or "",
        certifications=list(getattr(profile, "certifications", []) or []),
        ats_score=float(ats_score) if ats_score is not None else None,
        github_verified_score=float(gh_verified) if gh_verified is not None else None,
        tenth_percentage=float(tenth_pct) if tenth_pct is not None else None,
        twelfth_percentage=float(twelfth_pct) if twelfth_pct is not None else None,
        target_role=getattr(profile, "target_role", "Software Development Engineer (SDE)"),
    )

    is_estimated = False
    try:
        model, features = get_trained_model()
        input_df = pd.DataFrame(
            [[profile.cgpa, profile.backlogs, rf_intern, rf_comm, rf_coding]],
            columns=features
        )
        raw_rf_chance = model.predict_proba(input_df)[0][1] * 100.0
    except Exception as exc:
        print(f"[ML Engine] Prediction warning: {exc}, using calibrated fallback formula")
        raw_rf_chance = evidence_score
        is_estimated = True

    blended = (raw_rf_chance * 0.35) + (evidence_score * 0.65)
    # Apply strict Senior Hiring Manager caps for unverified claims & backlogs
    if profile.backlogs >= 2:
        blended = min(blended, 42.0)
    elif profile.backlogs >= 1:
        blended = min(blended, 54.0)
    if profile.internships >= 4 and not has_github:
        blended = min(blended, 64.0)
    elif not has_github and not has_leetcode:
        blended = min(blended, 74.0)

    chance = round(float(max(15.0, min(91.5, blended))), 1)

    # Determine classification label and tone
    if chance >= 76.0:
        label = "Strong Candidate Profile"
        tone = "strong"
    elif chance >= 58.0:
        label = "Developing Foundation (Proof Needed)" if (not has_github or not has_leetcode or profile.internships >= 4) else "Solid Foundation"
        tone = "steady"
    else:
        label = "Needs Focus & Acceleration"
        tone = "focus"

    return PredictionResult(
        chance=chance,
        label=label,
        tone=tone,
        strengths=strengths,
        priorities=priorities,
        breakdown=breakdown,
        is_estimated=is_estimated,
        data_source="Random Forest + Senior Hiring Manager Calibration (972 Records)"
        if not is_estimated
        else "Senior Hiring Manager Calibrated Model (Estimated)",
    )
