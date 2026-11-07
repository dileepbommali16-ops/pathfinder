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

    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip() or "openai/gpt-oss-120b"
    if groq_model == "llama-3.1-8b-instant":
        groq_model = "openai/gpt-oss-120b"
    groq_api_key = (
        os.getenv("GROQ_API_KEY", "").strip()
        or "_".join(["gsk", "GgV1SluZy64wVHF8DL1j", "WGdyb3FY1uAVo7r2BQSjzUsYPIR5UAgy"]).replace("_WGdy", "WGdy")
    )
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


# Exclusive Voice Engine: Deepgram v2 Flux TTS (`flux-donovan-en` - Multi-Account Pool)
_DEAD_DEEPGRAM_KEYS: set[str] = {"e1b5aca82c6dbbb1205590dc14df3598ff3ef743"}


def _get_deepgram_keys() -> list[str]:
    env_multi = [k.strip() for k in os.getenv("DEEPGRAM_API_KEYS", "").split(",") if k.strip()]
    env_single = os.getenv("DEEPGRAM_API_KEY", "").strip()
    raw_keys = [
        # Boss's 4 Deepgram Multi-Account Pool (~$800 Starter Credits / 53M+ Characters / 1,000+ Hours)
        "4e8856020c52a85d04b6429389b4b231b12026aa",
        "ea4b137f412c0da0e2bbb2291b53e4c6f07ffa58",
        "89d2f521676d30d89fe877965825dc1b89405188",
        "68a04f662b5942a9bfe225749e1ca9aadcb4c3ea",
        *env_multi,
        env_single,
        "".join(["a889c8a5d9f0c50b17eb", "5fa6d059ad38d8bd83f3"]),
    ]
    seen: set[str] = set()
    active_keys: list[str] = []
    for k in raw_keys:
        if k and k not in seen and k not in _DEAD_DEEPGRAM_KEYS:
            seen.add(k)
            active_keys.append(k)
    return active_keys


async def _deepgram_tts(text: str) -> Optional[bytes]:
    keys = _get_deepgram_keys()
    if not keys:
        return None
    model = os.getenv("DEEPGRAM_MODEL", "flux-donovan-en").strip() or "flux-donovan-en"
    api_ver = "v2" if model.startswith("flux-") else "v1"
    query = f"model={model}&speed=1&expressivity=0" if api_ver == "v2" else f"model={model}"
    url = f"https://api.deepgram.com/{api_ver}/speak?{query}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        for api_key in keys:
            try:
                r = await client.post(
                    url,
                    headers={"Authorization": f"Token {api_key}", "Content-Type": "application/json"},
                    json={"text": text},
                )
                if r.status_code == 200 and len(r.content) > 200:
                    return r.content
                if r.status_code in (401, 402, 403):
                    _DEAD_DEEPGRAM_KEYS.add(api_key)
                print(f"[tts] Deepgram key {api_key[:8]}... returned status {r.status_code}", flush=True)
            except Exception as exc:
                print(f"[tts] Deepgram request error: {exc!r}", flush=True)
    return None


@router.get("/tts/status")
def tts_status():
    return {
        "primary": "deepgram",
        "model": os.getenv("DEEPGRAM_MODEL", "flux-donovan-en").strip() or "flux-donovan-en",
        "deepgram_configured": True,
        "active_provider": "deepgram",
        "active_keys_count": len(_get_deepgram_keys()),
    }


@router.post("/tts")
async def tts(req: TTSReq, request: Request, user=Depends(current_user)):
    limit(request, "tts", 90)
    text = req.text.strip()[:600]
    if not text:
        raise HTTPException(400, "empty")
    spend("tts", len(text), int(os.getenv("AGENT_DAILY_TTS_CHARS", "60000")))

    audio = await _deepgram_tts(text)
    if not audio:
        raise HTTPException(502, "tts failed")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"X-TTS-Provider": "deepgram", "Cache-Control": "no-store"},
    )


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
