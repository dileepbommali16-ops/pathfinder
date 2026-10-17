"""
Pathfinder 2.0 Ollama Provider Integration
Supports both Hosted Ollama (https://ollama.com with Bearer API Key) and Local Ollama (http://localhost:11434).
Performs rapid connectivity tests (1.5s timeout, 401/403 skipping) and model discovery.
"""

import os
import json
import logging
import urllib.request
import urllib.error
import asyncio
from typing import Optional, Dict, Any, List, AsyncIterator

logger = logging.getLogger("pathfinder.ollama")

_ollama_initialized: bool = False
_active_ollama_model: Optional[str] = None
_ollama_status: Dict[str, Any] = {"available": False, "reason": "Uninitialized"}


def get_ollama_config() -> Dict[str, Any]:
    raw_base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip().rstrip("/")
    api_key = os.getenv("OLLAMA_API_KEY", "").strip()
    raw_model = os.getenv("OLLAMA_MODEL", "").strip()

    # Normalize model name: strip ':cloud' if user included it
    clean_model = raw_model.replace(":cloud", "") if raw_model else ""

    # Detect hosted mode vs local
    is_hosted = "ollama.com" in raw_base or bool(api_key and not raw_base.startswith("http://localhost") and not raw_base.startswith("http://127.0.0.1"))

    return {
        "base_url": raw_base,
        "api_key": api_key,
        "model": clean_model,
        "is_hosted": is_hosted
    }


def check_and_discover_ollama() -> Dict[str, Any]:
    """
    Checks Ollama availability, fetches available models from /api/tags,
    and validates the configuration.
    """
    global _ollama_initialized, _active_ollama_model, _ollama_status
    cfg = get_ollama_config()
    base_url = cfg["base_url"]
    api_key = cfg["api_key"]
    pref_model = cfg["model"]

    # Try /api/tags first (Ollama standard endpoint), then /v1/models
    tags_url = f"{base_url}/api/tags" if not base_url.endswith("/v1") else f"{base_url.replace('/v1', '')}/api/tags"

    headers = {"Content-Type": "application/json"}
    if cfg["is_hosted"] and api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        req = urllib.request.Request(tags_url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models_list = [m.get("name", "").replace(":cloud", "") for m in data.get("models", []) if m.get("name")]
            logger.info(f"[Ollama Provider] Connected to {base_url}. Available models: {models_list}")

            if not pref_model:
                pref_model = models_list[0] if models_list else "llama3.2"
                logger.info(f"[Ollama Provider] No OLLAMA_MODEL specified, picked first available: {pref_model}")
            elif models_list and pref_model not in models_list:
                logger.info(f"[Ollama Provider] Specified model '{pref_model}' not found in {models_list}, using available model '{models_list[0]}'")
                pref_model = models_list[0]

            _active_ollama_model = pref_model
            _ollama_status = {
                "available": True,
                "model": pref_model,
                "models": models_list,
                "base_url": base_url,
                "is_hosted": cfg["is_hosted"]
            }
            _ollama_initialized = True
            return _ollama_status
    except urllib.error.HTTPError as he:
        if he.code in (401, 403):
            reason = f"HTTP {he.code} Unauthorized (Invalid or expired OLLAMA_API_KEY)"
        else:
            reason = f"HTTP {he.code} from Ollama server"
        logger.warning(f"[Ollama Provider] {reason}. Skipping Ollama.")
        _ollama_status = {"available": False, "reason": reason}
        return _ollama_status
    except Exception as e:
        reason = f"Cannot reach Ollama at {base_url} ({type(e).__name__}: {str(e)[:80]})"
        logger.debug(f"[Ollama Provider] {reason}. Skipping Ollama.")
        _ollama_status = {"available": False, "reason": reason}
        return _ollama_status


async def stream_ollama_tokens(
    prompt: str,
    sys_instruction: str,
    history: Optional[List[Dict[str, Any]]] = None,
    timeout_sec: float = 12.0
) -> AsyncIterator[str]:
    """
    Streams tokens asynchronously from Ollama using the chat completions endpoint.
    """
    cfg = get_ollama_config()
    model = _active_ollama_model or cfg["model"] or "llama3.2"
    base_url = cfg["base_url"]
    api_key = cfg["api_key"]

    endpoint = f"{base_url}/v1/chat/completions" if not base_url.endswith("/v1") and not base_url.endswith("/v1/chat/completions") else (
        f"{base_url}/chat/completions" if base_url.endswith("/v1") else base_url
    )

    messages = [{"role": "system", "content": sys_instruction}]
    if history:
        for turn in history[-12:]:
            role = "user" if turn.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": turn.get("content", "")})
    messages.append({"role": "user", "content": prompt})

    headers = {"Content-Type": "application/json"}
    if cfg["is_hosted"] and api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = json.dumps({
        "model": model,
        "messages": messages,
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 600
    }).encode("utf-8")

    # Run streaming in async executor
    loop = asyncio.get_running_loop()

    def _sync_stream():
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        return urllib.request.urlopen(req, timeout=timeout_sec)

    try:
        resp = await loop.run_in_executor(None, _sync_stream)
        for line in resp:
            line_str = line.decode("utf-8").strip()
            if not line_str or line_str == "data: [DONE]":
                continue
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if chunk:
                        yield chunk
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"[Ollama Provider] Streaming error: {e}")
