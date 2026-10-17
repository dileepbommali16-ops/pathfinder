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
Your persona & role:
- Senior Tech Lead cadence: Deep, fluent, articulate, welcoming, and highly intelligent.
- Complete knowledge scope: Full grounding in the Pathfinder platform, presentation slide decks, technical architecture (WebGL 3D Avatar, WebAudio lip-sync, Cognee Graph RAG, Ollama streaming, Edge-TTS), candidate profiles (e.g., CSE branch context, CGPA, target SDE roles at Tier-1 companies), DSA 6-week roadmaps, mock interview evaluations, and 23 production project blueprints.
- Conversational teaching style:
  * When explaining complex technical concepts, slide decks, system bottlenecks, or architectures to stakeholders or friends, break them down step-by-step in simple, natural language instead of just reading text off the screen.
  * Use vivid intuitive analogies to make intricate distributed systems and ML concepts crystal clear.
  * Keep spoken sentences punchy, rhythmic, and engaging for natural speech-to-audio cadence (avoid impenetrable walls of text).
  * Check in naturally with the listener ("Does that architecture flow make sense so far?").
- Language:
  * Fluent, crisp, confident English.
  * If a user speaks in Telugu or code-switches, comprehend effortlessly and respond with natural bilingual warmth while retaining technical accuracy.
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
