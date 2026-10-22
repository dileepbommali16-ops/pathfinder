"""
Backend Architecture: Agent Controller (Photo 4)
Handles conversational AI Coach interactions and real-time streaming.
"""

from typing import Dict, Any, List, Optional
from backend.models import ChatMessage, StudentProfile
from backend.gemini_engine import chat_with_mentor
from backend.logging_config import logger


async def process_agent_query(
    message: str,
    history: Optional[List[ChatMessage]] = None,
    profile: Optional[StudentProfile] = None
) -> Dict[str, Any]:
    """Routes query through Gemini 2.0 Flash engine with site knowledge injection."""
    logger.info(f"[AGENT CONTROLLER] Processing query: {message[:40]}...")
    reply = chat_with_mentor(message, history or [], profile)
    return {
        "success": True,
        "reply": reply,
        "model": "gemini-2.0-flash"
    }
