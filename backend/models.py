from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class StudentProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    # Identification
    user_id: Optional[str] = Field(default=None, max_length=64)

    # Step 1: Basic Details
    email: Optional[str] = Field(default=None, max_length=128)
    full_name: Optional[str] = Field(default="Student Candidate", max_length=100)
    college: Optional[str] = Field(default="Engineering Institute", max_length=120)
    branch: Optional[str] = Field(default="CSE", max_length=50)
    course: Optional[str] = Field(default="B.Tech", max_length=50)
    current_year: Optional[Union[int, str]] = 4
    current_semester: Optional[Union[int, str]] = 7

    # Step 2: Academic Details
    tenth_percentage: Optional[float] = Field(default=85.0, ge=0.0, le=100.0)
    twelfth_percentage: Optional[float] = Field(default=82.0, ge=0.0, le=100.0)
    cgpa: float = Field(default=7.8, ge=0.0, le=10.0)
    percentage: Optional[float] = Field(default=74.1, ge=0.0, le=100.0)
    cgpa_formula_multiplier: Optional[float] = Field(default=9.5, ge=5.0, le=15.0)
    semester_cgpas: Optional[List[float]] = Field(default_factory=list)
    active_backlogs: Union[float, int] = Field(default=0, ge=0, le=50)
    history_backlogs: Union[float, int] = Field(default=0, ge=0, le=50)
    backlogs: Union[float, int] = Field(default=0, ge=0, le=50)  # alias for active_backlogs

    # Step 3: Skills & Experience
    technical_skills: Optional[List[str]] = Field(default_factory=lambda: ["Python", "SQL", "Data Structures"])
    tools: Optional[List[str]] = Field(default_factory=lambda: ["Git", "Docker", "VS Code"])
    programming_languages: Optional[List[str]] = Field(default_factory=lambda: ["Python", "Java", "SQL"])
    projects_count: Union[float, int] = Field(default=2, ge=0, le=100)
    internships: Union[float, int] = Field(default=1, ge=0, le=50)
    certifications: Optional[List[str]] = Field(default_factory=list)
    coding_profiles: Optional[Dict[str, str]] = Field(default_factory=dict)
    coding: Union[float, int] = Field(default=7, ge=0, le=10)
    communication: Union[float, int] = Field(default=7, ge=0, le=10)

    # Step 4: Career Goals
    target_role: Optional[str] = Field(default="Software Development Engineer (SDE)", max_length=120)
    target_domain: Optional[str] = Field(default="Full-Stack & Cloud Systems", max_length=120)
    preferred_location: Optional[str] = Field(default="Bangalore / Hyderabad", max_length=120)
    expected_package: Optional[str] = Field(default="10 - 15 LPA", max_length=60)
    preferred_company_type: Optional[str] = Field(default="Product Companies / Tier-1 MNCs", max_length=120)
    target_tier: Optional[str] = Field(default="Product Companies / Tier-1 MNCs", max_length=120)
    graduation_year: Optional[int] = Field(default=2026, ge=2000, le=2100)

    # Onboarding Status & Saved Progress
    onboarding_completed: bool = False
    wizard_step: int = Field(default=1, ge=1, le=5)


class ReadinessAuditResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    chance: float
    label: str
    tone: str
    overall_percentage: float
    cgpa: float
    conversion_formula: str
    strengths: List[str]
    gaps: List[str]
    recommended_skills: List[str]
    breakdown: Dict[str, float]
    cohort_comparison: Dict[str, Any]
    next_steps: List[str]
    is_estimated: Optional[bool] = False
    data_source: Optional[str] = "Random Forest ML Engine"


class PredictionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    chance: float
    label: str
    tone: str  # "strong" | "steady" | "focus"
    strengths: List[str]
    priorities: List[str]
    breakdown: Dict[str, float]
    is_estimated: Optional[bool] = False
    data_source: Optional[str] = "Random Forest ML Engine"


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
    message: str = Field(default="", max_length=10000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    profile: Optional[StudentProfile] = None


class CohortFilters(BaseModel):
    year: Optional[int] = Field(default=2026, ge=0, le=2100)
    branch: Optional[str] = Field(default="All", max_length=50)
    gender: Optional[str] = Field(default="All", max_length=50)
    skill: Optional[str] = Field(default="All", max_length=64)


class PaginatedCohortResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    page: int = Field(ge=1, default=1)
    page_size: int = Field(ge=1, le=100, default=25)
    total_records: int
    total_pages: int
    has_next: bool
    has_prev: bool
    records: List[Dict[str, Any]]


class UserSession(BaseModel):
    user_id: str = "usr_default"
    username: str = "Student"
    email: str = "candidate@pathfinder.ai"
    role: str = "student"
    auth_provider: str = "credentials"
    is_authenticated: bool = True
    token: Optional[str] = None


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    email: Optional[str] = Field(None, max_length=128)


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

