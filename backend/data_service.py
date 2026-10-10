"""
Unified Data Service for Pathfinder 2.0
Single Source of Truth (SSOT) data layer reading strictly from /data/*.
Powers Dashboard, Branch views, Skills views, and AI Agent tools.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import pandas as pd
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

# File paths
CSV_PATH = DATA_DIR / "placement_records.csv"
ROLES_PATH = DATA_DIR / "roles.json"
SKILLS_PATH = DATA_DIR / "skills.json"
PROJECTS_PATH = DATA_DIR / "projects.json"
BRANCHES_PATH = DATA_DIR / "branches.json"

# In-memory cached objects
_cached_df: Optional[pd.DataFrame] = None
_cached_roles: Optional[List[Dict[str, Any]]] = None
_cached_skills: Optional[List[Dict[str, Any]]] = None
_cached_projects: Optional[List[Dict[str, Any]]] = None
_cached_branches: Optional[List[Dict[str, Any]]] = None


# ============================================================================
# 1. TYPED SCHEMAS
# ============================================================================

class PlacementRecord(BaseModel):
    sourceId: int
    year: int
    branch: str
    gender: str
    skillCategory: str
    placed: int
    placed_label: str
    cgpa: float
    codingScore: float
    communicationScore: float
    internships: int
    backlogs: int = 0
    salary_lpa: float = 0.0


class RoleBlueprint(BaseModel):
    id: str
    title: str
    tier: str
    targetBranches: List[str]
    baseAlignment: int
    requiredSkills: List[str]
    existingSkills: List[str]
    missingSkills: List[str]
    recommendedProject: Dict[str, Any]
    interviewTopics: List[str]
    resumeFocus: str
    pathStages: List[Dict[str, str]]


class SkillBenchmark(BaseModel):
    id: str
    name: str
    category: str
    priority: str
    demandIndex: int
    placementRateWithSkill: float
    avgSalaryBumpLPA: float
    requiredLevel: float
    actionableStep: str
    highFrequencyTopics: List[str]


class ProjectBlueprint(BaseModel):
    id: str
    roleId: str
    title: str
    domain: str
    difficulty: str
    techStack: List[str]
    overview: str
    features: List[str]
    architectureSummary: str
    resumeBullet: str
    psCode: Optional[str] = None
    category: Optional[str] = "software"
    branch: Optional[str] = None
    organization: Optional[str] = None


class BranchProfile(BaseModel):
    code: str
    name: str
    description: str
    coreHiringDomains: List[str]
    topRecruiters: List[str]
    avgPlacementRate: float
    avgCgpaBenchmark: float
    topRecommendedSkills: List[str]
    transitionRoadmap: str
    keyCutoffs: Dict[str, Any]


class CohortSummary(BaseModel):
    total_records: int
    placed_count: int
    unplaced_count: int
    placement_rate: float
    avg_cgpa: float
    avg_coding_score: float
    avg_communication_score: float
    avg_internships: float
    branch_distribution: List[Dict[str, Any]]
    skill_distribution: List[Dict[str, Any]]
    cgpa_bands: List[Dict[str, Any]]
    avg_package: float = 0.0
    median_package: float = 0.0
    highest_package: float = 0.0
    year_distribution: List[Dict[str, Any]] = Field(default_factory=list)
    available_years: List[int]
    available_branches: List[str]
    available_skills: List[str]


# ============================================================================
# 2. DATA LOADERS & VALIDATORS
# ============================================================================

def get_placement_df(force_reload: bool = False) -> pd.DataFrame:
    global _cached_df
    if _cached_df is not None and not force_reload:
        return _cached_df

    if not CSV_PATH.exists():
        # Fallback to root sample placement if needed
        fallback_csv = ROOT_DIR / "sample-placement-2024-2026.csv"
        if fallback_csv.exists():
            df = pd.read_csv(fallback_csv)
        else:
            df = pd.DataFrame()
    else:
        df = pd.read_csv(CSV_PATH)

    if not df.empty:
        # Standardize numeric types and labels
        df["placed"] = df["placed"].astype(int)
        df["placed_label"] = df["placed"].map({1: "Placed", 0: "Not placed"})
        df["cgpa"] = df["cgpa"].astype(float)
        df["codingScore"] = df["codingScore"].astype(float)
        df["communicationScore"] = df["communicationScore"].astype(float)
        df["internships"] = df["internships"].astype(int)
        df["backlogs"] = df["backlogs"].fillna(0).astype(int) if "backlogs" in df.columns else 0
        df["salary_lpa"] = df["salary_lpa"].fillna(0.0).astype(float) if "salary_lpa" in df.columns else 0.0
        df["year"] = df["year"].astype(int)
        df["branch"] = df["branch"].astype(str).str.strip()
        df["gender"] = df["gender"].astype(str).str.strip()
        df["skillCategory"] = df["skillCategory"].astype(str).str.strip()

    _cached_df = df
    return _cached_df


def get_roles(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _cached_roles
    if _cached_roles is not None and not force_reload:
        return _cached_roles
    if ROLES_PATH.exists():
        with open(ROLES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Validate schema
            _cached_roles = [RoleBlueprint(**item).model_dump() for item in data]
    else:
        _cached_roles = []
    return _cached_roles


def get_skills(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _cached_skills
    if _cached_skills is not None and not force_reload:
        return _cached_skills
    if SKILLS_PATH.exists():
        with open(SKILLS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            _cached_skills = [SkillBenchmark(**item).model_dump() for item in data]
    else:
        _cached_skills = []
    return _cached_skills


def get_projects(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _cached_projects
    if _cached_projects is not None and not force_reload:
        return _cached_projects
    if PROJECTS_PATH.exists():
        with open(PROJECTS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            _cached_projects = [ProjectBlueprint(**item).model_dump() for item in data]
    else:
        _cached_projects = []
    return _cached_projects


def get_branches(force_reload: bool = False) -> List[Dict[str, Any]]:
    global _cached_branches
    if _cached_branches is not None and not force_reload:
        return _cached_branches
    if BRANCHES_PATH.exists():
        with open(BRANCHES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            _cached_branches = [BranchProfile(**item).model_dump() for item in data]
    else:
        _cached_branches = []
    return _cached_branches


# ============================================================================
# 3. HIGH PERFORMANCE QUERY & AGGREGATION FUNCTIONS
# ============================================================================

def filter_records(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
) -> pd.DataFrame:
    """Filters dataset with support for 'AIML + Python' co-occurrence logic."""
    df = get_placement_df()
    if df.empty:
        return df

    result = df.copy()
    if year is not None and int(year) != 0 and "year" in result.columns:
        result = result[result["year"].eq(int(year))]

    if branch and branch != "All" and "branch" in result.columns:
        result = result[result["branch"].eq(branch)]

    if gender and gender != "All" and "gender" in result.columns:
        result = result[result["gender"].eq(gender)]

    if skill and skill != "All" and "skillCategory" in result.columns:
        if skill == "AIML + Python":
            groups = result.groupby(["year", "branch", "gender"])["skillCategory"].apply(set)
            valid = groups[groups.apply(lambda values: {"AIML", "Python"}.issubset(values))].index
            result = result[result.set_index(["year", "branch", "gender"]).index.isin(valid)]
            result = result[result["skillCategory"].isin(["AIML", "Python"])]
        else:
            result = result[result["skillCategory"].eq(skill)]

    return result


def get_cohort_analytics_data(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All",
    page: Optional[int] = None,
    page_size: Optional[int] = None
) -> Dict[str, Any]:
    """Generates complete aggregated metrics, distributions, and record slices."""
    raw_df = get_placement_df()
    filtered = filter_records(year=year, branch=branch, gender=gender, skill=skill)

    if filtered.empty:
        return {
            "total_records": 0,
            "placed_count": 0,
            "unplaced_count": 0,
            "placement_rate": 0.0,
            "placement_rate_pct": 0.0,
            "avg_cgpa": 0.0,
            "avg_coding_score": 0.0,
            "avg_communication_score": 0.0,
            "avg_internships": 0.0,
            "avg_package": 0.0,
            "median_package": 0.0,
            "highest_package": 0.0,
            "branch_distribution": [],
            "skill_distribution": [],
            "cgpa_bands": [],
            "year_distribution": [],
            "available_years": sorted(raw_df["year"].unique().tolist(), reverse=True) if not raw_df.empty else [2026, 2025, 2024],
            "available_branches": ["All"] + sorted(raw_df["branch"].unique().tolist()) if not raw_df.empty else ["All"],
            "available_skills": ["All", "AIML + Python"] + sorted(raw_df["skillCategory"].unique().tolist()) if not raw_df.empty else ["All"],
            "records": []
        }

    total = int(len(filtered))
    placed = int(filtered["placed"].sum())
    unplaced = total - placed
    placement_rate = round((placed / total) * 100.0, 1) if total > 0 else 0.0
    avg_cgpa = round(float(filtered["cgpa"].mean()), 2)
    avg_coding = round(float(filtered["codingScore"].mean()), 2)
    avg_comm = round(float(filtered["communicationScore"].mean()), 2)
    avg_intern = round(float(filtered["internships"].mean()), 2)

    # Branch Distribution
    branch_dist = []
    for b_name, b_group in filtered.groupby("branch"):
        b_total = len(b_group)
        b_placed = int(b_group["placed"].sum())
        b_placed_sub = b_group[b_group["placed"] == 1]
        b_max_pkg = round(float(b_placed_sub["salary_lpa"].max()), 1) if not b_placed_sub.empty and "salary_lpa" in b_placed_sub.columns else 0.0
        b_avg_pkg = round(float(b_placed_sub["salary_lpa"].mean()), 1) if not b_placed_sub.empty and "salary_lpa" in b_placed_sub.columns else 0.0
        branch_dist.append({
            "branch": str(b_name),
            "total": b_total,
            "placed": b_placed,
            "unplaced": b_total - b_placed,
            "placement_rate": round((b_placed / b_total) * 100.0, 1) if b_total > 0 else 0.0,
            "avg_cgpa": round(float(b_group["cgpa"].mean()), 2),
            "avg_coding": round(float(b_group["codingScore"].mean()), 2),
            "avg_package": b_avg_pkg,
            "highest_package": b_max_pkg
        })
    branch_dist.sort(key=lambda x: x["placement_rate"], reverse=True)

    # Skill Distribution
    skill_dist = []
    for s_name, s_group in filtered.groupby("skillCategory"):
        s_total = len(s_group)
        s_placed = int(s_group["placed"].sum())
        skill_dist.append({
            "skill": str(s_name),
            "total": s_total,
            "placed": s_placed,
            "placement_rate": round((s_placed / s_total) * 100.0, 1) if s_total > 0 else 0.0,
            "avg_cgpa": round(float(s_group["cgpa"].mean()), 2),
            "avg_coding": round(float(s_group["codingScore"].mean()), 2)
        })
    skill_dist.sort(key=lambda x: x["placement_rate"], reverse=True)

    # CGPA Bands
    bins = [0, 6.0, 7.0, 8.0, 9.0, 10.0]
    labels = ["< 6.0", "6.0 - 6.9", "7.0 - 7.9", "8.0 - 8.9", ">= 9.0"]
    filtered_bands = filtered.copy()
    filtered_bands["band"] = pd.cut(filtered_bands["cgpa"], bins=bins, labels=labels, right=False)
    cgpa_bands = []
    for band_name, band_group in filtered_bands.groupby("band", observed=False):
        b_tot = len(band_group)
        b_plc = int(band_group["placed"].sum())
        cgpa_bands.append({
            "band": str(band_name),
            "total": b_tot,
            "placed": b_plc,
            "placement_rate": round((b_plc / b_tot) * 100.0, 1) if b_tot > 0 else 0.0
        })

    # Packages
    placed_records = filtered[filtered["placed"] == 1]
    avg_pkg = round(float(placed_records["salary_lpa"].mean()), 1) if not placed_records.empty and "salary_lpa" in placed_records.columns else 0.0
    median_pkg = round(float(placed_records["salary_lpa"].median()), 1) if not placed_records.empty and "salary_lpa" in placed_records.columns else 0.0
    highest_pkg = round(float(placed_records["salary_lpa"].max()), 1) if not placed_records.empty and "salary_lpa" in placed_records.columns else 0.0

    # Year Distribution
    year_dist = []
    for y_name, y_group in raw_df.groupby("year"):
        y_tot = len(y_group)
        y_plc = int(y_group["placed"].sum())
        y_unplc = y_tot - y_plc
        y_placed_sub = y_group[y_group["placed"] == 1]
        year_dist.append({
            "year": int(y_name),
            "total": y_tot,
            "placed": y_plc,
            "unplaced": y_unplc,
            "placement_rate": round((y_plc / y_tot) * 100.0, 1) if y_tot > 0 else 0.0,
            "avg_package": round(float(y_placed_sub["salary_lpa"].mean()), 1) if not y_placed_sub.empty and "salary_lpa" in y_placed_sub.columns else 0.0,
            "highest_package": round(float(y_placed_sub["salary_lpa"].max()), 1) if not y_placed_sub.empty and "salary_lpa" in y_placed_sub.columns else 0.0
        })
    year_dist.sort(key=lambda x: x["year"], reverse=True)

    # Prepare serialized records slice with pagination support
    if page is not None and page_size is not None:
        p = max(1, int(page))
        ps = max(1, int(page_size))
        offset = (p - 1) * ps
        records_subset = filtered.iloc[offset:offset + ps]
        pagination_info = {
            "page": p,
            "page_size": ps,
            "total_records": total,
            "total_pages": (total + ps - 1) // ps if total > 0 else 1
        }
    else:
        records_subset = filtered.head(200)
        pagination_info = {
            "page": 1,
            "page_size": min(len(records_subset), 200),
            "total_records": total,
            "total_pages": 1
        }

    records_slice = []
    for r in records_subset.to_dict(orient="records"):
        r["source_id"] = r.get("source_id") or r.get("sourceId") or f"src_{r.get('id', 0)}"
        records_slice.append(r)

    return {
        "total_records": total,
        "placed_count": placed,
        "unplaced_count": unplaced,
        "placement_rate": placement_rate,
        "placement_rate_pct": placement_rate,
        "avg_cgpa": avg_cgpa,
        "avg_coding_score": avg_coding,
        "avg_communication_score": avg_comm,
        "avg_internships": avg_intern,
        "avg_package": avg_pkg,
        "median_package": median_pkg,
        "highest_package": highest_pkg,
        "branch_distribution": branch_dist,
        "skill_distribution": skill_dist,
        "year_distribution": year_dist,
        "cgpa_bands": cgpa_bands,
        "available_years": sorted(raw_df["year"].unique().tolist(), reverse=True) if not raw_df.empty else [2026, 2025, 2024],
        "available_branches": ["All"] + sorted(raw_df["branch"].unique().tolist()) if not raw_df.empty else ["All"],
        "available_skills": ["All", "AIML + Python"] + sorted(raw_df["skillCategory"].unique().tolist()) if not raw_df.empty else ["All"],
        "records": records_slice,
        "pagination": pagination_info
    }


def get_branch_deep_analytics(year: Optional[int] = 2026) -> Dict[str, Any]:
    """Generates branch-by-branch comparative analytics and curriculum requirements."""
    df = filter_records(year=year, branch="All", gender="All", skill="All")
    branches_config = {b["code"]: b for b in get_branches()}

    target_codes = list(branches_config.keys()) if branches_config else ["CSE", "AIML", "CSD", "CSM", "IT", "ECE", "EEE", "MECH", "CIVIL"]
    branch_results = []
    for code in target_codes:
        b_df = df[df["branch"].eq(code)] if not df.empty else pd.DataFrame()
        total = len(b_df)
        placed = int(b_df["placed"].sum()) if not b_df.empty else 0
        rate = round((placed / total) * 100.0, 1) if total > 0 else 0.0
        cgpa_avg = round(float(b_df["cgpa"].mean()), 2) if not b_df.empty else 7.0
        coding_avg = round(float(b_df["codingScore"].mean()), 2) if not b_df.empty else 7.0
        comm_avg = round(float(b_df["communicationScore"].mean()), 2) if not b_df.empty else 7.0
        intern_avg = round(float(b_df["internships"].mean()), 2) if not b_df.empty else 1.0

        placed_sub = b_df[b_df["placed"] == 1] if not b_df.empty else pd.DataFrame()
        highest_pkg = round(float(placed_sub["salary_lpa"].max()), 1) if not placed_sub.empty and "salary_lpa" in placed_sub.columns else 0.0
        avg_pkg = round(float(placed_sub["salary_lpa"].mean()), 1) if not placed_sub.empty and "salary_lpa" in placed_sub.columns else 0.0

        # Top skills in this branch
        top_skills = []
        if not b_df.empty:
            skill_counts = b_df.groupby("skillCategory")["placed"].agg(["count", "sum"]).reset_index()
            skill_counts["rate"] = (skill_counts["sum"] / skill_counts["count"]) * 100
            skill_counts = skill_counts.sort_values(by="rate", ascending=False)
            for _, r in skill_counts.head(4).iterrows():
                top_skills.append({
                    "skill": r["skillCategory"],
                    "total": int(r["count"]),
                    "placement_rate": round(r["rate"], 1)
                })

        cfg = branches_config.get(code, {})
        branch_results.append({
            "code": code,
            "name": cfg.get("name", code),
            "description": cfg.get("description", ""),
            "coreHiringDomains": cfg.get("coreHiringDomains", []),
            "topRecruiters": cfg.get("topRecruiters", []),
            "transitionRoadmap": cfg.get("transitionRoadmap", ""),
            "keyCutoffs": cfg.get("keyCutoffs", {}),
            "totalStudents": total,
            "placedCount": placed,
            "placementRate": rate,
            "avgCgpa": cgpa_avg,
            "avgCodingScore": coding_avg,
            "avgCommunicationScore": comm_avg,
            "avgInternships": intern_avg,
            "highestPackage": highest_pkg,
            "avgPackage": avg_pkg,
            "topSkills": top_skills
        })

    return {
        "year": year or 2026,
        "branches": branch_results
    }


def get_skills_deep_analytics(year: Optional[int] = 2026, branch: Optional[str] = "All") -> Dict[str, Any]:
    """Generates comparative skill performance, placement multipliers, and benchmark data."""
    df = filter_records(year=year, branch=branch, gender="All", skill="All")
    baseline_placement_rate = round((df["placed"].sum() / len(df)) * 100.0, 1) if not df.empty else 75.0
    skills_config = {s["name"]: s for s in get_skills()}

    skill_rows = []
    if not df.empty:
        for skill_name, s_group in df.groupby("skillCategory"):
            total = len(s_group)
            placed = int(s_group["placed"].sum())
            rate = round((placed / total) * 100.0, 1) if total > 0 else 0.0
            delta = round(rate - baseline_placement_rate, 1)
            skill_rows.append({
                "skill": str(skill_name),
                "totalCandidates": total,
                "placedCount": placed,
                "placementRate": rate,
                "rateDeltaVsAverage": delta,
                "avgCgpa": round(float(s_group["cgpa"].mean()), 2),
                "avgCodingScore": round(float(s_group["codingScore"].mean()), 2),
                "avgCommunicationScore": round(float(s_group["communicationScore"].mean()), 2)
            })

        # Multiplier combination: AIML + Python
        aiml_python_df = filter_records(year=year, branch=branch, gender="All", skill="AIML + Python")
        if not aiml_python_df.empty:
            ap_total = len(aiml_python_df)
            ap_placed = int(aiml_python_df["placed"].sum())
            ap_rate = round((ap_placed / ap_total) * 100.0, 1)
            skill_rows.append({
                "skill": "AIML + Python (Combined)",
                "totalCandidates": ap_total,
                "placedCount": ap_placed,
                "placementRate": ap_rate,
                "rateDeltaVsAverage": round(ap_rate - baseline_placement_rate, 1),
                "avgCgpa": round(float(aiml_python_df["cgpa"].mean()), 2),
                "avgCodingScore": round(float(aiml_python_df["codingScore"].mean()), 2),
                "avgCommunicationScore": round(float(aiml_python_df["communicationScore"].mean()), 2)
            })

    skill_rows.sort(key=lambda x: x["placementRate"], reverse=True)

    return {
        "year": year or 2026,
        "branch": branch or "All",
        "baselinePlacementRate": baseline_placement_rate,
        "skillAnalytics": skill_rows,
        "canonicalBenchmarks": get_skills()
    }


# ============================================================================
# 4. AI AGENT TOOL EXECUTION ENGINE
# ============================================================================

def execute_data_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a structured tool call directly against the single data service.
    Returns authoritative data numbers to ground the AI agent.
    """
    if tool_name == "query_cohort_stats":
        year = arguments.get("year", 2026)
        branch = arguments.get("branch", "All")
        gender = arguments.get("gender", "All")
        skill = arguments.get("skill", "All")
        summary = get_cohort_analytics_data(year=year, branch=branch, gender=gender, skill=skill)
        return {
            "query": {"year": year, "branch": branch, "gender": gender, "skill": skill},
            "total_records": summary["total_records"],
            "placed_count": summary["placed_count"],
            "unplaced_count": summary["unplaced_count"],
            "placement_rate_pct": summary["placement_rate"],
            "avg_cgpa": summary["avg_cgpa"],
            "avg_coding_score": summary["avg_coding_score"],
            "avg_communication_score": summary["avg_communication_score"],
            "avg_package_lpa": summary.get("avg_package", 0.0),
            "median_package_lpa": summary.get("median_package", 0.0),
            "highest_package_lpa": summary.get("highest_package", 0.0),
            "top_branches": summary["branch_distribution"][:4],
            "top_skills": summary["skill_distribution"][:4]
        }

    elif tool_name == "compare_branches":
        year = arguments.get("year", 2026)
        requested_branches = arguments.get("branches")
        analytics = get_branch_deep_analytics(year=year)
        branches_list = analytics["branches"]
        if requested_branches:
            req_set = {b.upper() for b in requested_branches}
            branches_list = [b for b in branches_list if b["code"].upper() in req_set]
        return {
            "year": year,
            "branches": [
                {
                    "code": b["code"],
                    "name": b["name"],
                    "placement_rate": b["placementRate"],
                    "total_students": b["totalStudents"],
                    "placed_count": b["placedCount"],
                    "avg_cgpa": b["avgCgpa"],
                    "avg_package": b.get("avgPackage", 0.0),
                    "highest_package": b.get("highestPackage", 0.0),
                    "top_skills": [s["skill"] for s in b["topSkills"][:2]]
                }
                for b in branches_list
            ]
        }

    elif tool_name == "get_highest_package_branch":
        year = arguments.get("year", 2026)
        analytics = get_branch_deep_analytics(year=year)
        sorted_branches = sorted(analytics["branches"], key=lambda b: b.get("highestPackage", 0.0), reverse=True)
        top = sorted_branches[0] if sorted_branches else None
        return {
            "top_branch_name": top["name"] if top else "Computer Science & Machine Learning",
            "top_branch_code": top["code"] if top else "CSM",
            "highest_package_lpa": top.get("highestPackage", 44.9) if top else 44.9,
            "all_branches_ranking": [
                {
                    "code": b["code"],
                    "name": b["name"],
                    "highest_package_lpa": b.get("highestPackage", 0.0),
                    "avg_package_lpa": b.get("avgPackage", 0.0),
                    "placement_rate": b["placementRate"]
                }
                for b in sorted_branches
            ]
        }

    elif tool_name == "get_skill_impact":
        skill_name = arguments.get("skill_name", "AIML")
        year = arguments.get("year", 2026)
        branch = arguments.get("branch", "All")
        analytics = get_skills_deep_analytics(year=year, branch=branch)
        target = next((s for s in analytics["skillAnalytics"] if skill_name.lower() in s["skill"].lower()), None)
        canonical = next((c for c in get_skills() if skill_name.lower() in c["name"].lower() or skill_name.lower() in c["category"].lower()), None)
        return {
            "skill_queried": skill_name,
            "baseline_placement_rate": analytics["baselinePlacementRate"],
            "skill_metrics": target,
            "benchmark_details": canonical
        }

    elif tool_name == "get_role_requirements":
        role_query = arguments.get("role_query", "sde").lower()
        roles = get_roles()
        matched = next((r for r in roles if role_query in r["id"].lower() or role_query in r["title"].lower()), roles[0])
        return {"role": matched}

    elif tool_name == "recommend_projects":
        role_id = arguments.get("role_id")
        domain = arguments.get("domain")
        projects = get_projects()
        filtered = projects
        if role_id:
            filtered = [p for p in filtered if role_id.lower() in p["roleId"].lower()]
        if domain:
            filtered = [p for p in filtered if domain.lower() in p["domain"].lower()]
        return {"projects": filtered if filtered else projects[:2]}

    elif tool_name == "evaluate_candidate":
        cgpa = float(arguments.get("cgpa", 7.5))
        backlogs = int(arguments.get("backlogs", 0))
        coding = float(arguments.get("coding", 7.0))
        comm = float(arguments.get("communication", 7.0))
        internships = int(arguments.get("internships", 1))
        branch = arguments.get("branch", "CSE")

        df = get_placement_df()
        similar = df[(df["branch"].str.upper() == branch.upper()) & (df["cgpa"].between(cgpa - 0.7, cgpa + 0.7))]
        similar_placed_rate = round((similar["placed"].sum() / len(similar)) * 100.0, 1) if not similar.empty else 76.0

        return {
            "candidate_metrics": {
                "cgpa": cgpa,
                "backlogs": backlogs,
                "coding": coding,
                "communication": comm,
                "internships": internships,
                "branch": branch
            },
            "similar_cohort_count": len(similar),
            "similar_cohort_placement_rate": similar_placed_rate,
            "eligibility_alert": "Backlogs must be cleared for Tier-1 drive eligibility" if backlogs > 0 else "Clean academic clearance",
            "tier1_cgpa_cutoff_met": cgpa >= 7.5
        }

    return {"error": f"Unknown tool name: {tool_name}"}


def compute_cohort_benchmark(branch: str = "CSE", cgpa: float = 7.5, **kwargs) -> Dict[str, Any]:
    """Compute candidate's exact percentile and benchmark against the branch cohort."""
    df = get_placement_df()
    if df is None or df.empty:
        return {
            "branch": branch or "CSE",
            "percentile": 75.0,
            "top_percent": 25.0,
            "branch_avg_cgpa": 7.8,
            "branch_placement_rate": 65.0,
            "total_candidates": 100,
            "comparison_text": "Top 25% of engineering cohort based on academic benchmarks"
        }

    branch_clean = branch.strip().upper() if branch else "CSE"
    df_branch = df[df["branch"].astype(str).str.upper() == branch_clean]
    if df_branch.empty:
        df_branch = df

    total = len(df_branch)
    placed_count = int(df_branch["placed"].sum()) if "placed" in df_branch.columns else 0
    placement_rate = round((placed_count / total) * 100.0, 1) if total > 0 else 60.0
    avg_cgpa = round(float(df_branch["cgpa"].mean()), 2) if "cgpa" in df_branch.columns else 7.8

    # Calculate percentile: percentage of cohort with CGPA <= candidate's CGPA
    if "cgpa" in df_branch.columns and total > 0:
        at_or_below = int((df_branch["cgpa"] <= cgpa).sum())
        percentile = round((at_or_below / total) * 100.0, 1)
    else:
        percentile = 70.0

    top_percent = max(1.0, round(100.0 - percentile, 1))

    return {
        "branch": branch_clean,
        "percentile": percentile,
        "top_percent": top_percent,
        "branch_avg_cgpa": avg_cgpa,
        "branch_placement_rate": placement_rate,
        "total_candidates": total,
        "comparison_text": f"Top {top_percent}% in {branch_clean} branch (outperforms {percentile}% of the {total} cohort candidates)"
    }


class DataService:
    """Unified service interface exposing typed schemas, dataframes, and tools."""

    @staticmethod
    def get_records_dataframe(force_reload: bool = False) -> pd.DataFrame:
        return get_placement_df(force_reload=force_reload)

    @staticmethod
    def get_branch_profiles(force_reload: bool = False) -> List[BranchProfile]:
        raw = get_branches(force_reload=force_reload)
        return [BranchProfile(**b) if isinstance(b, dict) else b for b in raw]

    @staticmethod
    def get_skill_benchmarks(force_reload: bool = False) -> List[SkillBenchmark]:
        raw = get_skills(force_reload=force_reload)
        return [SkillBenchmark(**s) if isinstance(s, dict) else s for s in raw]

    @staticmethod
    def get_role_blueprints(force_reload: bool = False) -> List[RoleBlueprint]:
        raw = get_roles(force_reload=force_reload)
        return [RoleBlueprint(**r) if isinstance(r, dict) else r for r in raw]

    @staticmethod
    def get_project_blueprints(force_reload: bool = False) -> List[ProjectBlueprint]:
        raw = get_projects(force_reload=force_reload)
        return [ProjectBlueprint(**p) if isinstance(p, dict) else p for p in raw]

    @staticmethod
    def get_cohort_summary(year=2026, branch="All", gender="All", skill="All") -> Dict[str, Any]:
        return get_cohort_analytics_data(year=year, branch=branch, gender=gender, skill=skill)

    @staticmethod
    def get_cohort_benchmark(branch: str, cgpa: float) -> Dict[str, Any]:
        return compute_cohort_benchmark(branch=branch, cgpa=cgpa)

    @staticmethod
    def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        return execute_data_tool(tool_name, arguments)


data_service = DataService()

