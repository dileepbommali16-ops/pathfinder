"""
Pathfinder Voice Providers Chain (backend/voice/providers.py)
Implements prioritized fallback reasoning chain:
1. Gemini 2.0 Flash (Primary)
2. Ollama Hosted (https://ollama.com, OLLAMA_MODEL=gpt-oss:20b)
3. Ollama Local (http://localhost:11434)
Logs which provider answered and reasons for skips, NEVER printing API keys.
"""

import os
import json
import time
import logging
import urllib.request
import urllib.error
from typing import AsyncIterator, Dict, Any, List, Optional, Tuple

logger = logging.getLogger("pathfinder.voice.providers")


class ProviderChain:
    """
    Executes reasoning with prioritized LLM providers.
    Never exposes API keys in logs or exceptions.
    """

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "").strip()
        self.ollama_api_key = os.getenv("OLLAMA_API_KEY", "").strip()
        self.ollama_model = os.getenv("OLLAMA_MODEL", "gpt-oss:20b").replace(":cloud", "").strip()
        self.last_used_provider: str = "Initializing"

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str = "",
        history: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 400
    ) -> Tuple[str, str]:
        """
        Attempts to generate response through providers in order:
        1. Gemini -> 2. Hosted Ollama -> 3. Local Ollama.
        Returns: (response_text, provider_name)
        """
        # =====================================================================
        # 1. Primary: Gemini
        # =====================================================================
        if self.gemini_key:
            try:
                # Try google.genai SDK
                try:
                    import google.genai as genai
                    from google.genai import types

                    client = genai.Client(api_key=self.gemini_key)
                    model_name = os.getenv("GEMINI_TEXT_MODEL", os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))

                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction or None,
                        temperature=0.7,
                        max_output_tokens=max_tokens
                    )

                    resp = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config
                    )
                    text = resp.text.strip() if resp.text else ""
                    if text:
                        self.last_used_provider = f"Gemini ({model_name})"
                        logger.info(f"[Providers] Answered by {self.last_used_provider}")
                        return text, self.last_used_provider
                except Exception as sdk_err:
                    logger.warning(f"[Providers] Gemini SDK call failed: {str(sdk_err)[:120]}. Falling back to HTTP...")

                # HTTP Direct REST Call to Google Generative Language
                for candidate_model in ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"]:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate_model}:generateContent?key={self.gemini_key}"
                    payload: Dict[str, Any] = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.7, "maxOutputTokens": max_tokens}
                    }
                    if system_instruction:
                        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

                    req_data = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
                    
                    try:
                        with urllib.request.urlopen(req, timeout=8) as response:
                            if response.status == 200:
                                res_body = json.loads(response.read().decode("utf-8"))
                                candidates = res_body.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    text = "".join(p.get("text", "") for p in parts).strip()
                                    if text:
                                        self.last_used_provider = f"Gemini ({candidate_model})"
                                        logger.info(f"[Providers] Answered by {self.last_used_provider}")
                                        return text, self.last_used_provider
                    except urllib.error.HTTPError as h_err:
                        logger.warning(f"[Providers] Gemini model '{candidate_model}' HTTP {h_err.code}: {h_err.reason}")
                        continue
                    except Exception as e:
                        logger.warning(f"[Providers] Gemini request error on '{candidate_model}': {e}")
                        continue

            except Exception as e:
                logger.warning(f"[Providers] Gemini provider failed completely: {e}. Skipping to Ollama.")
        else:
            logger.info("[Providers] GEMINI_API_KEY not configured. Skipping Gemini.")

        # =====================================================================
        # 2. Secondary: Hosted Ollama (e.g., https://ollama.com)
        # =====================================================================
        if self.ollama_base_url and self.ollama_base_url.startswith("https://"):
            hosted_result = self._try_ollama(
                base_url=self.ollama_base_url,
                model=self.ollama_model or "gpt-oss:20b",
                api_key=self.ollama_api_key,
                prompt=prompt,
                system=system_instruction,
                label="Ollama Hosted"
            )
            if hosted_result:
                return hosted_result

        # =====================================================================
        # 3. Tertiary: Local Ollama (http://localhost:11434)
        # =====================================================================
        local_url = "http://localhost:11434"
        local_result = self._try_ollama(
            base_url=local_url,
            model=os.getenv("OLLAMA_LOCAL_MODEL", "llama3.2"),
            api_key="",
            prompt=prompt,
            system=system_instruction,
            label="Ollama Local"
        )
        if local_result:
            return local_result

        # All providers failed
        self.last_used_provider = "Fallback Error"
        logger.error("[Providers] All primary and secondary providers exhausted.")
        return (
            "I apologize, but my reasoning engine is momentarily reconnecting. Please click Retry below to query again.",
            "Provider Unavailable"
        )

    def _try_ollama(
        self,
        base_url: str,
        model: str,
        api_key: str,
        prompt: str,
        system: str,
        label: str
    ) -> Optional[Tuple[str, str]]:
        """Validates /api/tags within 1.5s then generates text."""
        clean_url = base_url.rstrip("/")
        tags_url = f"{clean_url}/api/tags"

        req = urllib.request.Request(tags_url)
        if api_key:
            req.add_header("Authorization", f"Bearer {api_key}")

        # Probe /api/tags with 1.5s hard timeout
        try:
            with urllib.request.urlopen(req, timeout=1.5) as probe:
                if probe.status in (401, 403):
                    logger.warning(f"[Providers] {label} returned HTTP {probe.status}. Skipping.")
                    return None
        except Exception as probe_err:
            logger.debug(f"[Providers] {label} probe skipped: {probe_err}")
            return None

        # Generate request
        clean_model = model.replace(":cloud", "")
        gen_url = f"{clean_url}/api/generate"
        payload = {
            "model": clean_model,
            "prompt": prompt,
            "system": system,
            "stream": False
        }
        data = json.dumps(payload).encode("utf-8")
        gen_req = urllib.request.Request(gen_url, data=data, headers={"Content-Type": "application/json"})
        if api_key:
            gen_req.add_header("Authorization", f"Bearer {api_key}")

        try:
            with urllib.request.urlopen(gen_req, timeout=12) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    text = body.get("response", "").strip()
                    if text:
                        provider_name = f"{label} ({clean_model})"
                        self.last_used_provider = provider_name
                        logger.info(f"[Providers] Answered by {provider_name}")
                        return text, provider_name
        except Exception as exc:
            logger.warning(f"[Providers] {label} execution error: {exc}")

        return None


# Global singleton
provider_chain = ProviderChain()
