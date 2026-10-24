"""
Pathfinder DAS Agent: Tools Declarations & Whitelist
Defines the client tools Gemini Live can call to inspect, navigate,
and interact with Pathfinder's web DOM.
"""

from typing import List, Dict, Any

TOOLS_WHITELIST = {
    "navigate_to",
    "scroll_to",
    "click",
    "fill_field",
    "read_page",
    "explain_page"
}

DESTRUCTIVE_ACTIONS = {
    "delete_profile",
    "reset_scores",
    "submit_final_application",
    "clear_history"
}

TOOLS_SCHEMA: List[Dict[str, Any]] = [
    {
        "name": "navigate_to",
        "description": "Navigates the user's browser to a specific route or dashboard tab in Pathfinder.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "route": {
                    "type": "STRING",
                    "description": "Target path or tab identifier, e.g. '/', '/dashboard', 'overview', 'skills', 'roadmap', 'cohort', 'resume', 'projects'."
                }
            },
            "required": ["route"]
        }
    },
    {
        "name": "scroll_to",
        "description": "Smoothly scrolls the browser viewport to a specific section or element on the current page.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "section": {
                    "type": "STRING",
                    "description": "Identifier or CSS selector of the section (e.g., 'hero-metrics', 'skill-gap', 'roadmap', 'cohort-explorer', 'resume-studio', 'blueprints')."
                }
            },
            "required": ["section"]
        }
    },
    {
        "name": "click",
        "description": "Simulates a user click on an interactive element marked with a data-agent-id attribute.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "agent_id": {
                    "type": "STRING",
                    "description": "The unique data-agent-id value of the button, tab, or card to click."
                }
            },
            "required": ["agent_id"]
        }
    },
    {
        "name": "fill_field",
        "description": "Fills an input, textarea, or search field marked with a data-agent-id attribute.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "agent_id": {
                    "type": "STRING",
                    "description": "The data-agent-id of the input field."
                },
                "value": {
                    "type": "STRING",
                    "description": "The text value to enter into the field."
                }
            },
            "required": ["agent_id", "value"]
        }
    },
    {
        "name": "read_page",
        "description": "Reads the current visible DOM structure, text, headings, and available data-agent-id buttons on the active page.",
        "parameters": {
            "type": "OBJECT",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "explain_page",
        "description": "Navigates to a specific page or tab and provides a detailed step-by-step audio walkthrough of what is on that page.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "route": {
                    "type": "STRING",
                    "description": "The route or tab to explain in detail."
                }
            },
            "required": ["route"]
        }
    }
]


def is_tool_whitelisted(tool_name: str) -> bool:
    """Verifies that the requested tool is permitted in the whitelist."""
    return tool_name in TOOLS_WHITELIST


def is_destructive_action(action_name: str, agent_id: str = "") -> bool:
    """Detects if an action or clicked element is dangerous and requires verbal user confirmation."""
    low_action = action_name.lower()
    low_id = agent_id.lower()
    return (
        low_action in DESTRUCTIVE_ACTIONS or
        any(k in low_id for k in ["delete", "remove", "reset", "purge", "danger", "destroy"])
    )
