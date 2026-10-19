# Pathfinder Complete Pages & Component Guide

This guide details every page, tab, modal, and interactive component in Pathfinder 2.0. Written directly from the production source code and routing architecture.

---

## 1. Authentication & Modals

### Lamp Login & Signup (`LampLogin.tsx`)
- **Route / Trigger**: Modal triggered upon landing or via header profile avatar.
- **Purpose**: Authenticates candidate and syncs persistent student credentials with Single Source of Truth (SSOT).
- **What the student sees**: A sleek glassmorphic modal with a dynamic lamp overhead illumination effect, email/password inputs, and quick demo role switcher.
- **How to use**: Enter credentials or click "Demo Login" to load standard candidate telemetry.
- **Result given**: Generates JWT session token, loads user profile draft from `localStorage`, and unlocks personalized recommendations.
- **Data used**: `data/user_profiles.json` and client `localStorage`.

### Onboarding Wizard Steps 1 to 5 (`OnboardingWizard.tsx`)
- **Route / Trigger**: Opened automatically for new candidates or via "Re-run Onboarding" in Profile Settings.
- **Purpose**: Gathers baseline academic and skill metrics to calibrate the Machine Learning readiness engine.
- **Steps**:
  - **Step 1 (Academics & Department)**: Input Degree, Branch (CSE, IT, AIML, CSD, ECE, EEE, MECH, CIVIL, CYBER), Graduation Year, and current CGPA.
  - **Step 2 (Coding & Problem Solving)**: Input solved DSA problem count, preferred language (Python, Java, C++, JS), and self-rating (1-10).
  - **Step 3 (Projects & Experience)**: Select completed projects count, tech domains (Full Stack, AI/ML, Cloud/DevOps, Embedded), and internships.
  - **Step 4 (Target Career Goals)**: Select target role (SDE, Data Engineer, ML Engineer, Embedded) and dream tier (Product Tier-1 vs Service Tier-2).
  - **Step 5 (Verification & Profile Generation)**: Review input summary and submit for ML readiness score calculation.
- **Result given**: Generates calibrated candidate state and routes to Onboarding Result Screen.
- **Data used**: `StudentProfileState` schema, `data/branches.json`, `data/roles.json`.

### Onboarding Result Screen (`OnboardingResultScreen.tsx`)
- **Route / Trigger**: Shown upon completion of the 5-step wizard.
- **Purpose**: Displays the first-look placement audit and probability verdict.
- **What the student sees**: Animated radial progress dial with percentage (e.g. 78%), tier badge, top identified strength, and critical gap warning.
- **How to use**: Click "Proceed to Dashboard" or "Explore 6-Week Sprint".
- **Result given**: Seamless handoff into the main Pathfinder executive dashboard.
- **Data used**: Output of `POST /api/audit` or client-side ML engine.

---

## 2. Core Dashboard Tabs (Route: `/`, controlled via `activeTab`)

### Tab 1: Executive Overview Dashboard (`activeTab = "overview"`)
- **Purpose**: Comprehensive command deck summarizing total placement readiness, high-level metrics, and immediate actions.
- **What the student sees**:
  - `HeroMetrics`: Four core KPIs (Overall Readiness %, Estimated Placement Probability, Target Role Fit, Average Package for Branch).
  - `SkillGapSection`: Visual spider/bar chart comparing candidate skill levels against Tier-1 requirements.
  - `CareerDigitalTwin`: AI simulation model showing career progression trajectory over 1-3 years.
  - `CompanyPlacementRadar`: Live radar chart showing match percentages against Tier-1 firms (Razorpay, Amazon, TCS, Infosys).
- **How to use**: Scan top-level indicators; click any card to jump directly to dedicated deep-dive tabs.
- **Result given**: High-level clarity on current standing.
- **Data used**: `data/placement_records.csv`, `StudentProfileState`.

### Tab 2: Readiness Command Center & What-If Simulator (`activeTab = "action"`)
- **Purpose**: Interactive sensitivity analysis tool calculating how incremental improvements change placement probability.
- **What the student sees**:
  - `WhatIfSimulator`: Interactive sliders for CGPA (6.0 to 10.0), Coding Rating (1 to 10), Internships (0 to 4), and Backlogs (0 to 5).
  - Live recalculating readiness gauge with delta markers (e.g., "+12% readiness boost if you complete 1 internship").
  - `NextActionsWidget`: Prioritized checklist of the top 3 highest-ROI actions to take this week.
- **How to use**: Adjust sliders to visualize how achieving a higher CGPA or finishing an internship impacts eligibility.
- **Result given**: Evidence-based goal setting eliminating guesswork.
- **Data used**: `backend/ml_engine.py` (RandomForest classifier and sensitivity weights).

### Tab 3: 6-Week Sprint Roadmap (`activeTab = "skills"`)
- **Purpose**: Structured week-by-week curriculum taking a student from fundamentals to interview-ready.
- **What the student sees**:
  - Interactive timeline visualizer (`RoadmapVisualizer.tsx`) covering Weeks 1 through 6:
    - **Week 1**: Arrays, Hashing, Two Pointers, Time Complexity.
    - **Week 2**: Sliding Window, Linked Lists, Stacks & Queues.
    - **Week 3**: Binary Search, Trees, Binary Search Trees.
    - **Week 4**: Graphs (BFS, DFS), Topological Sort, Heaps.
    - **Week 5**: Dynamic Programming (1D/2D), Greedy Algorithms.
    - **Week 6**: Mock Technical Interviews, System Design & Behavioral STAR rounds.
  - Problem cards with difficulty badges (Easy, Medium, Hard), LeetCode reference links, and completion checkboxes.
- **How to use**: Click week headers to expand daily tasks; check off completed algorithmic problems.
- **Result given**: Day-by-day accountability eliminating syllabus paralysis.
- **Data used**: `data/skills.json` and `backend/data_service.py`.

### Tab 4: Flagship Portfolio Blueprints (`activeTab = "projects"`)
- **Purpose**: End-to-end production architecture guides for 23 high-impact engineering projects.
- **What the student sees**:
  - Project grid filterable by Branch (CSE, AIML, ECE, EEE, Mech, Cyber) and Difficulty (Small, Medium, Hard).
  - Project cards featuring: Title, Domain, Architecture Flow, Recommended Tech Stack, Key Features, and Google X-Y-Z Resume Bullet point.
  - Detail modal with complete folder structures, step-by-step implementation instructions, and viva defense talking points.
- **How to use**: Filter by your branch, select a project matching your target tier, and follow the step-by-step guide.
- **Result given**: Real, deployable portfolio projects that withstand technical recruiter scrutiny.
- **Data used**: `data/projects.json`.

### Tab 5: Cohort Placement Intelligence & Dataset Explorer (`activeTab = "analytics"`)
- **Purpose**: Real-time recruitment data explorer across 972 historical student records and 9 departments.
- **What the student sees**:
  - Filter controls for Graduation Year (2023, 2024, 2025, 2026), Branch (CSE, AIML, ECE, etc.), Gender, and Primary Skill.
  - Analytics summary cards: Placement Rate %, Average Salary (LPA), Highest Package (44.6 LPA), Median Package.
  - Salary distribution histograms, CGPA vs Package scatter plots, and searchable raw record table.
  - Action buttons: "AI Cohort Insight" (summarizes trends via Gemini), "Export CSV", and "Export PDF".
- **How to use**: Select your branch and graduation year to see exact placement percentages and company salary bands.
- **Result given**: Transparent ground truth on campus recruitment realities.
- **Data used**: `data/placement_records.csv` (972 rows) via `backend/data_service.py`.

### Tab 6: DAS AI Voice Coach Studio (`activeTab = "coach"`)
- **Purpose**: Full-screen interactive 3D conversational career mentor.
- **What the student sees**:
  - Responsive 3D holographic avatar with real-time breathing, blinking, and speech lip-sync visemes.
  - Glassmorphic chat log showing typed/spoken conversation history.
  - Quick topic prompt pills (Build Projects, Why Pathfinder, All Components, DSA Roadmap).
  - Audio status indicators (Listening, Thinking, Speaking) with mute and stop controls.
- **How to use**: Speak into your microphone or type questions; DAS answers via spoken voice and on-screen cards.
- **Result given**: Instant 24/7 personalized coaching, interview drills, and website navigation.
- **Data used**: `backend/gemini_engine.py`, `backend/knowledge/*`, `backend/data_service.py`.

### Tab 7: ATS Resume Studio & Scanner (`activeTab = "resume"`)
- **Purpose**: Automated resume screening and Google X-Y-Z formula optimizer.
- **What the student sees**:
  - Resume upload dropzone (PDF/DOCX/TXT) and text editor.
  - Real-time ATS match score (0-100) with breakdown across Impact Metrics, Action Verbs, and Keyword Match.
  - Line-by-line rewrite suggestions highlighting weak passive phrases with strong engineering achievements.
  - One-Page Resume Builder modal (`OnePageResumeModal.tsx`) with instant clean PDF export.
- **How to use**: Paste resume text or upload your CV; review suggested rewrites and click "Export One-Page ATS Resume".
- **Result given**: An ATS-clearing resume optimized for Tier-1 applicant screening systems.
- **Data used**: `backend/routers/ai_router.py` (`POST /api/ai/resume`).

### Tab 8: Branch & Degree Analytics (`activeTab = "branches"`)
- **Purpose**: Comparative departmental intelligence across all 9 engineering disciplines.
- **What the student sees**:
  - Branch selection tabs (CSE, AIML, CSD, IT, ECE, EEE, Mech, Civil, Cyber).
  - Departmental metrics: Placement Rate (e.g., 86.5% in CSE vs 58.2% in Mech), Average Package, Top Recruiting Roles, Core Hiring Companies.
- **How to use**: Switch branches to benchmark your discipline against college-wide averages.
- **Result given**: Unbiased salary and role expectations for your specific branch.
- **Data used**: `data/branches.json` and `backend/data_service.py`.

### Tab 9: STAR Architecture Defense Simulator (`activeTab = "defense"`)
- **Purpose**: Technical viva defense simulator testing your ability to explain complex project decisions.
- **What the student sees**:
  - Project selector loading any of the 23 blueprints or custom projects.
  - STAR methodology breakdown (Situation, Task, Action, Result).
  - High-pressure viva questions (e.g., "Why did you choose Redis over Memcached? How do you handle cache stampedes?").
  - Automated rubric score with depth and clarity feedback.
- **How to use**: Select your project, click "Generate Viva Question", and type or speak your technical justification.
- **Result given**: Interview confidence and articulate technical defense skills.
- **Data used**: `data/projects.json` and `backend/routers/ai_router.py`.

### Tab 10: Target Role Intelligence (`activeTab = "roles"`)
- **Purpose**: Deep-dive requirements explorer for standard industry job titles.
- **What the student sees**:
  - Role cards (SDE-1, Full Stack Developer, Data Engineer, ML Engineer, DevOps/Cloud, Embedded Systems).
  - Required core skills, typical hiring tech stacks, salary percentiles, and interview rounds.
- **How to use**: Select your desired career path to inspect the mandatory skill prerequisites.
- **Result given**: Targeted alignment between student preparation and job descriptions.
- **Data used**: `data/roles.json`.

### Tab 11: Placement Mission Tracker (`activeTab = "missions"`)
- **Purpose**: Gamified milestone and goal-tracking board for campus drives.
- **What the student sees**:
  - Active career missions (e.g., "Solve 50 Medium LeetCode Problems", "Deploy 2 Live Projects", "Conduct 3 Mock Vivas").
  - Progress bars, XP badges, and status trackers (Not Started, In Progress, Verified).
- **How to use**: Mark tasks complete as you progress through your 6-week preparation.
- **Result given**: Sustained motivation and visible daily momentum.
- **Data used**: Client `StudentProfileState`.

### Tab 12: AI Mock Interview & Viva Simulator (`activeTab = "interview"`)
- **Purpose**: Real-time simulated technical coding and behavioral interview with voice input.
- **What the student sees**:
  - Company and role selector (e.g. Razorpay Full Stack Engineer, Google SDE-1, Amazon Cloud).
  - Live AI interviewer terminal with alternating conversational turns.
  - Real-time scoring rubric evaluating Technical Accuracy, Problem Solving, and Communication.
- **How to use**: Click "Start Mock Interview", listen to the interviewer's question, and respond verbally or via text.
- **Result given**: Realistic interview practice under timed pressure with immediate scoring.
- **Data used**: `backend/routers/ai_router.py` and Gemini Live engine.

### Tab 13: Candidate Profile & SSOT Settings (`activeTab = "profile"`)
- **Purpose**: Central account management and Single Source of Truth configuration.
- **What the student sees**:
  - Editable academic parameters (CGPA, backlogs, department, graduation year).
  - Coding credentials (GitHub profile link, LeetCode username, HackerRank score).
  - Dream company and target salary preferences.
  - Live Skill Verifier trigger (`LiveSkillVerifier.tsx`) for automated commit verification.
- **How to use**: Update your details anytime; changes automatically recalculate all dashboard scores and recommendations.
- **Result given**: Synchronized profile state across all platform features.
- **Data used**: `StudentProfileState` in `data/user_profiles.json` and `localStorage`.

---

## 3. Dedicated Route Pages

### Standalone 3D DAS Studio (`/das-agent` and port 8000 `/`)
- **Purpose**: Dedicated standalone immersion view featuring the Three.js 3D avatar and bidirectional voice HUD.
- **What the student sees**: Centered cybernetic avatar with full-viewport canvas, glassmorphic right-hand chat HUD, and microphone toggle.
- **How to use**: Open for focused voice sessions, viva drill practice, or continuous coaching.

### Avatar Calibration (`/avatar-calibrate`)
- **Purpose**: Diagnostic viewport for adjusting 3D avatar mesh morph targets, eye blink timing, and viseme lip-sync parameters.

### Avatar Diagnostics (`/avatar-test`)
- **Purpose**: Developer testing playground for WebAudio volume analyser thresholds and viseme mappings.

---

## 4. Key Global UI Elements

### AI Action Center (`AIActionCenter.tsx`)
- **Purpose**: Floating or embedded fast-action bar offering instant one-click execution of the platform's 6 core workflows:
  1. **Analyze Career Readiness**: Triggers ML readiness recalculation and displays top gaps.
  2. **Generate 6-Week Roadmap**: Synthesizes custom daily learning milestones for active target role.
  3. **Recommend 3 Projects**: Selects the optimal Small, Medium, and Hard projects for student's branch.
  4. **Scan Resume for ATS**: Opens instant ATS screening dialog.
  5. **Simulate Technical Viva**: Launches STAR project viva round.
  6. **Launch 3D DAS Studio**: Expands DAS AI voice coach into full-screen mode.

### Ambient 3D Background Switcher (`Ambient3DBackground.tsx`)
- **Purpose**: Controls high-performance animated Three.js background canvas behind dashboard content.
- **What the student sees**: Subtle floating particles and cybernetic grid meshes adhering strictly to dark slate/cyan theme tokens.
- **How to use**: Toggled automatically or via theme controls. Engineered with low CPU overhead.
