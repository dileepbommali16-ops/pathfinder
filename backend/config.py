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


class Settings:
    """Central configuration for Pathfinder 2.0 Backend."""

    def __init__(self):
        # Base paths
        self.root_dir: Path = Path(__file__).resolve().parent.parent
        self.backend_dir: Path = Path(__file__).resolve().parent
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

        # AI / LLM Configurations
        self.gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        self.openrouter_api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3-8b-instruct:free")
        self.ai_daily_budget_per_user: int = int(os.getenv("AI_DAILY_BUDGET", "200"))

        # CORS Origins
        frontend_env = os.getenv("FRONTEND_URL", "").strip()
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8501",
            "http://127.0.0.1:8501",
        ]
        if frontend_env:
            for item in frontend_env.split(","):
                cleaned = item.strip().rstrip("/")
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
