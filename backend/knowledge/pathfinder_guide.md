# Pathfinder Platform Guide & System Knowledge

## 1. What Pathfinder Is (In 5 Lines)
1. Pathfinder is an AI-powered campus placement co-pilot designed for undergraduate engineering students.
2. It solves the problem of generic, one-size-fits-all career guidance by evaluating individual academic and technical metrics.
3. It helps students understand their real placement readiness through transparent machine learning rather than guesswork.
4. It provides structured 6-week learning roadmaps, portfolio project blueprints, and real-time conversational AI coaching.
5. It is built for students, training & placement officers (TPOs), and mentors aiming for top-tier software and core engineering placements.

---

## 2. Core Features (Plain Language Guide)

### 1. Onboarding Wizard
- **What it does**: A friendly multi-step intake flow that collects the student's branch, graduation year, target role (e.g., SDE, Data Analyst, Cloud DevOps), current CGPA, active backlogs, internships, and self-assessed coding & communication ratings.
- **How a student uses it**: Students complete it upon first signing up or can re-run it at any time from Profile & Settings.
- **Result they get**: Initializes their student profile, baseline readiness score, and custom dashboard recommendations.

### 2. Readiness Command (Overview Tab)
- **What it does**: The central command deck displaying an animated 0-100% Placement Readiness score gauge alongside 5 core vectors (CGPA, Coding/DSA, Internships, Communication, Backlog status).
- **How a student uses it**: Students glance here daily to inspect their standing, see which vector is holding them back, and click direct action buttons.
- **Result they get**: A clear, instantaneous diagnostic of candidate tier (e.g., "Strong Candidate Profile" vs "Needs Focus & Acceleration") and prioritized next steps.

### 3. 6-Week Milestone Roadmap
- **What it does**: Converts the student's target role requirements into a structured, semester-friendly 6-week preparation roadmap with actionable weekly milestones.
- **How a student uses it**: Students navigate week-by-week, reviewing curated focus areas (Week 1: Core Fundamentals & DSA patterns, through Week 6: Mock interviews and behavioral prep).
- **Result they get**: A clear day-by-day study schedule eliminating confusion on what to study next.

### 4. AI Career Coach
- **What it does**: An intelligent, bilingual (English, Telugu script, and Roman Telugu/Tenglish) conversational mentor powered by Google Gemini.
- **How a student uses it**: Students type or speak their doubts, ask for project plans, request mock interview feedback, or seek honest motivation.
- **Result they get**: Instant, empathetic, context-aware answers tailored to their active screen, target branch, and actual skill level.

### 5. Project Blueprints (23 Software & Hardware Architectures)
- **What it does**: A curated catalog of 23 production-grade portfolio projects (6 flagship architectures + 17 national industry engineering blueprints) with difficulty tiers (Small, Medium, Hard) across software, AI, hardware/IoT, and distributed systems.
- **How a student uses it**: Students filter by domain/difficulty, review system architecture summaries, recommended tech stacks, key features, and defense talking points.
- **Result they get**: Real, resume-worthy projects that impress technical recruiters instead of generic cloned tutorial apps.

### 6. Cohort Analytics
- **What it does**: An interactive data explorer displaying campus recruitment distributions across 972 student records, 9 engineering branches, and multiple graduation years.
- **How a student uses it**: Students and placement coordinators filter by branch, academic year, and status to view placement percentages, average salary packages (LPA), and minimum CGPA cutoffs.
- **Result they get**: Realistic benchmarks showing where past candidates with similar profiles were placed and at what packages.

### 7. ATS Resume Studio
- **What it does**: An instant resume analysis tool that inspects resume text for applicant tracking system (ATS) compatibility, strong action verbs, quantifiable metrics, and missing keywords for the student's target role.
- **How a student uses it**: Students paste their resume markdown/text or upload their CV for an immediate score audit.
- **Result they get**: An ATS score out of 100 with line-by-line rewrite suggestions that highlight business and engineering impact.

### 8. Branches and Courses (Branch Intelligence)
- **What it does**: A comparative intelligence module benchmarking placement rates, core hiring companies, and top technical roles across 9 engineering branches (CSE, IT, AIML, CSD, ECE, EEE, Mech, Civil, Cyber Security).
- **How a student uses it**: Students switch between branch tabs to compare average packages, placed percentages, and industry recruiting sectors.
- **Result they get**: Contextual clarity on how their specific discipline fares in current campus drives.

### 9. Project Defense (Viva Simulator)
- **What it does**: Simulates a high-pressure technical interview / viva defense for candidate portfolio projects.
- **How a student uses it**: Students select a project and answer challenging questions posed by an AI technical interviewer (e.g., architectural trade-offs, scalability bottlenecks, failure modes).
- **Result they get**: Honest feedback on their project explanations, exposing conceptual blind spots before actual company interviews.

### 10. Profile & Settings
- **What it does**: The central management hub for student credentials, target preferences, data export, and account settings.
- **How a student uses it**: Students update their latest semester CGPA, newly cleared backlogs, or completed internships.
- **Result they get**: Automatic recalculation of their readiness score and updated roadmap recommendations across the entire platform.

---

## 3. How the AI Works (Simple & Transparent)

### Random Forest Machine Learning (Readiness Score)
- **Algorithm**: A calibrated `RandomForestClassifier` trained with 120 decision trees on placement dataset records.
- **Inputs (5 Features)**:
  1. `cgpa`: Academic performance on a 10.0 scale.
  2. `backlogs`: Count of active uncleared academic backlogs.
  3. `internships`: Number of completed industry or research internships.
  4. `communication_score`: Rated on a 1.0 - 10.0 scale.
  5. `coding_score`: Rated on a 1.0 - 10.0 scale.
- **Output**: A calibrated probability percentage from 0% to 100%, candidate categorization (e.g., "Strong Candidate Profile", "Solid Foundation", "Needs Focus & Acceleration"), and prioritized strengths/weaknesses.
- **What the score means**: It indicates the statistical likelihood of placement under historical campus recruitment cutoffs.
- **Its limits**: It is a mathematical estimate based on historical patterns; it cannot account for real-time interview day nerves, company hiring freezes, or niche interpersonal fit.

### Gemini AI Coach (Conversational Mentor)
- Powered by Google Gemini (`gemini-2.0-flash` / `gemini-2.5-flash`), with automated fallback to OpenRouter when needed.
- Uses real multi-turn conversation memory (last 12 turns) and is dynamically grounded in this knowledge guide and the 23 project catalog.
- Evaluates the student's active screen context so answers are tailored directly to what the student is looking at.

### Unified Data Tools
- Both the dashboard and the AI coach read from the exact same single source of truth (`backend/data_service.py`), ensuring that numbers, percentages, and catalog titles never contradict each other.

---

## 4. How Data Flows

```
[Student Signs In / Guest Demo]
           │
           ▼
[Inputs/Updates Profile in Onboarding or Settings]
           │
           ▼
[FastAPI Backend /api/predict or /api/profile]
           │
           ├──► [Random Forest ML Model calculates Readiness %]
           │
           ├──► [SQLite WAL Database persists profile]
           │
           ▼
[Dashboard Updates Gauge, 5 Vectors, and Roadmap]
           │
           ▼
[AI Coach Console reads Profile, Active Screen, and Knowledge]
           │
           ▼
[Context-Aware Gemini LLM Generates Tailored Guidance]
```

---

## 5. Honest Data Disclosure
- **Public Baseline Dataset**: 215 student records originating from the public `Placement_Data_Full_Class.csv` (historical campus recruitment records including degree stream, academic percentages, employability test scores, and placement outcomes).
- **Augmented Cohort Dataset**: 972 cohort records mapped across 9 engineering disciplines (CSE, IT, AIML, CSD, ECE, EEE, Mech, Civil, Cyber Security) for batches 2024–2026, synthesized to demonstrate institutional multi-year analytics and department-specific benchmarks.
- **Estimate Disclaimer**: All predictions, readiness percentages, and salary tier forecasts are statistical estimations for self-improvement and preparation, not legal or institutional guarantees of employment.

---

## 6. Tech Stack
- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Lucide Icons, Recharts, Framer Motion, and ThreeUI WebGL shader canvases.
- **Backend**: Python 3.11, FastAPI, Uvicorn, and Pydantic v2 with modular API routers.
- **Database & Cache**: SQLite in Write-Ahead Logging (WAL) mode with connection pooling and in-memory LRU caching.
- **AI & ML**: Scikit-Learn `RandomForestClassifier`, Google Gemini 2.0 Flash REST API, and OpenRouter fallback.
- **Hosting**: Vercel for the client Single Page Application (SPA), Render for the backend API web service, and automated GitHub Actions CI.

---

## 7. 10 Frequently Asked Questions (FAQs)

### Q1: Is a high readiness score a guarantee of getting placed?
**Answer**: No. The readiness score is a statistical probability based on historical criteria. Real placement depends on your live coding performance, company test cutoffs, interview performance, and current job market demand.

### Q2: How does the Random Forest calculate the score?
**Answer**: It feeds your 5 key metrics (CGPA, backlogs, internships, coding, communication) through 120 decision trees trained on student placement records to compute the probability of clearing campus recruitment.

### Q3: Where does the student data come from?
**Answer**: The baseline data comes from a verified public campus placement dataset (215 records) augmented into a 972-student multi-year cohort (2024–2026) across 9 branches to model realistic campus trends.

### Q4: Does the AI Coach have access to my profile without me repeating it?
**Answer**: Yes. When you chat with the coach, the backend automatically provides your active profile (branch, CGPA, target role, readiness score) and current dashboard screen into the model's context.

### Q5: Can students from non-CS branches (like ECE, Mech, Civil) use Pathfinder?
**Answer**: Absolutely. Pathfinder supports 9 branches, offering branch-specific placement analytics and hardware/IoT/embedded project blueprints alongside software architectures.

### Q6: Can a student manipulate their score by entering false numbers?
**Answer**: While students can adjust their profile values to simulate scenarios (via the What-If Simulator), official placement drives require institutional grade sheet verification. The score is meant as an honest self-assessment diagnostic.

### Q7: Are the 23 project blueprints just standard tutorial clones?
**Answer**: No. They are comprehensive production-grade architectures (e.g., distributed asynchronous queues, smart IoT healthcare systems, high-scale industry problem statements) complete with system architecture, edge failure modes, and viva defense questions.

### Q8: Does Pathfinder store or leak student passwords?
**Answer**: No. Pathfinder uses PBKDF2-SHA256 password hashing, secure JWT tokens, session isolation, and strict OWASP security headers. Passwords are never stored in plain text.

### Q9: Does Pathfinder replace campus placement officers or teachers?
**Answer**: Not at all. It acts as a co-pilot to assist TPOs and teachers by giving each student 24/7 personalized practice, roadmap clarity, and project mentorship at zero marginal cost.

### Q10: Can I use Pathfinder for free without signing up?
**Answer**: Yes. Pathfinder features an instant Guest Demo mode and one-click New Student Wizard with no credit card or mandatory OAuth required.
