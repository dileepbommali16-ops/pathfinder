"""
Authenticated Local Laptop Desktop Bridge Hub (`backend/desktop_bridge.py`).

Allows Boss (strictly verified via `is_owner_user(email=...)` + `DAS_BRIDGE_TOKEN`) to
connect his Windows laptop companion (`desktop-agent/bridge_agent.py`) over outbound WSS
to Render so voice/text commands from EITHER his Laptop OR Phone execute directly in his
real installed Chrome (real Google Search/clicks/tabs, real mail.google.com, real
WhatsApp Web, real Programiz) and scoped local VS Code workspace files.
"""

import asyncio
import hmac
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from backend.owner_profile import PRIMARY_OWNER_EMAIL, is_owner_user

logger = logging.getLogger("pathfinder.desktop_bridge")
bridge_router = APIRouter()


def _get_expected_bridge_token() -> str:
    """Reads DAS_BRIDGE_TOKEN dynamically so runtime/test updates apply immediately."""
    return (os.getenv("DAS_BRIDGE_TOKEN") or "").strip()


def _verify_bridge_token(candidate: str) -> bool:
    """Fail-closed constant-time token comparison."""
    expected = _get_expected_bridge_token()
    provided = (candidate or "").strip()
    if not expected or not provided:
        return False
    return hmac.compare_digest(expected, provided)


@dataclass
class BridgeSession:
    owner_email: str
    ws: WebSocket
    host: str = "laptop"
    capabilities: list[str] = field(default_factory=list)
    chrome_ready: bool = False
    vscode_ready: bool = False
    active_url: str = ""
    active_title: str = ""
    tabs_count: int = 0
    connected_at: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    pending: Dict[str, asyncio.Future] = field(default_factory=dict)


class DesktopBridgeHub:
    """Tracks the authenticated owner laptop bridge WebSocket and dispatches tool RPCs."""

    def __init__(self) -> None:
        self._sessions: Dict[str, BridgeSession] = {}

    @staticmethod
    def _normalize_owner_email(email: str) -> str:
        clean = (email or "").strip().lower()
        return clean or PRIMARY_OWNER_EMAIL

    def is_connected(self, email: str = "") -> bool:
        """True ONLY when email is the verified Boss account and has an active open WS."""
        norm_email = self._normalize_owner_email(email)
        if not is_owner_user(email=norm_email):
            return False
        sess = self._sessions.get(norm_email)
        if not sess:
            return False
        if getattr(sess.ws, "client_state", None) == WebSocketState.DISCONNECTED:
            self._sessions.pop(norm_email, None)
            return False
        return True

    def get_status(self, email: str = "") -> Dict[str, Any]:
        """Returns safe bridge status telemetry (zero secrets exposed)."""
        raw_email = (email or "").strip().lower()
        if raw_email and not is_owner_user(email=raw_email):
            return {
                "connected": False,
                "chrome_ready": False,
                "vscode_ready": False,
                "active_url": "",
                "active_title": "",
                "tabs_count": 0,
                "host": "",
                "last_seen_age_sec": None,
                "owner_only": True,
            }

        target_email = raw_email or PRIMARY_OWNER_EMAIL
        sess = self._sessions.get(target_email)
        if not sess or getattr(sess.ws, "client_state", None) == WebSocketState.DISCONNECTED:
            if sess:
                self._sessions.pop(target_email, None)
            return {
                "connected": False,
                "chrome_ready": False,
                "vscode_ready": False,
                "active_url": "",
                "active_title": "",
                "tabs_count": 0,
                "host": "",
                "last_seen_age_sec": None,
                "owner_only": True,
            }

        return {
            "connected": True,
            "chrome_ready": bool(sess.chrome_ready),
            "vscode_ready": bool(sess.vscode_ready),
            "active_url": sess.active_url,
            "active_title": sess.active_title,
            "tabs_count": int(sess.tabs_count or 0),
            "host": sess.host,
            "capabilities": list(sess.capabilities),
            "last_seen_age_sec": round(max(0.0, time.time() - sess.last_seen), 2),
            "owner_only": True,
        }

    async def register(
        self,
        owner_email: str,
        ws: WebSocket,
        host: str = "laptop",
        capabilities: Optional[list[str]] = None,
    ) -> BridgeSession:
        norm_email = self._normalize_owner_email(owner_email)
        old = self._sessions.get(norm_email)
        if old and old.ws is not ws:
            self._fail_pending(old, "Replaced by a newer laptop bridge connection.")
            try:
                if getattr(old.ws, "client_state", None) != WebSocketState.DISCONNECTED:
                    await old.ws.close(code=1000, reason="Superseded by new bridge connection")
            except Exception:
                pass

        sess = BridgeSession(
            owner_email=norm_email,
            ws=ws,
            host=str(host or "laptop")[:64],
            capabilities=list(capabilities or []),
        )
        self._sessions[norm_email] = sess
        return sess

    def unregister(self, owner_email: str, ws: WebSocket) -> None:
        norm_email = self._normalize_owner_email(owner_email)
        sess = self._sessions.get(norm_email)
        if sess and sess.ws is ws:
            self._fail_pending(sess, "Laptop bridge disconnected.")
            self._sessions.pop(norm_email, None)

    @staticmethod
    def _fail_pending(sess: BridgeSession, error_msg: str) -> None:
        for req_id, fut in list(sess.pending.items()):
            sess.pending.pop(req_id, None)
            if not fut.done():
                fut.set_result({"ok": False, "bridge": "desktop_bridge", "error": error_msg})

    def update_heartbeat(self, sess: BridgeSession, payload: Dict[str, Any]) -> None:
        sess.last_seen = time.time()
        if "chrome_ready" in payload:
            sess.chrome_ready = bool(payload.get("chrome_ready"))
        if "vscode_ready" in payload:
            sess.vscode_ready = bool(payload.get("vscode_ready"))
        if "active_url" in payload:
            sess.active_url = str(payload.get("active_url") or "")[:300]
        if "active_title" in payload:
            sess.active_title = str(payload.get("active_title") or "")[:200]
        if "tabs_count" in payload:
            try:
                sess.tabs_count = max(0, int(payload.get("tabs_count") or 0))
            except (TypeError, ValueError):
                pass
        if isinstance(payload.get("capabilities"), list):
            sess.capabilities = [str(c) for c in payload["capabilities"][:20]]

    def resolve_result(self, sess: BridgeSession, req_id: str, payload: Any) -> None:
        sess.last_seen = time.time()
        fut = sess.pending.pop(req_id, None)
        if fut and not fut.done():
            result = dict(payload) if isinstance(payload, dict) else {"ok": True, "result": payload}
            result.setdefault("bridge", "desktop_bridge")
            fut.set_result(result)

    async def execute(
        self,
        email: str,
        tool: str,
        args: Optional[Dict[str, Any]] = None,
        timeout: float = 25.0,
    ) -> Optional[Dict[str, Any]]:
        """
        Dispatches a tool execution request to Boss's connected laptop bridge.
        Returns None when the bridge is offline or caller is not Boss.
        """
        norm_email = self._normalize_owner_email(email)
        if not self.is_connected(norm_email):
            return None
        sess = self._sessions.get(norm_email)
        if not sess:
            return None

        req_id = uuid.uuid4().hex
        loop = asyncio.get_running_loop()
        fut: asyncio.Future = loop.create_future()
        sess.pending[req_id] = fut

        try:
            await sess.ws.send_json(
                {
                    "type": "command",
                    "req_id": req_id,
                    "tool": tool,
                    "args": dict(args or {}),
                }
            )
        except Exception as send_err:
            sess.pending.pop(req_id, None)
            self.unregister(norm_email, sess.ws)
            return {
                "ok": False,
                "bridge": "desktop_bridge",
                "error": f"Failed to send command to laptop bridge: {send_err}",
            }

        try:
            res = await asyncio.wait_for(fut, timeout=timeout)
            return res if isinstance(res, dict) else {"ok": True, "bridge": "desktop_bridge", "result": res}
        except asyncio.TimeoutError:
            sess.pending.pop(req_id, None)
            return {
                "ok": False,
                "bridge": "desktop_bridge",
                "error": f"Laptop bridge timed out after {int(timeout)}s running '{tool}'.",
            }
        except Exception as wait_err:
            sess.pending.pop(req_id, None)
            return {"ok": False, "bridge": "desktop_bridge", "error": str(wait_err)}


desktop_bridge_hub = DesktopBridgeHub()


@bridge_router.websocket("/ws/desktop-bridge")
async def desktop_bridge_ws(websocket: WebSocket):
    """Outbound authenticated WebSocket channel from Boss's laptop agent to Render."""
    await websocket.accept()
    registered_email = ""
    sess: Optional[BridgeSession] = None

    try:
        raw_auth = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        import json

        auth_msg = json.loads(raw_auth)
        if not isinstance(auth_msg, dict) or auth_msg.get("type") != "auth":
            await websocket.send_json({"type": "auth_error", "error": "First message must be type='auth'."})
            await websocket.close(code=1008, reason="Invalid bridge handshake")
            return

        token = str(auth_msg.get("token") or "")
        owner_email = str(auth_msg.get("owner_email") or "").strip().lower()
        if not _verify_bridge_token(token) or not is_owner_user(email=owner_email):
            await websocket.send_json({"type": "auth_error", "error": "Unauthorized desktop bridge credentials."})
            await websocket.close(code=1008, reason="Unauthorized bridge credentials")
            return

        registered_email = owner_email
        sess = await desktop_bridge_hub.register(
            owner_email=owner_email,
            ws=websocket,
            host=str(auth_msg.get("host") or "laptop"),
            capabilities=auth_msg.get("capabilities") if isinstance(auth_msg.get("capabilities"), list) else [],
        )
        await websocket.send_json({"type": "auth_ok", "owner_email": owner_email})
        logger.info("[DesktopBridge] Authenticated bridge connected from host=%s", sess.host)

        while True:
            raw_msg = await websocket.receive_text()
            msg = json.loads(raw_msg)
            if not isinstance(msg, dict):
                continue
            m_type = msg.get("type")
            if m_type == "ping":
                sess.last_seen = time.time()
                await websocket.send_json({"type": "pong"})
            elif m_type == "heartbeat":
                desktop_bridge_hub.update_heartbeat(sess, msg)
            elif m_type == "result":
                req_id = str(msg.get("req_id") or "")
                if req_id:
                    payload = msg.get("payload")
                    if not isinstance(payload, dict):
                        payload = {
                            "ok": bool(msg.get("ok", True)),
                            "result": payload if payload is not None else msg.get("result"),
                            "error": msg.get("error"),
                        }
                    desktop_bridge_hub.resolve_result(sess, req_id, payload)
    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        try:
            await websocket.send_json({"type": "auth_error", "error": "Authentication handshake timed out."})
            await websocket.close(code=1008, reason="Auth timeout")
        except Exception:
            pass
    except Exception as exc:
        logger.warning("[DesktopBridge] WebSocket terminated: %s", exc)
    finally:
        if sess is not None and registered_email:
            desktop_bridge_hub.unregister(registered_email, websocket)


@bridge_router.get("/api/bridge/status")
def get_desktop_bridge_status(email: str = Query(default="")):
    """Returns safe status of Boss's laptop bridge (never exposes tokens or private data)."""
    return desktop_bridge_hub.get_status(email=email)


@bridge_router.post("/api/bridge/dispatch")
async def dispatch_bridge_command(
    payload: Dict[str, Any] = Body(...),
    x_bridge_token: str = Header(default="", alias="X-Bridge-Token"),
):
    """Token-authenticated direct RPC dispatch endpoint for diagnostics and verification."""
    if not _verify_bridge_token(x_bridge_token):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Bridge-Token")

    owner_email = str(payload.get("email") or PRIMARY_OWNER_EMAIL).strip().lower()
    if not is_owner_user(email=owner_email):
        raise HTTPException(status_code=403, detail="Desktop bridge is restricted to the owner account")

    tool = str(payload.get("tool") or "").strip()
    if not tool:
        raise HTTPException(status_code=400, detail="tool is required")

    args = payload.get("args") if isinstance(payload.get("args"), dict) else {}
    timeout = min(45.0, max(5.0, float(payload.get("timeout", 25.0))))
    res = await desktop_bridge_hub.execute(owner_email, tool, args, timeout=timeout)
    if res is None:
        return {"ok": False, "bridge_offline": True, "error": "Laptop desktop bridge is not connected."}
    return res


@bridge_router.post("/api/bridge/open-gmail")
async def bridge_open_real_gmail(payload: Dict[str, Any] = Body(default={})):
    """Switches Boss's connected Laptop Chrome directly to real mail.google.com."""
    email = str(payload.get("email") or "").strip().lower()
    if not is_owner_user(email=email):
        return {
            "ok": False,
            "bridge_offline": True,
            "real_url": "https://mail.google.com/mail/u/0/#inbox",
            "message": "Opening real Gmail directly in browser.",
        }

    res = await desktop_bridge_hub.execute(
        email,
        "gmail_workspace_control",
        {
            "action": "open_gmail_tab",
            "view": str(payload.get("view") or "inbox"),
            "query": str(payload.get("query") or ""),
        },
        timeout=20.0,
    )
    if res is None:
        return {
            "ok": False,
            "bridge_offline": True,
            "real_url": "https://mail.google.com/mail/u/0/#inbox",
            "message": "Laptop bridge offline; open real mail.google.com directly.",
        }
    return res
