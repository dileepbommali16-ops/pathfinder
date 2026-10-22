"""
FastAPI routes for the voice agent.

Hook it up in backend/api.py (two lines):

    from backend.agent_router import create_agent_router
    app.include_router(create_agent_router(get_current_user))   # or create_agent_router() for no auth

Pass your existing auth dependency if guests/demo users should NOT call it; pass nothing to allow everyone
(the per-IP rate limit below still applies).
"""
from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque
from typing import Any, Callable, Deque, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

try:
    from . import agent_engine
except ImportError:  # running as a top-level module
    import agent_engine  # type: ignore

logger = logging.getLogger("agent_router")

RATE_WINDOW_SECONDS = 60
RATE_MAX_REQUESTS = 30
_hits: Dict[str, Deque[float]] = defaultdict(deque)


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


class AgentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    screenContext: ScreenContextIn = ScreenContextIn()
    userMemory: UserMemoryIn = UserMemoryIn()
    history: List[TurnIn] = Field(default_factory=list, max_length=24)


def _to_dict(model: BaseModel) -> Dict[str, Any]:
    dump = getattr(model, "model_dump", None) or model.dict  # pydantic v2 or v1
    return dump()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()  # Render sits behind a proxy
    return forwarded or (request.client.host if request.client else "unknown")


def _rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    hits = _hits[ip]
    while hits and now - hits[0] > RATE_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= RATE_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment and try again.")
    hits.append(now)


def create_agent_router(user_dependency: Optional[Callable] = None) -> APIRouter:
    dependencies = [Depends(user_dependency)] if user_dependency else []
    router = APIRouter(prefix="/api/agent", tags=["agent"], dependencies=dependencies)

    @router.post("/reply")
    async def agent_reply(payload: AgentRequest, request: Request) -> Dict[str, Any]:
        _rate_limit(request)
        try:
            return await agent_engine.generate_agent_reply(
                payload.message,
                _to_dict(payload.screenContext),
                _to_dict(payload.userMemory),
                [_to_dict(t) for t in payload.history],
            )
        except agent_engine.AgentEngineError as exc:
            logger.warning("agent reply failed: %s", str(exc)[:300])
            # Never leak provider errors or keys to the browser.
            raise HTTPException(status_code=502, detail="The AI is busy right now. Please try again in a moment.")

    @router.get("/status")
    async def agent_status() -> Dict[str, Any]:
        """Safe diagnostics (no secrets)."""
        return {
            "key_present": bool(os.getenv("GEMINI_API_KEY", "").strip()),
            "model": agent_engine.primary_model(),
            "fallback_model": agent_engine.fallback_model(),
            "knowledge_files": agent_engine.knowledge_file_count(),
        }

    return router
