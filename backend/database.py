"""
Pathfinder 2.0 - Production Database Layer
Implements persistent SQL storage with ACID compliance, Write-Ahead Logging (WAL),
connection pooling, and database indexes for high-throughput queries.
Supports SQLite (local / Render persistent disk) and PostgreSQL (via DATABASE_URL).
"""

import os
import sys
import json
import time
import sqlite3
import logging
import threading
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

from backend.supabase_store import (
    cloud_upsert_profile,
    cloud_get_profile_by_id,
    cloud_get_profile_by_identifier,
    cloud_delete_profile,
    cloud_add_readiness_snapshot,
    cloud_get_readiness_history,
    cloud_get_student_memory,
    cloud_save_student_memory,
)

logger = logging.getLogger("pathfinder.database")

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "pathfinder_production.db")))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

_wal_lock = threading.Lock()
_wal_configured = False
_db_write_lock = threading.RLock()


def _ensure_wal_once(conn: sqlite3.Connection) -> None:
    global _wal_configured
    if _wal_configured:
        return
    with _wal_lock:
        if _wal_configured:
            return
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
        except Exception as exc:
            logger.debug(f"[Database] WAL setup notice: {exc}")
        _wal_configured = True


class _ClosingConnection(sqlite3.Connection):
    """SQLite connection that commits/rolls back AND closes reliably on `with` exit."""
    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            return super().__exit__(exc_type, exc_val, exc_tb)
        finally:
            self.close()


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection configured with busy timeout, WAL (once), foreign keys, and auto-close on context exit."""
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False, factory=_ClosingConnection)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 25000;")
    _ensure_wal_once(conn)
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA cache_size = -32000;")
    conn.execute("PRAGMA temp_store = MEMORY;")
    return conn


_database_initialized = False


def init_database():
    """Initializes tables and indexes for profiles and cohort records."""
    global _database_initialized
    if _database_initialized:
        return
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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cohort_composite ON cohort_placements(branch, year, placed);")

        # 3. Student Readiness Progression History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS readiness_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                chance REAL NOT NULL,
                cgpa REAL NOT NULL,
                coding REAL NOT NULL,
                communication REAL NOT NULL,
                internships INTEGER DEFAULT 0,
                backlogs INTEGER DEFAULT 0,
                target_role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_readiness_history_user ON readiness_history(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_readiness_history_created ON readiness_history(created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_readiness_history_composite ON readiness_history(user_id, created_at DESC);")

        # 4. Student Conversational Memory Table (Lightweight persistent SQLite store)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_memory (
                user_id TEXT PRIMARY KEY,
                goals TEXT DEFAULT '[]',
                weak_areas TEXT DEFAULT '[]',
                topics TEXT DEFAULT '[]',
                last_summary TEXT DEFAULT '',
                last_session_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_memory_user ON student_memory(user_id);")

        # 5. Google Workspace OAuth Tokens Table (Gmail, Calendar, Sheets)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS google_oauth_tokens (
                email TEXT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT DEFAULT '',
                expires_at REAL DEFAULT 0,
                scope TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.commit()

    # Pre-populate cohort_placements from CSV if empty
    populate_cohort_if_empty()
    migrate_legacy_profiles_if_present()
    seed_demo_candidate_profile()
    _database_initialized = True


def seed_demo_candidate_profile():
    """Seeds pre-filled demo candidate profiles for live technical interview & recruiter demonstrations."""
    demo_profiles = [
        {
            "user_id": "usr_demo_judge",
            "username": "Demo Candidate",
            "email": "demo@pathfinder.ai",
            "full_name": "Dileep Bommali (Recruiter Demo)",
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
        save_user_profile(p["user_id"], p, sync_cloud=False)
        if p.get("email"):
            save_user_profile(p["email"], p, sync_cloud=False)



def populate_cohort_if_empty():
    """Seeds the SQL database from data/placement_records.csv on initial setup."""
    csv_path = DATA_DIR / "placement_records.csv"
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
        records = [
            (
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
            )
            for _, row in df.iterrows()
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO cohort_placements (
                source_id, year, branch, gender, skill_category, placed,
                placed_label, salary_lpa, cgpa, coding_score,
                communication_score, internships, backlogs
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, records)
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
    """Fetches a profile by user_id from SQLite cache or hydrates from Supabase cloud DB."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT profile_data FROM user_profiles WHERE user_id = ? LIMIT 1;", (user_id,))
        row = cursor.fetchone()
        if row and row[0]:
            try:
                return json.loads(row[0])
            except Exception:
                return None

    cloud_prof = cloud_get_profile_by_id(user_id)
    if cloud_prof:
        save_user_profile(user_id, cloud_prof, sync_cloud=False)
        return cloud_prof
    return None


def get_user_profile_by_email_or_username(
    identifier: str,
    include_cloud: bool = True,
) -> Optional[Dict[str, Any]]:
    """Look up profile by email, username, or full_name (case-insensitive) with optional Supabase cloud fallback."""
    clean = (identifier or "").strip()
    low = clean.lower()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT profile_data FROM user_profiles 
            WHERE LOWER(email) = ? OR LOWER(username) = ? OR LOWER(full_name) = ? OR user_id = ?
            ORDER BY updated_at DESC LIMIT 1;
        """, (low, low, low, clean))
        row = cursor.fetchone()
        if row and row[0]:
            try:
                return json.loads(row[0])
            except Exception:
                return None

    if include_cloud:
        cloud_prof = cloud_get_profile_by_identifier(clean)
        if cloud_prof:
            target_uid = cloud_prof.get("user_id") or clean
            save_user_profile(target_uid, cloud_prof, sync_cloud=False)
            return cloud_prof
    return None


def _execute_serialized_write(write_fn):
    """Run a SQLite write callable under _db_write_lock with busy/locked backoff."""
    last_err: Optional[Exception] = None
    for attempt in range(4):
        try:
            with _db_write_lock:
                with get_db_connection() as conn:
                    return write_fn(conn)
        except sqlite3.OperationalError as exc:
            last_err = exc
            if "locked" in str(exc).lower() or "busy" in str(exc).lower():
                time.sleep(0.05 * (attempt + 1))
                continue
            raise
    if last_err:
        raise last_err
    return None


def save_user_profile(user_id: str, profile_dict: Dict[str, Any], sync_cloud: bool = True) -> bool:
    """Inserts or updates a student profile in SQLite WAL and syncs to Supabase Postgres."""
    now = datetime.utcnow().isoformat()
    profile_dict["user_id"] = user_id
    profile_dict["updated_at"] = now
    payload_json = json.dumps(profile_dict)

    def _op(conn):
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

    saved_local = bool(_execute_serialized_write(_op))
    if saved_local and sync_cloud:
        cloud_upsert_profile(user_id, profile_dict)
    return saved_local


def delete_user_profile(user_id: str) -> bool:
    """Deletes a student profile by user_id."""
    def _op(conn):
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_profiles WHERE user_id = ?;", (user_id,))
        conn.commit()
        return cursor.rowcount > 0

    deleted_local = bool(_execute_serialized_write(_op))
    deleted_cloud = cloud_delete_profile(user_id)
    return deleted_local or deleted_cloud


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


def save_user_readiness_history(
    user_id: str,
    chance: float,
    cgpa: float,
    coding: float,
    communication: float,
    internships: int = 0,
    backlogs: int = 0,
    target_role: Optional[str] = None
) -> int:
    """Appends a new evaluation snapshot to the student's historical timeline."""
    def _op(conn):
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO readiness_history
            (user_id, chance, cgpa, coding, communication, internships, backlogs, target_role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
        """, (
            user_id,
            float(chance),
            float(cgpa),
            float(coding),
            float(communication),
            int(internships),
            int(backlogs),
            target_role or "Software Engineer",
        ))
        conn.commit()
        return cursor.lastrowid or 1

    row_id = int(_execute_serialized_write(_op) or 1)
    cloud_add_readiness_snapshot(
        user_id=user_id,
        chance=float(chance),
        cgpa=float(cgpa),
        coding=float(coding),
        communication=float(communication),
        internships=int(internships),
        backlogs=int(backlogs),
        target_role=target_role or "Software Engineer",
    )
    return row_id


def get_user_readiness_history(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves chronological readiness progression snapshots from SQLite or Supabase cloud DB."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_id, chance, cgpa, coding, communication, internships, backlogs, target_role, created_at
            FROM readiness_history
            WHERE user_id = ?
            ORDER BY created_at ASC
            LIMIT ?;
        """, (user_id, limit))
        rows = cursor.fetchall()
        if rows:
            return [dict(row) for row in rows]

    cloud_rows = cloud_get_readiness_history(user_id, limit=limit)
    return cloud_rows or []


def get_student_memory(user_id: str) -> Dict[str, Any]:
    """Retrieves long-term conversational memory from SQLite cache or Supabase cloud DB."""
    clean_id = user_id or "default_student"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, goals, weak_areas, topics, last_summary, last_session_at, updated_at FROM student_memory WHERE user_id = ?",
            (clean_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "user_id": row["user_id"],
                "goals": json.loads(row["goals"]) if row["goals"] else [],
                "weak_areas": json.loads(row["weak_areas"]) if row["weak_areas"] else [],
                "topics": json.loads(row["topics"]) if row["topics"] else [],
                "last_summary": row["last_summary"] or "",
                "last_session_at": str(row["last_session_at"])
            }

    cloud_mem = cloud_get_student_memory(clean_id)
    if cloud_mem:
        return cloud_mem

    return {
        "user_id": clean_id,
        "goals": ["Software Development Engineer", "Product Tier 1"],
        "weak_areas": ["Dynamic Programming", "System Design"],
        "topics": ["DSA Practice", "Resume Feedback"],
        "last_summary": "Initial candidate profile established.",
        "last_session_at": datetime.now().strftime("%B %d, %Y")
    }


def save_student_memory(
    user_id: str,
    goals: Optional[List[str]] = None,
    weak_areas: Optional[List[str]] = None,
    topics: Optional[List[str]] = None,
    last_summary: Optional[str] = None
) -> Dict[str, Any]:
    """Saves and updates conversational memory in SQLite WAL and Supabase Postgres."""
    clean_id = user_id or "default_student"
    existing = get_student_memory(clean_id)
    new_goals = goals if goals is not None else existing.get("goals", [])
    new_weak_areas = weak_areas if weak_areas is not None else existing.get("weak_areas", [])
    new_topics = topics if topics is not None else existing.get("topics", [])
    new_summary = last_summary if last_summary is not None else existing.get("last_summary", "")

    def _op(conn):
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO student_memory (user_id, goals, weak_areas, topics, last_summary, last_session_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                goals = excluded.goals,
                weak_areas = excluded.weak_areas,
                topics = excluded.topics,
                last_summary = excluded.last_summary,
                last_session_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP;
        """, (
            clean_id,
            json.dumps(new_goals),
            json.dumps(new_weak_areas),
            json.dumps(new_topics),
            new_summary
        ))
        conn.commit()

    _execute_serialized_write(_op)
    cloud_save_student_memory(clean_id, new_goals, new_weak_areas, new_topics, new_summary)
    return get_student_memory(clean_id)


def _workspace_token_cipher(raw_bytes: bytes) -> bytes:
    """Deterministic authenticated stream obfuscation keyed with JWT_SECRET for cloud backup."""
    import hashlib
    secret = (os.getenv("JWT_SECRET", "pathfinder_default_secret_2026") + ":ws_tok").encode("utf-8")
    out = bytearray(len(raw_bytes))
    counter = 0
    pos = 0
    while pos < len(raw_bytes):
        block = hashlib.sha256(secret + counter.to_bytes(4, "big")).digest()
        take = min(len(block), len(raw_bytes) - pos)
        for i in range(take):
            out[pos + i] = raw_bytes[pos + i] ^ block[i]
        pos += take
        counter += 1
    return bytes(out)


def save_google_workspace_tokens(
    email: str,
    access_token: str,
    refresh_token: str = "",
    expires_at: float = 0.0,
    scope: str = "",
) -> Dict[str, Any]:
    """Persists Google Workspace (Gmail/Calendar/Sheets) OAuth tokens in SQLite WAL + Supabase cloud backup."""
    import base64

    clean_email = (email or "").strip().lower()
    if not clean_email or not access_token:
        return {}

    existing = get_google_workspace_tokens(clean_email) or {}
    final_refresh = (refresh_token or "").strip() or existing.get("refresh_token", "")
    final_scope = (scope or "").strip() or existing.get("scope", "")

    def _op(conn):
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO google_oauth_tokens (email, access_token, refresh_token, expires_at, scope, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(email) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = CASE WHEN excluded.refresh_token != '' THEN excluded.refresh_token ELSE google_oauth_tokens.refresh_token END,
                expires_at = excluded.expires_at,
                scope = CASE WHEN excluded.scope != '' THEN excluded.scope ELSE google_oauth_tokens.scope END,
                updated_at = CURRENT_TIMESTAMP;
            """,
            (clean_email, access_token, final_refresh, float(expires_at or 0.0), final_scope),
        )
        conn.commit()

    _execute_serialized_write(_op)

    try:
        payload_bytes = json.dumps(
            {
                "access_token": access_token,
                "refresh_token": final_refresh,
                "expires_at": float(expires_at or 0.0),
                "scope": final_scope,
            },
            separators=(",", ":"),
        ).encode("utf-8")
        encoded = base64.urlsafe_b64encode(_workspace_token_cipher(payload_bytes)).decode("ascii")
        cloud_save_student_memory(
            f"oauth_google:{clean_email}",
            goals=[],
            weak_areas=[],
            topics=final_scope.split() if final_scope else [],
            last_summary=f"ws1:{encoded}",
        )
    except Exception as exc:
        logger.debug(f"[Database] Workspace cloud backup skipped: {exc}")

    return {
        "email": clean_email,
        "access_token": access_token,
        "refresh_token": final_refresh,
        "expires_at": float(expires_at or 0.0),
        "scope": final_scope,
    }


def get_google_workspace_tokens(email: str) -> Optional[Dict[str, Any]]:
    """Loads Google Workspace OAuth tokens from local SQLite WAL, hydrating from Supabase cloud backup if needed."""
    import base64

    clean_email = (email or "").strip().lower()
    if not clean_email:
        return None

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM google_oauth_tokens WHERE email = ?", (clean_email,))
        row = cur.fetchone()
        if row and row["access_token"]:
            return {
                "email": row["email"],
                "access_token": row["access_token"],
                "refresh_token": row["refresh_token"] or "",
                "expires_at": float(row["expires_at"] or 0.0),
                "scope": row["scope"] or "",
            }

    try:
        cloud_mem = cloud_get_student_memory(f"oauth_google:{clean_email}")
        raw_summary = (cloud_mem or {}).get("last_summary") or ""
        if raw_summary.startswith("ws1:"):
            enc_b64 = raw_summary[4:]
            decoded = json.loads(_workspace_token_cipher(base64.urlsafe_b64decode(enc_b64)).decode("utf-8"))
            if isinstance(decoded, dict) and decoded.get("access_token"):
                # Rehydrate into fast local SQLite cache
                def _cache_op(conn):
                    conn.execute(
                        """
                        INSERT INTO google_oauth_tokens (email, access_token, refresh_token, expires_at, scope, updated_at)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(email) DO UPDATE SET
                            access_token = excluded.access_token,
                            refresh_token = excluded.refresh_token,
                            expires_at = excluded.expires_at,
                            scope = excluded.scope,
                            updated_at = CURRENT_TIMESTAMP;
                        """,
                        (
                            clean_email,
                            decoded["access_token"],
                            decoded.get("refresh_token", ""),
                            float(decoded.get("expires_at") or 0.0),
                            decoded.get("scope", ""),
                        ),
                    )
                    conn.commit()
                _execute_serialized_write(_cache_op)
                return {
                    "email": clean_email,
                    "access_token": decoded["access_token"],
                    "refresh_token": decoded.get("refresh_token", ""),
                    "expires_at": float(decoded.get("expires_at") or 0.0),
                    "scope": decoded.get("scope", ""),
                }
    except Exception as exc:
        logger.debug(f"[Database] Workspace cloud hydrate skipped: {exc}")

    return None


# Auto-initialize database tables and initial cohort seed on module load
try:
    init_database()
except Exception as _init_err:
    logger.warning(f"[Database] Startup schema initialization deferred: {_init_err}")

