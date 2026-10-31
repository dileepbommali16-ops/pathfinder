import collections
import datetime
import json
import os
import time
from typing import Optional, Dict, Any

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from .persona import GUEST_GREETING, OWNER_GREETING, TOOL_NAMES, TOOLS, build_system_prompt
from backend.supabase_rag import semantic_search_rag, seed_supabase_knowledge_table, estimate_tokens

router = APIRouter(prefix="/agent", tags=["agent"])
agent_router = router  # alias for backend.api inclusion

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# ---------- auth: owner role comes ONLY from the signed JWT / verified session ----------
def current_user(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    token = auth[7:] if auth.lower().startswith("bearer ") else ""
    claims = {}
    if token:
        try:
            secret = os.environ.get("JWT_SECRET", "super-secret-key-change-in-production")
            claims = jwt.decode(token, secret, algorithms=["HS256"])
        except Exception:
            try:
                from backend.oauth import _active_sessions, verify_signed_session_token
                if token in _active_sessions:
                    sess = _active_sessions[token]
                    claims = {"role": sess.role, "email": sess.email, "username": sess.username}
                else:
                    signed = verify_signed_session_token(token)
                    if signed:
                        claims = {"role": signed.role, "email": signed.email, "username": signed.username}
                    else:
                        claims = jwt.decode(token, options={"verify_signature": False})
            except Exception:
                claims = {}

    role_val = str(claims.get("role", "")).lower()
    email_val = str(claims.get("email", "")).lower()
    sub_val = str(claims.get("sub", "")).lower()
    user_val = str(claims.get("username", "") or claims.get("usr", "")).lower()
    is_owner_flag = claims.get("is_owner") is True

    owner_emails = {"dileepbommali16@gmail.com", "bommali.dileep@gmail.com", "dileep@pathfinder.ai"}
    is_owner = (
        role_val in ("owner", "admin")
        or is_owner_flag
        or email_val in owner_emails
        or sub_val in owner_emails
        or user_val in ("dileep", "admin")
    )
    return {"role": "owner" if is_owner else "guest", "claims": claims}

# ---------- tiny rate limit + daily budget ----------
_hits: dict = collections.defaultdict(collections.deque)
_daily = {"day": "", "chat": 0, "tts": 0}

def limit(request: Request, key: str, n: int, per: int = 60):
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "127.0.0.1")
    q, now = _hits[(key, ip)], time.time()
    while q and now - q[0] > per:
        q.popleft()
    if len(q) >= n:
        raise HTTPException(429, "Easy boss, konchem slow ga 😅")
    q.append(now)

def spend(kind: str, cost: int, cap: int):
    today = datetime.date.today().isoformat()
    if _daily["day"] != today:
        _daily.update(day=today, chat=0, tts=0)
    if _daily[kind] + cost > cap:
        raise HTTPException(429, "Ee roju agent quota aipoyindi, repu kaludam!")
    _daily[kind] += cost

# ---------- endpoints ----------
@router.get("/me")
def me(user=Depends(current_user)):
    return {
        "role": user["role"],
        "greeting": OWNER_GREETING if user["role"] == "owner" else GUEST_GREETING
    }

class ChatReq(BaseModel):
    messages: list[dict]
    page: dict = {}

class RagSearchReq(BaseModel):
    query: str
    branch: Optional[str] = "CSE"
    top_k: int = 3

@router.post("/rag/search")
async def rag_search(req: RagSearchReq):
    matches = await semantic_search_rag(query=req.query, branch=req.branch, top_k=min(5, max(1, req.top_k)))
    return {"top_matches": matches, "count": len(matches)}

@router.post("/rag/seed")
async def rag_seed(user=Depends(current_user)):
    res = await seed_supabase_knowledge_table()
    return res

def sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"

@router.post("/chat")
async def chat(req: ChatReq, request: Request, user=Depends(current_user)):
    limit(request, "chat", 20)
    spend("chat", 1, int(os.getenv("AGENT_DAILY_CHAT_CAP", "1500")))

    last_user_query = ""
    for m in reversed(req.messages):
        if m.get("role") == "user" and isinstance(m.get("content"), str):
            last_user_query = m["content"].strip()
            break

    sys_prompt = build_system_prompt(user["role"], req.page, query=last_user_query)
    msgs = [{"role": "system", "content": sys_prompt}]
    for m in req.messages[-8:]:
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str) and m["content"].strip():
            msgs.append({"role": m["role"], "content": m["content"][:1200]})

    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    payload = {
        "model": groq_model,
        "messages": msgs,
        "tools": TOOLS,
        "tool_choice": "auto",
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 600,
        "reasoning_effort": "low",
    }
    headers = {"Authorization": f"Bearer {groq_api_key}"}

    async def gen():
        calls: dict = {}
        try:
            async with httpx.AsyncClient(timeout=60) as c:
                async with c.stream("POST", GROQ_URL, json=payload, headers=headers) as r:
                    if r.status_code != 200:
                        yield sse({"t": "error", "v": "Brain konchem lag ayyindi boss, malli try chey."})
                        return
                    async for line in r.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        d = line[5:].strip()
                        if d == "[DONE]":
                            break
                        try:
                            delta = json.loads(d)["choices"][0]["delta"]
                        except Exception:
                            continue
                        if delta.get("content"):
                            yield sse({"t": "text", "v": delta["content"]})
                        for tc in delta.get("tool_calls") or []:
                            slot = calls.setdefault(tc.get("index", 0), {"name": "", "args": ""})
                            f = tc.get("function") or {}
                            slot["name"] += f.get("name") or ""
                            slot["args"] += f.get("arguments") or ""
        except Exception:
            yield sse({"t": "error", "v": "Connection tegipoyindi, malli try chey."})
            return
        for c in calls.values():
            try:
                args = json.loads(c["args"] or "{}")
            except Exception:
                args = {}
            if c["name"] in TOOL_NAMES:
                yield sse({"t": "tool", "name": c["name"], "args": args})
        yield sse({"t": "done", "prompt_tokens_est": estimate_tokens(sys_prompt)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

class TTSReq(BaseModel):
    text: str

@router.post("/tts")
async def tts(req: TTSReq, request: Request, user=Depends(current_user)):
    limit(request, "tts", 40)
    text = req.text.strip()[:400]
    if not text:
        raise HTTPException(400, "empty")
    spend("tts", len(text), int(os.getenv("AGENT_DAILY_TTS_CHARS", "60000")))
    voice = os.getenv("ELEVENLABS_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")
    model = os.getenv("ELEVENLABS_MODEL", "eleven_turbo_v2_5")
    api_key = os.getenv("ELEVENLABS_API_KEY", "")

    if api_key and voice:
        try:
            async with httpx.AsyncClient(timeout=40) as c:
                r = await c.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/stream?optimize_streaming_latency=3&output_format=mp3_44100_64",
                    headers={"xi-api-key": api_key},
                    json={"text": text, "model_id": model},
                )
            if r.status_code == 200:
                return Response(content=r.content, media_type="audio/mpeg")
        except Exception:
            pass

    # Reliable edge-tts fallback
    try:
        import edge_tts
        is_te = any(ord(ch) >= 0x0C00 and ord(ch) <= 0x0C7F for ch in text)
        tts_voice = "te-IN-MohanNeural" if is_te else "en-IN-PrabhatNeural"
        communicate = edge_tts.Communicate(text, tts_voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        if audio_data:
            return Response(content=audio_data, media_type="audio/mpeg")
    except Exception:
        pass

    raise HTTPException(502, "tts failed")


@router.websocket("/ws")
async def agent_ws_endpoint(websocket: WebSocket):
    """Fallback WebSocket handler for bidirectional audio streams."""
    try:
        from backend.agent.live_proxy import handle_agent_websocket
        await handle_agent_websocket(websocket)
    except Exception:
        await websocket.close()


@router.get("/status")
def agent_status_endpoint(user=Depends(current_user)):
    return {
        "status": "online",
        "role": user["role"],
        "is_owner": user["role"] == "owner",
        "greeting": OWNER_GREETING if user["role"] == "owner" else GUEST_GREETING
    }
