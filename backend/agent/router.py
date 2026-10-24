"""
HTTP route for the agent.

Add to backend/api.py (at the END of the file, before any `if __name__` block):

    try:
        from backend.agent.router import create_agent_chat_router
        app.include_router(create_agent_chat_router(get_current_user))
    except Exception as exc:  # the agent must never take the whole API down
        logging.getLogger("api").warning("agent router disabled: %s", exc)

get_current_user never raises (guests get an anonymous session), so demo users can talk to the agent too.
"""
from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from backend import agent_engine as ae
from backend.agent import loop as agent_loop
from backend.agent import tools as agent_tools

logger = logging.getLogger("agent.router")

_SAFE_PROFILE_KEYS = set(agent_tools.PROFILE_FIELDS_FOR_AGENT)


class ScreenContextIn(BaseModel):
    activeTab: str = Field("", max_length=60)
    focusedWidget: str = Field("", max_length=60)
    userState: str = Field("active", max_length=30)


class UserMemoryIn(BaseModel):
    lastVisit: str = Field("", max_length=40)
    lastDiscussedTopic: str = Field("", max_length=120)
    studentName: str = Field("", max_length=40)


class TurnIn(BaseModel):
    role: str = Field(..., pattern="^(user|model)$")
    text: str = Field("", max_length=1500)


class TutorStateIn(BaseModel):
    project_id: str = Field("", max_length=64)
    step: int = Field(1, ge=1, le=50)


class AgentStateIn(BaseModel):
    tutor: Optional[TutorStateIn] = None


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    screenContext: ScreenContextIn = ScreenContextIn()
    userMemory: UserMemoryIn = UserMemoryIn()
    history: List[TurnIn] = Field(default_factory=list, max_length=24)
    agentState: AgentStateIn = AgentStateIn()
    profile: Dict[str, Any] = Field(default_factory=dict)  # only used when the student is not signed in


def _dump(model: BaseModel) -> Dict[str, Any]:
    dump = getattr(model, "model_dump", None) or model.dict  # pydantic v2 or v1
    return dump()


def _safe_profile(raw: Dict[str, Any]) -> Dict[str, Any]:
    """The browser's profile is untrusted: keep known keys, scalar values and short lists of short strings only."""
    out: Dict[str, Any] = {}
    for key, value in (raw or {}).items():
        if key not in _SAFE_PROFILE_KEYS:
            continue
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            out[key] = value
        elif isinstance(value, str):
            out[key] = value[:120]
        elif isinstance(value, list):
            out[key] = [str(v)[:60] for v in value[:20]]
    return out


def _agent_state(state: AgentStateIn) -> Dict[str, Any]:
    tutor = state.tutor
    return {"tutor": {"project_id": tutor.project_id, "step": tutor.step}} if tutor and tutor.project_id else {}


def create_agent_chat_router(get_current_user: Callable) -> APIRouter:
    router = APIRouter(prefix="/api/agent", tags=["agent"])

    # Reuse the website's own limiter, daily AI budget and input sanitizer.
    from backend.security import ai_budget_manager, get_client_ip, rate_limiter, sanitize_user_input

    @router.post("/chat")
    async def agent_chat(payload: AgentChatRequest, request: Request, user=Depends(get_current_user)) -> Dict[str, Any]:
        client_key = user.user_id if getattr(user, "is_authenticated", False) else get_client_ip(request)

        allowed, _ = rate_limiter.check(f"agent_{client_key}", max_requests=40, window_seconds=60)
        if not allowed:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
        ok, _count, limit = ai_budget_manager.consume(client_key)
        if not ok:
            raise HTTPException(status_code=429, detail=f"Daily AI quota reached ({limit}). It resets at midnight.")

        message = sanitize_user_input(payload.message, max_length=2000)
        if not message.strip():
            raise HTTPException(status_code=400, detail="Empty message")

        screen, memory = _dump(payload.screenContext), _dump(payload.userMemory)
        history = [_dump(t) for t in payload.history]
        state = _agent_state(payload.agentState)

        try:
            result = await agent_loop.run_agent(
                message,
                user=user,
                client_profile=_safe_profile(payload.profile),
                screen_context=screen,
                user_memory=memory,
                history=history,
                agent_state=state,
            )
            result["mode"] = "agent"
            return result
        except (agent_loop.AgentLoopError, ae.AgentEngineError) as exc:
            logger.warning("agent loop failed, using the simple engine: %s", str(exc)[:200])

        try:  # degraded but still a real answer, never a canned one
            simple = await ae.generate_agent_reply(message, screen, memory, history)
            return {**simple, "followups": [], "agentState": state, "toolsUsed": [], "mode": "simple"}
        except ae.AgentEngineError as exc:
            logger.warning("simple engine failed too: %s", str(exc)[:200])
            raise HTTPException(status_code=502, detail="The AI is busy right now. Please try again in a moment.")

    @router.get("/tools")
    async def agent_tools_list() -> Dict[str, Any]:
        """Safe diagnostics (no secrets)."""
        return {
            "tools": [d["name"] for d in agent_tools.TOOL_DECLARATIONS],
            "model": ae.primary_model(),
            "fallback_model": ae.fallback_model(),
            "knowledge_files": ae.knowledge_file_count(),
        }

    return router
