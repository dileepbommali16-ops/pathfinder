# Pathfinder 2.0 — AI-Powered Campus Placement & Career Readiness Platform

Pathfinder 2.0 is a full-stack career readiness and technical interview preparation platform for engineering students. It unifies predictive placement analytics, resume tailoring, multi-language code execution, system architecture blueprints, and a real-time 3D voice mentor in one web workspace.

**Live Website:** [https://pathfinder-client-fzom.vercel.app](https://pathfinder-client-fzom.vercel.app)

---

## Problem Statement

Engineering students preparing for campus recruitment face four persistent gaps:

1. **ATS Resume Drop-Offs:** Strong candidates get rejected before interviews because resumes lack quantified impact statements, target role alignment, and single-column ATS formatting.
2. **Surface-Level Portfolio Projects:** Generic tutorial clones fail when hiring panels test distributed workflows, failure handling, caching, and system design trade-offs.
3. **Lack of Objective Benchmarking:** Students apply across companies without data-backed visibility into how their CGPA, backlogs, coding proficiency, and internship history affect shortlist probability.
4. **Disconnected Practice Workflows:** Coding editors, technical viva practice, project guides, and placement tracking live across separate tools, slowing down structured preparation.

---

## Solution Overview

Pathfinder 2.0 solves these bottlenecks through six integrated workspaces:

| Workspace | Core Capability | Student Outcome |
| :--- | :--- | :--- |
| **1. Readiness Dashboard & Simulator** | Interactive ML placement probability card, 6-axis readiness breakdown, company radar benchmarks, and real-time What-If trajectory sliders. | Understand exact placement odds and test how closing gaps boosts shortlist chances. |
| **2. 1-Click JD Tailor & ATS Studio** | Compares a student profile and resume against company job descriptions, highlights missing skills/keywords, and builds a 1-page printable ATS PDF. | Submit role-aligned, quantified resumes engineered to pass recruiter screening. |
| **3. Live Coding & Technical Viva Arena** | Browser-based 11-language compiler (`Python`, `C`, `C++`, `Java`, `JavaScript`, `TypeScript`, `SQL`, `Rust`, `Go`, `C#`, `PHP`) paired with company-style mock interviews and STAR project defense grading. | Practice writing compilable code and defending algorithmic complexity aloud. |
| **4. 28 Engineering Project Blueprints** | Curated system design architectures across CS, AI/ML, Cloud, Data, and Embedded tracks with domain filters and implementation guides. | Replace weak starter apps with interview-ready production architectures. |
| **5. Cohort Intelligence & 6-Week Roadmap** | Historical branch/skill placement distributions across 972 campus records paired with a personalized 6-week preparation sprint plan. | Benchmark against placed peers and execute a focused weekly study schedule. |
| **6. DAS — 3D Voice Career Assistant** | Interactive WebGL 3D holographic agent supporting real-time voice and text interaction, concept explanations, coding studio automation, and hands-free slide control. | Receive instant technical mentoring and control platform workflows seamlessly. |

---

## High-Level System Architecture

```mermaid
flowchart TB
    Client["Web Application (React + TypeScript + Three.js WebGL)"]
    Edge["Serverless Fallback Handlers"]
    Gateway["REST & WebSocket API Gateway (FastAPI)"]
    ML["Placement Readiness Predictor (Scikit-Learn)"]
    AI["Real-Time Multimodal Voice & Generative AI Service"]
    Compiler["Isolated Multi-Language Sandbox Runners"]
    Store["Transactional Database & Semantic Vector Store (RAG)"]

    Client <-->|"HTTPS & WebSocket"| Gateway
    Client -->|"Resilient Edge Fallback"| Edge
    Gateway --> ML
    Gateway <--> AI
    Edge --> AI
    Gateway --> Compiler
    Gateway <--> Store
```

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router, Three.js / React Three Fiber, Recharts, Web Audio API |
| **Backend** | Python 3.11, FastAPI, Uvicorn (ASGI & WebSockets), Pydantic v2, HTTPX |
| **AI & Machine Learning** | Supervised Random Forest Pipeline (Scikit-Learn), Real-Time Multimodal Voice & Generative AI, Semantic Vector Retrieval (RAG), Automated PDF Parsing & Generation |
| **Sandboxed Execution** | Hardened In-Memory SQL Sandbox & Isolated Remote Compiler Runtimes across 11 Languages |
| **Data & Infrastructure** | PostgreSQL with Vector Indexing, SQLite (WAL Mode), Cloud Web & API Hosting, Automated CI Workflows |

---

## Project Structure

```text
pathfinder-main/
├── client/                              # Frontend SPA (React 19 + TypeScript + Vite)
│   ├── index.html                       # Application HTML shell & metadata
│   ├── public/
│   │   ├── models/                      # 3D avatar mesh asset (facecap.glb)
│   │   └── worklets/                    # Web AudioWorklet mic capture & PCM playback processors
│   └── src/
│       ├── App.tsx                      # Root router & global application providers
│       ├── main.tsx                     # React DOM bootstrap entry point
│       ├── agent/                       # Real-time 3D WebGL avatar, WebSocket voice bridge, viseme lip-sync & tool controllers
│       ├── audio/                       # Client audio playback & session queue manager
│       ├── auth/                        # Session state & auth event listeners
│       ├── components/
│       │   ├── auth/                    # Interactive login UI (LampLogin)
│       │   ├── common/                  # Shared UI inputs (searchable CollegeSelector)
│       │   ├── dashboard/               # Core workspaces: HeroMetrics, WhatIfSimulator, JDCustomTailor,
│       │   │                            # ResumeStudio, OnePageResumeModal, LiveCodingInterviewArena,
│       │   │                            # ProjectRecommender, CohortExplorer, RoadmapVisualizer, ProfileSettings
│       │   └── ui/                      # Reusable notification & tooltip primitives
│       ├── contexts/                    # Theme & shared UI context providers
│       ├── data/                        # Campus directory (134 colleges & universities) & 28 blueprint catalog
│       ├── hooks/                       # Active screen context & UI state hooks
│       ├── lib/                         # API client, auth helpers, interview evaluator & site knowledge
│       ├── pages/                       # Top-level views (Home, AtsResumeStudio, BlueprintDetail, MockInterview)
│       ├── types/                       # Shared TypeScript profile & domain interfaces
│       └── __tests__/                   # Frontend unit tests (Vitest)
│
├── backend/                             # Backend API & AI/ML Services (Python 3.11 + FastAPI)
│   ├── api.py                           # FastAPI entry point, CORS/security middleware & router mounts
│   ├── routers/                         # Modular REST & WebSocket routers
│   │   ├── auth_router.py               # Authentication & session token endpoints
│   │   ├── profile_router.py            # Candidate profile persistence & SSOT sync
│   │   ├── predictions_router.py        # ML placement probability & skill-gap endpoints
│   │   ├── analytics_router.py          # Cohort analytics & NAAC/NIRF reporting endpoints
│   │   ├── ai_router.py                 # Resume auditing, interview scoring & coding execution routes
│   │   ├── voice_routes.py              # Voice synthesis & real-time audio routes
│   │   ├── export_router.py             # CSV & structured PDF report exports
│   │   ├── github_router.py             # GitHub portfolio analysis integration
│   │   └── health_router.py             # Service readiness & health diagnostics
│   ├── agent/                           # Real-time multimodal voice proxy & session router
│   ├── config/                          # Environment settings & runtime configuration
│   ├── models/                          # Pydantic v2 request/response schemas
│   ├── repositories/                    # Data access layer for user profiles
│   ├── ml_engine.py                     # Calibrated Random Forest placement prediction pipeline
│   ├── analytics_engine.py              # Cohort filtering & statistical aggregation engine
│   ├── compiler_engine.py               # Isolated multi-language code execution dispatcher (11 languages)
│   ├── resume_auditor.py                # Recruiter-grade ATS scoring & critique engine
│   ├── pdf_engine.py                    # Resume PDF parsing & report generation
│   ├── database.py                      # Relational persistence layer (SQLite WAL / PostgreSQL)
│   ├── security.py                      # JWT signing, password hashing & OWASP request hardening
│   ├── oauth.py                         # OAuth provider verification helpers
│   ├── cache.py                         # In-memory response caching utilities
│   ├── reliability.py                   # Retry, timeout & circuit-breaker guards
│   └── tests/                           # Backend unit, API & concurrency tests (Pytest)
│
├── api/                                 # Serverless edge fallback handlers (chat & voice)
├── data/                                # Placement benchmark dataset (972 records) & JSON catalogs
│   ├── placement_records.csv            # Historical campus placement cohort dataset
│   ├── branches.json                    # Engineering branch metadata
│   ├── projects.json                    # Curated engineering project blueprints
│   ├── roles.json                       # Target engineering role definitions
│   └── skills.json                      # Technical skill taxonomy
├── supabase/
│   └── migrations/                      # Vector database schema & semantic search RPC migrations
├── scripts/
│   └── build-client.js                  # Production frontend build & artifact sync script
├── .github/
│   └── workflows/                       # Automated CI checks & repository maintenance workflows
├── Dockerfile                           # Container build definition for backend deployment
├── package.json                         # Workspace scripts & frontend dependencies
├── requirements.txt                     # Python backend dependencies
├── vite.config.ts                       # Vite bundler & path alias configuration
├── vitest.config.ts                     # Frontend test runner configuration
├── tsconfig.json                        # TypeScript compiler configuration
├── vercel.json                          # Frontend & serverless routing configuration
├── render.yaml                          # Backend infrastructure blueprint
├── .env.example                         # Environment variable template (no secrets)
├── DESIGN.md                            # Visual design system specification
└── LICENSE                              # MIT License
```

---

## Local Development & Verification

### 1. Start the Backend Server

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate  |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# Configure local environment variables using .env.example before starting
uvicorn backend.api:app --host 0.0.0.0 --port 8000 --ws auto
```

### 2. Start the Frontend Client

```bash
pnpm install
pnpm dev
```

### 3. Automated Quality Checks

```bash
# Backend unit & integration tests
python -m pytest -q

# Frontend unit tests & static checks
npx vitest run
npx tsc --noEmit
pnpm run build:vercel
```

---

## License

Released under the [MIT License](LICENSE).
