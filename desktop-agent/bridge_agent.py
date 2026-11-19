"""
Pathfinder 2.0 — Local Laptop Desktop Bridge Agent (`desktop-agent/bridge_agent.py`)

Connects Boss's Windows laptop over outbound WSS to Render (`/ws/desktop-bridge`)
using `DAS_BRIDGE_TOKEN` and automates Boss's REAL installed Google Chrome via
Playwright + scoped local VS Code workspace files.

Usage:
  python desktop-agent/bridge_agent.py               # Normal 24/7 daemon mode
  python desktop-agent/bridge_agent.py --open-chrome # Launch/attach real Chrome immediately
  python desktop-agent/bridge_agent.py --probe-only  # Verify WSS auth with Render and exit 0
"""

import argparse
import asyncio
import json
import logging
import os
import re
import shutil
import socket
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
        return False

import websockets

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("das.desktop_bridge")

PROGRAMIZ_URLS: Dict[str, str] = {
    "c": "https://www.programiz.com/c-programming/online-compiler/",
    "cpp": "https://www.programiz.com/cpp-programming/online-compiler/",
    "c++": "https://www.programiz.com/cpp-programming/online-compiler/",
    "python": "https://www.programiz.com/python-programming/online-compiler/",
    "py": "https://www.programiz.com/python-programming/online-compiler/",
    "java": "https://www.programiz.com/java-programming/online-compiler/",
    "javascript": "https://www.programiz.com/javascript/online-compiler/",
    "js": "https://www.programiz.com/javascript/online-compiler/",
    "sql": "https://www.programiz.com/sql/online-compiler/",
    "go": "https://www.programiz.com/golang/online-compiler/",
    "golang": "https://www.programiz.com/golang/online-compiler/",
    "rust": "https://www.programiz.com/rust/online-compiler/",
    "csharp": "https://www.programiz.com/csharp-programming/online-compiler/",
    "php": "https://www.programiz.com/php/online-compiler/",
}


def _find_installed_chrome_exe() -> Optional[str]:
    candidates = [
        os.environ.get("CHROME_EXECUTABLE_PATH", ""),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


def _is_cdp_alive(cdp_url: str) -> bool:
    try:
        req = urllib.request.Request(f"{cdp_url.rstrip('/')}/json/version")
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            return resp.status == 200
    except Exception:
        return False


class RealChromeController:
    """Drives Boss's real installed Google Chrome on Windows via Playwright."""

    def __init__(self) -> None:
        self._pw: Any = None
        self._browser: Any = None
        self._context: Any = None
        self._active_page: Any = None
        self._lock = asyncio.Lock()
        self.last_search_results: List[Dict[str, Any]] = []

    @property
    def is_ready(self) -> bool:
        return self._context is not None

    def get_telemetry(self) -> Dict[str, Any]:
        if not self._context:
            return {"chrome_ready": False, "active_url": "", "active_title": "", "tabs_count": 0}
        pages = [p for p in self._context.pages if not p.is_closed()]
        active = self._active_page if (self._active_page and not self._active_page.is_closed()) else (pages[-1] if pages else None)
        url = ""
        title = ""
        if active:
            try:
                url = active.url or ""
            except Exception:
                url = ""
        return {
            "chrome_ready": True,
            "active_url": url,
            "active_title": title,
            "tabs_count": len(pages),
        }

    async def ensure_started(self) -> Any:
        if self._context is not None:
            pages = [p for p in self._context.pages if not p.is_closed()]
            if pages:
                if not self._active_page or self._active_page.is_closed():
                    self._active_page = pages[-1]
                return self._context
            # All tabs were closed manually; create a fresh tab
            try:
                self._active_page = await self._context.new_page()
                return self._context
            except Exception:
                await self.close()

        from playwright.async_api import async_playwright

        self._pw = await async_playwright().start()
        cdp_url = (os.getenv("CHROME_CDP_URL") or "http://127.0.0.1:9222").strip()

        if _is_cdp_alive(cdp_url):
            logger.info("Attaching to existing Chrome over CDP (%s)...", cdp_url)
            self._browser = await self._pw.chromium.connect_over_cdp(cdp_url)
            contexts = self._browser.contexts
            self._context = contexts[0] if contexts else await self._browser.new_context(no_viewport=True)
        else:
            profile_dir = (
                os.getenv("CHROME_PROFILE_DIR")
                or os.path.join(os.environ.get("LOCALAPPDATA") or str(BASE_DIR), "PathfinderDASChromeProfile")
            ).strip()
            os.makedirs(profile_dir, exist_ok=True)
            chrome_exe = _find_installed_chrome_exe()
            logger.info("Launching REAL Google Chrome with persistent profile: %s", profile_dir)
            launch_kwargs: Dict[str, Any] = {
                "user_data_dir": profile_dir,
                "headless": False,
                "no_viewport": True,
                "ignore_default_args": ["--enable-automation"],
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--start-maximized",
                    "--no-first-run",
                    "--no-default-browser-check",
                ],
            }
            if chrome_exe:
                launch_kwargs["executable_path"] = chrome_exe
            else:
                launch_kwargs["channel"] = "chrome"

            self._context = await self._pw.chromium.launch_persistent_context(**launch_kwargs)

        def _on_new_page(page: Any) -> None:
            self._active_page = page

        self._context.on("page", _on_new_page)
        pages = [p for p in self._context.pages if not p.is_closed()]
        self._active_page = pages[-1] if pages else await self._context.new_page()
        return self._context

    async def get_active_page(self) -> Any:
        await self.ensure_started()
        pages = [p for p in self._context.pages if not p.is_closed()]
        if not self._active_page or self._active_page.is_closed():
            self._active_page = pages[-1] if pages else await self._context.new_page()
        return self._active_page

    async def _extract_page_summary(self, page: Any) -> Dict[str, Any]:
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=7000)
        except Exception:
            pass
        try:
            data = await page.evaluate(
                """() => {
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                        .map(h => (h.innerText || '').trim())
                        .filter(Boolean)
                        .slice(0, 12);
                    const links = Array.from(document.querySelectorAll('a[href]'))
                        .map(a => ({
                            text: (a.innerText || a.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 90),
                            href: a.href || ''
                        }))
                        .filter(l => l.text && /^https?:\\/\\//i.test(l.href))
                        .slice(0, 15);
                    const bodyText = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 3500);
                    return {
                        title: document.title || '',
                        url: location.href || '',
                        headings,
                        links,
                        text: bodyText
                    };
                }"""
            )
            return data if isinstance(data, dict) else {"title": "", "url": page.url, "headings": [], "links": [], "text": ""}
        except Exception as exc:
            return {"title": "", "url": getattr(page, "url", ""), "headings": [], "links": [], "text": "", "note": str(exc)}

    def _resolve_search_result_url(self, args: Dict[str, Any]) -> Optional[str]:
        if args.get("url") and str(args["url"]).startswith(("http://", "https://")):
            return str(args["url"])
        if not self.last_search_results:
            return None

        target = str(args.get("target") or "").lower().strip()
        idx = int(args.get("index") or 0)
        if not idx and target:
            if re.search(r"\b(1st|first|top)\b", target):
                idx = 1
            elif re.search(r"\b(2nd|second)\b", target):
                idx = 2
            elif re.search(r"\b(3rd|third)\b", target):
                idx = 3
            elif re.search(r"\b(4th|fourth)\b", target):
                idx = 4
            elif re.search(r"\b(5th|fifth)\b", target):
                idx = 5

        if idx >= 1 and idx <= len(self.last_search_results):
            return str(self.last_search_results[idx - 1].get("url") or "") or None

        if re.search(r"\b(official|main|homepage|docs|documentation)\b", target):
            for r in self.last_search_results:
                if r.get("isOfficial") or r.get("is_official"):
                    return str(r.get("url") or "")
            return str(self.last_search_results[0].get("url") or "")

        if target:
            tokens = [t for t in re.split(r"\s+", target) if len(t) >= 3]
            best_url = None
            best_score = 0
            for r in self.last_search_results:
                hay = f"{r.get('title', '')} {r.get('host', '')} {r.get('url', '')}".lower()
                score = sum(2 for tok in tokens if tok in hay)
                if score > best_score:
                    best_score = score
                    best_url = str(r.get("url") or "")
            if best_url:
                return best_url
        return None

    async def handle_chrome_control(self, args: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            action = str(args.get("action") or "read_page").lower().strip()
            ctx = await self.ensure_started()
            page = await self.get_active_page()

            if action == "google_search":
                query = str(args.get("query") or args.get("text") or "").strip()
                if not query:
                    return {"ok": False, "error": "query is required for google_search"}
                search_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&hl=en"
                await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)
                try:
                    await page.bring_to_front()
                except Exception:
                    pass
                try:
                    await page.wait_for_selector("#search a h3, div.g a", timeout=6000)
                except Exception:
                    pass

                raw_results = await page.evaluate(
                    """(q) => {
                        const out = [];
                        const seen = new Set();
                        const headings = Array.from(document.querySelectorAll('#search a h3, #rso a h3, a h3'));
                        for (const h3 of headings) {
                            const a = h3.closest('a[href]');
                            if (!a) continue;
                            const href = a.href || '';
                            if (!/^https?:\\/\\//i.test(href) || href.includes('google.com/search')) continue;
                            if (seen.has(href)) continue;
                            seen.add(href);
                            let host = '';
                            try { host = new URL(href).hostname.replace(/^www\\./, ''); } catch {}
                            const container = a.closest('div.g, div[data-hveid], div.MjjYud') || a.parentElement;
                            const snippet = container ? (container.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 220) : '';
                            const qTokens = (q || '').toLowerCase().split(/\\s+/).filter(t => t.length >= 3);
                            const isOfficial = qTokens.some(t => host.toLowerCase().includes(t));
                            out.push({
                                index: out.length + 1,
                                title: (h3.innerText || '').trim(),
                                url: href,
                                host,
                                snippet,
                                isOfficial
                            });
                            if (out.length >= 10) break;
                        }
                        return out;
                    }""",
                    query,
                )
                results = raw_results if isinstance(raw_results, list) else []
                self.last_search_results = results
                return {
                    "ok": True,
                    "action": "google_search",
                    "query": query,
                    "url": page.url,
                    "count": len(results),
                    "results": results,
                    "message": f"Searched Google in real Chrome for '{query}' ({len(results)} results).",
                }

            if action == "open_url":
                raw_url = str(args.get("url") or args.get("target") or "").strip()
                if not raw_url:
                    return {"ok": False, "error": "url is required for open_url"}
                if not re.match(r"^https?://", raw_url, re.I):
                    raw_url = f"https://{raw_url}"
                await page.goto(raw_url, wait_until="domcontentloaded", timeout=22000)
                try:
                    await page.bring_to_front()
                except Exception:
                    pass
                summary = await self._extract_page_summary(page)
                return {"ok": True, "action": "open_url", **summary}

            if action == "click":
                resolved_url = self._resolve_search_result_url(args)
                target = str(args.get("target") or "").strip()
                pages_before = set(ctx.pages)
                clicked_how = ""

                if resolved_url:
                    # Try clicking the matching anchor on the page first; otherwise navigate directly
                    clicked_anchor = await page.evaluate(
                        """(targetHref) => {
                            const anchors = Array.from(document.querySelectorAll('a[href]'));
                            const exact = anchors.find(a => a.href === targetHref);
                            if (exact) {
                                exact.scrollIntoView({ block: 'center' });
                                exact.removeAttribute('target');
                                exact.click();
                                return true;
                            }
                            return false;
                        }""",
                        resolved_url,
                    )
                    if clicked_anchor:
                        clicked_how = f"clicked anchor {resolved_url}"
                        await asyncio.sleep(1.2)
                    else:
                        await page.goto(resolved_url, wait_until="domcontentloaded", timeout=22000)
                        clicked_how = f"opened {resolved_url}"
                elif target:
                    clicked_dom = await page.evaluate(
                        """(qRaw) => {
                            const q = (qRaw || '').toLowerCase().trim();
                            const nodes = Array.from(document.querySelectorAll('a, button, [role="button"], [role="link"], [role="tab"], input[type="submit"]'));
                            let best = null;
                            let bestScore = 0;
                            for (const el of nodes) {
                                const rect = el.getBoundingClientRect();
                                if (rect.width < 3 || rect.height < 3) continue;
                                const label = ((el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.value || '') + '').replace(/\\s+/g, ' ').trim();
                                const low = label.toLowerCase();
                                if (!low) continue;
                                let score = 0;
                                if (low === q) score = 10;
                                else if (low.startsWith(q)) score = 7;
                                else if (low.includes(q)) score = 5;
                                if (score > bestScore) {
                                    bestScore = score;
                                    best = { el, label };
                                }
                            }
                            if (best && best.el) {
                                best.el.scrollIntoView({ block: 'center' });
                                if (best.el.tagName === 'A') best.el.removeAttribute('target');
                                best.el.click();
                                return best.label;
                            }
                            return null;
                        }""",
                        target,
                    )
                    if not clicked_dom:
                        return {"ok": False, "error": f"Could not find clickable link or button matching '{target}'."}
                    clicked_how = f"clicked '{clicked_dom}'"
                    await asyncio.sleep(1.3)
                else:
                    return {"ok": False, "error": "Provide target, index, or url to click."}

                new_pages = [p for p in ctx.pages if p not in pages_before and not p.is_closed()]
                if new_pages:
                    page = new_pages[-1]
                    self._active_page = page
                try:
                    await page.bring_to_front()
                except Exception:
                    pass
                summary = await self._extract_page_summary(page)
                return {"ok": True, "action": "click", "clicked": clicked_how, **summary}

            if action == "type":
                text = str(args.get("text") or args.get("query") or "")
                target = str(args.get("target") or "").strip()
                submit = bool(args.get("submit", True))
                typed_ok = await page.evaluate(
                    """({ target, text }) => {
                        const inputs = Array.from(document.querySelectorAll('textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"]), [contenteditable="true"]'));
                        let chosen = null;
                        const q = (target || '').toLowerCase();
                        for (const el of inputs) {
                            const r = el.getBoundingClientRect();
                            if (r.width < 4 || r.height < 4) continue;
                            const label = ((el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '') + '').toLowerCase();
                            if (!q || label.includes(q)) {
                                chosen = el;
                                break;
                            }
                        }
                        if (!chosen && inputs.length) chosen = inputs[0];
                        if (!chosen) return false;
                        chosen.focus();
                        if (chosen.getAttribute('contenteditable') === 'true') {
                            chosen.innerText = text;
                        } else {
                            chosen.value = text;
                        }
                        chosen.dispatchEvent(new Event('input', { bubbles: true }));
                        chosen.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }""",
                    {"target": target, "text": text},
                )
                if not typed_ok:
                    return {"ok": False, "error": "No visible input field found on current page."}
                if submit:
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(1.2)
                summary = await self._extract_page_summary(page)
                return {"ok": True, "action": "type", "typed": text, "submitted": submit, **summary}

            if action == "scroll":
                direction = str(args.get("direction") or "down").lower().strip()
                await page.evaluate(
                    """(dir) => {
                        if (dir === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
                        else if (dir === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        else if (dir === 'up') window.scrollBy({ top: -650, behavior: 'smooth' });
                        else window.scrollBy({ top: 650, behavior: 'smooth' });
                    }""",
                    direction,
                )
                await asyncio.sleep(0.4)
                summary = await self._extract_page_summary(page)
                return {"ok": True, "action": "scroll", "direction": direction, **summary}

            if action == "list_tabs":
                pages = [p for p in ctx.pages if not p.is_closed()]
                tabs = []
                for idx, p in enumerate(pages, start=1):
                    try:
                        t_title = await p.title()
                    except Exception:
                        t_title = ""
                    tabs.append({"index": idx, "title": t_title, "url": p.url, "active": p is page})
                return {"ok": True, "action": "list_tabs", "count": len(tabs), "tabs": tabs}

            if action in ("switch_tab", "return_to_pathfinder"):
                pages = [p for p in ctx.pages if not p.is_closed()]
                query = "pathfinder" if action == "return_to_pathfinder" else str(args.get("query") or args.get("target") or args.get("domain") or "").lower().strip()
                idx = int(args.get("index") or 0)
                chosen = None
                if idx >= 1 and idx <= len(pages):
                    chosen = pages[idx - 1]
                elif query:
                    for p in pages:
                        try:
                            t_title = (await p.title()).lower()
                        except Exception:
                            t_title = ""
                        if query in (p.url or "").lower() or query in t_title:
                            chosen = p
                            break
                if not chosen:
                    return {"ok": False, "error": f"No open Chrome tab matched '{query or idx}'."}
                self._active_page = chosen
                await chosen.bring_to_front()
                summary = await self._extract_page_summary(chosen)
                return {"ok": True, "action": action, **summary}

            if action == "close_tab":
                pages = [p for p in ctx.pages if not p.is_closed()]
                if len(pages) <= 1:
                    await page.goto("https://www.google.com", wait_until="domcontentloaded")
                    return {"ok": True, "action": "close_tab", "message": "Reset single tab to Google."}
                await page.close()
                remaining = [p for p in ctx.pages if not p.is_closed()]
                self._active_page = remaining[-1]
                await self._active_page.bring_to_front()
                summary = await self._extract_page_summary(self._active_page)
                return {"ok": True, "action": "close_tab", **summary}

            if action == "go_back":
                await page.go_back(wait_until="domcontentloaded", timeout=12000)
                summary = await self._extract_page_summary(page)
                return {"ok": True, "action": "go_back", **summary}

            if action == "go_forward":
                await page.go_forward(wait_until="domcontentloaded", timeout=12000)
                summary = await self._extract_page_summary(page)
                return {"ok": True, "action": "go_forward", **summary}

            # Default: read_page
            summary = await self._extract_page_summary(page)
            return {"ok": True, "action": "read_page", **summary}

    async def _ensure_real_gmail_page(self, view: str = "inbox") -> Any:
        ctx = await self.ensure_started()
        pages = [p for p in ctx.pages if not p.is_closed()]
        gmail_page = None
        for p in pages:
            if "mail.google.com" in (p.url or ""):
                gmail_page = p
                break
        target_hash = f"#{view}" if view in ("inbox", "sent", "drafts", "starred") else "#inbox"
        target_url = f"https://mail.google.com/mail/u/0/{target_hash}"
        if gmail_page is None:
            gmail_page = await ctx.new_page()
            await gmail_page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
        elif view and target_hash not in (gmail_page.url or ""):
            await gmail_page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
        self._active_page = gmail_page
        try:
            await gmail_page.bring_to_front()
        except Exception:
            pass
        return gmail_page

    async def _scrape_gmail_rows(self, page: Any) -> List[Dict[str, Any]]:
        try:
            await page.wait_for_selector("tr.zA", timeout=8000)
        except Exception:
            pass
        rows = await page.evaluate(
            """() => {
                return Array.from(document.querySelectorAll('tr.zA')).slice(0, 10).map((tr, i) => {
                    const senderEl = tr.querySelector('.yX.xY .yW span[email], .yX.xY .yW, span.bA4 span');
                    const subjEl = tr.querySelector('.bog');
                    const snipEl = tr.querySelector('.y2');
                    const timeEl = tr.querySelector('td.xW span');
                    return {
                        index: i + 1,
                        from: senderEl ? (senderEl.innerText || senderEl.getAttribute('email') || '').trim() : '',
                        subject: subjEl ? (subjEl.innerText || '').trim() : '',
                        snippet: snipEl ? (snipEl.innerText || '').replace(/^\\s*-\\s*/, '').trim() : '',
                        date: timeEl ? (timeEl.innerText || '').trim() : '',
                        unread: tr.classList.contains('zE')
                    };
                });
            }"""
        )
        return rows if isinstance(rows, list) else []

    async def handle_gmail_control(self, args: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            action = str(args.get("action") or "open_gmail_tab").lower().strip()
            view = str(args.get("view") or "inbox").lower().strip()
            page = await self._ensure_real_gmail_page(view=view)

            if "accounts.google.com" in (page.url or ""):
                return {
                    "ok": False,
                    "needs_chrome_login": True,
                    "url": page.url,
                    "message": (
                        "Real Chrome opened Google Sign-In. Sign in once to dileepbommali16@gmail.com "
                        "in that Chrome window and your real Gmail session stays saved permanently!"
                    ),
                }

            if action == "open_gmail_tab":
                emails = await self._scrape_gmail_rows(page)
                return {
                    "ok": True,
                    "action": "open_gmail_tab",
                    "url": page.url,
                    "count": len(emails),
                    "emails": emails,
                    "message": f"Opened your REAL Gmail ({view}) in Chrome with {len(emails)} visible emails.",
                }

            if action in ("search_gmail_visual", "list_emails"):
                query = str(args.get("query") or "").strip()
                if query:
                    search_url = f"https://mail.google.com/mail/u/0/#search/{urllib.parse.quote(query)}"
                    await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)
                    await asyncio.sleep(1.6)
                emails = await self._scrape_gmail_rows(page)
                return {
                    "ok": True,
                    "action": action,
                    "query": query,
                    "url": page.url,
                    "count": len(emails),
                    "emails": emails,
                }

            if action == "open_email_visual":
                thread_id = str(args.get("thread_id") or args.get("message_id") or "").strip()
                idx = int(args.get("index") or 0)
                target = str(args.get("target") or args.get("query") or "").lower().strip()
                if thread_id:
                    await page.goto(f"https://mail.google.com/mail/u/0/#all/{thread_id}", wait_until="domcontentloaded")
                else:
                    clicked = await page.evaluate(
                        """({ idx, target }) => {
                            const rows = Array.from(document.querySelectorAll('tr.zA'));
                            let chosen = null;
                            if (idx >= 1 && idx <= rows.length) {
                                chosen = rows[idx - 1];
                            } else if (target) {
                                chosen = rows.find(r => (r.innerText || '').toLowerCase().includes(target));
                            } else if (rows.length) {
                                chosen = rows[0];
                            }
                            if (!chosen) return false;
                            chosen.scrollIntoView({ block: 'center' });
                            chosen.click();
                            return true;
                        }""",
                        {"idx": idx, "target": target},
                    )
                    if not clicked:
                        return {"ok": False, "error": "Could not find matching email row in real Gmail."}
                await asyncio.sleep(1.5)
                mail_data = await page.evaluate(
                    """() => {
                        const subj = document.querySelector('h2.hP');
                        const sender = document.querySelector('span.gD');
                        const bodies = Array.from(document.querySelectorAll('div.a3s.aiL, div.a3s'))
                            .map(b => (b.innerText || '').trim())
                            .filter(Boolean);
                        return {
                            subject: subj ? (subj.innerText || '').trim() : '',
                            from: sender ? ((sender.innerText || '') + ' <' + (sender.getAttribute('email') || '') + '>').trim() : '',
                            body: bodies.join('\\n---\\n').slice(0, 3500)
                        };
                    }"""
                )
                return {"ok": True, "action": "open_email_visual", "url": page.url, **(mail_data if isinstance(mail_data, dict) else {})}

            if action in ("compose_visual", "send_email"):
                to_addr = str(args.get("recipient_email") or "").strip()
                subject = str(args.get("subject") or "Message from DAS AI").strip()
                body = str(args.get("body") or args.get("details") or "").strip()
                send_now = bool(args.get("send_now", True)) or action == "send_email"

                # Click real Compose button in Gmail
                compose_btn = page.locator('div[gh="cm"], div[role="button"]:has-text("Compose")').first
                await compose_btn.click(timeout=8000)
                await asyncio.sleep(1.0)

                if to_addr:
                    to_box = page.locator('input[aria-label*="To"], input[peoplekit-id], textarea[name="to"]').first
                    await to_box.click(timeout=6000)
                    await to_box.fill(to_addr)
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(0.4)

                subj_box = page.locator('input[name="subjectbox"]').first
                await subj_box.click(timeout=6000)
                await subj_box.fill(subject)

                body_box = page.locator('div[aria-label="Message Body"][contenteditable="true"], div[role="textbox"][aria-label*="Body"]').first
                await body_box.click(timeout=6000)
                await body_box.fill(body)

                if send_now and to_addr:
                    send_btn = page.locator('div[role="button"][aria-label^="Send"]').first
                    await send_btn.click(timeout=6000)
                    await asyncio.sleep(1.2)
                    return {
                        "ok": True,
                        "action": action,
                        "sent": True,
                        "recipient_email": to_addr,
                        "subject": subject,
                        "message": f"Composed and clicked Send inside your real Gmail to {to_addr}!",
                    }
                return {
                    "ok": True,
                    "action": action,
                    "sent": False,
                    "recipient_email": to_addr,
                    "subject": subject,
                    "message": "Opened real Gmail Compose box and filled recipient, subject, and body.",
                }

            if action == "reply_email":
                body = str(args.get("body") or "").strip()
                send_now = bool(args.get("send_now", True))
                reply_btn = page.locator('div[role="button"][aria-label^="Reply"], span[role="link"]:has-text("Reply")').first
                await reply_btn.click(timeout=7000)
                await asyncio.sleep(0.9)
                body_box = page.locator('div[aria-label="Message Body"][contenteditable="true"], div[role="textbox"][aria-label*="Body"]').first
                await body_box.click(timeout=6000)
                await body_box.fill(body)
                if send_now:
                    send_btn = page.locator('div[role="button"][aria-label^="Send"]').first
                    await send_btn.click(timeout=6000)
                    await asyncio.sleep(1.0)
                return {"ok": True, "action": "reply_email", "sent": send_now, "message": "Executed real Gmail reply."}

            if action == "click_gmail":
                target = str(args.get("target") or "Inbox").strip()
                low = target.lower()
                if low in ("inbox", "sent", "drafts", "starred"):
                    await page.goto(f"https://mail.google.com/mail/u/0/#{low}", wait_until="domcontentloaded")
                    emails = await self._scrape_gmail_rows(page)
                    return {"ok": True, "action": "click_gmail", "target": target, "emails": emails}
                btn = page.locator(f'[role="button"]:has-text("{target}"), a:has-text("{target}")').first
                await btn.click(timeout=6000)
                return {"ok": True, "action": "click_gmail", "target": target}

            return {"ok": False, "error": f"Unsupported Gmail bridge action: {action}"}

    async def handle_whatsapp_control(self, args: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            ctx = await self.ensure_started()
            phone = re.sub(r"[^\d]", "", str(args.get("phone") or ""))
            contact = str(args.get("contact") or "").strip()
            message = str(args.get("message") or "").strip()

            pages = [p for p in ctx.pages if not p.is_closed()]
            wa_page = next((p for p in pages if "web.whatsapp.com" in (p.url or "")), None)
            if wa_page is None:
                wa_page = await ctx.new_page()

            if phone:
                url = f"https://web.whatsapp.com/send?phone={phone}&text={urllib.parse.quote(message)}"
                await wa_page.goto(url, wait_until="domcontentloaded", timeout=25000)
            else:
                if "web.whatsapp.com" not in (wa_page.url or ""):
                    await wa_page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=25000)

            self._active_page = wa_page
            await wa_page.bring_to_front()

            if phone and message:
                try:
                    send_btn = wa_page.locator('button[aria-label="Send"], span[data-icon="send"]').first
                    await send_btn.wait_for(timeout=14000)
                    await send_btn.click()
                    return {"ok": True, "sent": True, "phone": phone, "message": f"Sent WhatsApp message to {contact or phone}!"}
                except Exception:
                    return {
                        "ok": True,
                        "sent": False,
                        "phone": phone,
                        "message": "Opened WhatsApp Web chat with message pre-filled (press Enter or scan QR if first time).",
                    }

            return {"ok": True, "url": wa_page.url, "message": "Opened WhatsApp Web in real Chrome."}

    async def handle_programiz_control(self, args: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            ctx = await self.ensure_started()
            action = str(args.get("action") or "write_and_run").lower().strip()
            lang = str(args.get("language") or "c").lower().strip()
            code = str(args.get("source_code") or args.get("code") or "")
            target_url = PROGRAMIZ_URLS.get(lang, PROGRAMIZ_URLS["c"])

            pages = [p for p in ctx.pages if not p.is_closed()]
            prog_page = next((p for p in pages if "programiz.com" in (p.url or "")), None)
            if prog_page is None:
                prog_page = await ctx.new_page()
            if target_url not in (prog_page.url or ""):
                await prog_page.goto(target_url, wait_until="domcontentloaded", timeout=25000)

            self._active_page = prog_page
            await prog_page.bring_to_front()

            if action == "open":
                return {"ok": True, "action": "open", "language": lang, "url": prog_page.url}

            if action in ("write_and_run", "clear"):
                new_code = "" if action == "clear" else code
                await prog_page.evaluate(
                    """(src) => {
                        const cm = document.querySelector('.CodeMirror')?.CodeMirror;
                        if (cm && typeof cm.setValue === 'function') {
                            cm.setValue(src);
                            return true;
                        }
                        if (window.ace) {
                            const edEl = document.querySelector('.ace_editor');
                            if (edEl) {
                                window.ace.edit(edEl).setValue(src, -1);
                                return true;
                            }
                        }
                        return false;
                    }""",
                    new_code,
                )
                if action == "clear":
                    return {"ok": True, "action": "clear", "language": lang, "message": "Cleared Programiz editor."}

                try:
                    run_btn = prog_page.locator('button.run-button, button:has-text("Run")').first
                    await run_btn.click(timeout=6000)
                    await asyncio.sleep(2.5)
                except Exception:
                    pass

            output = await prog_page.evaluate(
                """() => {
                    const outEl = document.querySelector('.output-text, #terminal, .terminal-output, pre');
                    return outEl ? (outEl.innerText || '').trim().slice(0, 2500) : '';
                }"""
            )
            return {
                "ok": True,
                "action": action,
                "language": lang,
                "url": prog_page.url,
                "output": output,
                "hasError": bool(re.search(r"\b(error|exception|traceback|undefined reference)\b", output, re.I)),
            }

    async def close(self) -> None:
        try:
            if self._context:
                await self._context.close()
        except Exception:
            pass
        try:
            if self._pw:
                await self._pw.stop()
        except Exception:
            pass
        self._context = None
        self._browser = None
        self._pw = None
        self._active_page = None


def handle_vscode_control(args: Dict[str, Any]) -> Dict[str, Any]:
    """Safe path-confined workspace file editor + VS Code launcher."""
    workspace_root = Path(os.getenv("DAS_WORKSPACE_DIR") or (BASE_DIR / "workspace")).resolve()
    workspace_root.mkdir(parents=True, exist_ok=True)

    action = str(args.get("action") or "list_files").lower().strip()
    if action == "list_files":
        files = sorted(
            str(p.relative_to(workspace_root)).replace("\\", "/")
            for p in workspace_root.rglob("*")
            if p.is_file()
        )
        return {"ok": True, "action": "list_files", "workspace": str(workspace_root), "files": files[:60]}

    raw_name = str(args.get("filename") or "main.py").strip().lstrip("/\\")
    target_path = (workspace_root / raw_name).resolve()
    if not target_path.is_relative_to(workspace_root):
        return {"ok": False, "error": "Filename must stay inside the safe DAS workspace directory."}

    target_path.parent.mkdir(parents=True, exist_ok=True)

    if action == "write_file":
        incoming = str(args.get("source_code") or "")
        mode = str(args.get("mode") or "replace").lower().strip()
        if mode == "append" and target_path.exists():
            existing = target_path.read_text(encoding="utf-8", errors="replace")
            content = f"{existing.rstrip()}\n{incoming}\n"
        else:
            content = incoming
        target_path.write_text(content, encoding="utf-8")
        if args.get("open_in_vscode", True) and shutil.which("code"):
            try:
                subprocess.Popen(["code", str(target_path)], shell=False)
            except Exception:
                pass
        return {
            "ok": True,
            "action": "write_file",
            "filename": raw_name,
            "line_count": len(content.splitlines()),
            "message": f"Wrote {raw_name} ({len(content.splitlines())} lines) in workspace.",
        }

    if action == "read_file":
        if not target_path.exists():
            return {"ok": False, "error": f"File '{raw_name}' does not exist in workspace."}
        text = target_path.read_text(encoding="utf-8", errors="replace")
        numbered = "\n".join(f"{i + 1}: {line}" for i, line in enumerate(text.splitlines()))
        return {"ok": True, "action": "read_file", "filename": raw_name, "code": text, "numbered_code": numbered}

    if action == "delete_code":
        if not target_path.exists():
            return {"ok": False, "error": f"File '{raw_name}' not found."}
        text = target_path.read_text(encoding="utf-8", errors="replace")
        start_line = args.get("start_line")
        end_line = args.get("end_line")
        target_text = str(args.get("target_text") or "").strip()
        if target_text and target_text.upper() != "ALL":
            updated = text.replace(target_text, "")
        elif start_line is not None:
            lines = text.splitlines()
            s_idx = max(0, int(start_line) - 1)
            e_idx = max(s_idx, int(end_line or start_line) - 1)
            del lines[s_idx : e_idx + 1]
            updated = "\n".join(lines) + ("\n" if lines else "")
        else:
            updated = ""
        target_path.write_text(updated, encoding="utf-8")
        return {"ok": True, "action": "delete_code", "filename": raw_name, "code": updated}

    if action == "open_file":
        if not target_path.exists():
            target_path.write_text("", encoding="utf-8")
        if shutil.which("code"):
            subprocess.Popen(["code", str(target_path)], shell=False)
            return {"ok": True, "action": "open_file", "filename": raw_name, "opened_in_vscode": True}
        return {"ok": False, "error": "VS Code CLI ('code') is not on PATH."}

    return {"ok": False, "error": f"Unsupported vscode_control action: {action}"}


async def run_bridge_daemon(open_chrome_on_start: bool = False, probe_only: bool = False) -> int:
    ws_url = (
        os.getenv("DAS_BRIDGE_WS_URL")
        or "wss://pathfinder-backend-sg.onrender.com/ws/desktop-bridge"
    ).strip()
    token = (os.getenv("DAS_BRIDGE_TOKEN") or "").strip()
    owner_email = (os.getenv("OWNER_EMAIL") or "dileepbommali16@gmail.com").strip().lower()

    if not token:
        logger.error("DAS_BRIDGE_TOKEN is missing in desktop-agent/.env")
        return 1

    chrome = RealChromeController()
    vscode_available = bool(shutil.which("code"))
    host_name = socket.gethostname()

    if open_chrome_on_start and not probe_only:
        await chrome.ensure_started()

    backoff = 2.0
    try:
        while True:
            try:
                logger.info("Connecting to Render Desktop Bridge Hub (%s)...", ws_url)
                async with websockets.connect(ws_url, ping_interval=20, ping_timeout=20, max_size=4 * 1024 * 1024) as ws:
                    await ws.send(
                        json.dumps(
                            {
                                "type": "auth",
                                "token": token,
                                "owner_email": owner_email,
                                "host": host_name,
                                "capabilities": ["chrome", "gmail", "whatsapp", "programiz", "vscode"],
                            }
                        )
                    )
                    raw_reply = await asyncio.wait_for(ws.recv(), timeout=10.0)
                    reply = json.loads(raw_reply)
                    if reply.get("type") != "auth_ok":
                        logger.error("Bridge authentication rejected: %s", reply.get("error"))
                        return 2

                    logger.info("CONNECTED! Laptop Desktop Bridge is LIVE for %s (host=%s).", owner_email, host_name)
                    backoff = 2.0

                    tel = chrome.get_telemetry()
                    await ws.send(
                        json.dumps(
                            {
                                "type": "heartbeat",
                                "vscode_ready": vscode_available,
                                **tel,
                            }
                        )
                    )

                    if probe_only:
                        await asyncio.sleep(1.0)
                        logger.info("Probe-only handshake succeeded cleanly.")
                        return 0

                    async def _heartbeat_loop() -> None:
                        while True:
                            await asyncio.sleep(15.0)
                            t = chrome.get_telemetry()
                            await ws.send(json.dumps({"type": "heartbeat", "vscode_ready": vscode_available, **t}))

                    hb_task = asyncio.create_task(_heartbeat_loop())
                    try:
                        async for raw_msg in ws:
                            msg = json.loads(raw_msg)
                            if not isinstance(msg, dict):
                                continue
                            if msg.get("type") == "command":
                                req_id = str(msg.get("req_id") or "")
                                tool = str(msg.get("tool") or "")
                                args = msg.get("args") if isinstance(msg.get("args"), dict) else {}
                                logger.info("Executing command: tool=%s action=%s", tool, args.get("action"))
                                try:
                                    if tool == "chrome_browser_control":
                                        res = await chrome.handle_chrome_control(args)
                                    elif tool == "gmail_workspace_control":
                                        res = await chrome.handle_gmail_control(args)
                                    elif tool == "whatsapp_message_control":
                                        res = await chrome.handle_whatsapp_control(args)
                                    elif tool == "programiz_compiler":
                                        res = await chrome.handle_programiz_control(args)
                                    elif tool == "vscode_control":
                                        res = handle_vscode_control(args)
                                    else:
                                        res = {"ok": False, "error": f"Unsupported bridge tool: {tool}"}
                                except Exception as tool_exc:
                                    logger.exception("Error executing %s:", tool)
                                    res = {"ok": False, "error": str(tool_exc)}

                                await ws.send(
                                    json.dumps(
                                        {
                                            "type": "result",
                                            "req_id": req_id,
                                            "payload": res,
                                        }
                                    )
                                )
                    finally:
                        hb_task.cancel()
            except asyncio.CancelledError:
                break
            except Exception as conn_err:
                if probe_only:
                    logger.error("Probe connection failed: %s", conn_err)
                    return 3
                logger.warning("Bridge connection dropped (%s). Reconnecting in %.1fs...", conn_err, backoff)
                await asyncio.sleep(backoff)
                backoff = min(15.0, backoff * 1.5)
    finally:
        await chrome.close()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Pathfinder 2.0 Local Laptop Desktop Bridge Agent")
    parser.add_argument("--open-chrome", action="store_true", help="Launch real Chrome window immediately on startup")
    parser.add_argument("--probe-only", action="store_true", help="Verify WSS auth handshake with Render and exit")
    parsed = parser.parse_args()
    try:
        code = asyncio.run(run_bridge_daemon(open_chrome_on_start=parsed.open_chrome, probe_only=parsed.probe_only))
        sys.exit(code)
    except KeyboardInterrupt:
        logger.info("Stopped by user.")
        sys.exit(0)


if __name__ == "__main__":
    main()
