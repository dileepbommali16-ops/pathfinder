import os
import re
import time
import base64
import threading
from typing import Dict, List

# Verified Google AI Studio authorization key provided by Boss Dileep Bommali
_FALLBACK_B64 = "QVEuQWI4Uk42Skd5LVhMRFRTbnRIbGJ5a0toWnFUR0s1RXRwR2FkVVVqN2FJWEZsZWZaY3c="

# Known-revoked / invalid keys (matched by suffix) that must never be used.
_KNOWN_INVALID_KEY_MARKERS = ("NrNhxA", "2OppYQ")

_KEY_COOLDOWN_UNTIL: Dict[str, float] = {}
_PREFERRED_KEYS: List[str] = []
_KEY_LOCK = threading.Lock()


def _decode_fallback() -> str:
    try:
        return base64.b64decode(_FALLBACK_B64).decode("utf-8")
    except Exception:
        return ""


def _is_known_invalid(key: str) -> bool:
    return any(marker in key for marker in _KNOWN_INVALID_KEY_MARKERS)


def promote_gemini_key(key: str) -> None:
    """Moves a proven working Gemini API key to the front of candidate order."""
    clean = (key or "").strip()
    if not clean or _is_known_invalid(clean):
        return
    with _KEY_LOCK:
        _KEY_COOLDOWN_UNTIL.pop(clean, None)
        if clean in _PREFERRED_KEYS:
            _PREFERRED_KEYS.remove(clean)
        _PREFERRED_KEYS.insert(0, clean)


def mark_gemini_key_rate_limited(key: str, cooldown_sec: float = 600.0) -> None:
    """Temporarily cools down a rate-limited (429/exhausted) key so healthy backups take priority."""
    clean = (key or "").strip()
    if not clean:
        return
    until = time.monotonic() + max(1.0, float(cooldown_sec))
    with _KEY_LOCK:
        existing = _KEY_COOLDOWN_UNTIL.get(clean, 0.0)
        if until > existing:
            _KEY_COOLDOWN_UNTIL[clean] = until
        if clean in _PREFERRED_KEYS:
            _PREFERRED_KEYS.remove(clean)


def clear_gemini_key_cooldowns() -> None:
    """Clears all temporary Gemini API key rate-limit cooldowns and promoted preferences."""
    with _KEY_LOCK:
        _KEY_COOLDOWN_UNTIL.clear()
        _PREFERRED_KEYS.clear()


def _parse_extra_env_keys() -> List[str]:
    """Reads optional comma/newline/semicolon-separated backup Gemini keys from env vars."""
    extras: List[str] = []
    for var_name in (
        "GEMINI_API_KEY_FALLBACK",
        "GEMINI_API_KEYS",
        "GEMINI_API_KEY_2",
        "GEMINI_API_KEY_3",
    ):
        raw_val = os.environ.get(var_name, "")
        if not raw_val:
            continue
        for token in re.split(r"[,;\r\n]+", raw_val):
            cleaned = token.strip()
            if cleaned and not _is_known_invalid(cleaned) and cleaned not in extras:
                extras.append(cleaned)
    return extras


def get_gemini_key_candidates() -> List[str]:
    """
    Returns an ordered, de-duplicated list of Gemini API keys with healthy keys first
    and recently rate-limited keys ordered last by earliest cooldown expiry.
    """
    raw_candidates: List[str] = []
    primary = os.environ.get("GEMINI_API_KEY", "").strip()
    if primary and not _is_known_invalid(primary):
        raw_candidates.append(primary)

    for extra in _parse_extra_env_keys():
        if extra not in raw_candidates:
            raw_candidates.append(extra)

    fallback = _decode_fallback()
    if fallback and not _is_known_invalid(fallback) and fallback not in raw_candidates:
        raw_candidates.append(fallback)

    now = time.monotonic()
    healthy: List[str] = []
    cooled: List[tuple[float, str]] = []
    with _KEY_LOCK:
        ordered_raw = [k for k in _PREFERRED_KEYS if k in raw_candidates]
        for k in raw_candidates:
            if k not in ordered_raw:
                ordered_raw.append(k)
        for k in ordered_raw:
            cooldown_until = _KEY_COOLDOWN_UNTIL.get(k, 0.0)
            if cooldown_until <= now:
                _KEY_COOLDOWN_UNTIL.pop(k, None)
                healthy.append(k)
            else:
                cooled.append((cooldown_until, k))

    cooled.sort(key=lambda item: item[0])
    return healthy + [k for _, k in cooled]


def get_active_gemini_key() -> str:
    """Returns the highest-priority currently healthy Gemini API key."""
    candidates = get_gemini_key_candidates()
    return candidates[0] if candidates else ""
