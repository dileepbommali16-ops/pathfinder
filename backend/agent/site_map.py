"""
Site map and UI action validator for the Pathfinder agent.
Loads pages and sections from site_map.json and validates agent UI actions.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("agent.site_map")

ACTION_TYPES = ("navigate_to", "highlight", "scroll_to", "propose_profile_change")

EDITABLE_PROFILE_FIELDS = {
    "target_role", "target_domain", "branch", "graduation_year",
    "preferred_location", "expected_package", "target_tier", "current_year",
    "technical_skills", "tools", "programming_languages"
}

_HTML_TAG_RE = re.compile(r"<[^>]*>")
_TARGET_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,64}$")

_cached_site_map: Optional[Dict[str, Any]] = None


def _site_map_path() -> Path:
    return Path(__file__).resolve().parent / "site_map.json"


def reset_cache() -> None:
    global _cached_site_map
    _cached_site_map = None


def load_site_map() -> Dict[str, Any]:
    global _cached_site_map
    if _cached_site_map is not None:
        return _cached_site_map

    path = _site_map_path()
    try:
        if path.is_file():
            _cached_site_map = json.loads(path.read_text(encoding="utf-8"))
            return _cached_site_map
    except Exception as exc:
        logger.warning("Could not read site_map.json: %s", exc)

    _cached_site_map = {"pages": []}
    return _cached_site_map


def pages() -> List[Dict[str, Any]]:
    return load_site_map().get("pages", [])


def page_ids() -> List[str]:
    return [str(p.get("id")) for p in pages() if p.get("id")]


def section_ids() -> List[str]:
    sections: List[str] = []
    for p in pages():
        for s in p.get("sections", []):
            if isinstance(s, str) and s:
                sections.append(s)
            elif isinstance(s, dict) and s.get("id"):
                sections.append(str(s["id"]))
    return sections


def get_page(page_id: str) -> Optional[Dict[str, Any]]:
    wanted = str(page_id or "").strip().lower()
    for p in pages():
        if str(p.get("id", "")).lower() == wanted:
            return p
    return None


def summary_for_prompt() -> str:
    lines = []
    for p in pages():
        pid = p.get("id", "")
        title = p.get("title", "")
        purpose = p.get("purpose", "")
        secs = p.get("sections", [])
        sec_str = f" [sections: {', '.join(secs)}]" if secs else ""
        lines.append(f"- {pid}: {title} — {purpose}{sec_str}")
    return "\n".join(lines)


def validate_actions(actions: Any) -> Tuple[List[Dict[str, Any]], List[str]]:
    if not isinstance(actions, list):
        return [], []

    valid_pages = set(page_ids())
    valid_sections = set(section_ids())

    ok: List[Dict[str, Any]] = []
    errors: List[str] = []

    for action in actions[:3]:
        if not isinstance(action, dict):
            continue
        kind = action.get("type")
        if kind not in ACTION_TYPES:
            continue

        if kind == "navigate_to":
            target = str(action.get("target") or "").strip()
            if target in valid_pages:
                ok.append({"type": "navigate_to", "target": target})
            else:
                errors.append(f"Unknown page '{target}'. Valid pages: {', '.join(sorted(valid_pages))}")

        elif kind in ("highlight", "scroll_to"):
            target = str(action.get("target") or "").strip()
            if target in valid_sections:
                ok.append({"type": kind, "target": target})
            else:
                errors.append(f"Target '{target}' is not a registered section on this website.")

        elif kind == "propose_profile_change":
            field = str(action.get("field") or "").strip()
            val_raw = str(action.get("value") or "")
            cleaned_val = _HTML_TAG_RE.sub("", val_raw).strip()[:120]
            if field in EDITABLE_PROFILE_FIELDS:
                ok.append({"type": "propose_profile_change", "field": field, "value": cleaned_val})
            else:
                errors.append(f"Field '{field}' is not editable. Editable fields: {', '.join(sorted(EDITABLE_PROFILE_FIELDS))}")

    return ok, errors
