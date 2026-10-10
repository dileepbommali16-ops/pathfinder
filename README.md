# 🚀 Pathfinder 2.0 — Enterprise Campus Placement Intelligence & AI Career Coach

[![Live Deployment (Vercel)](https://img.shields.io/badge/Vercel-Frontend_Live-black?style=for-the-badge&logo=vercel)](https://pathfinder-client-fzom.vercel.app)
[![API Engine (Render)](https://img.shields.io/badge/Render-Backend_Active-46E3B7?style=for-the-badge&logo=render)](https://pathfinder-backend-klrp.onrender.com/api/health)
[![Python Version](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![React Version](https://img.shields.io/badge/React-19.2+-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> **Pathfinder 2.0** is an enterprise-grade campus placement intelligence platform and bilingual AI career coach. Engineered for undergraduate and postgraduate engineering candidates, it bridges academic transcripts with real-world technical hiring cutoffs using calibrated Random Forest machine learning models, multi-dimensional candidate vector profiling, interactive cohort analytics over 972 historical records, and a context-aware Google Gemini career mentor supporting English and Telugu.

---

## 🌐 Live Production Deployments

* **Production Frontend (Vercel):** [https://pathfinder-client-fzom.vercel.app](https://pathfinder-client-fzom.vercel.app)
* **Production API Engine (Render):** [https://pathfinder-backend-klrp.onrender.com](https://pathfinder-backend-klrp.onrender.com)
* **API Health & Continuous Telemetry:** [https://pathfinder-backend-klrp.onrender.com/api/health](https://pathfinder-backend-klrp.onrender.com/api/health)
* **Interactive OpenAPI Swagger Docs:** [https://pathfinder-backend-klrp.onrender.com/docs](https://pathfinder-backend-klrp.onrender.com/docs)

---

## 🏛️ 1. Full-Stack System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PATHFINDER FULL-STACK ARCHITECTURE                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  1. CLIENT & PRESENTATION TIER                                                                         │
│  ┌────────────────────────┬─────────────────────────┬────────────────────────┬────────────────────────┐│
│  │ React 19 + Vite 7      │ Vanilla HTML5 / CSS3/JS │ Bootstrap 5.3 Edition  │ Next.js & Vue 3        ││
│  │ (/client/src)          │ (/vanilla)              │ (/vanilla/bootstrap)   │ (/integrations)        ││
│  ├────────────────────────┼─────────────────────────┼────────────────────────┼────────────────────────┤│
│  │ • Tailwind CSS v4      │ • Zero-Build DOM Engine │ • Bootstrap 5.3 Grid   │ • Next.js App Router   ││
│  │ • Recharts + Lucide    │ • Chart.js Visualizer   │ • Dark Theme Cards     │ • Vue 3 SFC Component  ││
│  │ • 11 Interactive Views │ • Desk Lamp Physics     │ • REST API Client      │ • Reactive Two-Way Bind││
│  │ • 23 Portfolio Specs   │ • 3 Category Filter Tabs│ • Live Search Filtering│ • Handoff to AI Coach  ││
│  └────────────────────────┴─────────────────────────┴────────────────────────┴────────────────────────┘│
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  2. PROTOCOL, GATEWAY & SECURITY LAYER                                                                 │
│   ├── HTTPS RESTful APIs · Cryptographically Signed Bearer Tokens · 30-Min Idle Session Revocation      │
│   ├── HSTS (max-age=31536000; includeSubDomains; preload) & CSP upgrade-insecure-requests                  │
│   ├── Sliding-Window Rate Limiting (10 req/min auth, 30 req/min predict) & IDOR Multi-User Defense         │
│   ├── Multipart/Form-Data Resume Uploads with Binary Magic-Byte Verification (Blocks Malicious Files)  │
│   └── Sanitized Global Exception Handlers (Zero Leaked Stack Traces, Private Correlation request_id)   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  3. BACKEND COMPUTATION & INTELLIGENCE SERVICES                                                        │
│  ┌───────────────────────────────────┬───────────────────────────────────┬────────────────────────────┐│
│  │ Python 3.11 FastAPI Engine        │ Node.js Express Microservice      │ Java Enterprise Service    ││
│  │ (/backend)                        │ (/backend/node_server.js)         │ (/backend/java)            ││
│  ├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────┤│
│  │ • Scikit-Learn Random Forest ML   │ • Pure JavaScript Node Runtime    │ • JVM Placement Evaluator  ││
│  │ • Google Gemini 3.8 Flash AI Coach│ • CORS & Async HTTP Routing       │ • Strongly-Typed Telemetry ││
│  │ • System Architecture Engine      │ • Standalone Prediction Engine    │ • Android Kotlin Sync      ││
│  │ • Pydantic v2 Schema Validators   │ • Lightweight Fallback Gateway    │ • Zero-Lag Local Advisor   ││
│  └───────────────────────────────────┴───────────────────────────────────┴────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  4. MULTI-DATABASE STORAGE & PERSISTENCE TIER                                                          │
│  ┌───────────────────────────────────┬───────────────────────────────────┬────────────────────────────┐│
│  │ SQLite Production Core (WAL Mode) │ MySQL Enterprise Relational       │ MongoDB NoSQL Document     ││
│  │ (/data/pathfinder_production.db)  │ (/backend/db_connectors/mysql)    │ (/backend/db_connectors)   ││
│  ├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────┤│
│  │ • 13 Composite Performance Indexes│ • InnoDB utf8mb4 Engine Schema    │ • BSON Schema Validators   ││
│  │ • 972 Canonical Cohort Records    │ • PyMySQL Connection Pooling      │ • PyMongo Document Stores  ││
│  │ • Sub-5ms Read Query Latency      │ • Relational Profile Foreign Keys │ • Time-Series Prediction DB││
│  └───────────────────────────────────┴───────────────────────────────────┴────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 2. Frontend Architecture & Implementation

The Pathfinder presentation layer is designed with high responsiveness, visual excellence, and multi-framework flexibility:

### Primary React 19 Application (`/client`)
* **Build Tooling & Shell:** Built with **Vite 7** and **React 19** with strict TypeScript typing (`/client/src/main.tsx`, `/client/index.html`).
* **Design System & Styling:** **Tailwind CSS v4** token system with glassmorphic cards, smooth micro-animations, and CSS variables for dark-mode contrast.
* **Component Modularization:**
  * **Interactive Desk Lamp Login (`/client/src/components/auth/LampLogin.tsx`):** Custom physics-based interactive pull-cord switch with dynamic cord curvature and real-time room lighting toggling.
  * **5-Step Diagnostic Onboarding (`/client/src/components/onboarding/OnboardingWizard.tsx`):** Multi-step candidate intake capturing academic metrics, coding ratings, career targets, and certifications.
  * **Interactive Workspaces (`/client/src/components/dashboard/`):**
    * *Placement Gauge & Digital Twin Radar:* Recharts visualizer mapping 5 candidate skill vectors.
    * *What-If? Parameter Simulator:* Real-time sliders recalculating placement probabilities on the fly.
    * *Cohort Analytics Matrix:* Filterable table over 972 student records with salary distribution histograms, CSV export, and PDF generation.
    * *Engineering Portfolio Blueprints:* Catalog of 23 software and hardware architectures categorized into Software Systems and Hardware & Embedded.
    * *AI Career Coach Chat Console:* Full-screen chat interface powered by Google Gemini supporting streaming, regeneration, and Telugu script.
    * *ATS Resume Studio:* Drag-and-drop PDF parser calculating ATS score (0–100) and actionable keyword feedback.

### Multi-Framework Client Demonstrations
* **Pure Vanilla HTML/CSS/JavaScript (`/vanilla`):** Zero-build implementation using browser-native ES modules, CSS Grid, and Chart.js.
* **Bootstrap 5.3 Edition (`/vanilla/bootstrap_dashboard.html`):** Dark-themed responsive dashboard using standard Bootstrap grid utilities.
* **Next.js 14+ Integration (`/integrations/nextjs/`):** Modern React Server Component (RSC) compatible dashboard.
* **Vue 3 Integration (`/integrations/vue/`):** Single File Component (`PathfinderVueDashboard.vue`) demonstrating reactive two-way binding.

---

## ⚙️ 3. Backend Architecture & Implementation

The backend is built with **FastAPI (Python 3.11)**, engineered strictly according to 7 enterprise software pillars:

### 1. Fundamentals & Lifecycle
* **Lifespan Context Manager:** Handles database connection verification, schema self-healing, ML model loading, and graceful resource teardown.
* **Typed Configuration (`backend/config.py`):** Centralized Pydantic settings loading environment variables with strict typing.
* **Structured JSON Logging (`backend/logging_config.py`):** Correlates all incoming requests with unique `X-Request-ID` headers for end-to-end tracing.

### 2. Modular API Routing & Communication
* **Decoupled Routers (`backend/routers/`):**
  * `auth_router.py`: JWT issuance, Google/GitHub OAuth exchange, and session revocation.
  * `profile_router.py`: Candidate profile CRUD with IDOR multi-tenant isolation.
  * `predictions_router.py`: Machine learning probability inference and sensitivity curves.
  * `ai_router.py`: Conversational mentor routing, 6-week roadmaps, and resume ATS analysis.
  * `analytics_router.py`: High-speed cohort queries with multi-column filtering.
  * `health_router.py`: Root `/`, `/health`, and `/api/health` probes for cloud uptime monitors.
  * `export_router.py`: Streaming CSV and PDF generation engines.

### 3. Machine Learning & Predictive Analytics
* **Random Forest Classifier (`backend/ml_engine.py`):** Trained on 972 historical student placement records across 9 engineering departments (CSE, IT, ECE, EEE, Mech, Civil, AIML, CSD, CSM).
* **Calibrated Sensitivity Vectors:** Computes dynamic impact curves for CGPA changes, backlog resolution, internship completions, and coding confidence improvements.

### 4. Bilingual Google Gemini AI Engine
* **Model Hierarchy (`backend/gemini_engine.py`):** Primary support for `gemini-3.8-flash` with automatic fallback to `gemini-2.5-flash` and local high-fidelity heuristic engines.
* **Multilingual Fluency:** Seamlessly answers queries in **English**, **Telugu script (తెలుగు)**, and conversational **Roman Telugu (Tenglish)** with zero cold-start failures.
* **Circuit Breakers & Rate Limiters:** Protects upstream AI quotas with automated circuit breakers (`gemini_circuit_breaker`).

### 5. Multi-Database Storage Tier
* **Primary SQLite WAL Database (`backend/database.py`):** High-concurrency Write-Ahead Logging mode with 13 composite B-Tree indexes delivering sub-5ms query response times.
* **MySQL Enterprise Connector (`backend/db_connectors/mysql_adapter.py`):** Connection pooling and relational schema scripts for enterprise deployments.
* **MongoDB NoSQL Connector (`backend/db_connectors/mongodb_adapter.py`):** BSON document store integration for time-series prediction logs.

### 6. Security Hardening
* **OWASP Security Headers:** Automatic injection of `Strict-Transport-Security` (HSTS), `Content-Security-Policy` (CSP), `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.
* **Rate Limiting:** Sliding-window rate limiters protecting authentication endpoints (10 req/min) and AI inference (30 req/min).
* **Binary Magic-Byte Verification:** Verifies true `%PDF-` file signatures for resume uploads, rejecting forged or malicious payloads.

---

## 🛠️ 4. Complete Technology Stack & Tools Used

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Frontend Frameworks** | React 19, TypeScript, Vite 7, Next.js 14, Vue 3, HTML5, Vanilla JavaScript |
| **Styling & Icons** | Tailwind CSS v4, Bootstrap 5.3, Lucide React, CSS Variables Design System |
| **Data Visualization** | Recharts, Chart.js, HTML5 Canvas API |
| **Backend Runtime** | Python 3.11, FastAPI, Uvicorn (ASGI), Node.js (Express), Java 17 (JVM) |
| **Machine Learning & AI** | Scikit-Learn (Random Forest), Google Gemini 3.8 Flash, NumPy, Pandas |
| **Databases & Storage** | SQLite 3 (WAL Mode), MySQL (InnoDB), MongoDB, PyMongo, PyMySQL |
| **Security & Auth** | JWT (PyJWT), Passlib (Bcrypt), OAuth 2.0 (Google/GitHub), OWASP Security Headers |
| **Document Processing** | PyPDF, ReportLab (PDF Generation), Pandas (CSV Streaming) |
| **Testing & CI/CD** | Pytest, TypeScript Compiler (`tsc`), GitHub Actions, Automated Audit Suites |

---

## 🚀 5. Deployments & Infrastructure

Pathfinder 2.0 is deployed in production with a decoupled microservice topology:

### Frontend Deployment (Vercel)
* **Hosting Platform:** [Vercel Edge Network](https://vercel.com)
* **Live Production URL:** [https://pathfinder-client-fzom.vercel.app](https://pathfinder-client-fzom.vercel.app)
* **Routing Configuration (`vercel.json`):** Single Page Application (SPA) rewrite rules ensuring all deep links route to `index.html`.
* **Build Command:** `npm run build` (outputs to `/dist`).

### Backend Deployment (Render)
* **Hosting Platform:** [Render Cloud Application Platform](https://render.com)
* **Live Production URL:** [https://pathfinder-backend-klrp.onrender.com](https://pathfinder-backend-klrp.onrender.com)
* **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
* **UptimeRobot Continuous Health Monitoring:**
  * Root path `/` and `/api/health` respond with `HTTP 200 OK` on both `GET` and `HEAD` requests.
  * Zero 404 warnings during automated ping cycles.

### Environment Variables Reference

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | Optional | Port for the backend server (Defaults to `8000`, assigned by Render in production) |
| `HOST` | Optional | Host interface binding (Defaults to `0.0.0.0`) |
| `ENVIRONMENT` | Optional | Runtime mode: `production` or `development` |
| `JWT_SECRET` | Required | Cryptographic secret for signing session tokens |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for live AI Coach generation |
| `GEMINI_MODEL` | Optional | Model identifier (Defaults to `gemini-3.8-flash`) |
| `FRONTEND_URL` | Optional | Allowed CORS origin for production frontend |
| `DATABASE_PATH` | Optional | Custom path for SQLite database file |

---

## 💻 6. Local Setup & Development

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
Client available at: `http://localhost:5173`

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
