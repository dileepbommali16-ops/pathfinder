"""
Backend Architecture: Prediction Controller (Photo 4)
Handles ML placement probability inference and skill gap analysis.
"""

from typing import Dict, Any
from backend.models import StudentProfile, PredictionResult
from backend.ml_engine import predict_placement
from backend.logging_config import logger


async def calculate_placement_prediction(profile: StudentProfile) -> PredictionResult:
    """Invokes calibrated Random Forest classifier (120 trees) to predict placement odds."""
    logger.info(f"[PREDICTION CONTROLLER] Inferring placement for {profile.target_role} (CGPA: {profile.cgpa})")
    result = predict_placement(profile)
    return result
