from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class StudentProfile(BaseModel):
    cgpa: float = Field(ge=0, le=10, default=7.5)
    backlogs: int = Field(ge=0, default=0)
    internships: int = Field(ge=0, default=1)
    communication: int = Field(ge=1, le=10, default=7)
    coding: int = Field(ge=1, le=10, default=7)
    target_role: Optional[str] = "Software Development Engineer (SDE)"
    target_tier: Optional[str] = "Product / Tier-1 MNC"
    branch: Optional[str] = "CSE"
    graduation_year: Optional[int] = 2026


class PredictionResult(BaseModel):
    chance: float
    label: str
    tone: str  # "strong" | "steady" | "focus"
    strengths: List[str]
    priorities: List[str]
    breakdown: Dict[str, float]


class Roadmap(BaseModel):
    headline: str
    skill_gaps: List[str]
    weekly_actions: List[str]


class CohortInsight(BaseModel):
    headline: str
    summary: str
    actions: List[str]


class ResumeFeedback(BaseModel):
    score: int = Field(ge=0, le=100)
    verdict: str
    strengths: List[str]
    improvements: List[str]
    ats_keywords: List[str]
    formatting_tips: List[str]


class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    profile: Optional[StudentProfile] = None


class CohortFilters(BaseModel):
    year: Optional[int] = 2026
    branch: Optional[str] = "All"
    gender: Optional[str] = "All"
    skill: Optional[str] = "All"


class UserSession(BaseModel):
    user_id: str = "usr_default"
    username: str = "Student"
    email: str = "candidate@pathfinder.ai"
    role: str = "student"
    auth_provider: str = "credentials"
    is_authenticated: bool = True
    token: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    email: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    message: str
    user: UserSession
    token: str


class OAuthUrlsResponse(BaseModel):
    google_configured: bool
    github_configured: bool
    google_url: Optional[str] = None
    github_url: Optional[str] = None


class SkillGapItem(BaseModel):
    skill: str
    category: str
    current_level: float
    required_level: float
    priority: str
    actionable_step: str


class SkillGapAnalysis(BaseModel):
    strengths: List[str]
    critical_gaps: List[SkillGapItem]
    priorities: List[str]
    category_breakdown: Dict[str, float]
    target_role_fit: float

