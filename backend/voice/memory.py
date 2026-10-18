"""
Pathfinder Voice Memory Manager (backend/voice/memory.py)
Cognee wrapper behind COGNEE_ENABLED with strict per-student isolation,
1.5s hard timeouts, and robust local fallback memory cache.
"""

import os
import json
import time
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("pathfinder.voice.memory")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data"
LOCAL_MEMORY_FILE = DATA_DIR / "student_memory_cache.json"

# In-memory session store for fast fallback
_FALLBACK_MEMORY: Dict[str, Dict[str, Any]] = {}


def _load_local_memory():
    global _FALLBACK_MEMORY
    if LOCAL_MEMORY_FILE.exists():
        try:
            with open(LOCAL_MEMORY_FILE, "r", encoding="utf-8") as f:
                _FALLBACK_MEMORY = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load local memory cache: {e}")


def _save_local_memory():
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(LOCAL_MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(_FALLBACK_MEMORY, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist local memory cache: {e}")


# Initialize cache
_load_local_memory()


class VoiceMemoryManager:
    """
    Manages long-term conversational memory with Cognee Graph RAG and instant local fallback.
    Guarantees that memory retrieval NEVER blocks or delays responses (> 1.5s).
    """

    def __init__(self):
        self.cognee_enabled = os.getenv("COGNEE_ENABLED", "false").lower() in ("true", "1", "yes")
        self.cognee_initialized = False

        if self.cognee_enabled:
            self._init_cognee()

    def _init_cognee(self):
        """Configures Cognee with Gemini LLM and Embeddings from environment."""
        try:
            import cognee  # type: ignore

            # Configure environment variables required by Cognee
            os.environ.setdefault("LLM_PROVIDER", "gemini")
            os.environ.setdefault("LLM_MODEL", "gemini/gemini-flash-latest")
            os.environ.setdefault("EMBEDDING_PROVIDER", "gemini")
            os.environ.setdefault("EMBEDDING_MODEL", "gemini/gemini-embedding-001")

            # Transfer GEMINI_API_KEY if LLM_API_KEY not explicitly set
            gemini_key = os.getenv("GEMINI_API_KEY", "")
            if gemini_key and not os.getenv("LLM_API_KEY"):
                os.environ["LLM_API_KEY"] = gemini_key

            self.cognee_initialized = True
            logger.info("[MemoryManager] Cognee configured with Gemini LLM & Embeddings.")
        except Exception as exc:
            self.cognee_initialized = False
            logger.warning(f"[MemoryManager] Cognee initialization skipped: {exc}")

    async def recall_memory(self, student_id: str, query: str = "") -> str:
        """
        Recalls relevant context for the student.
        Strict 1.5s timeout: if Cognee takes too long, falls back to local student summary immediately.
        """
        clean_id = student_id or "default_student"

        # 1. Try Cognee if enabled and ready
        if self.cognee_enabled and self.cognee_initialized:
            try:
                import cognee  # type: ignore

                async def _search_cognee():
                    search_dataset = f"student_{clean_id}"
                    results = await cognee.search(
                        query_text=query or "recent project milestones and interview performance",
                        dataset_name=search_dataset
                    )
                    if results:
                        if isinstance(results, list):
                            return " | ".join(str(r) for r in results[:3])
                        return str(results)
                    return ""

                # Enforce strict 1.5 second hard timeout
                cognee_result = await asyncio.wait_for(_search_cognee(), timeout=1.5)
                if cognee_result:
                    return f"Cognee Memory: {cognee_result}"
            except asyncio.TimeoutError:
                logger.warning(f"[MemoryManager] Cognee query timed out (>1.5s) for {clean_id}. Using fallback.")
            except Exception as exc:
                logger.warning(f"[MemoryManager] Cognee query error: {exc}. Using fallback.")

        # 2. Local persistent SQLite student memory
        try:
            from backend.database import get_student_memory
            mem = get_student_memory(clean_id)
            goals_str = ", ".join(mem.get("goals", [])) or "SDE Placement"
            weak_str = ", ".join(mem.get("weak_areas", [])) or "None reported"
            topics_str = ", ".join(mem.get("topics", [])) or "Initial session"
            last_date = mem.get("last_session_at", "recently")
            summary = mem.get("last_summary", "")

            return (
                f"Student Memory Profile: "
                f"Goals: [{goals_str}] | "
                f"Weak Areas: [{weak_str}] | "
                f"Topics Discussed: [{topics_str}] | "
                f"Last Session Date: {last_date} | "
                f"Summary: {summary}"
            )
        except Exception as e:
            logger.debug(f"[MemoryManager] SQLite recall failed, using memory cache: {e}")

        # 3. Fallback memory cache
        student_data = _FALLBACK_MEMORY.get(clean_id)
        if student_data:
            project_info = ""
            if student_data.get("current_project"):
                project_info = f" | Active Blueprint: {student_data.get('current_project')} (Step {student_data.get('current_step', 1)})"

            topics_info = ""
            if student_data.get("last_topics"):
                topics_info = f" | Recent Topics: {', '.join(student_data.get('last_topics', [])[-3:])}"

            return f"Student Context: {student_data.get('last_summary', 'Returning candidate')}{project_info}{topics_info}"

        return "New session initialized for engineering candidate."

    async def store_turn(
        self,
        student_id: str,
        user_message: str,
        assistant_message: str,
        project_id: Optional[str] = None,
        step: Optional[int] = None
    ):
        """
        Stores finished conversational turn asynchronously into SQLite database and memory cache.
        Saves student goals, weak areas mentioned, topics discussed, and session timestamp.
        """
        clean_id = student_id or "default_student"

        # Update local memory
        entry = _FALLBACK_MEMORY.setdefault(clean_id, {
            "last_topics": [],
            "current_project": None,
            "current_step": 1,
            "last_summary": "",
            "turns_count": 0,
            "last_active": time.time()
        })

        entry["turns_count"] = entry.get("turns_count", 0) + 1
        entry["last_active"] = time.time()

        if project_id:
            entry["current_project"] = project_id
        if step is not None:
            entry["current_step"] = step

        # Extract lightweight keywords
        words = [w.capitalize() for w in user_message.split() if len(w) > 4 and w.isalpha()]
        for w in words[:2]:
            if w not in entry["last_topics"]:
                entry["last_topics"].append(w)
        entry["last_topics"] = entry["last_topics"][-8:]

        # Check for weak areas mentioned
        weak_keywords = ["dsa", "dynamic programming", "graphs", "trees", "system design", "sql", "math", "aptitude", "speaking", "pointers", "recursion"]
        lower_msg = user_message.lower()
        detected_weak = [kw.upper() for kw in weak_keywords if kw in lower_msg]

        # Compact summary
        summary_text = f"Discussed {words[0] if words else 'placement prep'} and candidate milestones."
        entry["last_summary"] = summary_text
        _save_local_memory()

        # Persist to SQLite student_memory table
        try:
            from backend.database import get_student_memory, save_student_memory
            curr_mem = get_student_memory(clean_id)
            updated_topics = list(set(curr_mem.get("topics", []) + entry["last_topics"]))[-10:]
            updated_weak = list(set(curr_mem.get("weak_areas", []) + detected_weak))[-6:]
            save_student_memory(
                user_id=clean_id,
                weak_areas=updated_weak if updated_weak else None,
                topics=updated_topics if updated_topics else None,
                last_summary=summary_text
            )
        except Exception as err:
            logger.debug(f"[MemoryManager] SQLite save turn error: {err}")

        # Background Cognee storage if enabled
        if self.cognee_enabled and self.cognee_initialized:
            asyncio.create_task(self._async_cognee_add(clean_id, user_message, assistant_message))

    async def _async_cognee_add(self, student_id: str, user_text: str, assistant_text: str):
        """Asynchronously writes turn to Cognee graph without blocking caller."""
        try:
            import cognee  # type: ignore

            dataset_name = f"student_{student_id}"
            turn_doc = f"User: {user_text}\nAssistant: {assistant_text}"
            await cognee.add(turn_doc, dataset_name=dataset_name)
        except Exception as e:
            logger.debug(f"[MemoryManager] Background Cognee write failed: {e}")


# Global singleton
voice_memory_manager = VoiceMemoryManager()
