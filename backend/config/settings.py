"""
Backend Fundamentals: Application Configuration & Environment Settings
Centralizes configuration management with Pydantic validation, default values,
and type safety across environments (Development, Testing, Render Production).
"""

import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv


class Settings:
    """Central configuration for Pathfinder 2.0 Backend."""

    def __init__(self):
        # Base paths: settings.py is in backend/config/
        self.backend_dir: Path = Path(__file__).resolve().parent.parent
        self.root_dir: Path = self.backend_dir.parent

        # Load environment files
        load_dotenv(self.root_dir / ".env")
        load_dotenv(self.backend_dir / ".env")

        self.data_dir: Path = self.root_dir / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # Server network settings
        self.host: str = os.getenv("HOST", "0.0.0.0")
        self.port: int = int(os.getenv("PORT", "8000"))
        self.environment: str = os.getenv("ENVIRONMENT", "production" if os.getenv("RENDER") else "development")
        self.debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

        # Database settings
        self.database_path: Path = Path(os.getenv("DATABASE_PATH", str(self.data_dir / "pathfinder_production.db")))
        self.database_url: Optional[str] = os.getenv("DATABASE_URL")
        self.mysql_url: Optional[str] = os.getenv("MYSQL_URL")
        self.mongodb_uri: Optional[str] = os.getenv("MONGODB_URI") or os.getenv("MONGO_URL")

        # Security & Authentication
        self.jwt_secret: str = os.getenv("JWT_SECRET") or secrets.token_hex(32)
        self.jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

        # OAuth Provider Credentials
        self.google_client_id: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
        self.google_client_secret: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
        self.github_client_id: Optional[str] = os.getenv("GITHUB_CLIENT_ID")
        self.github_client_secret: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET")

        # AI / LLM Configurations (Unified Google Gemini + Gemini Live)
        from backend.config.key_resolver import get_active_gemini_key
        self.gemini_api_key: Optional[str] = get_active_gemini_key()
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip() or "gemini-flash-latest"
        self.gemini_live_model: str = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest").strip() or "gemini-2.5-flash-native-audio-latest"
        if "2.0-flash-exp" in self.gemini_live_model:
            self.gemini_live_model = "gemini-2.5-flash-native-audio-latest"
        self.ai_daily_budget_per_user: int = int(os.getenv("AI_DAILY_BUDGET", "200"))

        # CORS Origins
        frontend_env = os.getenv("FRONTEND_URL", "").strip()
        origins = [
            "https://pathfinder-client-fzom.vercel.app",
        ]
        if frontend_env:
            import re
            for item in frontend_env.split(","):
                cleaned = item.strip().rstrip("/")
                cleaned = re.sub(r'^[hH]+[tT]+[pP][sS]?://', 'https://', cleaned)
                cleaned = re.sub(r'^[tT]+[pP][sS]?://', 'https://', cleaned)
                cleaned = re.sub(r'^https?:/*(?=[^/])', 'https://', cleaned)
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)
        self.allowed_origins: List[str] = origins

        # Public URLs
        self.backend_public_url: str = os.getenv("BACKEND_PUBLIC_URL", "https://pathfinder-backend-klrp.onrender.com")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_gemini_available(self) -> bool:
        return bool(self.gemini_api_key and len(self.gemini_api_key.strip()) > 5)


@lru_cache()
def get_settings() -> Settings:
    """Returns singleton cached instance of application settings."""
    return Settings()
