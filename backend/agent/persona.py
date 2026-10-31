import json
import os
import pathlib
from typing import Optional, Any

from backend.supabase_rag import (
    MAX_SYSTEM_PROMPT_TOKENS,
    compute_embedding_384,
    cosine_similarity,
    build_rag_corpus,
    tokenize,
)

BASE = pathlib.Path(__file__).parent

OWNER_GREETING = "Hi Boss, what's up! I'm your DAS agent, how can I assist you?"
GUEST_GREETING = "Hi Sir, I'm your DAS agent, how can I assist you?"
STAKEHOLDER_GREETING = GUEST_GREETING  # backwards compatibility alias

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "navigate_to",
            "description": "Open a page of this website. Set explain=true to open it and then explain it to the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "route": {
                        "type": "string",
                        "description": "App route starting with /",
                    },
                    "explain": {"type": "boolean"},
                },
                "required": ["route"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "scroll_to",
            "description": "Scroll to an element by its data-agent-id or a heading text.",
            "parameters": {
                "type": "object",
                "properties": {"target": {"type": "string"}},
                "required": ["target"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "click",
            "description": "Click a button/link by its data-agent-id from the page snapshot.",
            "parameters": {
                "type": "object",
                "properties": {"agent_id": {"type": "string"}},
                "required": ["agent_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fill_field",
            "description": "Type a value into an input by its data-agent-id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_id": {"type": "string"},
                    "value": {"type": "string"},
                },
                "required": ["agent_id", "value"],
            },
        },
    },
]
TOOL_NAMES = {t["function"]["name"] for t in TOOLS}


def _retrieve_top3_sync(query: str, branch: str = "CSE") -> str:
    """Synchronous semantic retrieval of Top 3 chunks from the 23 blueprints + 972 placement records."""
    corpus = build_rag_corpus(include_all_individual_records=False)
    q_text = f"{query} {branch}".strip()
    q_emb = compute_embedding_384(q_text)
    q_tokens = set(tokenize(q_text))

    scored = []
    for doc in corpus:
        sim = cosine_similarity(q_emb, doc["embedding"])
        if branch and branch.upper() in doc.get("branch", "").upper():
            sim += 0.12
        doc_tokens = set(tokenize(doc["title"] + " " + doc["skill_category"]))
        sim += len(q_tokens.intersection(doc_tokens)) * 0.08
        scored.append((sim, doc))

    scored.sort(key=lambda item: item[0], reverse=True)
    top3 = [f"{i}. {doc['content']}" for i, (_, doc) in enumerate(scored[:3], start=1)]
    return "\n".join(top3) if top3 else "1. Pathfinder 2.0: 23 Project Blueprints & 972 Placement Records active."


def build_system_prompt(role: str, page: dict, query: str = "") -> str:
    """
    Builds a compact (< 2000 tokens) Groq system prompt injecting ONLY the Top 3
    semantic search results from the 23 blueprints + 972 placement records.
    """
    who = (
        "the OWNER and BOSS (Dileep) who built Pathfinder. Address him warmly as 'Boss'."
        if role == "owner"
        else "a guest, student, or stakeholder. Address them respectfully as 'Sir'."
    )
    page_dict = page or {}
    branch = str(page_dict.get("candidateBranch") or page_dict.get("branch") or "CSE")
    cgpa = page_dict.get("cgpa", 7.8)
    backlogs = page_dict.get("backlogs", 0)
    target_role = page_dict.get("targetRole", "Software Development Engineer (SDE)")
    active_tab = page_dict.get("activeTabTitle") or page_dict.get("route") or "overview"

    rag_top_3 = _retrieve_top3_sync(query or active_tab, branch=branch)

    # Keep page snapshot compact (< 600 chars) so total system prompt stays well under 2,000 tokens
    compact_elements = (page_dict.get("elements") or [])[:12]
    snap = json.dumps(
        {"route": page_dict.get("route", "/"), "tab": active_tab, "elements": compact_elements},
        ensure_ascii=False,
        separators=(",", ":"),
    )[:600]

    prompt = f"""You are DAS, Pathfinder 2.0's JARVIS-style 3D AI Voice Agent & Career Co-Pilot.
You are speaking to {who}
Candidate Profile: Branch={branch}, CGPA={cgpa}, Backlogs={backlogs}, Role={target_role}, Tab={active_tab}.

OUTPUT FORMAT (spoken aloud via ElevenLabs onwK4e9ZLuTAKqWW03F9):
1. First, write 1-2 short natural spoken sentences (plain text, zero markdown/asterisks).
2. Then write ||| followed by concise markdown notes if details are helpful.
3. Reply in the user's language (English, Telugu/Tenglish, or Hindi).

TOP 3 SEMANTIC RAG RESULTS (from 23 Blueprints + 972 Placement Records):
{rag_top_3}

WEBSITE CONTROL ACTIONS (append at the very end ONLY when explicitly asked to open/navigate/scroll/filter/update):
<!--ACTION: {{"type": "NAVIGATE_TAB", "target": "overview|interview|action|skills|projects|analytics|resume|branches|defense|profile|roles|missions"}}-->
<!--ACTION: {{"type": "OPEN_MODAL", "target": "one_page_resume"}}-->
<!--ACTION: {{"type": "SCROLL_TO", "target": "down|up|top|bottom"}}-->
<!--ACTION: {{"type": "SET_FILTER", "target": "CSE"}}-->
<!--ACTION: {{"type": "UPDATE_PROFILE", "field": "cgpa", "value": 8.5}}-->

PAGE CONTEXT: {snap}"""

    max_chars = (MAX_SYSTEM_PROMPT_TOKENS - 100) * 4
    return prompt[:max_chars]


def build_system_instruction(
    user: Optional[Any] = None,
    site_knowledge_str: str = "",
    current_page_context: Optional[dict] = None,
    query: str = "",
) -> str:
    from backend.owner_profile import is_owner_user
    role = "owner" if is_owner_user(user) else "guest"
    return build_system_prompt(role, current_page_context or {}, query=query)


def get_greeting_for_user(user: Optional[Any] = None) -> str:
    from backend.owner_profile import is_owner_user
    return OWNER_GREETING if is_owner_user(user) else GUEST_GREETING
