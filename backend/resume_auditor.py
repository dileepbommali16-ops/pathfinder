"""
Senior Enterprise & Deloitte Hiring Manager ATS Resume Audit Engine.
Performs honest, non-inflated structural, skill-taxonomy, project-depth,
certification, metric-quantification, and Big-4 / Tier-1 company matching analysis.
"""

from __future__ import annotations

import html
import io
import re
from typing import Any, Dict, List, Optional, Tuple, Union

from backend.models.schemas import (
    BulletRewriteItem,
    CompanyMatchItem,
    ResumeFeedback,
    ScoreBreakdown,
    StudentProfile,
)

# Normalized technical skill signals mapped from regex -> canonical display label
SKILL_TAXONOMY: Dict[str, List[Tuple[str, str]]] = {
    "languages": [
        (r"\bpython\b", "Python"),
        (r"\bjava\b", "Java"),
        (r"\bc\+\+\b|\bcpp\b", "C++"),
        (r"\btypescript\b", "TypeScript"),
        (r"\bjavascript\b|\bjs\b", "JavaScript"),
        (r"\bsql\b", "SQL"),
        (r"\bgolang\b|\bgo\b", "Go"),
        (r"\bc#\b", "C#"),
    ],
    "backend": [
        (r"\bfastapi\b", "FastAPI"),
        (r"\bdjango\b", "Django"),
        (r"\bflask\b", "Flask"),
        (r"\bspring\s?boot\b", "Spring Boot"),
        (r"\bnode\.?js\b|\bexpress\b", "Node.js / Express"),
        (r"\brest\s?api|\brestful\b", "REST APIs"),
        (r"\bgraphql\b", "GraphQL"),
        (r"\bmicroservices?\b", "Microservices"),
        (r"\bwebsockets?\b", "WebSockets"),
    ],
    "frontend": [
        (r"\breact\b", "React"),
        (r"\bnext\.?js\b", "Next.js"),
        (r"\bangular\b", "Angular"),
        (r"\bvue\b", "Vue.js"),
        (r"\btailwind\b", "Tailwind CSS"),
        (r"\bhtml5?\b", "HTML"),
        (r"\bcss3?\b", "CSS"),
    ],
    "databases": [
        (r"\bpostgres(?:ql)?\b", "PostgreSQL"),
        (r"\bmysql\b", "MySQL"),
        (r"\bmongodb\b", "MongoDB"),
        (r"\bredis\b", "Redis"),
        (r"\bdynamodb\b", "DynamoDB"),
        (r"\bsqlite\b", "SQLite"),
        (r"\bsnowflake\b", "Snowflake"),
    ],
    "cloud_devops": [
        (r"\baws\b|\bamazon web services\b|\bec2\b|\bs3\b|\blambda\b", "AWS"),
        (r"\bazure\b", "Microsoft Azure"),
        (r"\bgcp\b|\bgoogle cloud\b", "Google Cloud (GCP)"),
        (r"\bdocker\b", "Docker"),
        (r"\bkubernetes\b|\bk8s\b", "Kubernetes"),
        (r"\bci/?cd\b|\bgithub actions\b|\bjenkins\b", "CI/CD"),
        (r"\bterraform\b", "Terraform"),
        (r"\blinux\b", "Linux"),
        (r"\bgit\b|\bgithub\b", "Git / GitHub"),
    ],
    "testing_quality": [
        (r"\bpytest\b|\bunittest\b", "PyTest / Unit Testing"),
        (r"\bjest\b|\bvitest\b", "Jest / Vitest"),
        (r"\bjunit\b|\bmockito\b", "JUnit / Mockito"),
        (r"\bplaywright\b|\bselenium\b|\bcypress\b", "E2E Automation"),
        (r"\bsystem design\b", "System Design"),
        (r"\bdata structures\b|\balgorithms\b|\bdsa\b|\bleetcode\b", "DSA"),
        (r"\bdistributed systems\b", "Distributed Systems"),
        (r"\boops?\b|\bobject[- ]oriented\b", "OOP"),
        (r"\bdbms\b", "DBMS"),
        (r"\boperating systems?\b|\bcomputer networks?\b", "OS / CN"),
    ],
    "demo_tools": [
        (r"\bstreamlit\b", "Streamlit"),
        (r"\bgradio\b", "Gradio"),
        (r"\bjupyter\b", "Jupyter Notebook"),
        (r"\bpandas\b", "Pandas"),
        (r"\bnumpy\b", "NumPy"),
        (r"\bscikit[- ]learn\b|\bsklearn\b", "Scikit-learn"),
    ],
}

COMPANY_RUBRICS: List[Dict[str, object]] = [
    {
        "company": "Deloitte",
        "cutoff": 76,
        "keywords": [
            "SQL",
            "Python / Java",
            "REST APIs",
            "AWS / Azure / GCP",
            "Docker & CI/CD",
            "PostgreSQL / RDBMS",
            "Agile / SDLC",
            "System Design",
        ],
        "match_rules": [
            ("SQL", r"\bsql\b|\bpostgres\b|\bmysql\b|\bdbms\b"),
            ("Python / Java", r"\bpython\b|\bjava\b"),
            ("REST APIs", r"\brest\b|\bfastapi\b|\bdjango\b|\bflask\b|\bspring\b|\bexpress\b|\bapi\b"),
            ("AWS / Azure / GCP", r"\baws\b|\bazure\b|\bgcp\b|\bgoogle cloud\b"),
            ("Docker & CI/CD", r"\bdocker\b|\bci/?cd\b|\bgithub actions\b|\bjenkins\b"),
            ("PostgreSQL / RDBMS", r"\bpostgres|\bmysql\b|\boracle\b|\bsnowflake\b"),
            ("Agile / SDLC", r"\bagile\b|\bscrum\b|\bsdld?\b|\bsdlc\b|\bjira\b"),
            ("System Design", r"\bsystem design\b|\bmicroservices?\b|\barchitecture\b|\bscalab"),
        ],
    },
    {
        "company": "Amazon",
        "cutoff": 82,
        "keywords": ["AWS", "DSA", "System Design", "Microservices", "Java / Python", "Docker", "Unit Testing"],
        "match_rules": [
            ("AWS", r"\baws\b|\bec2\b|\bs3\b|\blambda\b|\bdynamodb\b"),
            ("DSA", r"\bdsa\b|\bdata structures\b|\balgorithms\b|\bleetcode\b"),
            ("System Design", r"\bsystem design\b|\bdistributed\b|\bscalab"),
            ("Microservices", r"\bmicroservices?\b|\bevent[- ]driven\b|\bkafka\b"),
            ("Java / Python", r"\bjava\b|\bpython\b|\bc\+\+\b"),
            ("Docker", r"\bdocker\b|\bkubernetes\b"),
            ("Unit Testing", r"\bpytest\b|\bjest\b|\bjunit\b|\bunit test"),
        ],
    },
    {
        "company": "Google",
        "cutoff": 86,
        "keywords": ["DSA", "System Design", "C++ / Python / Java", "Distributed Systems", "GCP / Cloud", "Testing", "Latency Metrics"],
        "match_rules": [
            ("DSA", r"\bdsa\b|\bdata structures\b|\balgorithms\b|\bleetcode\b"),
            ("System Design", r"\bsystem design\b|\barchitecture\b"),
            ("C++ / Python / Java", r"\bc\+\+\b|\bpython\b|\bjava\b|\bgolang\b"),
            ("Distributed Systems", r"\bdistributed\b|\bredis\b|\bcaching\b|\bconcurrency\b"),
            ("GCP / Cloud", r"\bgcp\b|\bgoogle cloud\b|\baws\b|\bazure\b|\bkubernetes\b"),
            ("Testing", r"\bpytest\b|\bjest\b|\bjunit\b|\bci/?cd\b"),
            ("Latency Metrics", r"\bms\b|\bp9[59]\b|\brps\b|\bqps\b|\bthroughput\b"),
        ],
    },
    {
        "company": "Microsoft",
        "cutoff": 82,
        "keywords": ["TypeScript / React", "Azure / Cloud", "DSA", "System Design", "C# / Python / Java", "CI/CD", "SQL"],
        "match_rules": [
            ("TypeScript / React", r"\btypescript\b|\breact\b|\bnext\.?js\b"),
            ("Azure / Cloud", r"\bazure\b|\baws\b|\bgcp\b|\bkubernetes\b"),
            ("DSA", r"\bdsa\b|\bdata structures\b|\balgorithms\b"),
            ("System Design", r"\bsystem design\b|\bdistributed\b|\bscalab"),
            ("C# / Python / Java", r"\bc#\b|\b\.net\b|\bpython\b|\bjava\b"),
            ("CI/CD", r"\bci/?cd\b|\bgithub actions\b|\bdocker\b"),
            ("SQL", r"\bsql\b|\bpostgres|\bmysql\b"),
        ],
    },
    {
        "company": "TCS Digital / Infosys",
        "cutoff": 68,
        "keywords": ["Python / Java", "SQL / DBMS", "OOP", "HTML / CSS / JS", "Git", "REST APIs", "Cloud Basics"],
        "match_rules": [
            ("Python / Java", r"\bpython\b|\bjava\b|\bc\+\+\b"),
            ("SQL / DBMS", r"\bsql\b|\bdbms\b|\bmysql\b|\bpostgres"),
            ("OOP", r"\boops?\b|\bobject[- ]oriented\b"),
            ("HTML / CSS / JS", r"\bjavascript\b|\bhtml\b|\bcss\b|\breact\b"),
            ("Git", r"\bgit\b|\bgithub\b"),
            ("REST APIs", r"\brest\b|\bfastapi\b|\bdjango\b|\bflask\b|\bspring\b"),
            ("Cloud Basics", r"\baws\b|\bazure\b|\bgcp\b|\bdocker\b"),
        ],
    },
    {
        "company": "Fast-Growth AI Startup",
        "cutoff": 75,
        "keywords": ["FastAPI / Next.js", "LLM / RAG / GenAI", "PostgreSQL / Vector DB", "Docker", "Live Deployed URL", "Streaming / WebSockets"],
        "match_rules": [
            ("FastAPI / Next.js", r"\bfastapi\b|\bnext\.?js\b|\breact\b|\bnode\b"),
            ("LLM / RAG / GenAI", r"\bllm\b|\brag\b|\bgemini\b|\bopenai\b|\blangchain\b|\bgenai\b|\bvector\b"),
            ("PostgreSQL / Vector DB", r"\bpostgres|\bpinecone\b|\bqdrant\b|\bsupabase\b|\bpgvector\b"),
            ("Docker", r"\bdocker\b|\brender\b|\bvercel\b|\baws\b"),
            ("Live Deployed URL", r"https?://(?!linkedin\.com)|vercel\.app|onrender\.com|netlify\.app|github\.io"),
            ("Streaming / WebSockets", r"\bwebsocket|\bsse\b|\bstreaming\b|\bredis\b"),
        ],
    },
]

DEMO_TOY_PATTERNS = [
    r"\bstreamlit\b",
    r"\bgradio\b",
    r"\bmini[- ]?project\b",
    r"\biris\b",
    r"\btitanic\b",
    r"\bquiz app\b",
    r"\btodo\b|\bto-do\b",
    r"\bcalculator\b",
    r"\bweather app\b",
    r"\bmovie recommendation\b",
    r"\bhouse price\b",
    r"\bfake news\b",
    r"\bspam detection\b",
    r"\bsimple\b",
    r"\bbasic\b",
]


def tier_for_score(score: int) -> str:
    if score >= 82:
        return "Tier-1 / Big-4 Ready"
    if score >= 68:
        return "Competitive Shortlist"
    if score >= 50:
        return "Needs Enterprise Polish"
    return "Major Overhaul Needed"


def _extract_skills(text: str) -> Tuple[List[str], Dict[str, int]]:
    detected: List[str] = []
    counts: Dict[str, int] = {}
    seen = set()
    low = text.lower()
    for category, pairs in SKILL_TAXONOMY.items():
        cat_count = 0
        for pattern, label in pairs:
            if re.search(pattern, low):
                cat_count += 1
                if label not in seen:
                    seen.add(label)
                    detected.append(label)
        counts[category] = cat_count
    return detected, counts


def _extract_project_lines(text: str) -> List[str]:
    lines = [re.sub(r"\s+", " ", ln).strip("•-* \t") for ln in text.splitlines()]
    proj_hits: List[str] = []
    in_projects = False
    for ln in lines:
        if not ln:
            continue
        low = ln.lower()
        if re.match(r"^(projects?|academic projects?|key projects?)\b", low):
            in_projects = True
            continue
        if in_projects and re.match(
            r"^(education|certifications?|achievements?|experience|skills?|internships?|declaration)\b",
            low,
        ):
            in_projects = False
            continue
        is_numbered_or_app = bool(
            re.match(r"^\d+[\.)]\s+", ln)
            or (in_projects and 8 <= len(ln) <= 130 and not ln.endswith(":"))
            or any(tag in low for tag in ("streamlit", "app", "system", "platform", "prediction", "detector", "clone"))
        )
        if is_numbered_or_app and len(ln) >= 8 and ln not in proj_hits:
            proj_hits.append(ln[:110])
    return proj_hits[:6]


def _build_company_matches(
    text: str,
    overall_score: int,
    has_metrics: bool,
    toy_only: bool,
) -> List[CompanyMatchItem]:
    low = text.lower()
    matches: List[CompanyMatchItem] = []
    depth_penalty = 14 if toy_only else (6 if not has_metrics else 0)

    for rubric in COMPANY_RUBRICS:
        matched: List[str] = []
        missing: List[str] = []
        for label, pattern in rubric["match_rules"]:  # type: ignore[attr-defined]
            if re.search(pattern, low):
                matched.append(label)
            else:
                missing.append(label)
        total = max(1, len(rubric["match_rules"]))  # type: ignore[arg-type]
        kw_pct = (len(matched) / total) * 100.0
        blended = int(round((kw_pct * 0.65) + (overall_score * 0.35) - depth_penalty))
        match_score = max(10, min(98, blended))
        cutoff = int(rubric["cutoff"])  # type: ignore[arg-type]

        if match_score >= cutoff:
            verdict = f"Passes {rubric['company']} ATS screen ({len(matched)}/{total} core signals matched)."
        elif match_score >= cutoff - 15:
            verdict = f"Borderline for {rubric['company']}: add {', '.join(missing[:3])} with quantified project impact."
        else:
            verdict = f"High rejection risk at {rubric['company']}: lacks {', '.join(missing[:3])} & production proof."

        matches.append(
            CompanyMatchItem(
                company=str(rubric["company"]),
                cutoff_score=cutoff,
                match_score=match_score,
                verdict=verdict,
                matched_keywords=matched,
                missing_keywords=missing,
            )
        )
    return matches


def _build_missing_skills(counts: Dict[str, int], detected: List[str], low: str) -> List[str]:
    missing: List[str] = []
    if counts.get("backend", 0) == 0:
        missing.append("Production Backend & APIs: Add FastAPI / Django REST / Node.js (Express) or Spring Boot with JWT auth & OpenAPI docs.")
    if counts.get("databases", 0) == 0:
        missing.append("Databases & Caching: Add PostgreSQL (indexing, migrations, ACID transactions) plus Redis caching.")
    if counts.get("cloud_devops", 0) <= 1:
        missing.append("Cloud & DevOps (Mandatory for Deloitte / Big-Tech): Add AWS (EC2/S3/Lambda) or Azure, Docker containers, & GitHub Actions CI/CD.")
    if counts.get("testing_quality", 0) == 0:
        missing.append("Automated Testing & Quality: Add PyTest / Jest unit + integration tests cleanly measured with code coverage.")
    if not re.search(r"\b(data structures|algorithms|dsa|leetcode)\b", low):
        missing.append("CS Core & DSA Benchmarks: Explicitly highlight Data Structures & Algorithms, OOP, DBMS, OS, & LeetCode/CodeChef rating.")
    if not re.search(r"\b(react|next\.?js|typescript|angular)\b", low):
        missing.append("Modern Production Frontend: Upgrade beyond basic HTML/Streamlit with React + TypeScript & responsive state management.")
    if not missing:
        missing.append("System Design & Observability: Add distributed rate limiting, Prometheus/Grafana metrics, or Kubernetes deployment specs.")
    return missing[:7]


def _build_certifications(low: str, target_role: str) -> List[str]:
    certs: List[str] = []
    if not re.search(r"\b(aws|cloud practitioner|solutions architect|developer associate)\b", low):
        certs.append("AWS Certified Cloud Practitioner (or AWS Certified Developer - Associate) — high ROI filter for Deloitte & product companies.")
    if not re.search(r"\b(azure|az-900|az-204|dp-203)\b", low):
        certs.append("Microsoft Certified: Azure Fundamentals (AZ-900) / Azure Data Engineer (DP-203) — heavily preferred by Deloitte Consulting.")
    if not re.search(r"\b(gcp|google cloud|associate cloud engineer)\b", low):
        certs.append("Google Cloud Associate Cloud Engineer (ACE) — validates real cloud deployment & IAM competence.")
    if re.search(r"\b(data|ml|ai|python|streamlit|pandas)\b", low) or "data" in target_role.lower():
        certs.append("Databricks Certified Data Engineer / TensorFlow or DeepLearning.AI Specialization — separates real ML engineers from toy demos.")
    certs.append("HackerRank / Oracle Java SE or Meta Back-End / Full-Stack Professional Certificate (backed by a verified credential ID link).")
    return certs[:5]


def _build_project_upgrades(toy_count: int, detected_projects: List[str], low: str) -> List[str]:
    upgrades: List[str] = []
    if toy_count > 0 or "streamlit" in low:
        upgrades.append(
            "Graduate Streamlit prototypes into 3-tier Production Systems: decouple React/Next.js frontend -> FastAPI/Node REST API -> PostgreSQL/Redis database -> Docker + cloud deploy."
        )
        upgrades.append(
            "Consolidate 3 small academic/Streamlit scripts into 1 flagship end-to-end capstone (e.g., Multi-tenant SaaS or RAG Copilot with Auth, Rate Limiting, Async Worker Queue, & Telemetry)."
        )
    if not re.search(r"github\.com/\S+", low):
        upgrades.append("Publish clean READMEs with architecture diagrams, API specs, & screenshots and link live GitHub repos + hosted URLs right next to every project title.")
    if not re.search(r"\b(\d+%|\d+ms|\d+\+|\d+x|users?|latency|requests?)\b", low):
        upgrades.append("Instrument and benchmark every project: record exact API p95 latency (ms), dataset size, active users, accuracy %, or speedups instead of vague feature descriptions.")
    if not re.search(r"\b(docker|ci/?cd|pytest|jest|unit test)\b", low):
        upgrades.append("Add Docker Compose setup, PyTest/Jest test suite (75%+ coverage), and a green GitHub Actions CI badge to prove enterprise engineering discipline.")
    return upgrades[:5]


def _build_bullet_rewrites(detected_projects: List[str], toy_only: bool, low: str) -> List[BulletRewriteItem]:
    items: List[BulletRewriteItem] = []
    if "streamlit" in low or toy_only:
        sample_name = detected_projects[0] if detected_projects else "Movie Recommendation / ML App using Streamlit"
        items.append(
            BulletRewriteItem(
                before=f"Built {sample_name}",
                after="Engineered an end-to-end ML recommendation service using FastAPI, PostgreSQL, and Redis caching behind a responsive UI, cutting p95 inference latency by 48% across 10k+ records and deploying via Docker on AWS.",
                reason="Replaces a single-line Streamlit demo claim with production architecture, caching, quantified latency metric (48%), dataset scale (10k+), and cloud deployment (Google X-Y-Z formula).",
            )
        )
        sample_two = detected_projects[1] if len(detected_projects) > 1 else "Prediction / Academic Mini-Project in Python"
        items.append(
            BulletRewriteItem(
                before=f"Created {sample_two}",
                after="Developed a validated REST prediction pipeline with Scikit-learn, Pydantic schema guards, and automated PyTest CI checks, improving F1 validation accuracy from 74% to 89% with zero unhandled runtime failures.",
                reason="Shows Deloitte & product managers you understand testing, schema validation, and iterative accuracy measurement rather than running a static notebook.",
            )
        )
    else:
        items.append(
            BulletRewriteItem(
                before="Worked on web application backend and database integration.",
                after="Architected RESTful API endpoints using FastAPI and PostgreSQL with composite B-tree indexing, reducing average query response time by 42% under 500 concurrent requests.",
                reason="Quantifies scale (500 concurrent requests) and measurable speedup (42%) using specific indexing technology.",
            )
        )
        items.append(
            BulletRewriteItem(
                before="Deployed project online and collaborated with team using Git.",
                after="Containerized multi-service backend with Docker and automated PyTest + GitHub Actions CI/CD pipelines, cutting manual deployment time from 25 minutes to under 3 minutes.",
                reason="Demonstrates DevOps reliability and concrete developer productivity impact.",
            )
        )
    return items


def analyze_resume_deterministically(
    resume_text: str,
    profile: Optional[StudentProfile] = None,
    target_role: Optional[str] = None,
) -> ResumeFeedback:
    """
    Produces a candid, Senior Deloitte / Big-Tech Manager audit strictly from the submitted text.
    Never returns empty feedback lists or fake optimistic '78 Tier-1 Ready' placeholders.
    """
    clean_text = (resume_text or "").strip()
    low = clean_text.lower()
    word_count = len(re.findall(r"[A-Za-z0-9]+", clean_text))
    role_label = (
        (target_role or "").strip()
        or (profile.target_role if profile and profile.target_role else "")
        or "Software Development Engineer / Consulting Analyst"
    )

    if len(clean_text) < 80 or word_count < 15:
        matches = _build_company_matches("", 15, has_metrics=False, toy_only=True)
        return ResumeFeedback(
            score=14,
            recruiter_readiness_tier="Major Overhaul Needed",
            verdict="Unreadable or nearly empty resume — ATS parsers and Deloitte recruiters will reject immediately.",
            manager_critique=(
                "As a Senior Engineering Manager, almost no parsable text could be extracted from your submission "
                "(likely a scanned image PDF without OCR text layer, or fewer than 15 words). "
                "Export a crisp, text-selectable single-column PDF from Word, Google Docs, or LaTeX (Jake's Resume template) "
                "containing full Contact links, Technical Skills, Production Projects, and Certifications."
            ),
            breakdown=ScoreBreakdown(keywords=10, structure=15, impact=5, skills_match=10, projects=10, education=30, formatting=15),
            detected_skills=[],
            detected_projects=[],
            strengths=["None detected yet — resubmit a text-selectable single-column PDF or paste full resume text."],
            improvements=[
                "Your file yielded too little extractable text for automated ATS screening (use selectable text, never flat PNG/JPEG exports inside PDF).",
                "Include clear sections: Header + GitHub/LinkedIn, Education, Technical Skills, 2–3 Production Projects, Internships/Certifications.",
            ],
            missing_skills=_build_missing_skills({}, [], ""),
            recommended_certifications=_build_certifications("", role_label),
            project_upgrade_plan=_build_project_upgrades(1, [], ""),
            ats_keywords=["Python", "SQL", "REST APIs", "FastAPI", "PostgreSQL", "Docker", "AWS", "Git/GitHub", "CI/CD", "Unit Testing"],
            missing_keywords=["SQL", "REST APIs", "AWS / Azure", "Docker", "PostgreSQL", "Unit Testing"],
            formatting_tips=[
                "Strict 1-page single-column ATS format with standard headings (Education, Skills, Experience, Projects, Certifications).",
                "Verify text is highlightable/copyable inside Chrome before uploading to company portals.",
            ],
            rewritten_bullets=_build_bullet_rewrites([], True, ""),
            action_plan=[
                "Day 1–2: Rebuild resume into a clean single-column LaTeX/Docs template with clickable GitHub & LinkedIn links.",
                "Week 1–2: Upgrade one basic app into a FastAPI + PostgreSQL + React deployed system with metrics.",
                "Week 3: Add Docker + GitHub Actions CI + PyTest/Jest unit tests.",
                "Week 4: Earn AWS Cloud Practitioner or Azure AZ-900 and tailor keywords for Deloitte / Amazon.",
            ],
            project_suggestions=[
                "Full-Stack SaaS / Placement Portal with FastAPI + PostgreSQL + Redis + Docker + CI/CD",
                "Enterprise RAG Document Analyzer with FastAPI + Vector DB + Citations + Latency Benchmarks",
            ],
            company_matches=matches,
            evaluation_source="Strict Deloitte & Tier-1 Deterministic Audit",
        )

    detected_skills, counts = _extract_skills(clean_text)
    detected_projects = _extract_project_lines(clean_text)

    toy_hits = sum(1 for rx in DEMO_TOY_PATTERNS if re.search(rx, low))
    has_streamlit = "streamlit" in low
    has_backend_api = counts.get("backend", 0) > 0
    has_real_db = bool(re.search(r"\b(postgres|mysql|mongodb|redis|dynamodb|snowflake)\b", low))
    has_cloud = bool(re.search(r"\b(aws|azure|gcp|google cloud|docker|kubernetes|terraform|ci/?cd)\b", low))
    has_testing = counts.get("testing_quality", 0) > 0
    metric_matches = re.findall(r"\b\d+(?:\.\d+)?\s*(?:%|ms|s\b|x\b|k\b|m\b|rps|qps|users?|records?|requests?|lpa)\b", low)
    has_metrics = len(metric_matches) >= 2
    has_github = bool(re.search(r"github\.com/\S+", low))
    has_linkedin = bool(re.search(r"linkedin\.com/\S+", low))
    has_cert = bool(re.search(r"\b(certified|certification|aws certified|az-900|coursera|nptel|oracle|databricks)\b", low))
    has_internship = bool(re.search(r"\b(intern|internship|experience|software engineer|developer at)\b", low))

    # Toy-only detector (e.g., weak skills + Streamlit mini-projects only)
    toy_only = (toy_hits >= 1 or has_streamlit) and not has_backend_api and not has_cloud

    # Honest component sub-scores (0-100)
    non_demo_skills = len(detected_skills) - counts.get("demo_tools", 0)
    skills_score = min(92, max(18, non_demo_skills * 8 + counts.get("languages", 0) * 5 - (10 if toy_only else 0)))
    keywords_score = min(94, max(20, (len(detected_skills) * 6) + (12 if has_backend_api else 0) + (12 if has_cloud else 0)))
    projects_score = min(
        95,
        max(
            18,
            (32 if has_backend_api else 12)
            + (20 if has_real_db else 4)
            + (18 if has_cloud else 0)
            + (15 if has_metrics else 0)
            + (10 if has_github else 0)
            - (18 if toy_only else 0),
        ),
    )
    impact_score = min(95, 16 + len(metric_matches) * 14 + (14 if has_internship else 0))
    structure_score = 45 + (15 if has_github else 0) + (10 if has_linkedin else 0) + (15 if word_count >= 180 else 0) + (10 if 180 <= word_count <= 750 else 0)
    structure_score = min(96, structure_score)
    formatting_score = min(95, 52 + (12 if has_github else 0) + (10 if has_linkedin else 0) + (14 if word_count <= 700 else -8) + (8 if has_cert else 0))
    education_score = 84 if re.search(r"\b(b\.?tech|b\.?e|computer science|cse|ai|cgpa|gpa)\b", low) else 62

    overall = int(
        round(
            skills_score * 0.24
            + projects_score * 0.28
            + impact_score * 0.22
            + keywords_score * 0.14
            + structure_score * 0.12
        )
    )
    # Hard honest cap if resume only shows demo/Streamlit projects without backend, cloud, or metrics
    if toy_only and not has_metrics:
        overall = min(overall, 44)
    elif not has_backend_api and not has_cloud:
        overall = min(overall, 52)
    overall = max(18, min(95, overall))

    tier = tier_for_score(overall)

    strengths: List[str] = []
    if detected_skills:
        strengths.append(f"Recognized technical stack in resume: {', '.join(detected_skills[:8])}.")
    if has_backend_api and has_real_db:
        strengths.append("Demonstrates backend API + persistent database architecture rather than standalone scripts.")
    if has_metrics:
        strengths.append(f"Uses quantified outcomes ({', '.join(metric_matches[:3])}) that pass recruiter metric scans.")
    if has_github or has_linkedin:
        strengths.append("Includes clickable GitHub/LinkedIn portfolio verification links.")
    if has_cert:
        strengths.append("Lists formal technical certifications/coursework alongside academic credentials.")
    if not strengths:
        strengths.append("Readable foundational layout with core education context — needs enterprise stack depth and metrics.")

    improvements: List[str] = []
    if toy_only or has_streamlit:
        improvements.append(
            "Major Blocker (Deloitte & Product Screen): Your projects rely heavily on Streamlit / basic academic demos. Hiring managers immediately classify Streamlit-only portfolios as prototype tutorials rather than scalable production engineering."
        )
    if not has_backend_api:
        improvements.append(
            "No Production Backend Framework: Add RESTful APIs built with FastAPI, Django, Spring Boot, or Node.js/Express with authentication and proper error handling."
        )
    if not has_real_db:
        improvements.append(
            "Missing Persistent Database & Caching Layer: Employers test SQL schema design, indexing, transactions (PostgreSQL/MySQL), and Redis caching."
        )
    if not has_cloud:
        improvements.append(
            "Zero Cloud / Container Proof: Top recruiters (Deloitte, Amazon, Microsoft) filter heavily for AWS/Azure/GCP, Docker, and GitHub Actions CI/CD."
        )
    if not has_metrics:
        improvements.append(
            "Unquantified Bullets: Zero concrete metrics detected (% latency reduction, RPS throughput, accuracy %, active users). Convert every project bullet to Google X-Y-Z format."
        )
    if not has_github:
        improvements.append("Missing GitHub Repo URLs: Recruiters will not trust code quality claims without direct GitHub links and live deployed URLs.")
    if not has_cert:
        improvements.append("No Recognized Enterprise Certifications: Big-4 firms like Deloitte weight AWS/Azure/GCP/Databricks credentials heavily during campus shortlisting.")
    if not has_testing:
        improvements.append("No Testing / Engineering Discipline Mentioned: Add PyTest/Jest/JUnit automated tests and CI pipeline verification.")
    if not improvements:
        improvements.append(
            "Tailor Flagship Project Bullets to Target JD: Add direct live deployment URLs, open-source PR links, and distributed system trade-offs for Staff/Bar-Raiser rounds."
        )

    if overall < 50:
        verdict = "Shortlist risk HIGH: thin enterprise stack and demo/Streamlit-level projects need major production upgrading before Deloitte or Tier-1 applications."
    elif overall < 68:
        verdict = "Mid-tier baseline: shows foundational coding ability, but missing cloud, testing, and quantified metrics required by Big-4 & product cutoffs."
    elif overall < 82:
        verdict = "Competitive candidate: good technical alignment — closing a couple of cloud/metrics gaps will push you past Tier-1 cutoffs."
    else:
        verdict = "Strong enterprise-ready engineering resume with verified stack depth, production architecture, and measurable outcomes."

    manager_critique = (
        f"Candid Senior Deloitte & Product Manager Audit ({overall}/100 · {tier}): "
        + (
            f"Looking at your resume for '{role_label}', I see only {len(detected_skills)} verified skills "
            f"({', '.join(detected_skills[:5]) or 'minimal'}) and prototype/Streamlit-oriented projects ({len(detected_projects)} detected). "
            "In real enterprise hiring, Streamlit mini-apps (movie recommenders, quiz apps, Iris/basic dashboards) without backend APIs, "
            "SQL databases, Docker/cloud hosting, tests, or quantified metrics get rejected at the first ATS & manager screen. "
            if toy_only or overall < 55
            else f"Your resume shows {len(detected_skills)} recognized technologies ({', '.join(detected_skills[:6])}). "
            "To clear Deloitte Consulting, Amazon, or top product bar consistently, anchor every project with backend/cloud ownership, "
            "industry certifications, and measurable p95 latency or scale numbers. "
        )
        + f"Priority focus: {improvements[0]}"
    )

    missing_skills = _build_missing_skills(counts, detected_skills, low)
    certs = _build_certifications(low, role_label)
    upgrades = _build_project_upgrades(toy_hits, detected_projects, low)
    rewrites = _build_bullet_rewrites(detected_projects, toy_only, low)
    matches = _build_company_matches(clean_text, overall, has_metrics, toy_only)

    ats_pool = [
        "FastAPI / Spring Boot",
        "PostgreSQL",
        "Redis",
        "Docker",
        "AWS / Azure",
        "GitHub Actions CI/CD",
        "PyTest / Jest",
        "RESTful APIs",
        "Microservices",
        "Data Structures & Algorithms",
        "Agile / SDLC",
        "System Design",
    ]
    missing_ats = [kw for kw in ats_pool if kw.split(" /")[0].lower() not in low][:10]

    formatting_tips = [
        "Keep strictly to 1 single column page (no multi-column tables, skill bars, photos, or icons that break Workday/Lever/Taleo ATS parsers).",
        "Place live clickable GitHub, LinkedIn, Portfolio/Deployed URL, Email, and Phone cleanly in the 2-line top header.",
        "Order sections for campus/early-career: Header -> Education -> Technical Skills (grouped by Languages, Backend/APIs, Databases, Cloud/DevOps, Testing) -> Projects (with Live + Repo links) -> Certifications & Achievements.",
        "Limit each project to 3–4 punchy action-verb bullets (Engineered, Architected, Automated, Reduced) with real numbers — zero first-person pronouns ('I', 'My').",
    ]
    if word_count < 160:
        formatting_tips.insert(0, f"Resume text is far too brief ({word_count} words). Aim for 320–550 information-dense words across 1 full page.")
    elif word_count > 780:
        formatting_tips.insert(0, f"Resume is overly wordy ({word_count} words). Trim narrative fluff down under 600 words so managers scan key stack & impact in 8 seconds.")

    return ResumeFeedback(
        score=overall,
        recruiter_readiness_tier=tier,
        verdict=verdict,
        manager_critique=manager_critique,
        breakdown=ScoreBreakdown(
            keywords=keywords_score,
            structure=structure_score,
            impact=impact_score,
            skills_match=skills_score,
            projects=projects_score,
            education=education_score,
            formatting=formatting_score,
        ),
        detected_skills=detected_skills,
        detected_projects=detected_projects,
        strengths=strengths,
        improvements=improvements,
        missing_skills=missing_skills,
        recommended_certifications=certs,
        project_upgrade_plan=upgrades,
        ats_keywords=missing_ats or ats_pool[:8],
        missing_keywords=missing_ats[:8],
        formatting_tips=formatting_tips,
        rewritten_bullets=rewrites,
        action_plan=[
            "Week 1: Replace bare Streamlit UI-only code with a proper FastAPI + PostgreSQL + JWT Auth REST backend & React frontend.",
            "Week 2: Containerize with Docker, add PyTest/Jest unit tests, deploy publicly (AWS/Azure/Render/Vercel), & benchmark latency metrics.",
            "Week 3: Complete 1 recognized credential (AWS Cloud Practitioner / Microsoft Azure AZ-900) and embed verified credential ID.",
            "Week 4: Rewrite every project bullet using Google X-Y-Z metrics, add GitHub/LinkedIn header links, and re-scan against Deloitte & Amazon rubrics.",
        ],
        project_suggestions=[
            "Multi-Tenant Enterprise SaaS Tracker (React + TypeScript + FastAPI + PostgreSQL + Redis + Docker + GitHub Actions CI)",
            "Production RAG Policy & Compliance Copilot (FastAPI + Vector DB + Citations + PyTest + Cloud Deploy)",
            "Distributed Event-Driven Order / Payment Webhook Engine (Idempotency Keys + Dead-Letter Queue + Metrics Dashboard)",
        ],
        company_matches=matches,
        evaluation_source="Senior Deloitte & Big-Tech Deterministic Audit Engine",
        spoken_summary=manager_critique,
    )


def merge_with_deterministic_audit(
    ai_feedback: Optional[ResumeFeedback],
    deterministic: ResumeFeedback,
    resume_text: str,
) -> ResumeFeedback:
    """
    Combines live Gemini AI critique with strict deterministic reality checks so scores
    are never unrealistically inflated on thin/Streamlit-only resumes and zero cards are ever blank.
    """
    if ai_feedback is None:
        return deterministic

    # Calibrate AI score against deterministic reality bounds so weak resumes cannot score fake 78+
    raw_score = int(getattr(ai_feedback, "score", deterministic.score) or deterministic.score)
    if deterministic.score < 50:
        calibrated_score = min(raw_score, deterministic.score + 8)
    else:
        calibrated_score = int(round((raw_score * 0.65) + (deterministic.score * 0.35)))
    calibrated_score = max(10, min(98, calibrated_score))

    def _pick_list(primary: Optional[List[str]], fallback: List[str]) -> List[str]:
        cleaned = [str(x).strip() for x in (primary or []) if str(x).strip()]
        return cleaned if cleaned else fallback

    return ResumeFeedback(
        score=calibrated_score,
        recruiter_readiness_tier=tier_for_score(calibrated_score),
        verdict=(getattr(ai_feedback, "verdict", "") or "").strip() or deterministic.verdict,
        manager_critique=(getattr(ai_feedback, "manager_critique", "") or "").strip() or deterministic.manager_critique,
        breakdown=ai_feedback.breakdown if getattr(ai_feedback, "breakdown", None) and ai_feedback.breakdown.skills_match > 0 else deterministic.breakdown,
        detected_skills=_pick_list(getattr(ai_feedback, "detected_skills", None), deterministic.detected_skills),
        detected_projects=_pick_list(getattr(ai_feedback, "detected_projects", None), deterministic.detected_projects),
        strengths=_pick_list(getattr(ai_feedback, "strengths", None), deterministic.strengths),
        improvements=_pick_list(getattr(ai_feedback, "improvements", None), deterministic.improvements),
        missing_skills=_pick_list(getattr(ai_feedback, "missing_skills", None), deterministic.missing_skills),
        recommended_certifications=_pick_list(getattr(ai_feedback, "recommended_certifications", None), deterministic.recommended_certifications),
        project_upgrade_plan=_pick_list(getattr(ai_feedback, "project_upgrade_plan", None), deterministic.project_upgrade_plan),
        ats_keywords=_pick_list(getattr(ai_feedback, "ats_keywords", None), deterministic.ats_keywords),
        missing_keywords=_pick_list(getattr(ai_feedback, "missing_keywords", None), deterministic.missing_keywords),
        formatting_tips=_pick_list(getattr(ai_feedback, "formatting_tips", None), deterministic.formatting_tips),
        rewritten_bullets=ai_feedback.rewritten_bullets if getattr(ai_feedback, "rewritten_bullets", None) else deterministic.rewritten_bullets,
        action_plan=_pick_list(getattr(ai_feedback, "action_plan", None), deterministic.action_plan),
        project_suggestions=_pick_list(getattr(ai_feedback, "project_suggestions", None), deterministic.project_suggestions),
        company_matches=ai_feedback.company_matches if getattr(ai_feedback, "company_matches", None) and len(ai_feedback.company_matches) >= 4 else deterministic.company_matches,
        evaluation_source=(getattr(ai_feedback, "evaluation_source", "") or "").strip() or "DAS AI + Senior Hiring Manager Rubric",
        spoken_summary=(getattr(ai_feedback, "spoken_summary", "") or "").strip() or deterministic.manager_critique,
    )


def generate_resume_audit_pdf(payload: Union[ResumeFeedback, Dict[str, Any]]) -> bytes:
    """
    Compiles a complete, ReportLab-safe Senior Deloitte & Big-Tech ATS Audit PDF
    from either a ResumeFeedback model instance or JSON dictionary payload.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    if isinstance(payload, ResumeFeedback):
        data = payload.model_dump()
    elif isinstance(payload, dict):
        data = dict(payload)
    else:
        data = {}

    def esc(val: Any) -> str:
        return html.escape(str(val or "").strip(), quote=True)

    score = int(round(float(data.get("score", 0) or 0)))
    tier = esc(data.get("recruiter_readiness_tier") or tier_for_score(score))
    verdict = esc(data.get("verdict") or "Senior Hiring Manager ATS Resume Audit")
    critique = esc(data.get("manager_critique") or "")
    source = esc(data.get("evaluation_source") or "Pathfinder AI")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=36,
        bottomMargin=36,
        leftMargin=40,
        rightMargin=40,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "AuditTitle",
        parent=styles["Title"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6,
    )
    sub_style = ParagraphStyle(
        "AuditSub",
        parent=styles["Heading2"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#b91c1c") if score < 50 else colors.HexColor("#0e7490"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "AuditBody",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4,
    )

    story: List[Any] = [
        Paragraph("Pathfinder 2.0 · Senior Hiring Manager &amp; Deloitte ATS Resume Audit", title_style),
        Paragraph(
            f"<b>Score:</b> {score}/100 ({tier}) &nbsp;|&nbsp; <b>Source:</b> {source}",
            body_style,
        ),
        Paragraph(f"<b>Executive Verdict:</b> {verdict}", body_style),
    ]
    if critique:
        story.append(Paragraph(f"<b>Hiring Manager Critique:</b> {critique}", body_style))

    def add_bullet_section(heading: str, items: Any) -> None:
        clean_items = [str(x).strip() for x in (items or []) if str(x).strip()]
        if not clean_items:
            return
        story.append(Spacer(1, 4))
        story.append(Paragraph(esc(heading), sub_style))
        for item in clean_items[:12]:
            story.append(Paragraph(f"&bull; {esc(item)}", body_style))

    add_bullet_section("Critical Improvements Required", data.get("improvements"))
    add_bullet_section("Missing Enterprise Skills to Add", data.get("missing_skills"))
    add_bullet_section("Recommended Certifications (Deloitte & Big-Tech)", data.get("recommended_certifications"))
    add_bullet_section("Project Upgrade Blueprint (Beyond Basic Streamlit)", data.get("project_upgrade_plan"))
    add_bullet_section("Candidate Strengths", data.get("strengths"))

    rewrites = data.get("rewritten_bullets") or []
    if rewrites:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Google X-Y-Z Bullet Rewrites (Before -&gt; After)", sub_style))
        for rw in rewrites[:6]:
            if isinstance(rw, dict):
                before = esc(rw.get("before", ""))
                after = esc(rw.get("after", ""))
                if before or after:
                    story.append(Paragraph(f"<b>Before:</b> {before}", body_style))
                    story.append(Paragraph(f"<b>After:</b> {after}", body_style))
                    story.append(Spacer(1, 2))

    company_matches = data.get("company_matches") or []
    if company_matches:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Target Recruiter ATS Match Breakdown", sub_style))
        rows = [["Company", "Your Match", "Cutoff", "Assessment"]]
        for cm in company_matches[:8]:
            if isinstance(cm, dict):
                rows.append([
                    esc(cm.get("company", "")),
                    f"{int(cm.get('match_score', 0))}%",
                    f"{int(cm.get('cutoff_score', 0))}%",
                    esc(cm.get("verdict", ""))[:95],
                ])
        if len(rows) > 1:
            tbl = Table(rows, colWidths=[110, 62, 52, 295], repeatRows=1)
            tbl.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ])
            )
            story.append(tbl)

    add_bullet_section("Recommended ATS Keywords", data.get("ats_keywords"))
    add_bullet_section("Structural & Formatting Guidelines", data.get("formatting_tips"))
    add_bullet_section("4-Week Overhaul Action Plan", data.get("action_plan"))

    doc.build(story)
    return buf.getvalue()

