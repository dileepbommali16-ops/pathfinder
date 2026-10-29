"""
Tools the Pathfinder agent can call (Gemini function calling).

Read tools wrap the data the dashboard already uses (data_service, SQLite profiles, the readiness audit), so the
agent's numbers always match the website. `respond` is the terminal tool: the agent ends every turn by calling it.
The model can never write data; profile edits are only PROPOSED through respond.actions and confirmed in the UI.
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from backend.agent import site_map

logger = logging.getLogger("agent.tools")

MAX_TOOL_RESULT_CHARS = 6_000

PROFILE_FIELDS_FOR_AGENT = (
    "full_name", "branch", "current_year", "cgpa", "active_backlogs", "technical_skills", "tools",
    "programming_languages", "projects_count", "internships", "certifications", "coding", "communication",
    "target_role", "target_domain", "preferred_location", "expected_package", "target_tier", "graduation_year",
)


@dataclass
class ToolContext:
    user: Any = None  # backend.models.UserSession (or anything with user_id / is_authenticated)
    client_profile: Dict[str, Any] = field(default_factory=dict)  # untrusted, only used when not signed in
    agent_state: Dict[str, Any] = field(default_factory=dict)
    screen: Dict[str, Any] = field(default_factory=dict)


# ----------------------------------------------------------------------------- declarations

def _obj(properties: Dict[str, Any], required: Optional[List[str]] = None) -> Dict[str, Any]:
    spec: Dict[str, Any] = {"type": "OBJECT", "properties": properties}
    if required:
        spec["required"] = required
    return spec


_STR = {"type": "STRING"}
_INT = {"type": "INTEGER"}

TOOL_DECLARATIONS: List[Dict[str, Any]] = [
    {
        "name": "get_student_profile",
        "description": "The signed-in student's saved profile (branch, CGPA, skills, backlogs, target role...). Call before personalised advice.",
    },
    {
        "name": "get_readiness_score",
        "description": "The student's placement readiness audit from the website's ML engine: chance, label, strengths, gaps, breakdown, next steps.",
    },
    {
        "name": "query_cohort_stats",
        "description": "Placement statistics from the dataset, filtered by year, branch (code like CSE or All), gender and skill.",
        "parameters": _obj({"year": _INT, "branch": _STR, "gender": _STR, "skill": _STR}),
    },
    {
        "name": "compare_branches",
        "description": "Placement rate, packages and top skills per branch. Optionally pass branch codes to compare.",
        "parameters": _obj({"year": _INT, "branches": {"type": "ARRAY", "items": _STR}}),
    },
    {
        "name": "get_highest_package_branch",
        "description": "Ranking of branches by highest package.",
        "parameters": _obj({"year": _INT}),
    },
    {
        "name": "get_skill_impact",
        "description": "How much a skill improves placement odds, with benchmark details.",
        "parameters": _obj({"skill_name": _STR, "year": _INT, "branch": _STR}, ["skill_name"]),
    },
    {
        "name": "get_role_requirements",
        "description": "Required, existing and missing skills for a role (match by id or title, e.g. sde).",
        "parameters": _obj({"role_query": _STR}, ["role_query"]),
    },
    {
        "name": "list_projects",
        "description": "Project blueprints (summary only: id, title, domain, difficulty, stack). Filter by role_id, domain or difficulty.",
        "parameters": _obj({"role_id": _STR, "domain": _STR, "difficulty": _STR}),
    },
    {
        "name": "get_project",
        "description": "Full details of one project blueprint: overview, features, architecture, stack, resume bullet. Use it before teaching a project.",
        "parameters": _obj({"project_id": _STR}, ["project_id"]),
    },
    {
        "name": "get_page_guide",
        "description": "What a website page is, its purpose and its registered sections.",
        "parameters": _obj({"page_id": _STR}, ["page_id"]),
    },
    {
        "name": "respond",
        "description": (
            "FINISH your turn with the final answer. Always end with this. "
            "'spoken' is read aloud (1-3 short plain sentences). 'display' is the full markdown answer for the screen. "
            "'actions' controls the website UI, only when the student asked to go somewhere, see something or change something. "
            "A profile change is only a proposal: the student confirms it on screen."
        ),
        "parameters": _obj(
            {
                "spoken": {"type": "STRING", "description": "1-3 short sentences, plain words, no markdown, no URLs, no symbols."},
                "display": {"type": "STRING", "description": "Full answer in markdown."},
                "actions": {
                    "type": "ARRAY",
                    "items": _obj(
                        {
                            "type": {"type": "STRING", "enum": list(site_map.ACTION_TYPES)},
                            "target": {"type": "STRING", "description": "page id (navigate_to) or section id (highlight, scroll_to)"},
                            "field": {"type": "STRING", "description": "profile field (propose_profile_change)"},
                            "value": {"type": "STRING", "description": "new value (propose_profile_change)"},
                        },
                        ["type"],
                    ),
                },
                "followups": {"type": "ARRAY", "items": _STR, "description": "Up to 3 short follow-up suggestions."},
                "tutor": _obj(
                    {
                        "project_id": {"type": "STRING", "description": "Project being taught; empty string ends tutoring."},
                        "step": {"type": "INTEGER", "description": "Step the student is on now (1-based)."},
                    }
                ),
            },
            ["spoken", "display"],
        ),
    },
]

DATA_TOOL_NAMES = [d["name"] for d in TOOL_DECLARATIONS if d["name"] != "respond"]


# ----------------------------------------------------------------------------- executors

def _cap(result: Any) -> Any:
    text = json.dumps(result, default=str, ensure_ascii=False)
    if len(text) <= MAX_TOOL_RESULT_CHARS:
        return json.loads(text)
    return {"truncated": True, "data": text[:MAX_TOOL_RESULT_CHARS]}


def _as_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_str(value: Any, max_len: int = 80) -> Optional[str]:
    return str(value).strip()[:max_len] if value not in (None, "") else None


def _data_tool(name: str, allowed: Dict[str, str]) -> Callable[[Dict[str, Any], ToolContext], Any]:
    """Wrap data_service.execute_data_tool with strictly typed arguments."""

    def run(args: Dict[str, Any], ctx: ToolContext) -> Any:  # noqa: ARG001, ARG002
        from backend.data_service import execute_data_tool  # lazy: keeps this module importable without pandas

        clean: Dict[str, Any] = {}
        for key, kind in allowed.items():
            if key not in args:
                continue
            if kind == "int":
                parsed = _as_int(args[key])
                if parsed is not None:
                    clean[key] = parsed
            elif kind == "list":
                if isinstance(args[key], list):
                    clean[key] = [str(x)[:20] for x in args[key][:12]]
            else:
                parsed_s = _as_str(args[key])
                if parsed_s:
                    clean[key] = parsed_s
        return execute_data_tool(name, clean)

    return run


def _tool_get_student_profile(args: Dict[str, Any], ctx: ToolContext) -> Any:
    profile: Optional[Dict[str, Any]] = None
    source = "client"
    user_id = getattr(ctx.user, "user_id", None)
    if user_id and getattr(ctx.user, "is_authenticated", False):
        from backend.database import get_user_profile_by_id

        profile = get_user_profile_by_id(user_id)
        source = "saved"
    if not profile:
        profile, source = (ctx.client_profile or {}), "client"
    picked = {k: profile.get(k) for k in PROFILE_FIELDS_FOR_AGENT if profile.get(k) not in (None, "", [])}
    if not picked:
        return {"error": "No profile is available. The student may not be signed in or has not completed onboarding."}
    return {"source": source, "profile": picked}


def _tool_get_readiness_score(args: Dict[str, Any], ctx: ToolContext) -> Any:
    from backend import api as web_api  # lazy: avoids a circular import with api.py
    from backend.models import StudentProfile

    signed_in = bool(getattr(ctx.user, "is_authenticated", False))
    if signed_in:
        profile = None  # the audit reads the saved profile from the database
    elif ctx.client_profile:
        profile = StudentProfile(**{k: v for k, v in ctx.client_profile.items() if k in PROFILE_FIELDS_FOR_AGENT})
    else:
        return {"error": "The student is not signed in and no profile was provided, so there is no real readiness score to read."}

    result = web_api.calculate_readiness_audit(profile=profile, user=ctx.user)
    data = result.model_dump() if hasattr(result, "model_dump") else dict(result)
    keys = ("chance", "label", "overall_percentage", "cgpa", "strengths", "gaps", "recommended_skills",
            "breakdown", "cohort_comparison", "next_steps", "data_source")
    return {k: data.get(k) for k in keys}


def _tool_list_projects(args: Dict[str, Any], ctx: ToolContext) -> Any:
    from backend.data_service import get_projects

    role_id, domain, difficulty = (_as_str(args.get(k)) for k in ("role_id", "domain", "difficulty"))
    items = get_projects()
    if role_id:
        items = [p for p in items if role_id.lower() in str(p.get("roleId", "")).lower()]
    if domain:
        items = [p for p in items if domain.lower() in str(p.get("domain", "")).lower()]
    if difficulty:
        items = [p for p in items if difficulty.lower() in str(p.get("difficulty", "")).lower()]
    return {
        "count": len(items),
        "projects": [
            {k: p.get(k) for k in ("id", "title", "domain", "difficulty", "roleId", "techStack")} for p in items[:30]
        ],
    }


def _tool_get_project(args: Dict[str, Any], ctx: ToolContext) -> Any:
    from backend.data_service import get_projects

    wanted = (_as_str(args.get("project_id")) or "").lower()
    for p in get_projects():
        if wanted and (wanted == str(p.get("id", "")).lower() or wanted in str(p.get("title", "")).lower()):
            return {"project": p}
    return {"error": f"No project matches {wanted!r}. Use list_projects to see valid ids."}


def _tool_get_page_guide(args: Dict[str, Any], ctx: ToolContext) -> Any:
    page = site_map.get_page(_as_str(args.get("page_id")) or "")
    if not page:
        return {"error": "Unknown page id.", "valid_pages": site_map.page_ids()}
    return {"page": page}


def _tool_generate_resume(args: Dict[str, Any], ctx: ToolContext) -> Any:
    """Builds a one-page ATS resume markdown from the student's profile and returns feedback."""
    from backend.routers.voice_routes import generate_resume as _gen
    profile = (ctx.client_profile or {}).copy()
    # Normalize key aliases to match the unified payload schema in AgentLayout.tsx
    for k, v in list(profile.items()):
        if not isinstance(v, str):
            v = str(v) if v is not None else ""
        profile[k] = v
    try:
        data = _gen({"profile_fields": profile}).get("data", {})
        return {"markdown": data.get("markdown", ""), "feedback": data.get("feedback", {})}
    except Exception as exc:
        logger.warning("tool generate_resume failed: %s", exc)
        return {"markdown": "", "feedback": {"error": f"Resume generation failed: {exc}"}}


EXECUTORS: Dict[str, Callable[[Dict[str, Any], ToolContext], Any]] = {
    "get_student_profile": _tool_get_student_profile,
    "get_readiness_score": _tool_get_readiness_score,
    "query_cohort_stats": _data_tool("query_cohort_stats", {"year": "int", "branch": "str", "gender": "str", "skill": "str"}),
    "compare_branches": _data_tool("compare_branches", {"year": "int", "branches": "list"}),
    "get_highest_package_branch": _data_tool("get_highest_package_branch", {"year": "int"}),
    "get_skill_impact": _data_tool("get_skill_impact", {"skill_name": "str", "year": "int", "branch": "str"}),
    "get_role_requirements": _data_tool("get_role_requirements", {"role_query": "str"}),
    "list_projects": _tool_list_projects,
    "get_project": _tool_get_project,
    "get_page_guide": _tool_get_page_guide,
    "generate_resume": _tool_generate_resume,
}


async def run_tool(name: str, args: Any, ctx: ToolContext) -> Any:
    """Never raises: a failing tool becomes an error object the model can read and recover from."""
    fn = EXECUTORS.get(name)
    if fn is None:
        return {"error": f"Unknown tool {str(name)[:40]!r}. Available tools: {', '.join(DATA_TOOL_NAMES)}, respond"}
    safe_args = args if isinstance(args, dict) else {}
    try:
        result = await asyncio.to_thread(fn, safe_args, ctx)
        return _cap(result)
    except Exception as exc:  # noqa: BLE001
        logger.warning("tool %s failed: %s", name, str(exc)[:200])
        return {"error": f"The tool {name} failed. Answer without it and say that data was unavailable."}
