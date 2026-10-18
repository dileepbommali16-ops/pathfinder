"""
Pathfinder Voice Tools Dispatch (backend/voice/tools.py)
Strict allowlist tool definitions exposed to Gemini Live as function calls.
Every argument is strictly validated. No OS, file system, or arbitrary command execution.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("pathfinder.voice.tools")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data"

# Allowlist of valid navigation tabs on the Pathfinder frontend
VALID_TABS = {
    "overview",
    "action",
    "skills",
    "projects",
    "resume",
    "defense",
    "twin",
    "analytics",
    "coach",
    "profile"
}

# ---------------------------------------------------------------------------
# Tool Implementations
# ---------------------------------------------------------------------------

def get_site_guide(topic: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves full or topic-filtered Pathfinder site guide."""
    guide_path = DATA_DIR / "site_guide.json"
    if not guide_path.exists():
        return {"features": [], "message": "Site guide data not found"}

    try:
        with open(guide_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        features = data.get("features", [])
        if topic:
            clean_topic = str(topic).lower().strip()
            matched = [
                f for f in features
                if clean_topic in f.get("name", "").lower()
                or clean_topic in f.get("id", "").lower()
                or clean_topic in f.get("whatItDoes", "").lower()
                or any(clean_topic in cmd.lower() for cmd in f.get("voiceCommands", []))
            ]
            return {"features": matched if matched else features[:3], "filtered_by": topic}

        return {"features": features}
    except Exception as e:
        logger.error(f"Error loading site guide: {e}")
        return {"error": str(e)}


def list_projects() -> List[Dict[str, Any]]:
    """Lists summary cards for all 23 production project blueprints."""
    proj_path = DATA_DIR / "projects.json"
    if not proj_path.exists():
        return []

    try:
        with open(proj_path, "r", encoding="utf-8") as f:
            projects = json.load(f)

        summaries = []
        for p in projects:
            summaries.append({
                "id": p.get("id"),
                "title": p.get("title"),
                "domain": p.get("domain"),
                "difficulty": p.get("difficulty"),
                "techStack": p.get("techStack", [])
            })
        return summaries
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        return []


def get_project(project_id: str) -> Dict[str, Any]:
    """Retrieves detailed architecture and roadmap for a specific project blueprint."""
    if not project_id or not isinstance(project_id, str):
        return {"error": "Invalid project_id provided"}

    clean_id = project_id.strip()
    proj_path = DATA_DIR / "projects.json"
    if not proj_path.exists():
        return {"error": "Projects catalog not found"}

    try:
        with open(proj_path, "r", encoding="utf-8") as f:
            projects = json.load(f)

        for p in projects:
            if p.get("id") == clean_id or clean_id.lower() in p.get("title", "").lower():
                return p

        return {"error": f"Project '{project_id}' not found in the 23 blueprints catalog."}
    except Exception as e:
        logger.error(f"Error getting project {project_id}: {e}")
        return {"error": str(e)}


def get_project_step(project_id: str, step: int) -> Dict[str, Any]:
    """Retrieves a single milestone step for tutoring a student through a project."""
    project = get_project(project_id)
    if "error" in project:
        return project

    features = project.get("features", [])
    if not features:
        return {
            "project_id": project.get("id"),
            "title": project.get("title"),
            "step": step,
            "instruction": project.get("overview", ""),
            "check_question": "Does this high-level system architecture meet your project requirements?"
        }

    total_steps = len(features)
    step_idx = max(1, min(int(step), total_steps)) - 1
    current_feature = features[step_idx]

    return {
        "project_id": project.get("id"),
        "title": project.get("title"),
        "step": step_idx + 1,
        "total_steps": total_steps,
        "step_instruction": current_feature,
        "tech_stack": project.get("techStack", []),
        "check_question": f"Have you implemented or designed '{current_feature}', or would you like me to explain the code patterns for it?"
    }


def get_profile(profile_dict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Retrieves active student profile state."""
    if profile_dict and isinstance(profile_dict, dict):
        return profile_dict

    # Fallback to local profile store
    profile_path = DATA_DIR / "user_profiles.json"
    if profile_path.exists():
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and data:
                    return data[0]
                elif isinstance(data, dict):
                    # Check if keys are user_ids mapping to profile dicts
                    if "branch" in data or "targetRole" in data:
                        return data
                    first_val = next(iter(data.values()), None)
                    if isinstance(first_val, dict):
                        return first_val
                    return data
        except Exception:
            pass

    return {
        "fullName": "Engineering Candidate",
        "branch": "CSE",
        "cgpa": 8.0,
        "activeBacklogs": 0,
        "targetRole": "Software Development Engineer (SDE-1)",
        "codingScore": 7.5,
        "placementProbability": 82.5
    }


def get_roles_and_skills(role: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves industry role competencies and required tech stack skills."""
    roles_path = DATA_DIR / "roles.json"
    skills_path = DATA_DIR / "skills.json"

    roles_data = []
    skills_data = {}

    if roles_path.exists():
        try:
            with open(roles_path, "r", encoding="utf-8") as f:
                roles_data = json.load(f)
        except Exception:
            pass

    if skills_path.exists():
        try:
            with open(skills_path, "r", encoding="utf-8") as f:
                skills_data = json.load(f)
        except Exception:
            pass

    if role:
        clean_role = str(role).lower().strip()
        matched_role = None
        if isinstance(roles_data, list):
            matched_role = next((r for r in roles_data if isinstance(r, dict) and (clean_role in r.get("title", "").lower() or clean_role in r.get("id", "").lower())), None)
        elif isinstance(roles_data, dict):
            matched_role = roles_data.get(clean_role)

        skills_list = skills_data if isinstance(skills_data, list) else skills_data.get("core_skills", [])
        return {
            "role": matched_role or {"title": role, "note": "Standard software engineering tracks applied"},
            "skills_taxonomy": skills_list
        }

    return {
        "roles": roles_data,
        "skills": skills_data
    }


def get_companies(category: Optional[str] = None) -> Dict[str, Any]:
    """Returns top recruiting companies grouped by tier (Tier-1 MNC, Unicorn, Enterprise)."""
    companies_data = {
        "Tier-1 Product": ["Google", "Microsoft", "Amazon", "Atlassian", "Uber", "Adobe"],
        "Top FinTech & High Frequency": ["Goldman Sachs", "Morgan Stanley", "DE Shaw", "PhonePe", "Razorpay"],
        "Enterprise IT & Cloud": ["Salesforce", "Oracle", "Cisco", "ServiceNow", "SAP Labs"],
        "Fast-Growing Startups": ["Swiggy", "Zomato", "CRED", "Meesho", "Zepto"]
    }

    if category:
        clean_cat = str(category).lower()
        matched = {k: v for k, v in companies_data.items() if clean_cat in k.lower()}
        if matched:
            return matched

    return companies_data


def navigate(tab: str) -> Dict[str, Any]:
    """
    Directs the client frontend to switch to a valid navigation tab.
    Strictly restricted to the VALID_TABS allowlist.
    """
    clean_tab = str(tab).lower().strip()
    if clean_tab in VALID_TABS:
        return {
            "action": "navigate",
            "tab": clean_tab,
            "success": True,
            "message": f"Navigating to '{clean_tab}' tab."
        }
    return {
        "action": "navigate",
        "tab": clean_tab,
        "success": False,
        "error": f"Invalid tab '{tab}'. Allowed tabs: {sorted(list(VALID_TABS))}"
    }


def open_resume_builder() -> Dict[str, Any]:
    """Triggers the client One-Page ATS Resume Studio modal."""
    return {
        "action": "open_resume_builder",
        "success": True,
        "message": "Opening One-Page ATS Resume Studio."
    }


# ---------------------------------------------------------------------------
# Declarations for Gemini Function Calling
# ---------------------------------------------------------------------------
TOOL_DECLARATIONS = [
    {
        "name": "get_site_guide",
        "description": "Answers questions about Pathfinder website pages, tabs, features, and how to use them.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "topic": {"type": "STRING", "description": "Specific feature, tab, or tool name (e.g., 'resume', 'skills', 'analytics')"}
            }
        }
    },
    {
        "name": "list_projects",
        "description": "Lists all 23 production project blueprints available in Pathfinder.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "get_project",
        "description": "Retrieves the full technical blueprint and architecture for a project.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "project_id": {"type": "STRING", "description": "The unique identifier or title of the project (e.g. 'proj-sde-1')"}
            },
            "required": ["project_id"]
        }
    },
    {
        "name": "get_project_step",
        "description": "Retrieves a single step/milestone to tutor a student through a project one step at a time.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "project_id": {"type": "STRING", "description": "The project ID to tutor"},
                "step": {"type": "INTEGER", "description": "The step number (1-indexed)"}
            },
            "required": ["project_id", "step"]
        }
    },
    {
        "name": "get_profile",
        "description": "Retrieves the student's academic background, CGPA, backlogs, and target role.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "get_roles_and_skills",
        "description": "Returns required technical skills and competencies for a target company role.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "role": {"type": "STRING", "description": "Target role (e.g., 'SDE', 'AI Engineer', 'Cloud Engineer')"}
            }
        }
    },
    {
        "name": "get_companies",
        "description": "Returns recruiting companies and placement tiers matching candidate goals.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category": {"type": "STRING", "description": "Category (e.g. 'Tier-1', 'FinTech', 'Startup')"}
            }
        }
    },
    {
        "name": "navigate",
        "description": "Navigates the user to a specific tab on the Pathfinder website.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "tab": {
                    "type": "STRING",
                    "description": "Target tab to navigate to (must be one of: overview, action, skills, projects, resume, defense, twin, analytics, coach, profile)"
                }
            },
            "required": ["tab"]
        }
    },
    {
        "name": "open_resume_builder",
        "description": "Opens the single-page ATS resume studio modal on the user's screen.",
        "parameters": {"type": "OBJECT", "properties": {}}
    }
]

# Dispatcher mapping
DISPATCHER = {
    "get_site_guide": lambda args: get_site_guide(args.get("topic")),
    "list_projects": lambda args: list_projects(),
    "get_project": lambda args: get_project(args.get("project_id")),
    "get_project_step": lambda args: get_project_step(args.get("project_id"), args.get("step", 1)),
    "get_profile": lambda args: get_profile(),
    "get_roles_and_skills": lambda args: get_roles_and_skills(args.get("role")),
    "get_companies": lambda args: get_companies(args.get("category")),
    "navigate": lambda args: navigate(args.get("tab", "")),
    "open_resume_builder": lambda args: open_resume_builder()
}


def execute_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Executes a tool call strictly adhering to the allowlist."""
    handler = DISPATCHER.get(tool_name)
    if not handler:
        logger.warning(f"Rejected unapproved tool call: {tool_name}")
        return {"error": f"Tool '{tool_name}' is not permitted in web mode."}

    try:
        result = handler(args)
        return result
    except Exception as exc:
        logger.error(f"Error executing tool {tool_name}: {exc}")
        return {"error": f"Tool execution failed: {str(exc)}"}
