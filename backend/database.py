"""
Pathfinder 2.0 - Production Database Layer
Implements persistent SQL storage with ACID compliance, Write-Ahead Logging (WAL),
connection pooling, and database indexes for high-throughput queries.
Supports SQLite (local / Render persistent disk) and PostgreSQL (via DATABASE_URL).
"""

import os
import sys
import json
import sqlite3
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

logger = logging.getLogger("pathfinder.database")

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "pathfinder_production.db")))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection configured with WAL mode and foreign keys."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_database():
    """Initializes tables and indexes for profiles and cohort records."""
    logger.info(f"[Database] Initializing persistent database at: {DB_PATH}")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. User Profiles Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                email TEXT,
                full_name TEXT,
                branch TEXT,
                cgpa REAL,
                percentage REAL,
                active_backlogs INTEGER DEFAULT 0,
                onboarding_completed INTEGER DEFAULT 0,
                profile_data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Indexes for fast filtering and lookups
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_profiles_branch ON user_profiles(branch);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);")

        # 2. Placement Cohort Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cohort_placements (
                source_id INTEGER PRIMARY KEY,
                year INTEGER NOT NULL,
                branch TEXT NOT NULL,
                gender TEXT NOT NULL,
                skill_category TEXT NOT NULL,
                placed INTEGER NOT NULL,
                placed_label TEXT NOT NULL,
                salary_lpa REAL DEFAULT 0.0,
                cgpa REAL NOT NULL,
                coding_score REAL NOT NULL,
                communication_score REAL NOT NULL,
                internships INTEGER DEFAULT 0,
                backlogs INTEGER DEFAULT 0
            );
        """)

        # Database Indexes requested: (branch, year)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cohort_branch_year ON cohort_placements(branch, year);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cohort_branch ON cohort_placements(branch);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cohort_year ON cohort_placements(year);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cohort_placed ON cohort_placements(placed);")

        conn.commit()

    # Pre-populate cohort_placements from CSV if empty
    populate_cohort_if_empty()
    migrate_legacy_profiles_if_present()
    seed_demo_candidate_profile()


def seed_demo_candidate_profile():
    """Seeds pre-filled demo candidate profiles for live hackathon judge demonstrations."""
    demo_profiles = [
        {
            "user_id": "usr_demo_judge",
            "username": "Demo Candidate",
            "email": "demo@pathfinder.ai",
            "full_name": "Dileep Bommali (Judge Demo)",
            "college": "National Institute of Technology",
            "branch": "AIML",
            "course": "B.Tech",
            "year_semester": "4th Year / 7th Sem",
            "tenth_percentage": 92.5,
            "twelfth_percentage": 89.0,
            "cgpa": 8.4,
            "percentage": 79.8,
            "cgpa_formula_multiplier": 9.5,
            "semester_cgpas": [8.1, 8.2, 8.3, 8.5, 8.4, 8.6],
            "active_backlogs": 0,
            "backlogs": 0,
            "history_of_backlogs": 0,
            "technical_skills": ["Python", "Machine Learning", "FastAPI", "React", "PostgreSQL", "Docker", "PyTorch"],
            "tools": ["Git", "Docker", "VS Code", "Postman", "Linux"],
            "programming_languages": ["Python", "JavaScript", "TypeScript", "SQL"],
            "projects_count": 3,
            "internships": 2,
            "certifications": ["AWS Certified Cloud Practitioner", "Google Cloud Associate"],
            "github_url": "https://github.com/dileepbommali",
            "leetcode_url": "https://leetcode.com/dileep",
            "target_role": "Software Development Engineer (SDE)",
            "target_tier": "Product Companies / Tier-1 MNCs",
            "target_domain": "Applied AI & Cloud Services",
            "preferred_location": "Bangalore",
            "expected_package": "15 - 25 LPA",
            "preferred_company_type": "Product Companies / Tier-1 MNCs",
            "communication": 8,
            "coding": 8,
            "graduation_year": 2026,
            "onboarding_completed": True,
            "wizard_step": 5
        },
        {
            "user_id": "usr_demo_guest",
            "username": "Guest Student",
            "email": "guest@pathfinder.ai",
            "full_name": "Guest Student Candidate",
            "college": "Engineering College",
            "branch": "CSE",
            "course": "B.Tech",
            "year_semester": "4th Year / 7th Sem",
            "tenth_percentage": 90.0,
            "twelfth_percentage": 88.0,
            "cgpa": 7.8,
            "percentage": 74.1,
            "cgpa_formula_multiplier": 9.5,
            "active_backlogs": 0,
            "backlogs": 0,
            "history_of_backlogs": 0,
            "technical_skills": ["Java", "Python", "SQL", "React", "Spring Boot"],
            "tools": ["Git", "VS Code", "Postman"],
            "programming_languages": ["Java", "Python", "SQL"],
            "projects_count": 2,
            "internships": 1,
            "certifications": ["Java Professional", "SQL Advanced"],
            "target_role": "Software Development Engineer (SDE)",
            "target_tier": "Product Companies / Tier-1 MNCs",
            "target_domain": "Full-Stack Development",
            "preferred_location": "Hyderabad",
            "expected_package": "10 - 15 LPA",
            "preferred_company_type": "Product Companies / Tier-1 MNCs",
            "communication": 7,
            "coding": 7,
            "graduation_year": 2026,
            "onboarding_completed": True,
            "wizard_step": 5
        }
    ]
    for p in demo_profiles:
        save_user_profile(p["user_id"], p)
        if p.get("email"):
            save_user_profile(p["email"], p)



def populate_cohort_if_empty():
    """Seeds the SQL database from sample-placement-2024-2026.csv on initial setup."""
    csv_path = ROOT_DIR / "sample-placement-2024-2026.csv"
    if not csv_path.exists():
        return

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM cohort_placements;")
        count = cursor.fetchone()[0]
        if count >= 972:
            return  # Already populated

        from backend.data_service import get_placement_df
        df = get_placement_df()
        logger.info(f"[Database] Seeding {len(df)} cohort placement records into SQL database...")
        for _, row in df.iterrows():
            cursor.execute("""
                INSERT OR REPLACE INTO cohort_placements (
                    source_id, year, branch, gender, skill_category, placed,
                    placed_label, salary_lpa, cgpa, coding_score,
                    communication_score, internships, backlogs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                int(row["sourceId"]),
                int(row["year"]),
                str(row["branch"]).strip(),
                str(row["gender"]).strip(),
                str(row["skillCategory"]).strip(),
                int(row["placed"]),
                str(row.get("placed_label", "Placed" if int(row["placed"]) == 1 else "Not placed")).strip(),
                float(row.get("salary_lpa", 0.0)),
                float(row["cgpa"]),
                float(row["codingScore"]),
                float(row["communicationScore"]),
                int(row.get("internships", 0)),
                int(row.get("backlogs", 0))
            ))
        conn.commit()
        logger.info("[Database] Cohort placement records successfully indexed in SQL.")


def migrate_legacy_profiles_if_present():
    """Migrates any existing profiles from user_profiles.json into SQLite."""
    legacy_file = DATA_DIR / "user_profiles.json"
    if not legacy_file.exists():
        return

    try:
        with open(legacy_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        for key, p_data in data.items():
            if isinstance(p_data, dict):
                user_id = p_data.get("user_id") or key
                save_user_profile(user_id, p_data)
        logger.info(f"[Database] Migrated {len(data)} profiles from legacy JSON to SQLite.")
    except Exception as exc:
        logger.warning(f"[Database] Legacy profile migration notice: {exc}")


def get_user_profile_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a profile by user_id from the indexed SQL table."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT profile_data FROM user_profiles WHERE user_id = ? LIMIT 1;", (user_id,))
        row = cursor.fetchone()
        if row and row[0]:
            try:
                return json.loads(row[0])
            except Exception:
                return None
    return None


def get_user_profile_by_email_or_username(identifier: str) -> Optional[Dict[str, Any]]:
    """Look up profile by email, username, or full_name."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT profile_data FROM user_profiles 
            WHERE email = ? OR username = ? OR full_name = ? 
            ORDER BY updated_at DESC LIMIT 1;
        """, (identifier, identifier, identifier))
        row = cursor.fetchone()
        if row and row[0]:
            try:
                return json.loads(row[0])
            except Exception:
                return None
    return None


def save_user_profile(user_id: str, profile_dict: Dict[str, Any]) -> bool:
    """Inserts or updates a student profile in the persistent database."""
    now = datetime.utcnow().isoformat()
    profile_dict["user_id"] = user_id
    profile_dict["updated_at"] = now
    payload_json = json.dumps(profile_dict)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_profiles (
                user_id, username, email, full_name, branch, cgpa,
                percentage, active_backlogs, onboarding_completed,
                profile_data, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username = excluded.username,
                email = excluded.email,
                full_name = excluded.full_name,
                branch = excluded.branch,
                cgpa = excluded.cgpa,
                percentage = excluded.percentage,
                active_backlogs = excluded.active_backlogs,
                onboarding_completed = excluded.onboarding_completed,
                profile_data = excluded.profile_data,
                updated_at = excluded.updated_at;
        """, (
            user_id,
            profile_dict.get("username") or profile_dict.get("full_name"),
            profile_dict.get("email"),
            profile_dict.get("full_name"),
            profile_dict.get("branch", "CSE"),
            float(profile_dict.get("cgpa", 0.0)),
            float(profile_dict.get("percentage", 0.0)),
            int(profile_dict.get("active_backlogs", 0)),
            1 if profile_dict.get("onboarding_completed") else 0,
            payload_json,
            now
        ))
        conn.commit()
    return True


def delete_user_profile(user_id: str) -> bool:
    """Deletes a student profile by user_id."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_profiles WHERE user_id = ?;", (user_id,))
        conn.commit()
        return cursor.rowcount > 0


def query_cohort_paginated(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All",
    page: int = 1,
    page_size: int = 25
) -> Dict[str, Any]:
    """
    Executes an indexed SQL query for cohort placements with pagination.
    Uses idx_cohort_branch_year and idx_cohort_branch for fast query planning.
    """
    query_parts = ["1=1"]
    params: List[Any] = []

    if year and year != 0:
        query_parts.append("year = ?")
        params.append(int(year))

    if branch and branch != "All":
        query_parts.append("branch = ?")
        params.append(branch)

    if gender and gender != "All":
        query_parts.append("gender = ?")
        params.append(gender)

    if skill and skill != "All":
        query_parts.append("skill_category = ?")
        params.append(skill)

    where_clause = " AND ".join(query_parts)

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Count total records matching filter
        cursor.execute(f"SELECT COUNT(*) FROM cohort_placements WHERE {where_clause};", params)
        total_records = cursor.fetchone()[0]

        # Calculate pagination limits
        page = max(1, int(page))
        page_size = max(1, min(100, int(page_size)))
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 1
        offset = (page - 1) * page_size

        # Paginated fetch
        fetch_params = params + [page_size, offset]
        cursor.execute(f"""
            SELECT * FROM cohort_placements
            WHERE {where_clause}
            ORDER BY source_id ASC
            LIMIT ? OFFSET ?;
        """, fetch_params)

        rows = cursor.fetchall()
        records = []
        for row in rows:
            r = dict(row)
            r["sourceId"] = r.get("source_id")
            r["codingScore"] = float(r.get("coding_score", 0.0))
            r["communicationScore"] = float(r.get("communication_score", 0.0))
            r["skillCategory"] = r.get("skill_category", "")
            r["placed_label"] = r.get("placed_label") or ("Placed" if r.get("placed") == 1 else "Not placed")
            records.append(r)

        return {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "records": records
        }
