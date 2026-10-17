"""
Backend Architecture: Routes Package (Photo 2)
Defines API endpoints (URLs) and maps them to controllers.
"""

from backend.routers.health_router import health_router
from backend.routers.auth_router import auth_router
from backend.routers.profile_router import profile_router
from backend.routers.analytics_router import analytics_router
from backend.routers.ai_router import ai_router
from backend.routers.predictions_router import predictions_router
from backend.routers.export_router import export_router
from backend.routers.webhook_router import webhook_router
from backend.oauth import oauth_router

__all__ = [
    "health_router",
    "auth_router",
    "profile_router",
    "analytics_router",
    "ai_router",
    "predictions_router",
    "export_router",
    "webhook_router",
    "oauth_router",
]
