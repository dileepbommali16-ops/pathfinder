# 🚀 Pathfinder 2.0 — Enterprise Campus Placement Intelligence & AI Career Coach

[![Live Deployment (Vercel)](https://img.shields.io/badge/Vercel-Frontend_Live-black?style=for-the-badge&logo=vercel)](https://pathfinder-client-fzom.vercel.app)
[![API Engine (Render)](https://img.shields.io/badge/Render-Backend_Active-46E3B7?style=for-the-badge&logo=render)](https://pathfinder-backend-klrp.onrender.com/api/health)
[![Python Version](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![React Version](https://img.shields.io/badge/React-19.2+-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> **Pathfinder 2.0** is an enterprise-grade, data-driven campus recruitment intelligence platform and bilingual AI career coach. Engineered for undergraduate and postgraduate engineering candidates, it bridges academic transcripts with real-world technical hiring cutoffs using calibrated Random Forest machine learning models, multi-dimensional candidate vector profiling, interactive cohort analytics over 972 historical records, and a context-aware Google Gemini career mentor supporting English and Telugu.

---

## 🌐 Live Production Deployments

* **Production Frontend (Vercel):** [https://pathfinder-client-fzom.vercel.app](https://pathfinder-client-fzom.vercel.app)
* **Production API Engine (Render):** [https://pathfinder-backend-klrp.onrender.com](https://pathfinder-backend-klrp.onrender.com)
* **API Health & Telemetry:** [https://pathfinder-backend-klrp.onrender.com/api/health](https://pathfinder-backend-klrp.onrender.com/api/health)
* **Interactive OpenAPI Swagger Docs:** `https://pathfinder-backend-klrp.onrender.com/docs`

---

## 🏛️ System Architecture

```text
                                  ┌──────────────────────────────────────────────┐
                                  │           CLIENT ACCESS LAYER                │
                                  ├──────────────────────┬───────────────────────┤
                                  │   React 19 + Vite    │  Vanilla JS Showcase  │
                                  │    (/client/src)     │      (/vanilla)       │
                                  └───────────┬──────────┴───────────┬───────────┘
                                              │                      │
                                              ▼                      ▼
                                    HTTPS REST / JWT Bearer Tokens / Headers
                                              │                      │
                                              ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PATHFINDER FASTAPI BACKEND ENGINE                                      │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [Middleware Pipeline]                                                                                 │
│   ├── Request Correlation ID (X-Request-ID) & Structured JSON Logger                                   │
│   ├── Client IP Defense (X-Forwarded-For Spoofing Mitigation, Cloudflare / Render Trust)               │
│   ├── In-Memory Sliding-Window Rate Limiter (Auth & Heavy PDF Export protection)                       │
│   └── OWASP Hardened Headers (HSTS, CSP, X-Frame-Options, Sniffing Protection)                         │
├───────────────────────────────────────────────────┬────────────────────────────────────────────────────┤
│  [API Routers Layer]                              │  [Core Intelligence Engines]                       │
│   ├── /api/auth       (Credentials & OAuth 2.0)   │   ├── Random Forest Placement Predictor (Scikit)   │
│   ├── /api/profile    (SSOT Candidate Records)    │   ├── Multi-Dimensional Readiness Vector Matrix    │
│   ├── /api/predict    (ML Inference & Sensitivity)│   ├── Gemini AI Bilingual Coach (English & Telugu) │
│   ├── /api/analytics  (972 Cohort Records)        │   ├── ATS Resume Parser & Keyword Scanner          │
│   ├── /api/ai         (Roadmap & Project Defense) │   └── In-Memory TTL Cache & Circuit Breakers       │
│   └── /api/export     (Streaming CSV & PDF)       │                                                    │
├───────────────────────────────────────────────────┴────────────────────────────────────────────────────┤
│  [Data Persistence & Storage Layer]                                                                    │
│   ├── SQLite (WAL Mode, 13 Composite Performance Indexes, Single Source of Truth)                      │
│   └── In-Memory LRU Cache with Automatic Invalidation on Profile Mutations                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Codebase Map: Where is Frontend & Where is Backend?

This repository contains clearly decoupled **Frontend** and **Backend** directories:

### 🖥️ 1. FRONTEND ARCHITECTURE (Where the UI is Built)
* **Primary Framework Application (`/client`):**
  * **HTML Shell & Mounting:** [`client/index.html`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/index.html) and [`client/src/main.tsx`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/main.tsx)
  * **Main View & Tab Orchestration:** [`client/src/pages/Home.tsx`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/pages/Home.tsx) (Contains all 11 workspace views)
  * **Lamp Login Experience:** [`client/src/components/auth/LampLogin.tsx`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/components/auth/LampLogin.tsx) (Interactive cord physics, ambient light)
  * **5-Step Onboarding Wizard:** [`client/src/components/onboarding/OnboardingWizard.tsx`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/components/onboarding/OnboardingWizard.tsx)
  * **Dashboard Feature Components:** [`client/src/components/dashboard/`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/components/dashboard/)
    * `HeroMetrics.tsx` — Readiness KPI cards and percentage gauges
    * `CareerDigitalTwin.tsx` — 5-vector Radar benchmark visualization
    * `AICoachConsole.tsx` — Bilingual Gemini AI chat mentor interface
    * `CohortExplorer.tsx` — 972 student cohort benchmark explorer
    * `ResumeStudio.tsx` — Drag-and-drop ATS resume scanner
    * `WhatIfSimulator.tsx` — Interactive placement probability sandbox
    * `RoadmapVisualizer.tsx` — 6-week preparation sprint milestones
    * `BranchIntelligence.tsx` — Branch placement rankings across 9 departments
  * **API Client & Networking:** [`client/src/lib/apiClient.js`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/lib/apiClient.js)
  * **Design System & Styles:** [`client/src/index.css`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/client/src/index.css) (Tailwind CSS tokens, dark mode)

* **Zero-Framework Static Showcase (`/vanilla`):**
  * Built as a pure, zero-build HTML5/CSS3/JavaScript alternative:
  * [`vanilla/index.html`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/vanilla/index.html) — Single-page view switcher
  * [`vanilla/app.js`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/vanilla/app.js) — Pure JS state machine & Chart.js radar
  * [`vanilla/api.js`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/vanilla/api.js) — Native browser fetch client
  * [`vanilla/style.css`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/vanilla/style.css) — Compiled styling bundle

---

### ⚙️ 2. BACKEND ARCHITECTURE (Where the API & Intelligence is Built)
* **Application Entry Point:** [`backend/main.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/main.py) (FastAPI app, middleware, CORS, lifespan)
* **Modular API Routers (`/backend/routers/`):**
  * [`auth_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/auth_router.py) — Credentials, OAuth 2.0 exchange, token revocation
  * [`profile_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/profile_router.py) — Candidate SSOT CRUD (IDOR-protected)
  * [`predictions_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/predictions_router.py) — Random Forest ML inference & bounds checks
  * [`ai_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/ai_router.py) — Gemini AI bilingual coach, ATS resume scanner
  * [`analytics_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/analytics_router.py) — 972 cohort queries & multi-variable filters
  * [`export_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/export_router.py) — Streaming CSV & ReportLab PDF generation
  * [`health_router.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/routers/health_router.py) — System telemetry, circuit breakers, liveness probes
* **Machine Learning & Core Engines:**
  * [`ml_engine.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/ml_engine.py) — Scikit-Learn Random Forest model & sensitivity vectors
  * [`gemini_engine.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/gemini_engine.py) — Gemini LLM mentor integration with bilingual prompt templates
  * [`data_service.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/data_service.py) — 972 cohort dataset management
  * [`database.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/database.py) — SQLite WAL engine with 13 composite B-Tree indexes
  * [`security.py`](file:///c:/Users/Priyanka/Downloads/pathfinder-main/backend/security.py) — IP extraction, rate limiting, JWT cryptography, OWASP headers


## 🎨 Frontend Architecture (Top to Bottom)

Pathfinder features a **Dual-Frontend Architecture**: an enterprise React 19 application and a zero-build vanilla HTML/CSS/JavaScript showcase.

### 1. Interactive Lamp Login Experience
* **Physics-Driven Pull Cord:** Clickable and draggable desk lamp pull string with dynamic cord curvature calculations.
* **Realistic Room Ambient Lighting:** Toggles room light, bulb glow, light beam cone, and desk surface illumination.
* **Authentication Options:**
  * One-Click **Google & GitHub OAuth 2.0** with signed state verification.
  * Direct Credentials Form (Username, Email, Password).
  * **Quick Demo / Guest Bypass** for instant evaluation without onboarding friction.

### 2. 5-Step Step-Wise Onboarding Wizard
Guides new students through a structured diagnostic intake before generating their baseline readiness score:
1. **Academic Foundations:** Full Name, Engineering Branch, Degree Course, Year/Semester, 10th/12th percentages, CGPA, and Active Backlogs.
2. **Technical Mastery:** Coding/DSA rating (1–10), Communication confidence, Core Skills tagging, and GitHub/LeetCode profile links.
3. **Career Ambitions:** Target role selection (SDE, ML Engineer, DevOps, Full-Stack) and Target Company Tier (Tier-1 Product, High-Growth Startups, Enterprise IT).
4. **Practical Experience:** Completed internships, academic/flagship project counts, and technical certifications.
5. **Review & Baseline Submission:** Automated parameter validation and instant calculation of the candidate's initial readiness baseline.

### 3. 11 Specialized Production Workspaces

| Workspace | Tab Identifier | Capabilities & Features |
| :--- | :---: | :--- |
| **Command Center Overview** | `#overview` | Live placement probability gauge, Academic & Backlog KPIs, Career Digital Twin radar vectors, What-If? real-time parameter sliders, and Priority Next Best Actions. |
| **AI Action Center** | `#action` | 1-Click diagnostic workflows: launch mock interview, trigger skill gap audit, or recalculate probabilities. |
| **Skills & 6-Week Roadmap** | `#skills` | Adaptive weekly milestone roadmap (Core Algorithms ➡️ System Design & Projects ➡️ Mock Interviews & Speed Tests), mission tracker, and skill intelligence matrix. |
| **Branch Intelligence** | `#branches` | Placement percentages, average packages, and top marquee recruiters across 9 engineering departments (CSE, IT, AIML, ECE, EEE, Mech, Civil, etc.). |
| **Cohort 972 Analytics** | `#analytics` | Authoritative database of 972 real placement records filterable by Batch Year, Department, Gender, and Skill; package distribution bar chart, CSV export, PDF export, and Gemini AI cohort summarizer. |
| **AI Career Coach** | `#coach` | Full-screen interactive mentor powered by Google Gemini with live profile awareness, English & Telugu script support, stop generation via `AbortController`, prompt chips, and message regeneration. |
| **Profile & System Settings** | `#profile` | Single Source of Truth (SSOT) academic parameter editor with direct backend SQLite synchronization and immediate probability re-indexing. |
| **ATS Resume Studio** | `#resume` | Drag-and-drop PDF resume uploader, raw text scanner, ATS scoring circle (0–100), Google X-Y-Z formula critique, keyword gap detection, and downloadable PDF feedback report. |
| **Project Blueprints** | `#projects` | Production-grade project architectures with tech stack recommendations and STAR interview defense talking points. |
| **Project Defense Simulator** | `#defense` | Interactive Round 2 technical interview architecture grilling console simulating interviewer follow-ups. |
| **Role Intelligence** | `#roles` | Detailed exploration of hiring benchmarks, required tech stacks, and package trajectories across modern engineering roles. |

---

## ⚙️ Backend Architecture & The 7 Enterprise Pillars

The backend is built with **FastAPI (Python 3.11)** adhering strictly to 7 enterprise engineering pillars:

```text
├── Pillar 1: Backend Fundamentals  ── Structured JSON logs, X-Request-ID correlation, Pydantic v2 schemas
├── Pillar 2: Modular API Router    ── Versioned routes (/api and /api/v1), strictly separated routers
├── Pillar 3: Database & Repository ── SQLite WAL mode, repository pattern, parameterized queries (Zero SQLi)
├── Pillar 4: Query Performance     ── 13 composite B-Tree indexes, optimized aggregates, sub-5ms queries
├── Pillar 5: Caching & Scale       ── Thread-safe in-memory cache, GZip compression, connection pooling
├── Pillar 6: Reliability           ── Circuit breaker protection, /api/health/live & /api/health/ready
└── Pillar 7: Security Essentials   ── OWASP security headers, IP spoofing mitigation, rate limits
```

### 1. Database Indexing & Performance
The SQLite database operates in **Write-Ahead Logging (WAL)** mode with 13 composite and single-column B-Tree indexes:
* `idx_cohort_branch_year` on `(branch, year)`: Accelerates cohort analytics filtering.
* `idx_user_profiles_user_id` & `idx_user_profiles_email`: Sub-millisecond candidate lookups.
* `idx_cohort_placement` & `idx_cohort_package`: Instantaneous package distribution histograms.

### 2. Machine Learning Placement Engine
* **Algorithm:** Multi-variable Random Forest Classifier trained on 972 historical student records.
* **Sensitivity Vectors:** Dynamically computes sensitivity curves for CGPA, Active Backlogs, Internships, Communication, and Coding DSA.
* **Deterministic Fallback:** Robust statistical fallback heuristics guarantee zero 500 errors even if ML model binaries are unavailable.

### 3. Context-Aware AI Career Coach
* **Engine:** Google Gemini (`gemini-2.5-flash` / `gemini-1.5-flash`) with automatic provider fallbacks.
* **Live Candidate Injection:** Automatically binds candidate branch, CGPA, target role, active tab, and roadmap gaps into the model's system prompt.
* **Multi-Lingual NLP:** Fully fluent in **English**, **Telugu script (తెలుగు)**, and **Roman Telugu (e.g., "DSA ela nerchukovali?")**.

---

## 🔒 20-Point Security & Reliability Audit Matrix

All 20 security requirements from our comprehensive pre-public audit have been implemented and verified:

| Checkpoint | Implementation & Hardening | Status |
| :--- | :--- | :---: |
| **SEC-01: IDOR Profile Isolation** | Profile reads and deletions strictly bounded to authenticated `user.user_id` with 401/403 enforcement. | ✅ PASS |
| **SEC-02: Admin Role Guard** | Admin assignment requires verification against `x-admin-key` matching the environment `ADMIN_KEY`. | ✅ PASS |
| **SEC-03: OAuth Open Redirect** | Redirect origins strictly validated against verified domain patterns (`pathfinder-` prefix domains). | ✅ PASS |
| **SEC-04: IP Spoofing Mitigation** | `get_client_ip` extracts authentic client IP from trusted CDN headers (`cf-connecting-ip`, `render-client-ip`). | ✅ PASS |
| **SEC-05: Path Disclosure Defense** | Removed local filesystem DB path disclosure from `/api/health` and sanitized error payloads. | ✅ PASS |
| **SEC-06: Rate Limiting Defense** | Sliding-window rate limiting on login (10 req/min) and heavy PDF endpoints (10 req/min). | ✅ PASS |
| **SEC-07: Telemetry Redaction** | Stripped internal key prefixes and runtime configurations from public health endpoints. | ✅ PASS |
| **SEC-08: Exception Sanitization** | Tracebacks redacted from AI resume parser HTTP 500 responses. | ✅ PASS |
| **SEC-09: Header CRLF Sanitization** | Filtered carriage returns and newlines from `Content-Disposition` attachment filenames. | ✅ PASS |
| **SEC-10: Token Revocation** | Immediate invalidation of JWT tokens on logout in the server-side revocation store. | ✅ PASS |
| **SEC-11: Magic-Byte Upload Guards** | PDF resume upload validates true `%PDF-` magic bytes, blocking `.exe` or forged files. | ✅ PASS |
| **SEC-12: Input Bounds Validation** | Pydantic constraints (`ge=0.0, le=10.0`) prevent unhandled crashes on malformed inputs. | ✅ PASS |
| **SEC-13: OWASP Security Headers** | Injects HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy on all responses. | ✅ PASS |

---

## 📡 Complete REST API Reference

### Authentication & Sessions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate with username and email; returns JWT token. |
| `POST` | `/api/auth/oauth/exchange` | Exchange OAuth code from Google/GitHub for a JWT session. |
| `GET` | `/api/auth/me` | Verify active JWT session token and return user metadata. |
| `POST` | `/api/auth/logout` | Revoke active JWT session token. |
| `GET` | `/api/auth/oauth-urls` | Check configuration status of Google and GitHub OAuth providers. |

### Candidate Profile (SSOT)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/profile` | Retrieve the authenticated student's profile. |
| `POST` | `/api/profile` | Create or update candidate profile parameters in SQLite. |
| `DELETE`| `/api/profile` | Securely delete authenticated candidate profile (IDOR-protected). |

### ML Inference & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predict` | Calculate placement probability, confidence label, and category breakdown. |
| `POST` | `/api/skill-gap` | Calculate candidate skill gaps and priority strengths. |
| `GET` | `/api/analytics` | Retrieve cohort records with filters (`year`, `branch`, `gender`, `skill`). |
| `GET` | `/api/cohort/paginated` | Paginated cohort records with page index and limit. |

### AI Career Coach & Workflows
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | Conversational Gemini AI career coach with live profile context. |
| `POST` | `/api/ai/roadmap` | Generate customized 6-week preparation milestone roadmap. |
| `POST` | `/api/ai/cohort-insight` | Generate Gemini AI narrative summary of current cohort filters. |
| `POST` | `/api/ai/resume` | Multipart PDF resume upload and ATS diagnostic analysis. |

### Reports & Data Export
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/export/csv` | Download cohort placement dataset as a CSV file. |
| `GET` | `/api/export/pdf` | Download cohort analytics summary as a PDF report. |
| `POST` | `/api/export/resume-pdf` | Download generated ATS resume critique as a PDF report. |

### Health & Observability
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Overall system health check and cold-start ping. |
| `GET` | `/api/health/live` | Kubernetes / Render liveness probe. |
| `GET` | `/api/health/ready` | Database readiness probe. |
| `GET` | `/api/cache/stats` | In-memory cache hit rate and entry statistics. |

---

## 🧪 Verification & Audit Test Suites

Pathfinder includes automated verification scripts to ensure 100% test coverage before every push:

```bash
# 1. Run the 60-second full system audit (Python compile, TypeScript, Bundles, Health)
python scripts/fast_health_check.py

# 2. Run the 16-point production-readiness suite (IDOR, bounds, indexes, pagination)
python scripts/test_production_readiness.py

# 3. Run the 7-point security verification suite (Isolation, rate-limits, XSS, magic bytes)
python scripts/security_audit_test.py

# 4. Verify all 7 Backend Enterprise Pillars
python scripts/verify_seven_pillars.py

# 5. Build and verify production client bundle
node scripts/build-client.js
```

**Latest Audit Run:** `58/58 Python files compiled`, `tsc --noEmit 0 errors`, `16/16 tests passed`, `7/7 security tests passed`. **Result: 100% Green.**

---

## 💻 Local Setup & Development

### Prerequisites
* **Python 3.11+**
* **Node.js 20+** and **npm** / **pnpm**

### 1. Clone the Repository
```bash
git clone https://github.com/dileepbommali16-ops/pathfinder.git
cd pathfinder
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```
Client available at: `http://localhost:5173` (or `http://localhost:3000`)

### 4. Zero-Framework Showcase (Vanilla JS)
To preview the pure HTML/CSS/JavaScript version without any build step:
```bash
# Open directly in browser or serve statically
cd vanilla
python -m http.server 8085
```
Open: `http://localhost:8085`

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
