from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT_DIR / "sample-placement-2024-2026.csv"

_cached_df: Optional[pd.DataFrame] = None


def get_dataset() -> pd.DataFrame:
    global _cached_df
    if _cached_df is not None:
        return _cached_df

    if not DATA_FILE.exists():
        return pd.DataFrame()

    data = pd.read_csv(DATA_FILE)
    data["placed_label"] = data["placed"].map({1: "Placed", 0: "Not placed"})
    _cached_df = data
    return _cached_df


def filter_cohort_records(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
) -> pd.DataFrame:
    data = get_dataset()
    if data.empty:
        return data

    result = data.copy()
    if year is not None and year != 0 and "year" in result.columns:
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


def get_cohort_analytics(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
) -> Dict[str, Any]:
    full_data = get_dataset()
    filtered = filter_cohort_records(year, branch, gender, skill)

    total_filtered = len(filtered)
    if total_filtered == 0:
        return {
            "total_records": 0,
            "placed_count": 0,
            "unplaced_count": 0,
            "placement_rate": 0.0,
            "avg_cgpa": 0.0,
            "avg_coding_score": 0.0,
            "branch_distribution": [],
            "skill_distribution": [],
            "cgpa_bands": [],
            "available_years": sorted(full_data["year"].dropna().unique().astype(int).tolist(), reverse=True) if not full_data.empty else [2026, 2025, 2024],
            "available_branches": ["All"] + sorted(full_data["branch"].dropna().unique().tolist()) if not full_data.empty else ["All"],
            "available_skills": ["All", "AIML + Python"] + sorted(full_data["skillCategory"].dropna().unique().tolist()) if not full_data.empty else ["All"],
            "records": []
        }

    placed_count = int(filtered["placed"].sum())
    unplaced_count = total_filtered - placed_count
    placement_rate = round(float(filtered["placed"].mean() * 100.0), 1)
    avg_cgpa = round(float(filtered["cgpa"].mean()), 2)
    avg_coding = round(float(filtered["codingScore"].mean()), 2)

    # Branch distribution & placement rate
    branch_stats = []
    if "branch" in filtered.columns:
        for b_name, group in filtered.groupby("branch"):
            b_total = len(group)
            b_placed = int(group["placed"].sum())
            b_rate = round((b_placed / b_total) * 100.0, 1) if b_total > 0 else 0.0
            branch_stats.append({
                "branch": str(b_name),
                "total": b_total,
                "placed": b_placed,
                "placement_rate": b_rate,
                "avg_cgpa": round(float(group["cgpa"].mean()), 2)
            })
        branch_stats.sort(key=lambda x: x["placement_rate"], reverse=True)

    # Skill distribution & placement rate
    skill_stats = []
    if "skillCategory" in filtered.columns:
        for s_name, group in filtered.groupby("skillCategory"):
            s_total = len(group)
            s_placed = int(group["placed"].sum())
            s_rate = round((s_placed / s_total) * 100.0, 1) if s_total > 0 else 0.0
            skill_stats.append({
                "skill": str(s_name),
                "total": s_total,
                "placed": s_placed,
                "placement_rate": s_rate,
                "avg_coding": round(float(group["codingScore"].mean()), 2)
            })
        skill_stats.sort(key=lambda x: x["placement_rate"], reverse=True)

    # CGPA Bands
    cgpa_bands = [
        {"band": "9.0 - 10.0", "min": 9.0, "max": 10.1},
        {"band": "8.0 - 8.9", "min": 8.0, "max": 8.99},
        {"band": "7.0 - 7.9", "min": 7.0, "max": 7.99},
        {"band": "< 7.0", "min": 0.0, "max": 6.99},
    ]
    band_results = []
    for b in cgpa_bands:
        matched = filtered[(filtered["cgpa"] >= b["min"]) & (filtered["cgpa"] <= b["max"])]
        m_total = len(matched)
        m_placed = int(matched["placed"].sum())
        m_rate = round((m_placed / m_total) * 100.0, 1) if m_total > 0 else 0.0
        band_results.append({
            "band": b["band"],
            "total": m_total,
            "placed": m_placed,
            "placement_rate": m_rate
        })

    # Sample records (top 150 for fast JSON payload)
    records_sample = filtered[[
        "sourceId", "year", "branch", "gender", "skillCategory",
        "placed_label", "cgpa", "codingScore", "communicationScore", "internships"
    ]].head(150).to_dict(orient="records")

    return {
        "total_records": total_filtered,
        "placed_count": placed_count,
        "unplaced_count": unplaced_count,
        "placement_rate": placement_rate,
        "avg_cgpa": avg_cgpa,
        "avg_coding_score": avg_coding,
        "branch_distribution": branch_stats,
        "skill_distribution": skill_stats,
        "cgpa_bands": band_results,
        "available_years": sorted(full_data["year"].dropna().unique().astype(int).tolist(), reverse=True) if not full_data.empty else [2026, 2025, 2024],
        "available_branches": ["All"] + sorted(full_data["branch"].dropna().unique().tolist()) if not full_data.empty else ["All"],
        "available_skills": ["All", "AIML + Python"] + sorted(full_data["skillCategory"].dropna().unique().tolist()) if not full_data.empty else ["All"],
        "records": records_sample
    }
