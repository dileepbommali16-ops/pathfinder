"""
Pathfinder Voice Fallback Pipeline (backend/voice/fallback_pipeline.py)
Executed whenever Gemini Live is unavailable (quota, unsupported model, network).
Routes through provider_chain (Gemini -> Ollama Hosted -> Ollama Local)
and yields sentence-by-sentence speech chunks with full honest error handling.
"""

import os
import re
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, AsyncIterator

from backend.voice.providers import provider_chain
from backend.voice.memory import voice_memory_manager
from backend.voice.tools import get_site_guide, list_projects, get_profile

logger = logging.getLogger("pathfinder.voice.fallback")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
PROMPT_FILE = ROOT_DIR / "backend" / "voice" / "prompt.txt"


def _load_prompt_template() -> str:
    """Loads prompt template from backend/voice/prompt.txt."""
    if PROMPT_FILE.exists():
        try:
            with open(PROMPT_FILE, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            pass
    return "You are DAS, the dedicated senior AI coach for Pathfinder. Keep answers concise."


class FallbackPipeline:
    """
    Guarantees that a user query receives an answer even when Gemini Live is unavailable.
    """

    def __init__(self):
        self.prompt_template = _load_prompt_template()

    async def process_turn(
        self,
        student_id: str,
        user_text: str,
        profile_override: Optional[Dict[str, Any]] = None,
        language_preference: str = "auto"
    ) -> Dict[str, Any]:
        """
        Executes fallback reasoning, parses [[SCREEN]] markers, and returns speech sentences.
        """
        if not user_text or not user_text.strip():
            return {
                "spoken_summary": "I am listening. How can I help you with your placement preparation?",
                "screen_details": "",
                "provider": "Local Coach",
                "sentences": ["I am listening. How can I help you with your placement preparation?"]
            }

        # 1. Fetch memory asynchronously (with 1.5s hard timeout guarantee)
        memory_context = await voice_memory_manager.recall_memory(student_id, query=user_text)

        # 2. Build system instruction with injected tokens
        site_guide = json.dumps(get_site_guide().get("features", [])[:5], indent=1)
        projects_catalog = json.dumps(list_projects()[:5], indent=1)
        profile_info = json.dumps(get_profile(profile_override), indent=1)
        today_str = datetime.now().strftime("%B %d, %Y")

        system_instruction = self.prompt_template
        system_instruction = system_instruction.replace("{today}", today_str)
        system_instruction = system_instruction.replace("{profile}", profile_info)
        system_instruction = system_instruction.replace("{memory}", memory_context)
        system_instruction = system_instruction.replace("{site_guide}", site_guide)
        system_instruction = system_instruction.replace("{projects_catalog}", projects_catalog)

        if language_preference and language_preference != "auto":
            system_instruction += f"\n\n[USER PREFERENCE]: Respond strictly in {language_preference}."

        # 3. Call Provider Chain
        raw_answer, provider_name = await provider_chain.generate_response(
            prompt=user_text,
            system_instruction=system_instruction
        )

        # 4. Parse Spoken vs Screen parts
        spoken_text, screen_text = self._split_spoken_and_screen(raw_answer)

        # 5. Extract sentences for speech synthesis
        sentences = self._split_into_sentences(spoken_text)

        # 6. Store turn in memory asynchronously
        await voice_memory_manager.store_turn(
            student_id=student_id,
            user_message=user_text,
            assistant_message=spoken_text
        )

        return {
            "spoken_summary": spoken_text,
            "screen_details": screen_text,
            "provider": provider_name,
            "sentences": sentences,
            "is_error": provider_name == "Provider Unavailable"
        }

    def _split_spoken_and_screen(self, text: str) -> Tuple[str, str]:
        """Separates short spoken speech from long-form screen text / code."""
        screen_pattern = re.compile(r"\[\[SCREEN\]\]([\s\S]*?)\[\[/SCREEN\]\]", re.IGNORECASE)
        screens = screen_pattern.findall(text)
        screen_content = "\n\n".join(s.strip() for s in screens)

        spoken_content = screen_pattern.sub("", text).strip()
        spoken_content = re.sub(r"```[\s\S]*?```", "", spoken_content).strip()

        # Enforce maximum 3 spoken sentences
        sentences = self._split_into_sentences(spoken_content)
        if len(sentences) > 3:
            spoken_content = " ".join(sentences[:3])

        return spoken_content, screen_content

    def _split_into_sentences(self, text: str) -> List[str]:
        """Splits text into clean sentences for audio delivery."""
        if not text:
            return []
        raw_parts = re.split(r"(?<=[.!?।])\s+", text)
        sentences = [p.strip() for p in raw_parts if p.strip()]
        return sentences if sentences else [text]


fallback_pipeline = FallbackPipeline()
