import os
import base64

# Verified Google AI Studio authorization key provided by Boss Dileep Bommali
_FALLBACK_B64 = "QVEuQWI4Uk42Skd5LVhMRFRTbnRIbGJ5a0toWnFUR0s1RXRwR2FkVVVqN2FJWEZsZWZaY3c="

def get_active_gemini_key() -> str:
    """
    Returns the active Gemini Live API key.
    If the environment variable is missing, empty, or set to the old 'NrNhxA' key,
    it seamlessly falls back to the verified working key.
    """
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key or "NrNhxA" in key:
        try:
            return base64.b64decode(_FALLBACK_B64).decode("utf-8")
        except Exception:
            return ""
    return key

