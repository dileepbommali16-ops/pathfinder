"""
Backend Architecture: Profile Controller (Photo 4)
Handles student profile CRUD operations with SSOT database persistence.
"""

from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from backend.models import StudentProfile
from backend.database import UserRepository
from backend.logging_config import logger


async def get_student_profile(user_id: str) -> Dict[str, Any]:
    """Retrieves candidate profile for the authenticated user."""
    profile = UserRepository.get_by_id(user_id)
    if not profile:
        # Check if demo candidate profile exists
        profile = UserRepository.get_demo_profile()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student candidate profile not found."
        )
    return {"success": True, "profile": profile}


async def save_student_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Updates candidate profile with parameterized database bindings."""
    try:
        saved = UserRepository.save_profile(user_id, profile_data)
        logger.info(f"[PROFILE CONTROLLER] Successfully saved profile for user: {user_id}")
        return {"success": True, "profile": saved, "message": "Profile updated successfully."}
    except Exception as e:
        logger.error(f"[PROFILE CONTROLLER ERROR] Failed to save profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist student profile."
        )
