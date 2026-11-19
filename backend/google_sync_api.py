# backend/google_sync_api.py
"""
Real Google Workspace (Gmail API v1, Google Calendar API v3, Google Sheets) + n8n fallback.
Uses stored OAuth 2.0 tokens with automatic refresh so DAS AI can read inbox, read messages,
draft, reply, send real emails, and schedule real Calendar events directly from Boss's Gmail.
"""
import asyncio
import base64
import email.mime.text
import html
import ipaddress
import json
import os
import re
import socket
import time
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from backend.database import get_google_workspace_tokens, save_google_workspace_tokens
from backend.google_automation import google_auto

router = APIRouter(prefix="/api/google", tags=["Google Workspace, Gmail & Placement Automation"])

N8N_WEBHOOK_URL = os.getenv(
    "N8N_WEBHOOK_URL",
    "https://dileepdas.app.n8n.cloud/webhook/pathfinder-google-sync",
).strip()
DEFAULT_OWNER_EMAIL = "dileepbommali16@gmail.com"


async def trigger_n8n_webhook_async(event_type: str, data: dict) -> bool:
    urls = [
        N8N_WEBHOOK_URL,
        "https://dileepdas.app.n8n.cloud/webhook/pathfinder-google-sync",
        "https://dileepdas.app.n8n.cloud/webhook-test/pathfinder-google-sync",
    ]
    seen = set()
    for u in urls:
        if not u or u in seen:
            continue
        seen.add(u)
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    u,
                    json={"source": "Pathfinder 2.0 Autonomous Career OS", "event": event_type, "data": data},
                )
                if resp.status_code < 400:
                    return True
        except Exception:
            continue
    return False


def trigger_n8n_webhook(event_type: str, data: dict) -> bool:
    urls = [
        N8N_WEBHOOK_URL,
        "https://dileepdas.app.n8n.cloud/webhook/pathfinder-google-sync",
        "https://dileepdas.app.n8n.cloud/webhook-test/pathfinder-google-sync",
    ]
    seen = set()
    for u in urls:
        if not u or u in seen:
            continue
        seen.add(u)
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.post(
                    u,
                    json={"source": "Pathfinder 2.0 Autonomous Career OS", "event": event_type, "data": data},
                )
                if resp.status_code < 400:
                    return True
        except Exception:
            continue
    return False


# ============================================================================
# REAL GOOGLE OAUTH 2.0 TOKEN MANAGEMENT & AUTO-REFRESH
# ============================================================================

async def get_valid_google_access_token(user_email: str) -> Optional[str]:
    clean_email = (user_email or DEFAULT_OWNER_EMAIL).strip().lower()
    tok = await asyncio.to_thread(get_google_workspace_tokens, clean_email)
    if not tok:
        return None

    access_token = tok.get("access_token") or ""
    refresh_token = tok.get("refresh_token") or ""
    expires_at = float(tok.get("expires_at") or 0.0)

    if access_token and expires_at > time.time() + 90:
        return access_token

    if not refresh_token:
        return access_token or None

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return access_token or None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                new_access = data.get("access_token") or ""
                new_exp = time.time() + float(data.get("expires_in") or 3500)
                if new_access:
                    await asyncio.to_thread(
                        save_google_workspace_tokens,
                        clean_email,
                        new_access,
                        refresh_token,
                        new_exp,
                        tok.get("scope", ""),
                    )
                    return new_access
    except Exception:
        pass
    return access_token or None


def _decode_gmail_body(payload: Dict[str, Any]) -> str:
    """Recursively extracts clean UTF-8 text from a Gmail API message payload."""
    if not isinstance(payload, dict):
        return ""
    mime = (payload.get("mimeType") or "").lower()
    body_data = (payload.get("body") or {}).get("data")
    if body_data and mime in ("text/plain", ""):
        try:
            padded = body_data + "=" * (-len(body_data) % 4)
            return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace").strip()
        except Exception:
            pass
    parts = payload.get("parts") or []
    plain_chunks: List[str] = []
    html_fallback: List[str] = []
    for part in parts:
        p_mime = (part.get("mimeType") or "").lower()
        if p_mime == "text/plain":
            txt = _decode_gmail_body(part)
            if txt:
                plain_chunks.append(txt)
        elif p_mime.startswith("multipart/"):
            txt = _decode_gmail_body(part)
            if txt:
                plain_chunks.append(txt)
        elif p_mime == "text/html" and (part.get("body") or {}).get("data"):
            try:
                raw_h = part["body"]["data"]
                padded = raw_h + "=" * (-len(raw_h) % 4)
                html_txt = base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")
                import re
                stripped = re.sub(r"<[^>]+>", " ", html_txt)
                stripped = re.sub(r"\s+", " ", stripped).strip()
                if stripped:
                    html_fallback.append(stripped)
            except Exception:
                pass
    if plain_chunks:
        return "\n".join(plain_chunks).strip()
    if html_fallback:
        return "\n".join(html_fallback).strip()
    if body_data:
        try:
            padded = body_data + "=" * (-len(body_data) % 4)
            return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace").strip()
        except Exception:
            return ""
    return ""


def _build_rfc2822_base64url(to_addr: str, subject: str, body_text: str, in_reply_to: str = "") -> str:
    msg = email.mime.text.MIMEText(body_text or "", "plain", "utf-8")
    msg["To"] = to_addr
    msg["Subject"] = subject or "Message from DAS AI"
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    raw_bytes = msg.as_bytes()
    return base64.urlsafe_b64encode(raw_bytes).decode("ascii")


# ============================================================================
# REAL GMAIL + CALENDAR SERVICE HELPERS (callable by HTTP routes AND live_proxy!)
# ============================================================================

async def gmail_list_messages_service(
    user_email: str, query: str = "", max_results: int = 5
) -> Dict[str, Any]:
    token = await get_valid_google_access_token(user_email)
    if not token:
        return {
            "ok": False,
            "needs_auth": True,
            "message": "Gmail is not authorized yet. Click 'Connect Gmail' in Pathfinder HUD once to grant Gmail read/send access.",
        }

    headers = {"Authorization": f"Bearer {token}"}
    params: Dict[str, Any] = {"maxResults": max(1, min(int(max_results or 5), 15))}
    if query:
        params["q"] = query

    async with httpx.AsyncClient(timeout=12.0) as client:
        list_resp = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers=headers,
            params=params,
        )
        if list_resp.status_code == 401:
            return {
                "ok": False,
                "needs_auth": True,
                "message": "Gmail authorization expired. Please click 'Connect Gmail' once to reconnect.",
            }
        if list_resp.status_code >= 400:
            return {"ok": False, "message": f"Gmail API error ({list_resp.status_code}): {list_resp.text[:160]}"}

        refs = (list_resp.json() or {}).get("messages") or []
        emails: List[Dict[str, Any]] = []
        for ref in refs[: params["maxResults"]]:
            mid = ref.get("id")
            if not mid:
                continue
            m_resp = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}",
                headers=headers,
                params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            )
            if m_resp.status_code == 200:
                m_data = m_resp.json()
                hdrs = {
                    h.get("name", "").lower(): h.get("value", "")
                    for h in ((m_data.get("payload") or {}).get("headers") or [])
                }
                emails.append({
                    "id": mid,
                    "threadId": m_data.get("threadId", ""),
                    "from": hdrs.get("from", ""),
                    "subject": hdrs.get("subject", "(No Subject)"),
                    "date": hdrs.get("date", ""),
                    "snippet": (m_data.get("snippet") or "")[:200],
                })
        return {"ok": True, "count": len(emails), "emails": emails}


async def gmail_read_message_service(user_email: str, message_id: str) -> Dict[str, Any]:
    token = await get_valid_google_access_token(user_email)
    if not token:
        return {
            "ok": False,
            "needs_auth": True,
            "message": "Gmail is not authorized yet. Click 'Connect Gmail' in Pathfinder HUD once.",
        }

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}",
            headers=headers,
            params={"format": "full"},
        )
        if resp.status_code >= 400:
            return {"ok": False, "message": f"Unable to read email {message_id} ({resp.status_code})."}
        data = resp.json()
        payload = data.get("payload") or {}
        hdrs = {h.get("name", "").lower(): h.get("value", "") for h in (payload.get("headers") or [])}
        body = _decode_gmail_body(payload)
        return {
            "ok": True,
            "id": data.get("id"),
            "threadId": data.get("threadId"),
            "from": hdrs.get("from", ""),
            "to": hdrs.get("to", ""),
            "subject": hdrs.get("subject", ""),
            "date": hdrs.get("date", ""),
            "body": (body or data.get("snippet") or "")[:2500],
        }


async def gmail_send_message_service(
    user_email: str,
    recipient_email: str,
    subject: str,
    body: str,
    thread_id: str = "",
) -> Dict[str, Any]:
    token = await get_valid_google_access_token(user_email)
    if token:
        raw_b64 = _build_rfc2822_base64url(recipient_email, subject, body)
        req_body: Dict[str, Any] = {"raw": raw_b64}
        if thread_id:
            req_body["threadId"] = thread_id
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=req_body,
            )
            if resp.status_code < 400:
                sent_data = resp.json()
                return {
                    "ok": True,
                    "provider": "gmail_api_oauth",
                    "message_id": sent_data.get("id"),
                    "threadId": sent_data.get("threadId"),
                    "message": f"Real Gmail sent to {recipient_email} with subject '{subject}'.",
                }
            err_preview = resp.text[:160]
            if resp.status_code == 401:
                return {
                    "ok": False,
                    "needs_auth": True,
                    "message": f"Gmail token expired ({err_preview}). Click 'Connect Gmail' once to refresh authorization.",
                }

    # Fallback to n8n webhook if Gmail OAuth isn't connected yet
    n8n_ok = await trigger_n8n_webhook_async(
        "gmail_send",
        {"recipient_email": recipient_email, "subject": subject, "body": body},
    )
    if n8n_ok:
        return {
            "ok": True,
            "provider": "n8n_webhook",
            "message": f"Email queued via n8n webhook to {recipient_email}. (Connect Gmail OAuth in HUD for direct Gmail API send/read!)",
        }
    return {
        "ok": False,
        "needs_auth": True,
        "message": "Gmail OAuth is not connected yet. Click 'Connect Gmail' in Pathfinder HUD once so DAS can send and read real emails directly.",
    }


async def gmail_create_draft_service(
    user_email: str, recipient_email: str, subject: str, body: str
) -> Dict[str, Any]:
    token = await get_valid_google_access_token(user_email)
    if not token:
        return {
            "ok": False,
            "needs_auth": True,
            "message": "Gmail is not authorized yet. Click 'Connect Gmail' in Pathfinder HUD once.",
        }
    raw_b64 = _build_rfc2822_base64url(recipient_email, subject, body)
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"message": {"raw": raw_b64}},
        )
        if resp.status_code < 400:
            data = resp.json()
            return {
                "ok": True,
                "draft_id": data.get("id"),
                "message": f"Saved real Gmail draft to {recipient_email} ('{subject}').",
            }
        return {"ok": False, "message": f"Gmail draft error ({resp.status_code}): {resp.text[:150]}"}


async def calendar_create_event_service(
    user_email: str, summary: str, description: str, start_iso: str = ""
) -> Dict[str, Any]:
    token = await get_valid_google_access_token(user_email)
    if token:
        now_utc = datetime.now(timezone.utc)
        start_dt = now_utc + timedelta(hours=24)
        if start_iso:
            try:
                parsed = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                start_dt = parsed
            except Exception:
                pass
        end_dt = start_dt + timedelta(hours=1)
        event_payload = {
            "summary": summary or "Pathfinder Interview / Event",
            "description": description or "Scheduled by DAS AI Agent",
            "start": {"dateTime": start_dt.isoformat()},
            "end": {"dateTime": end_dt.isoformat()},
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=event_payload,
            )
            if resp.status_code < 400:
                ev = resp.json()
                return {
                    "ok": True,
                    "provider": "google_calendar_api",
                    "event_id": ev.get("id"),
                    "htmlLink": ev.get("htmlLink"),
                    "message": f"Scheduled real Google Calendar event: '{summary}'.",
                }
    n8n_ok = await trigger_n8n_webhook_async(
        "calendar_schedule",
        {"student_email": user_email, "summary": summary, "description": description, "start_iso": start_iso},
    )
    return {
        "ok": n8n_ok,
        "provider": "n8n_webhook" if n8n_ok else "unconnected",
        "message": (
            f"Calendar event sent via n8n webhook: '{summary}'."
            if n8n_ok
            else "Connect Gmail/Workspace in HUD once to schedule real Google Calendar events."
        ),
    }


# ============================================================================
# FASTAPI ROUTES
# ============================================================================

class GmailSendRequest(BaseModel):
    recipient_email: str
    subject: str
    body: str
    user_email: Optional[str] = None
    thread_id: Optional[str] = None


class CalendarSyncRequest(BaseModel):
    student_email: str
    company_name: str
    interview_time: str
    role_title: str


class SheetLogRequest(BaseModel):
    student_name: str
    branch: str
    readiness_score: float
    target_role: str


@router.get("/workspace/status")
async def workspace_oauth_status(
    request: Request, email: str = Query(default=DEFAULT_OWNER_EMAIL)
):
    clean_email = (email or DEFAULT_OWNER_EMAIL).strip().lower()
    tok = await asyncio.to_thread(get_google_workspace_tokens, clean_email)
    scopes = (tok.get("scope") or "").split() if tok else []
    has_gmail = any("gmail" in s for s in scopes)
    has_cal = any("calendar" in s for s in scopes)
    base_url = os.getenv("BACKEND_PUBLIC_URL", "https://pathfinder-backend-sg.onrender.com").rstrip("/")
    return {
        "connected": bool(tok and (has_gmail or tok.get("access_token"))),
        "email": clean_email,
        "has_gmail": has_gmail,
        "has_calendar": has_cal,
        "has_refresh_token": bool(tok and tok.get("refresh_token")),
        "connect_url": f"{base_url}/api/auth/google/workspace/start",
    }


@router.get("/gmail/list")
async def list_gmail_messages(
    email: str = Query(default=DEFAULT_OWNER_EMAIL),
    query: str = Query(default=""),
    max_results: int = Query(default=5, ge=1, le=15),
):
    return await gmail_list_messages_service(email, query=query, max_results=max_results)


@router.get("/gmail/read/{message_id}")
async def read_gmail_message(
    message_id: str, email: str = Query(default=DEFAULT_OWNER_EMAIL)
):
    return await gmail_read_message_service(email, message_id)


@router.post("/gmail/send")
async def send_gmail_message(payload: GmailSendRequest):
    """Sends a real Gmail message via Gmail API OAuth (with n8n fallback)."""
    try:
        sender = (payload.user_email or DEFAULT_OWNER_EMAIL).strip().lower()
        res = await gmail_send_message_service(
            user_email=sender,
            recipient_email=payload.recipient_email,
            subject=payload.subject,
            body=payload.body,
            thread_id=payload.thread_id or "",
        )
        return {
            "success": bool(res.get("ok")),
            "n8n_synced": res.get("provider") == "n8n_webhook",
            **res,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gmail/draft")
async def draft_gmail_message(payload: GmailSendRequest):
    sender = (payload.user_email or DEFAULT_OWNER_EMAIL).strip().lower()
    return await gmail_create_draft_service(
        user_email=sender,
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        body=payload.body,
    )


@router.post("/calendar/schedule")
async def schedule_google_calendar(payload: CalendarSyncRequest):
    try:
        res = await calendar_create_event_service(
            user_email=payload.student_email or DEFAULT_OWNER_EMAIL,
            summary=f"{payload.company_name} — {payload.role_title}",
            description=f"Scheduled via Pathfinder DAS AI for {payload.interview_time}",
            start_iso=payload.interview_time,
        )
        return {
            "success": bool(res.get("ok")),
            "n8n_synced": res.get("provider") == "n8n_webhook",
            "details": res,
            "message": res.get("message", "Scheduled interview."),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sheets/log")
async def log_to_tpo_sheet(payload: SheetLogRequest):
    try:
        local_res = google_auto.log_to_placement_sheet(
            student_name=payload.student_name,
            branch=payload.branch,
            score=payload.readiness_score,
        )
        n8n_triggered = await trigger_n8n_webhook_async("tpo_sheet_log", payload.model_dump())
        return {
            "success": True,
            "n8n_synced": n8n_triggered,
            "message": f"Updated {payload.student_name} ({payload.readiness_score}%) in TPO Google Sheet.",
            "details": local_res,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CLOUD WEB SEARCH & SSRF-SAFE PAGE READER (LAPTOP + PHONE/TABLET SUPPORT)
# ============================================================================

def _is_public_ip(ip_obj: Any) -> bool:
    return not (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_reserved
        or ip_obj.is_multicast
        or ip_obj.is_unspecified
    )


def _is_safe_public_url(url: str) -> bool:
    """Blocks non-HTTP(S) schemes, localhost, internal hostnames, and private/loopback/link-local IPs."""
    raw = (url or "").strip()
    if not raw or len(raw) > 2048:
        return False
    try:
        parsed = urllib.parse.urlparse(raw)
    except Exception:
        return False

    if parsed.scheme.lower() not in ("http", "https"):
        return False

    hostname = (parsed.hostname or "").strip().lower().rstrip(".")
    if not hostname:
        return False
    if hostname in ("localhost", "ip6-localhost", "ip6-loopback") or hostname.endswith(
        (".localhost", ".local", ".internal", ".arpa")
    ):
        return False

    # Direct IP literal check (catches IPv4, IPv6, decimal/hex normalized by urlparse/ipaddress)
    try:
        ip_lit = ipaddress.ip_address(hostname)
        return _is_public_ip(ip_lit)
    except ValueError:
        pass

    # Best-effort DNS resolution check when network DNS is available
    try:
        infos = socket.getaddrinfo(hostname, None)
        for info in infos:
            addr = info[4][0].split("%")[0]
            try:
                resolved_ip = ipaddress.ip_address(addr)
                if not _is_public_ip(resolved_ip):
                    return False
            except ValueError:
                return False
    except OSError:
        # Offline / restricted DNS environments still validate literal IPs and reserved suffixes above
        pass

    return True


def _compute_is_official(query: str, title: str, url: str) -> bool:
    try:
        host = (urllib.parse.urlparse(url).hostname or "").lower().replace("www.", "")
    except Exception:
        host = ""
    q_tokens = [t for t in re.split(r"[^a-z0-9]+", (query or "").lower()) if len(t) >= 3]
    if any(tok in host for tok in q_tokens):
        return True
    if "claude" in q_tokens and ("anthropic.com" in host or "claude.ai" in host):
        return True
    if "official" in (title or "").lower():
        return True
    return False


class _DuckDuckGoHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results: List[Dict[str, str]] = []
        self._in_title_a = False
        self._in_snippet = False
        self._current: Optional[Dict[str, str]] = None
        self._buf: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple]):
        attr_map = dict(attrs)
        cls = (attr_map.get("class") or "").split()
        if tag == "a" and "result__a" in cls:
            if self._current and self._current.get("url"):
                self.results.append(self._current)
            self._current = {"title": "", "url": attr_map.get("href", ""), "snippet": ""}
            self._in_title_a = True
            self._buf = []
        elif tag in ("a", "div", "span") and "result__snippet" in cls and self._current is not None:
            self._in_snippet = True
            self._buf = []

    def handle_data(self, data: str):
        if self._in_title_a or self._in_snippet:
            self._buf.append(data)

    def handle_endtag(self, tag: str):
        if tag == "a" and self._in_title_a and self._current is not None:
            self._current["title"] = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            self._in_title_a = False
            self._buf = []
        elif tag in ("a", "div", "span") and self._in_snippet and self._current is not None:
            self._current["snippet"] = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            self._in_snippet = False
            self._buf = []
            if self._current.get("url"):
                self.results.append(self._current)
                self._current = None


def _unwrap_ddg_url(raw_href: str) -> str:
    if not raw_href:
        return ""
    if raw_href.startswith("//"):
        raw_href = "https:" + raw_href
    try:
        parsed = urllib.parse.urlparse(raw_href)
        if "duckduckgo.com" in (parsed.hostname or "") and parsed.path.startswith("/l"):
            qs = urllib.parse.parse_qs(parsed.query)
            if qs.get("uddg"):
                return qs["uddg"][0]
    except Exception:
        pass
    return raw_href


class _ReadablePageParser(HTMLParser):
    _SKIP_TAGS = {"script", "style", "noscript", "svg", "iframe"}

    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.title = ""
        self.headings: List[str] = []
        self.links: List[Dict[str, str]] = []
        self._text_parts: List[str] = []
        self._skip_depth = 0
        self._in_title = False
        self._in_heading = False
        self._in_link = False
        self._link_href = ""
        self._buf: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple]):
        t = tag.lower()
        if t in self._SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth > 0:
            return
        if t == "title":
            self._in_title = True
            self._buf = []
        elif t in ("h1", "h2", "h3"):
            self._in_heading = True
            self._buf = []
        elif t == "a":
            href = dict(attrs).get("href") or ""
            abs_href = urllib.parse.urljoin(self.base_url, href)
            if abs_href.startswith(("http://", "https://")):
                self._in_link = True
                self._link_href = abs_href
                self._buf = []

    def handle_data(self, data: str):
        if self._skip_depth > 0:
            return
        clean = data.strip()
        if clean:
            self._text_parts.append(clean)
        if self._in_title or self._in_heading or self._in_link:
            self._buf.append(data)

    def handle_endtag(self, tag: str):
        t = tag.lower()
        if t in self._SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if t == "title" and self._in_title:
            self.title = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            self._in_title = False
            self._buf = []
        elif t in ("h1", "h2", "h3") and self._in_heading:
            txt = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if txt and len(self.headings) < 15:
                self.headings.append(txt[:140])
            self._in_heading = False
            self._buf = []
        elif t == "a" and self._in_link:
            txt = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if txt and len(txt) >= 2 and len(self.links) < 15:
                self.links.append({"text": txt[:80], "href": self._link_href})
            self._in_link = False
            self._link_href = ""
            self._buf = []

    @property
    def body_text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self._text_parts)).strip()


async def web_search_service(query: str, max_results: int = 8) -> Dict[str, Any]:
    clean_q = (query or "").strip()
    limit = max(1, min(int(max_results or 8), 12))
    if not clean_q:
        return {"ok": False, "error": "Search query is required.", "results": []}

    results: List[Dict[str, Any]] = []
    # 1. Fast Bing RSS organic search (clean URLs & snippets, no CAPTCHA on cloud IPs)
    try:
        async with httpx.AsyncClient(
            timeout=6.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"},
        ) as client:
            bing_resp = await client.get(
                "https://www.bing.com/search",
                params={"q": clean_q, "format": "rss"},
            )
            if bing_resp.status_code == 200 and "<item>" in bing_resp.text:
                root = ET.fromstring(bing_resp.text)
                seen_urls = set()
                for item in root.findall(".//item"):
                    real_url = (item.findtext("link") or "").strip()
                    if not real_url.startswith(("http://", "https://")) or real_url in seen_urls:
                        continue
                    seen_urls.add(real_url)
                    host = (urllib.parse.urlparse(real_url).hostname or "").lower().replace("www.", "")
                    title = html.unescape((item.findtext("title") or host or real_url).strip())
                    desc = html.unescape(re.sub(r"\s+", " ", (item.findtext("description") or "").strip()))
                    results.append(
                        {
                            "index": len(results) + 1,
                            "title": title[:140],
                            "url": real_url,
                            "host": host,
                            "snippet": desc[:220],
                            "is_official": _compute_is_official(clean_q, title, real_url),
                        }
                    )
                    if len(results) >= limit:
                        break
    except Exception:
        pass

    # 2. Fast DuckDuckGo HTML search fallback
    if not results:
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "en-US,en;q=0.9",
            }
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True, headers=headers) as client:
                resp = await client.get("https://html.duckduckgo.com/html/", params={"q": clean_q})
                if resp.status_code == 200 and resp.text:
                    parser = _DuckDuckGoHTMLParser()
                    parser.feed(resp.text)
                    if parser._current and parser._current.get("url"):
                        parser.results.append(parser._current)
                    seen_urls = set()
                    for item in parser.results:
                        real_url = _unwrap_ddg_url(item.get("url", ""))
                        if not real_url.startswith(("http://", "https://")) or real_url in seen_urls:
                            continue
                        seen_urls.add(real_url)
                        host = (urllib.parse.urlparse(real_url).hostname or "").lower().replace("www.", "")
                        title = html.unescape(item.get("title") or host or real_url)
                        results.append(
                            {
                                "index": len(results) + 1,
                                "title": title[:140],
                                "url": real_url,
                                "host": host,
                                "snippet": html.unescape(item.get("snippet") or "")[:220],
                                "is_official": _compute_is_official(clean_q, title, real_url),
                            }
                        )
                        if len(results) >= limit:
                            break
        except Exception:
            pass

    # 3. Gemini Google Search grounding fallback if web feeds returned 0 results
    if not results:
        try:
            from google import genai
            from google.genai import types
            from backend.config.key_resolver import get_gemini_key_candidates

            for key in get_gemini_key_candidates():
                gclient = genai.Client(http_options={"api_version": "v1beta"}, api_key=key)
                for m_name in ("gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"):
                    try:
                        resp = await asyncio.to_thread(
                            gclient.models.generate_content,
                            model=m_name,
                            contents=f"Search the web for: {clean_q}. Include official website URLs.",
                            config=types.GenerateContentConfig(
                                tools=[types.Tool(google_search=types.GoogleSearch())],
                                temperature=0.1,
                                max_output_tokens=300,
                            ),
                        )
                        cands = getattr(resp, "candidates", None) or []
                        gm = getattr(cands[0], "grounding_metadata", None) if cands else None
                        chunks = getattr(gm, "grounding_chunks", None) or []
                        seen = set()
                        for ch in chunks:
                            web = getattr(ch, "web", None)
                            uri = getattr(web, "uri", None) if web else None
                            title = getattr(web, "title", None) if web else ""
                            if not uri or uri in seen:
                                continue
                            seen.add(uri)
                            host = (urllib.parse.urlparse(uri).hostname or "").lower().replace("www.", "")
                            results.append(
                                {
                                    "index": len(results) + 1,
                                    "title": (title or host or uri)[:140],
                                    "url": uri,
                                    "host": host,
                                    "snippet": "",
                                    "is_official": _compute_is_official(clean_q, title or "", uri),
                                }
                            )
                            if len(results) >= limit:
                                break
                        if results:
                            break
                    except Exception:
                        continue
                if results:
                    break
        except Exception:
            pass

    return {
        "ok": True,
        "query": clean_q,
        "count": len(results),
        "results": results,
    }


async def web_read_page_service(url: str) -> Dict[str, Any]:
    target_url = (url or "").strip()
    if target_url and not re.match(r"^https?://", target_url, re.I):
        target_url = f"https://{target_url}"

    safe = await asyncio.to_thread(_is_safe_public_url, target_url)
    if not safe:
        raise HTTPException(
            status_code=400,
            detail="Blocked unsafe or non-public URL for security reasons.",
        )

    title = ""
    headings: List[str] = []
    links: List[Dict[str, str]] = []
    body_text = ""
    final_url = target_url

    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(target_url)
            final_url = str(resp.url)
            if not await asyncio.to_thread(_is_safe_public_url, final_url):
                raise HTTPException(status_code=400, detail="Blocked redirect to unsafe internal URL.")
            if resp.status_code < 400 and resp.text:
                parser = _ReadablePageParser(final_url)
                parser.feed(resp.text)
                title = html.unescape(parser.title)
                headings = [html.unescape(h) for h in parser.headings]
                links = parser.links
                body_text = html.unescape(parser.body_text)
    except HTTPException:
        raise
    except Exception:
        pass

    # SPA / JS-rendered fallback via r.jina.ai markdown reader
    if len(body_text) < 150:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                jina_resp = await client.get(
                    f"https://r.jina.ai/{final_url}",
                    headers={"Accept": "text/plain"},
                )
                if jina_resp.status_code == 200 and len(jina_resp.text.strip()) > len(body_text):
                    jina_txt = jina_resp.text.strip()
                    if not title:
                        m_title = re.search(r"^Title:\s*(.+)$", jina_txt, re.M)
                        if m_title:
                            title = m_title.group(1).strip()
                    cleaned = re.sub(r"^(Title|URL Source|Markdown Content):.*$", "", jina_txt, flags=re.M)
                    cleaned = re.sub(r"\s+", " ", cleaned).strip()
                    if cleaned:
                        body_text = cleaned
        except Exception:
            pass

    return {
        "ok": bool(body_text or headings or title),
        "url": final_url,
        "title": title or final_url,
        "headings": headings[:15],
        "links": links[:15],
        "text": body_text[:3500],
    }


@router.get("/web/search")
async def google_web_search_route(
    q: str = Query(..., min_length=1),
    max_results: int = Query(default=8, ge=1, le=12),
):
    return await web_search_service(q, max_results=max_results)


@router.get("/web/read")
async def google_web_read_route(url: str = Query(..., min_length=4)):
    return await web_read_page_service(url)
