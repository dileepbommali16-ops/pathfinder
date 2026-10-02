"""
Analytics Engine for Pathfinder 2.0
Delegates completely to the Single Data Service (/data/*) to guarantee consistency.
"""

from typing import Dict, Any, Optional
import pandas as pd
from backend.data_service import (
    get_placement_df,
    filter_records,
    get_cohort_analytics_data
)


def get_dataset() -> pd.DataFrame:
    """Returns the authoritative placement dataset from /data/."""
    return get_placement_df()


def filter_cohort_records(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
) -> pd.DataFrame:
    """Delegates filtering to data_service."""
    return filter_records(year=year, branch=branch, gender=gender, skill=skill)


def get_cohort_analytics(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
) -> Dict[str, Any]:
    """Delegates cohort analytics directly to data_service."""
    return get_cohort_analytics_data(year=year, branch=branch, gender=gender, skill=skill)
