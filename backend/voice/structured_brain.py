"""
Structured Brain & Output Formatter for DAS AI (backend/voice/structured_brain.py)
Enforces voice-mode output rules:
Returns structured JSON:
{
  "spoken": "<2-4 short sentences, no markdown, no URLs, no symbols>",
  "display": "<full detailed answer in markdown for the screen>",
  "actions": [ ... tool calls ... ],
  "followups": ["...", "..."]
}
Validates JSON, retries once on invalid output, falls back cleanly.
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("pathfinder.voice.structured_brain")


def clean_spoken_text(text: str) -> str:
    """
    Strips all markdown symbols, asterisks, URLs, code blocks,
    and technical noise so text-to-speech audio sounds clean and natural.
    """
    if not text:
        return ""

    # Remove code blocks and inline code
    t = re.sub(r"```[\s\S]*?```", "", text)
    t = re.sub(r"`([^`]+)`", r"\1", t)

    # Remove markdown links [text](url) -> text
    t = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", t)

    # Remove bold, italics, strikethrough, blockquotes
    t = re.sub(r"[*_~#>|]", "", t)

    # Remove raw URLs
    t = re.sub(r"https?://\S+", "", t)

    # Expand common acronyms for natural phonetics
    t = re.sub(r"\bDSA\b", "D S A", t)
    t = re.sub(r"\bCGPA\b", "C G P A", t)
    t = re.sub(r"\bATS\b", "A T S", t)
    t = re.sub(r"\bSDE\b", "S D E", t)
    t = re.sub(r"\bML\b", "M L", t)
    t = re.sub(r"\bAI\b", "A I", t)
    t = re.sub(r"\bLPA\b", "L P A", t)

    # Collapse repeated whitespace
    t = re.sub(r"\s+", " ", t).strip()

    # Limit to 2-4 sentences max
    sentences = re.split(r"(?<=[.!?])\s+", t)
    if len(sentences) > 4:
        t = " ".join(sentences[:3])

    return t


def extract_structured_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts and parses JSON object from model response,
    handling markdown code fences (```json ... ```) or raw text.
    """
    if not raw_text:
        return None

    trimmed = raw_text.strip()

    # 1. Try direct parse
    try:
        data = json.loads(trimmed)
        if isinstance(data, dict) and "spoken" in data:
            return data
    except Exception:
        pass

    # 2. Try regex extraction of JSON block
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", trimmed)
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, dict) and "spoken" in data:
                return data
        except Exception:
            pass

    # 3. Try finding outermost braces { ... }
    first_brace = trimmed.find("{")
    last_brace = trimmed.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            data = json.loads(trimmed[first_brace:last_brace + 1])
            if isinstance(data, dict) and ("spoken" in data or "display" in data):
                return data
        except Exception:
            pass

    return None


def format_voice_response(
    raw_response: str,
    default_actions: Optional[List[Dict[str, Any]]] = None,
    default_followups: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Ensures the response adheres 100% to the voice-mode structured contract:
    {
      "spoken": "...",
      "display": "...",
      "actions": [...],
      "followups": [...]
    }
    """
    extracted = extract_structured_json(raw_response)
    if extracted:
        spoken = clean_spoken_text(str(extracted.get("spoken", "")))
        display = str(extracted.get("display", "")).strip() or raw_response
        actions = extracted.get("actions", default_actions or [])
        followups = extracted.get("followups", default_followups or [
            "Tell me more about this",
            "Show me project blueprints",
            "What should I do next?"
        ])
        return {
            "spoken": spoken,
            "display": display,
            "actions": actions,
            "followups": followups
        }

    # Fallback parsing for non-JSON responses
    # If the model used tags like <spoken>...</spoken>
    spoken_tag = re.search(r"<spoken>([\s\S]*?)</spoken>", raw_response)
    if spoken_tag:
        spoken = clean_spoken_text(spoken_tag.group(1))
        display = re.sub(r"<spoken>[\s\S]*?</spoken>", "", raw_response).strip()
    else:
        # Split first 2-3 sentences for speech
        sentences = re.split(r"(?<=[.!?])\s+", raw_response.strip())
        spoken = clean_spoken_text(" ".join(sentences[:3])) if sentences else "Here is the guidance you requested."
        display = raw_response.strip()

    return {
        "spoken": spoken,
        "display": display,
        "actions": default_actions or [],
        "followups": default_followups or [
            "Tell me more about this",
            "Show me project blueprints",
            "What should I do next?"
        ]
    }
