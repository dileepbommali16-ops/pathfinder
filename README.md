# Pathfinder 2.0 — Campus Placement Readiness Platform & AI Career Coach

Pathfinder is an intelligent, full-stack placement readiness assessment, cohort benchmarking, and career coaching platform designed for engineering students. It bridges academic metrics with real-world recruitment criteria through data-driven probability modeling, interactive cohort analytics, and a multi-lingual AI mentor.

---

## 🌟 Core Features

- **Interactive Placement Readiness Calculator**: Move sliders for CGPA, Active Backlogs, Internships, Communication Rating, and Coding Confidence to instantly evaluate placement probability with visual gauge metrics and actionable improvement roadmaps.
- **Cohort Benchmarking & Analytics**: Real-time filters by branch (CSE, IT, ECE, MECH, CIVIL) and skill tier over historical placement datasets, featuring placement distribution charts and branch rankings.
- **Readiness History & Progression Tracking**: Persistent SQLite database recording timestamped assessment snapshots, delta metrics over time, and CSV export.
- **AI Career Coach (English & Telugu)**: Context-aware study roadmaps for Data Structures & Algorithms, Core Computer Science (OS, DBMS, CN), System Design, Behavioral STAR interview strategies, and ATS resume optimization powered by Google Gemini with deterministic offline fallbacks.
- **Signature Lamp Login Experience**: Interactive cord-drag lamp physics with dark ambient glow, floating fireflies, and seamless guest/demo modes.
- **Hardened OAuth 2.0 & Session Management**: Google and GitHub OAuth authentication with signed CSRF state verification and cryptographically signed JWT sessions.
- **Native Android Companion**: Android app built with Kotlin, Jetpack Compose, Material Design 3, and Room Database.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | React 19, Vite, Tailwind CSS, Radix UI, Framer Motion, Recharts, Lucide Icons |
| **Backend API** | FastAPI, Python 3.11, Uvicorn, SQLite (WAL mode), Scikit-Learn, Pandas |
| **AI / Mentorship** | Google Gemini API (`gemini-3.8-flash`), OpenRouter fallback, Rule-based Offline Fallback |
| **Authentication** | Google OAuth 2.0, GitHub OAuth 2.0, Jose / Authlib, Signed JWT Sessions |
| **Mobile App** | Kotlin, Jetpack Compose, Android Room Database, Coroutines & Flow |
| **Cloud Deployment** | Vercel (Frontend Static Client) & Render (Backend Web Service) |
| **Live Deployments** | Frontend: [pathfinder-client-fzom.vercel.app](https://pathfinder-client-fzom.vercel.app) · Backend: [pathfinder-backend-klrp.onrender.com](https://pathfinder-backend-klrp.onrender.com) |

---

## 🚀 Getting Started Locally

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **npm** / **pnpm**

### 1. Backend Setup
```bash
# Navigate to project directory
cd pathfinder-main

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and OpenAPI docs will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```
The React frontend client will be available at `http://localhost:3000` (or `http://localhost:5173`).

---

## 🔑 Environment Variables

Create a `.env` file in the project root based on `.env.example`. Only variable names are required:

### AI & Mentorship
- `GEMINI_API_KEY`: Google Gemini API key for AI mentor responses.
- `GEMINI_MODEL`: Model version identifier (e.g., `gemini-3.8-flash`).
- `OPENROUTER_API_KEY`: Optional fallback key.
- `OPENROUTER_MODEL`: Optional fallback model.

### Server & Networking
- `HOST`: Server bind address (`0.0.0.0` or `127.0.0.1`).
- `PORT`: Server port (e.g., `8000`).
- `BACKEND_URL`: Internal backend address.
- `BACKEND_PUBLIC_URL`: Public backend URL (e.g., `https://your-backend.onrender.com`).
- `FRONTEND_URL`: Comma-separated list of allowed frontend origins for CORS and OAuth redirects.
- `VITE_API_BASE_URL`: Base API URL used by the Vite client.

### Security & OAuth
- `JWT_SECRET`: Secret key for signing session tokens (min 32 characters).
- `GOOGLE_CLIENT_ID`: Google Cloud OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth Client Secret.
- `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App Client Secret.

---

## 📁 Repository Structure

```
pathfinder-main/
├── backend/                  # FastAPI backend server
│   ├── api.py                # REST endpoints, routers, CORS, and health checks
│   ├── database.py           # SQLite persistence, schema, and readiness history
│   ├── gemini_engine.py      # AI mentor engine, intent routing, and offline fallbacks
│   ├── oauth.py              # OAuth flow, state signing, and exchange logic
│   ├── ml_engine.py          # Placement readiness calculations & logic
│   └── data_service.py       # Cohort dataset loading & analytics
├── client/                   # React 19 + Vite frontend
│   ├── src/
│   │   ├── components/       # UI components, dashboard slides, modals
│   │   │   ├── auth/         # LampLogin and authentication controls
│   │   │   └── dashboard/    # Readiness calculator, cohort analytics, history
│   │   ├── pages/            # Page layouts and showcases
│   │   └── lib/              # API client and utility functions
│   └── public/               # Public web assets and favicon
├── app/                      # Native Android mobile application (Jetpack Compose)
├── data/                     # Canonical datasets (CSV and JSON)
├── docs/                     # Architecture and operational documentation
├── scripts/                  # Automated verification, audit, and deployment scripts
│   ├── build-client.js       # Production Vite asset compilation & sync
│   └── db_backup.py          # SQLite online atomic backup automation
├── render.yaml               # Cloud Render deployment blueprint
├── vercel.json               # Vercel client deployment configuration
└── requirements.txt          # Python production dependencies
```

---

## 🔒 Production Deployment

- **Render**: Configured via `render.yaml` to run `uvicorn backend.api:app --host 0.0.0.0 --port $PORT` with auto-healing and daily keep-alive cron ping.
- **Vercel**: Configured via `vercel.json` to execute `node scripts/build-client.js` with output directed to `dist/public`.
