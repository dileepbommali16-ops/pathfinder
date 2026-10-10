"""
Databases & Database Performance: Cohort Repository
Provides optimized SQL data access for cohort placements, benchmarking,
and analytical aggregation with pagination and composite index support.
"""

import time
from typing import Dict, Any, List, Optional
from backend.database import get_db_connection
from backend.logging_config import logger


class CohortRepository:
    """Repository handling cohort placement datasets and aggregates."""

    @staticmethod
    def get_paginated(
        year: Optional[int] = None,
        branch: Optional[str] = None,
        gender: Optional[str] = None,
        skill_category: Optional[str] = None,
        placed_only: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Queries cohort records with dynamic filters and pagination."""
        start = time.perf_counter()
        query = "SELECT * FROM cohort_placements WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM cohort_placements WHERE 1=1"
        params: List[Any] = []

        if year and year != 0:
            query += " AND year = ?"
            count_query += " AND year = ?"
            params.append(year)

        if branch and branch.lower() != "all":
            query += " AND branch = ?"
            count_query += " AND branch = ?"
            params.append(branch)

        if gender and gender.lower() != "all":
            query += " AND gender = ?"
            count_query += " AND gender = ?"
            params.append(gender)

        if skill_category and skill_category.lower() != "all":
            query += " AND skill_category = ?"
            count_query += " AND skill_category = ?"
            params.append(skill_category)

        if placed_only is not None:
            query += " AND placed = ?"
            count_query += " AND placed = ?"
            params.append(1 if placed_only else 0)

        # Count total matches
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(count_query, params)
            total_records = cursor.fetchone()["total"]

            # Query page
            query += " ORDER BY source_id ASC LIMIT ? OFFSET ?;"
            page_params = params + [limit, offset]
            cursor.execute(query, page_params)
            rows = cursor.fetchall()

        records = [dict(row) for row in rows]
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] CohortRepository.get_paginated took {elapsed_ms:.2f}ms for {len(records)} items")

        return {
            "total": total_records,
            "limit": limit,
            "offset": offset,
            "count": len(records),
            "records": records
        }

    @staticmethod
    def get_aggregate_stats(year: Optional[int] = None, branch: Optional[str] = None) -> Dict[str, Any]:
        """Calculates cohort statistics directly via SQL aggregations."""
        start = time.perf_counter()
        query = """
            SELECT 
                COUNT(*) as total_students,
                SUM(CASE WHEN placed = 1 THEN 1 ELSE 0 END) as placed_count,
                AVG(cgpa) as avg_cgpa,
                AVG(salary_lpa) as avg_salary_all,
                AVG(CASE WHEN placed = 1 THEN salary_lpa ELSE NULL END) as avg_placed_salary,
                MAX(salary_lpa) as max_salary
            FROM cohort_placements
            WHERE 1=1
        """
        params = []
        if year and year != 0:
            query += " AND year = ?"
            params.append(year)
        if branch and branch.lower() != "all":
            query += " AND branch = ?"
            params.append(branch)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            row = cursor.fetchone()

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if elapsed_ms > 50.0:
            logger.warning(f"[SLOW QUERY] CohortRepository.get_aggregate_stats took {elapsed_ms:.2f}ms")

        total = row["total_students"] or 0
        placed = row["placed_count"] or 0
        placement_rate = (placed / total * 100.0) if total > 0 else 0.0

        return {
            "total_students": total,
            "placed_count": placed,
            "placement_rate_pct": round(placement_rate, 2),
            "avg_cgpa": round(row["avg_cgpa"] or 0.0, 2),
            "avg_salary_lpa": round(row["avg_placed_salary"] or 0.0, 2),
            "highest_package_lpa": round(row["max_salary"] or 0.0, 2),
        }
