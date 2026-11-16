"""
Pathfinder 2.0 - Permanent Cloud Persistence Layer (Supabase PostgreSQL via PostgREST HTTPS)
Provides durable cloud storage & cold-boot hydration for user profiles, readiness history,
student memory, and cohort analytics records over IPv4 HTTPS, backing the sub-millisecond
local SQLite WAL cache so Render container restarts never lose student state.
"""

from __future__ import annotations

import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import httpx

logger = logging.getLogger("pathfinder.supabase_store")

_HTTP_CLIENT: Optional[httpx.Client] = None


def _get_supabase_config() -> Optional[Tuple[str, str]]:
    """
    Returns `(supabase_url, service_role_key)` when cloud persistence is configured.
    Automatically skips cloud network writes inside automated unit test runs unless
    `PATHFINDER_ENABLE_CLOUD_DB_IN_TESTS=1` is explicitly set.
    """
    if os.getenv("PYTEST_CURRENT_TEST") and os.getenv("PATHFINDER_ENABLE_CLOUD_DB_IN_TESTS") != "1":
        return None

    url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip().rstrip("/")
    service_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "").strip()
    if not url or not service_key or service_key.startswith("sb_publishable_"):
        return None
    return url, service_key


def is_cloud_db_configured() -> bool:
    """Reports whether durable Supabase PostgreSQL persistence credentials are configured."""
    url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip()
    service_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "").strip()
    return bool(url and service_key and not service_key.startswith("sb_publishable_"))


def _get_client() -> httpx.Client:
    global _HTTP_CLIENT
    if _HTTP_CLIENT is None or _HTTP_CLIENT.is_closed:
        _HTTP_CLIENT = httpx.Client(timeout=3.0)
    return _HTTP_CLIENT


def _rest_request(
    method: str,
    table_path: str,
    *,
    params: Optional[Dict[str, str]] = None,
    json_body: Any = None,
    extra_headers: Optional[Dict[str, str]] = None,
) -> Optional[httpx.Response]:
    """Executes a fail-safe HTTPS PostgREST call against Supabase using service-role auth."""
    cfg = _get_supabase_config()
    if not cfg:
        return None

    base_url, service_key = cfg
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    try:
        resp = _get_client().request(
            method,
            f"{base_url}/rest/v1/{table_path.lstrip('/')}",
            params=params,
            json=json_body,
            headers=headers,
        )
        if resp.status_code >= 400:
            logger.warning(f"[SupabaseStore] {method} {table_path} -> HTTP {resp.status_code}: {resp.text[:180]}")
            return None
        return resp
    except Exception as exc:
        logger.debug(f"[SupabaseStore] {method} {table_path} skipped cleanly: {exc}")
        return None


def cloud_upsert_profile(user_id: str, profile_dict: Dict[str, Any]) -> bool:
    """Upserts a student profile row into `public.user_profiles`."""
    if not user_id:
        return False

    now_iso = datetime.now(timezone.utc).isoformat()
    row = {
        "user_id": user_id,
        "username": profile_dict.get("username") or profile_dict.get("full_name"),
        "email": (profile_dict.get("email") or "").strip().lower() or None,
        "full_name": profile_dict.get("full_name"),
        "branch": profile_dict.get("branch") or "CSE",
        "cgpa": float(profile_dict.get("cgpa") or 0.0),
        "percentage": float(profile_dict.get("percentage") or 0.0),
        "active_backlogs": int(profile_dict.get("active_backlogs") or profile_dict.get("backlogs") or 0),
        "onboarding_completed": bool(profile_dict.get("onboarding_completed")),
        "profile_data": profile_dict,
        "updated_at": now_iso,
    }
    resp = _rest_request(
        "POST",
        "user_profiles",
        params={"on_conflict": "user_id"},
        json_body=row,
        extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    return resp is not None


def _extract_profile_payload(resp: Optional[httpx.Response]) -> Optional[Dict[str, Any]]:
    if not resp:
        return None
    try:
        rows = resp.json()
        if isinstance(rows, list) and rows and isinstance(rows[0].get("profile_data"), dict):
            return rows[0]["profile_data"]
    except Exception:
        return None
    return None


def cloud_get_profile_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a student profile by exact `user_id` from Supabase Postgres."""
    if not user_id:
        return None
    resp = _rest_request(
        "GET",
        "user_profiles",
        params={"user_id": f"eq.{user_id}", "select": "profile_data", "limit": "1"},
    )
    return _extract_profile_payload(resp)


def cloud_get_profile_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    """Fetches the most recently updated student profile matching email, username, or user_id."""
    clean = (identifier or "").strip()
    if not clean:
        return None

    low = clean.lower()
    # Escape commas/parens lightly via URL encoding inside PostgREST `or` filter
    enc_low = quote(low, safe="@._+-")
    enc_raw = quote(clean, safe="@._+-")
    resp = _rest_request(
        "GET",
        "user_profiles",
        params={
            "or": f"(email.ilike.{enc_low},username.ilike.{enc_low},user_id.eq.{enc_raw})",
            "select": "profile_data",
            "order": "updated_at.desc",
            "limit": "1",
        },
    )
    return _extract_profile_payload(resp)


def cloud_delete_profile(user_id: str) -> bool:
    """Deletes a student profile row by `user_id` or `email` from Supabase Postgres."""
    clean = (user_id or "").strip()
    if not clean:
        return False
    enc = quote(clean, safe="@._+-")
    resp = _rest_request(
        "DELETE",
        "user_profiles",
        params={"or": f"(user_id.eq.{enc},email.ilike.{enc.lower()})"},
    )
    return resp is not None


def cloud_add_readiness_snapshot(
    user_id: str,
    chance: float,
    cgpa: float,
    coding: float,
    communication: float,
    internships: int = 0,
    backlogs: int = 0,
    target_role: Optional[str] = None,
) -> bool:
    """Appends an evaluation snapshot into `public.readiness_history`."""
    if not user_id:
        return False
    row = {
        "user_id": user_id,
        "chance": float(chance),
        "cgpa": float(cgpa),
        "coding": float(coding),
        "communication": float(communication),
        "internships": int(internships),
        "backlogs": int(backlogs),
        "target_role": target_role or "Software Engineer",
    }
    resp = _rest_request(
        "POST",
        "readiness_history",
        json_body=row,
        extra_headers={"Prefer": "return=minimal"},
    )
    return resp is not None


def cloud_get_readiness_history(user_id: str, limit: int = 50) -> Optional[List[Dict[str, Any]]]:
    """Fetches chronological readiness snapshots for a student from `public.readiness_history`."""
    if not user_id:
        return None
    resp = _rest_request(
        "GET",
        "readiness_history",
        params={
            "user_id": f"eq.{user_id}",
            "select": "id,user_id,chance,cgpa,coding,communication,internships,backlogs,target_role,created_at",
            "order": "created_at.asc",
            "limit": str(max(1, min(200, int(limit)))),
        },
    )
    if not resp:
        return None
    try:
        rows = resp.json()
        return rows if isinstance(rows, list) else None
    except Exception:
        return None


def cloud_get_student_memory(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches conversational memory from `public.student_memory`."""
    clean_id = user_id or "default_student"
    resp = _rest_request(
        "GET",
        "student_memory",
        params={
            "user_id": f"eq.{clean_id}",
            "select": "user_id,goals,weak_areas,topics,last_summary,last_session_at",
            "limit": "1",
        },
    )
    if not resp:
        return None
    try:
        rows = resp.json()
        if not isinstance(rows, list) or not rows:
            return None
        row = rows[0]
        return {
            "user_id": row.get("user_id", clean_id),
            "goals": row.get("goals") if isinstance(row.get("goals"), list) else [],
            "weak_areas": row.get("weak_areas") if isinstance(row.get("weak_areas"), list) else [],
            "topics": row.get("topics") if isinstance(row.get("topics"), list) else [],
            "last_summary": row.get("last_summary") or "",
            "last_session_at": str(row.get("last_session_at") or ""),
        }
    except Exception:
        return None


def cloud_save_student_memory(
    user_id: str,
    goals: List[str],
    weak_areas: List[str],
    topics: List[str],
    last_summary: str,
) -> bool:
    """Upserts conversational memory in `public.student_memory`."""
    clean_id = user_id or "default_student"
    now_iso = datetime.now(timezone.utc).isoformat()
    row = {
        "user_id": clean_id,
        "goals": goals,
        "weak_areas": weak_areas,
        "topics": topics,
        "last_summary": last_summary,
        "last_session_at": now_iso,
        "updated_at": now_iso,
    }
    resp = _rest_request(
        "POST",
        "student_memory",
        params={"on_conflict": "user_id"},
        json_body=row,
        extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    return resp is not None


def seed_supabase_cohort_placements() -> int:
    """Upserts all 972 placement records into `public.cohort_placements`."""
    from backend.data_service import get_placement_df

    df = get_placement_df()
    rows = [
        {
            "source_id": int(r["sourceId"]),
            "year": int(r["year"]),
            "branch": str(r["branch"]).strip(),
            "gender": str(r["gender"]).strip(),
            "skill_category": str(r["skillCategory"]).strip(),
            "placed": int(r["placed"]),
            "placed_label": str(r.get("placed_label", "Placed" if int(r["placed"]) == 1 else "Not placed")).strip(),
            "salary_lpa": float(r.get("salary_lpa", 0.0)),
            "cgpa": float(r["cgpa"]),
            "coding_score": float(r["codingScore"]),
            "communication_score": float(r["communicationScore"]),
            "internships": int(r.get("internships", 0)),
            "backlogs": int(r.get("backlogs", 0)),
        }
        for _, r in df.iterrows()
    ]

    inserted = 0
    batch_size = 200
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        resp = _rest_request(
            "POST",
            "cohort_placements",
            params={"on_conflict": "source_id"},
            json_body=batch,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
        if resp is not None:
            inserted += len(batch)
    return inserted
