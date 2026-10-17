"""
Pathfinder 2.0 Cognee Memory Integration
Provides student-isolated semantic memory retrieval and storage with strict 1.5s timeouts
and fail-safe fallbacks so memory failures never block or slow down live voice responses.
"""

import os
import asyncio
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime

logger = logging.getLogger("pathfinder.memory")

COGNEE_ENABLED = os.getenv("COGNEE_ENABLED", "false").lower() in ("true", "1", "yes")

# In-memory per-student session cache as high-speed zero-latency fallback
_STUDENT_SESSION_MEMORY: Dict[str, List[Dict[str, Any]]] = {}
_MAX_LOCAL_TURNS_PER_STUDENT = 12


def is_cognee_enabled() -> bool:
    return COGNEE_ENABLED


async def recall_student_memory(
    student_id: str,
    query: str,
    timeout_sec: float = 1.5
) -> str:
    """
    Recalls student-specific historical context and relevant project/placement goals.
    Strictly isolated per student. Hard 1.5s timeout; exceptions are caught and never crash the caller.
    """
    if not student_id:
        student_id = "default_student"

    if not is_cognee_enabled():
        # Fallback to local in-memory student cache
        history = _STUDENT_SESSION_MEMORY.get(student_id, [])
        if not history:
            return ""
        # Return recent context notes
        recent = history[-3:]
        recap = "; ".join(f"Q: {h['query'][:60]} -> A: {h['summary'][:60]}" for h in recent)
        return f"[Student Session Context: {recap}]"

    try:
        # Isolated execution with asyncio.wait_for hard ceiling
        async def _cognee_search():
            try:
                import cognee  # type: ignore
                dataset_name = f"student_{student_id.replace('@', '_').replace('.', '_')}"
                results = await cognee.search(query_text=query, dataset_name=dataset_name)
                if results and isinstance(results, list):
                    summaries = [str(r.get("text", r)) for r in results[:2]]
                    return " | ".join(summaries)
                return ""
            except ImportError:
                logger.debug("[Memory Engine] cognee package not installed. Skipping semantic memory search.")
                return ""
            except Exception as e:
                logger.warning(f"[Memory Engine] Cognee search error for {student_id}: {e}")
                return ""

        return await asyncio.wait_for(_cognee_search(), timeout=timeout_sec)
    except asyncio.TimeoutError:
        logger.info(f"[Memory Engine] Cognee recall timed out (> {timeout_sec}s) for student {student_id}. Continuing safely.")
        return ""
    except Exception as e:
        logger.warning(f"[Memory Engine] Unexpected memory recall exception: {e}")
        return ""


async def store_student_exchange(
    student_id: str,
    user_msg: str,
    assistant_reply: str,
    timeout_sec: float = 1.5
) -> bool:
    """
    Persists student exchange into isolated dataset.
    Non-blocking background capability with fail-safe error handling.
    """
    if not student_id:
        student_id = "default_student"

    # Always keep in local in-memory session cache
    if student_id not in _STUDENT_SESSION_MEMORY:
        _STUDENT_SESSION_MEMORY[student_id] = []
    
    clean_summary = assistant_reply.split("---SCREEN---")[0].strip()[:180]
    _STUDENT_SESSION_MEMORY[student_id].append({
        "timestamp": datetime.utcnow().isoformat(),
        "query": user_msg[:200],
        "summary": clean_summary
    })
    if len(_STUDENT_SESSION_MEMORY[student_id]) > _MAX_LOCAL_TURNS_PER_STUDENT:
        _STUDENT_SESSION_MEMORY[student_id] = _STUDENT_SESSION_MEMORY[student_id][-_MAX_LOCAL_TURNS_PER_STUDENT:]

    if not is_cognee_enabled():
        return True

    try:
        async def _cognee_add():
            try:
                import cognee  # type: ignore
                dataset_name = f"student_{student_id.replace('@', '_').replace('.', '_')}"
                exchange_text = f"Student: {user_msg}\nMentor Guidance: {clean_summary}"
                await cognee.add(exchange_text, dataset_name=dataset_name)
                return True
            except ImportError:
                return False
            except Exception as e:
                logger.warning(f"[Memory Engine] Cognee store warning for {student_id}: {e}")
                return False

        return await asyncio.wait_for(_cognee_add(), timeout=timeout_sec)
    except asyncio.TimeoutError:
        logger.info(f"[Memory Engine] Cognee store timed out (> {timeout_sec}s). Exchange preserved in memory cache.")
        return False
    except Exception as e:
        logger.warning(f"[Memory Engine] Cognee store error: {e}")
        return False
