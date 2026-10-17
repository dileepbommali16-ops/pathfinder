"""
Pathfinder DAS Agent: Ollama Reasoning Engine
Senior Tech Lead Persona ("DAS"): Highly intelligent, warm, step-by-step conversational teacher.
"""

import os
import json
import logging
import asyncio
import importlib
import urllib.request
import urllib.error
from typing import AsyncIterator, List, Dict, Any, Optional

httpx: Any = None
try:
    httpx = importlib.import_module("httpx")
    HTTPX_AVAILABLE = True
except Exception:
    HTTPX_AVAILABLE = False

logger = logging.getLogger("das.ollama")

DAS_SYSTEM_PROMPT = """
You are "DAS", the Lead AI Architect and Senior Tech Lead for the Pathfinder platform.
Your persona:
- A senior, brilliant, yet exceptionally warm and approachable engineering mentor.
- You speak with clarity, empathy, and conversational confidence.
- When explaining complex slide decks, architecture diagrams, or technical pipelines:
  * NEVER simply read raw text off slides or bullet points.
  * Synthesize complex ideas into a simple, logical, step-by-step mental model.
  * Use vivid intuitive analogies (e.g., comparing event-driven queues to a restaurant kitchen).
  * Check in naturally with the listener ("Does that flow make sense so far?").
- Language style:
  * Primarily fluent, crisp, modern English.
  * You understand and seamlessly respond when users speak Telugu or code-switch (e.g., "niku em help kavali cheppu").
  * Keep spoken sentences punchy and conversational for optimal speech-to-audio cadence (avoid wall-of-text responses).
"""

async def stream_das_response(
    user_query: str,
    rag_context: str = "",
    history: Optional[List[Dict[str, str]]] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None
) -> AsyncIterator[str]:
    """
    Streams tokens from Ollama locally or hosted with low TTFT (Time-To-First-Token).
    """
    ollama_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
    api_key = os.getenv("OLLAMA_API_KEY", "").strip()
    active_model = model or os.getenv("OLLAMA_MODEL", "llama3.2")

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Build enriched context prompt
    augmented_prompt = user_query
    if rag_context:
        augmented_prompt = (
            f"[SYSTEM ARCHITECTURE & SLIDE GROUNDING CONTEXT]:\n{rag_context}\n\n"
            f"[USER QUERY / QUESTION]:\n{user_query}\n\n"
            f"Synthesize the architecture context into a crisp, engaging, step-by-step spoken explanation."
        )

    messages = [{"role": "system", "content": DAS_SYSTEM_PROMPT}]
    if history:
        for turn in history[-8:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": augmented_prompt})

    payload = {
        "model": active_model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.65,
            "top_p": 0.9,
            "num_predict": 350
        }
    }

    try:
        if HTTPX_AVAILABLE and httpx:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", f"{ollama_url}/api/chat", json=payload, headers=headers) as resp:
                    if resp.status_code != 200:
                        logger.error(f"[Ollama] Non-200 status {resp.status_code}: {await resp.aread()}")
                        yield "I'm having a brief connection hitch with my reasoning core, but I'm right here. Let me know what you'd like to dive into."
                        return

                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
        else:
            # Standard library urllib fallback
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(f"{ollama_url}/api/chat", data=req_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30.0) as resp:
                for line in resp:
                    decoded = line.decode("utf-8").strip()
                    if decoded:
                        try:
                            chunk = json.loads(decoded)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        logger.error(f"[Ollama Engine] Exception during streaming: {e}")
        yield "I ran into a quick hiccup reaching my local model brain, but I'm ready to help you analyze any part of Pathfinder."
