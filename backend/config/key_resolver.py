import os
import base64
from typing import List

# Verified Google AI Studio authorization key provided by Boss Dileep Bommali
_FALLBACK_B64 = "QVEuQWI4Uk42Skd5LVhMRFRTbnRIbGJ5a0toWnFUR0s1RXRwR2FkVVVqN2FJWEZsZWZaY3c="

# Known-revoked / invalid keys (matched by suffix) that must never be used.
_KNOWN_INVALID_KEY_MARKERS = ("NrNhxA", "2OppYQ")


def _decode_fallback() -> str:
    try:
        return base64.b64decode(_FALLBACK_B64).decode("utf-8")
    except Exception:
        return ""


def _is_known_invalid(key: str) -> bool:
    return any(marker in key for marker in _KNOWN_INVALID_KEY_MARKERS)


def get_active_gemini_key() -> str:
    """
    Returns the active Gemini API key.
    If the environment variable is missing, empty, or set to a known-invalid key,
    it falls back to the verified working key.
    """
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key or _is_known_invalid(key):
        return _decode_fallback()
    return key


def get_gemini_key_candidates() -> List[str]:
    """
    Returns an ordered, de-duplicated list of keys to try for Gemini Live:
    the active environment key first, then the verified fallback key.
    Lets the Live proxy recover automatically if the env key is rejected (1008).
    """
    candidates: List[str] = []
    for k in (get_active_gemini_key(), _decode_fallback()):
        if k and k not in candidates:
            candidates.append(k)
    return candidates
