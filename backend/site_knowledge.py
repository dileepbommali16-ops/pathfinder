"""
Pathfinder 2.0 - Authoritative Site Knowledge Registry
Contains structured metadata, purpose, widget explanations, data provenance,
and architecture details for every tab, screen, and capability on the platform.
"""

from typing import Dict, Any, Optional

PLATFORM_ARCHITECTURE = {
    "frontend": "React 19, Vite, Tailwind CSS, Framer Motion, Radix UI, Recharts, Lucide Icons",
    "backend": "FastAPI, Python 3.11, Uvicorn, Scikit-Learn, Pandas",
    "database": "Persistent SQLite in WAL mode (data/pathfinder_production.db) with automatic JSON migrations",
    "ai_engine": "Google Gemini API (gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash) with multi-turn history & repeat protection",
    "ml_engine": "RandomForestClassifier (120 estimators, 88% verified cross-val accuracy) trained on 972 verified student placement records",
    "authentication": "Google OAuth 2.0, GitHub OAuth 2.0 with cryptographic state validation, signed JWT sessions, and guest instant access",
    "hosting": "Vercel (Frontend Client) + Render (Backend API Web Service)",
    "security": "Sliding-window rate limiter (60 req/min), daily token budget manager (200 req/day), HTML/JS XSS sanitization, SameSite secure cookies"
}

TABS_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "overview": {
        "title": "Dashboard / Platform Overview",
        "purpose": "Central command center displaying high-level placement readiness probability, vector gauges, and immediate diagnostic feedback.",
        "widgets": [
            "Hero Metrics: Live Placement Readiness Probability Gauge (0-100%), Readiness Tier Badge, and Quick Stats.",
            "Vector Breakdown: Academic index (CGPA), Coding/DSA proficiency, Communication confidence, Practical internship experience, and Backlog eligibility penalty.",
            "Next Immediate Actions Widget: High-impact milestones to boost probability within 7-14 days.",
            "What-If Scenario Simulator: Interactive sandbox to preview how raising CGPA, coding, or adding an internship affects probability."
        ],
        "data_sources": "Real-time inference from RandomForestClassifier trained on 972 records. Input values come from the user's active Student Profile.",
        "how_to_use": "Review your overall readiness gauge. Click 'What-If Simulator' or 'Readiness Command' to see which exact skill lever provides the highest score delta.",
        "limitations": "The percentage score is a statistical probability estimation based on historical placement distributions, not a contractual employment guarantee."
    },
    "action": {
        "title": "Readiness Command / AI Action Centre",
        "purpose": "Prescriptive tactical hub that translates assessment gaps into concrete, prioritized daily tasks and milestone checklists.",
        "widgets": [
            "Readiness Diagnostic Matrix: Visual gap analysis across Academics, DSA, Projects, and Communication.",
            "Action Card Deck: Prioritized interventions categorized by High/Medium Impact (e.g., Blind 75 LeetCode sprints, STAR interview stories, Resume keyword alignment).",
            "What-If Simulator: Fine-grained slider experiment to calculate expected ROI on time investments."
        ],
        "data_sources": "Generated dynamically by evaluating the candidate's profile against the verified benchmark cutoffs of top-tier hiring companies.",
        "how_to_use": "Focus on the top 2 'High Impact' actions first. Complete the recommended tasks to systematically eliminate eligibility barriers.",
        "limitations": "Recommendations prioritize general campus drive criteria and should be tailored if targeting niche research or specialized domains."
    },
    "skills": {
        "title": "6-Week Roadmap & Skill Intelligence",
        "purpose": "A sprint-based, structured curriculum guiding the student through DSA, System Design, Core CS, Mock Coding, and Resume Optimization.",
        "widgets": [
            "6-Week Timeline: Week-by-week interactive checklist with actionable deliverables.",
            "Skill Gap Radar / Vector Matrix: Visualizes student ratings against required industry standards.",
            "Skill Intelligence Explorer: Deep-dive into technical topics (Arrays, Trees, Dynamic Programming, OS, DBMS, Networks) with recommended resources."
        ],
        "data_sources": "Curated technical hiring rubrics from top tech recruiters combined with AI-generated personalized sprint adjustments.",
        "how_to_use": "Follow one week at a time. Mark actions as completed as you finish coding problems, project modules, or core CS revisions.",
        "limitations": "Pacing can be accelerated or extended based on the student's graduation semester and current backlog status."
    },
    "coach": {
        "title": "AI Career Coach Console",
        "purpose": "Interactive real-time mentor powered by Google Gemini, capable of conducting mock interviews, explaining code architecture, dissecting platform charts, and chatting warmly in English, Telugu, or Roman Telugu.",
        "widgets": [
            "Chat Thread: Multi-turn conversational interface with markdown formatting, code blocks, and syntax highlighting.",
            "Quick Action Chips: Pre-populated prompts ('Start Mock Interview', 'Find My Skill Gaps', 'Review My Resume', 'Suggest Flagship Project', 'Placement Preparation Plan').",
            "Controls: Stop Generation, Regenerate, Clear Chat, and Server Wake-up notification indicator."
        ],
        "data_sources": "Direct live inference from Google Gemini models with full site knowledge injection, candidate profile grounding, and verified platform statistics.",
        "how_to_use": "Ask anything! Whether you want technical system design explanations, mock behavioral questions, emotional encouragement, or explanations of specific charts on the website.",
        "limitations": "The AI mentor provides guidance and educational mentorship; it does not grade official university coursework or guarantee job placement."
    },
    "projects": {
        "title": "Project Blueprints & Architecture Recommender",
        "purpose": "Curated collection of industry-grade, resume-worthy software projects designed to demonstrate production engineering skills.",
        "widgets": [
            "Project Cards: Domain filtering (Full-Stack, Cloud/DevOps, AI/ML, Distributed Systems).",
            "Blueprint Modal: Complete system architecture diagram, tech stack recommendations, database schemas, step-by-step build order, and interview defense talking points.",
            "'Discuss Architecture with AI Coach' Button: Hands off the project context directly to the coach for custom technical discussion."
        ],
        "data_sources": "data/projects.json containing verified engineering specifications used by successful alumni hires.",
        "how_to_use": "Select a flagship project aligned with your target role. Read the architecture pattern, implement the suggested stack, and deploy with a live demo URL.",
        "limitations": "Students should write original code and understand the implementation deeply rather than cloning boilerplate templates."
    },
    "analytics": {
        "title": "Cohort Analytics & Placement Benchmarks",
        "purpose": "Empirical historical analytics dashboard analyzing placement rates, salary packages, and academic correlations across 9 engineering departments.",
        "widgets": [
            "Department Filter & Year Selector (2024, 2025, 2026).",
            "Placement Distribution Charts: Placed vs Unplaced ratios per branch.",
            "Salary Package Rankings: Highest and average LPA across departments (CSM/AIML highest at 44.6 LPA, CSE at 44.0 LPA).",
            "CGPA vs Placement Correlation Scatter: Demonstrates that CGPA >= 7.5 combined with practical internships maximizes clearance probability."
        ],
        "data_sources": "Verified database of 972 historical student placement records (sample-placement-2024-2026.csv and data/placement_records.json).",
        "how_to_use": "Compare your branch and CGPA bracket to historical placement cohorts to set realistic package targets and identify benchmark percentiles.",
        "limitations": "Historical cohort trends provide statistical baselines; macroeconomic hiring shifts between academic years may influence drive volumes."
    },
    "resume": {
        "title": "ATS Resume Studio",
        "purpose": "AI-powered resume evaluation engine that parses candidate CVs, scores them against ATS criteria, and provides line-by-line optimization tips.",
        "widgets": [
            "PDF Upload & Text Paste Area.",
            "ATS Score Meter (0-100) with Strengths & Weaknesses breakdown.",
            "Keyword Gap Matcher: Identifies high-frequency industry keywords missing from the resume.",
            "Formatting & Layout Diagnostic: Highlights formatting traps (tables, graphics, unselectable fonts) that fail automated scanners."
        ],
        "data_sources": "Gemini structured JSON analysis and regex keyword matching against verified job descriptions for software engineering roles.",
        "how_to_use": "Upload your resume in PDF format. Review the keyword gaps and formatting tips. Update your bullet points with measurable impact metrics.",
        "limitations": "ATS scoring evaluates keyword and formatting hygiene; human interviewers will evaluate technical depth and personal communication during rounds."
    },
    "branches": {
        "title": "Branches & Courses Intelligence",
        "purpose": "Department-specific curriculum guides and placement statistics across CSE, IT, ECE, EEE, MECH, CIVIL, AIML, CSD, and CSM.",
        "widgets": [
            "Department Overview Cards with Student Counts and Placement Ratios.",
            "Core Subjects Checklist (OS, DBMS, Networks, Microprocessors, CAD, Power Systems).",
            "Top Tech Hiring Recruiters by Branch."
        ],
        "data_sources": "Derived from data/branches.json and verified cohort placement records.",
        "how_to_use": "Find your department to discover core academic subjects most frequently tested during campus technical rounds.",
        "limitations": "Non-circuital branches (MECH, CIVIL) should focus on core departmental opportunities or follow the IT transition roadmap if targeting software roles."
    },
    "defense": {
        "title": "Project Defense Console",
        "purpose": "Interactive technical viva and interview simulator designed to test how well a candidate can defend their project code and architecture.",
        "widgets": [
            "Tough Interview Question Prompts (e.g. 'Why Redis over RabbitMQ?', 'How do you handle race conditions?', 'What happens if your database dies?').",
            "Architectural Defense Rubric: Tips on explaining trade-offs, bottlenecks, scalability, and security measures.",
            "'Practice Defending with Coach' Button: Pre-populates the chosen technical defense question into the AI chat."
        ],
        "data_sources": "Real questions asked by hiring managers and tech leads during Tier-1 product company interviews.",
        "how_to_use": "Click through the defense questions for your project stack. Practice articulating trade-offs aloud, then verify your explanation with the AI Coach.",
        "limitations": "Simulations focus on common architectural trade-offs; interviewers may ask deeper proprietary questions about your specific code."
    },
    "roles": {
        "title": "Role Intelligence & Target Pathways",
        "purpose": "Comprehensive roadmap and requirement breakdown for top hiring profiles (SDE, Frontend, Backend, Data Engineer, Cloud/DevOps, AI/ML).",
        "widgets": [
            "Role Cards with Market Demand Ratings and Average Package Ranges.",
            "Must-Have vs Good-to-Have Skill Trees.",
            "Interview Round Breakdown (Online Assessment -> Technical Round 1 -> Technical Round 2 -> HR/Managerial)."
        ],
        "data_sources": "data/roles.json and current job market competencies.",
        "how_to_use": "Select your target role. Verify that your skills and projects align with the 'Must-Have' criteria before applying to campus drives.",
        "limitations": "Company expectations vary; Tier-1 product firms emphasize DSA and system design, while service firms may emphasize aptitude and domain basics."
    },
    "missions": {
        "title": "Career Mission Tracker",
        "purpose": "Gamified milestone progression system turning the semester into manageable, rewarded objectives.",
        "widgets": [
            "Mission Badges (e.g., 'LeetCode 50 Century', 'Flagship Deployer', 'Resume ATS 80+', 'Mock Master').",
            "Progress Trackers: Real-time status reflecting student checklist completions."
        ],
        "data_sources": "Persistent user profile state in SQLite.",
        "how_to_use": "Complete weekly missions to build consistency and confidence leading up to the campus recruitment season.",
        "limitations": "Badges track personal preparation discipline and effort; they serve as internal motivational milestones."
    },
    "profile": {
        "title": "Profile & Settings (Single Source of Truth)",
        "purpose": "Candidate identity management and academic record editor (CGPA, backlogs, internships, coding, communication, target role).",
        "widgets": [
            "Profile Edit Form with instant validation.",
            "Snapshot History: Timestamped log of previous probability calculations.",
            "CSV Export: Download historical assessment snapshots.",
            "Reset / Demo Mode: Load realistic sample profiles or reset local draft."
        ],
        "data_sources": "Persistent SQLite database (`data/pathfinder_production.db`) linked to authenticated JWT or browser session ID.",
        "how_to_use": "Keep your CGPA, backlogs, and completed internships up to date. Every change dynamically recalculates your placement readiness probability across the platform.",
        "limitations": "Data entered by the user is used for assessment modeling; accuracy of predictions depends on honest input values."
    },
    "login": {
        "title": "Signature Lamp Login & Authentication",
        "purpose": "Interactive ambient login experience featuring physical cord-drag lamp physics, floating fireflies, and secure OAuth 2.0 / JWT session handling.",
        "widgets": [
            "Interactive Hanging Lamp: Drag the cord downward to toggle the ambient room glow and light switch.",
            "Floating Ambient Fireflies: Animated canvas particle system with smooth physics.",
            "Social OAuth: One-click Google and GitHub Sign-In with CSRF state protection.",
            "Guest / Demo Access: Instant bypass for exploratory and judging evaluation without mandatory sign-up."
        ],
        "data_sources": "FastAPI backend authentication endpoints (/api/auth/login, /api/auth/register, /api/oauth/google, /api/oauth/github).",
        "how_to_use": "Pull the cord to illuminate the interface, then log in with Google, GitHub, email/password, or click 'Continue as Guest'.",
        "limitations": "Guest accounts maintain session state locally; sign in with Google or GitHub to persist profile data across devices."
    },
    "onboarding": {
        "title": "Onboarding Readiness Wizard",
        "purpose": "Step-by-step 4-stage intake wizard to capture academic credentials, target roles, coding experience, and communication confidence.",
        "widgets": [
            "Stage 1: Identity & Department (Name, Branch, Graduation Year).",
            "Stage 2: Academic Metrics (CGPA, Active Backlogs, Internships).",
            "Stage 3: Technical & Communication Self-Assessment (Sliders 1-10).",
            "Stage 4: Target Career Vision (Target Role, Company Tier Preference)."
        ],
        "data_sources": "Populates the initial StudentProfile sent to the ML prediction engine.",
        "how_to_use": "Complete each step sequentially. Upon submission, the engine calculates your baseline placement probability and forwards you to the Result Screen.",
        "limitations": "Ensure CGPA is accurately reported on a 10.0 scale."
    },
    "result": {
        "title": "Immediate Readiness Result Screen",
        "purpose": "Post-onboarding celebration and initial diagnostic breakdown showcasing placement probability score, key strengths, and immediate next steps.",
        "widgets": [
            "Celebratory Readiness Gauge with animated score reveal.",
            "Key Strengths & Critical Opportunities highlight boxes.",
            "Quick-Launch Navigation: 'Go to Dashboard', 'Start Mock Interview with AI Coach', 'View 6-Week Roadmap'."
        ],
        "data_sources": "Real-time output of RandomForestClassifier prediction.",
        "how_to_use": "Review your baseline probability score and click 'Go to Dashboard' or 'Start Mock Interview' to begin targeted prep.",
        "limitations": "Initial score reflects baseline status before completing suggested roadmap sprints."
    }
}


def get_site_knowledge_context(active_tab: Optional[str] = None, page_context: Optional[Dict[str, Any]] = None) -> str:
    """
    Constructs an authoritative, contextual site knowledge injection
    for Gemini's system instruction, enabling it to explain any tab,
    widget, or platform metric with complete accuracy.
    """
    ctx_parts = [
        "================================================================================",
        "PATHFINDER 2.0 FULL PLATFORM KNOWLEDGE BASE (SSOT - DO NOT CONTRADICT)",
        "================================================================================",
        "PLATFORM OVERVIEW: Pathfinder 2.0 is an intelligent campus placement readiness, cohort",
        "benchmarking, and AI career coaching platform designed for engineering students.",
        f"ARCHITECTURE STACK: {PLATFORM_ARCHITECTURE['frontend']} | {PLATFORM_ARCHITECTURE['backend']} | {PLATFORM_ARCHITECTURE['database']} | ML: {PLATFORM_ARCHITECTURE['ml_engine']}",
        "PROVENANCE OF STATISTICS: Historical dataset consists of 972 verified student placement records across 9 departments (CSE, IT, ECE, EEE, MECH, CIVIL, AIML, CSD, CSM) from 2024 to 2026. Top package is 44.6 LPA (CSM & AIML), followed by 44.0 LPA (CSE).",
        "PREDICTION MODEL: Placement probability is calculated using a trained RandomForestClassifier (88% accuracy) based on 5 features: CGPA, Backlogs, Internships, Coding Confidence, Communication Rating.",
        ""
    ]

    # If an active tab is specified, provide deep specific context first
    if active_tab and active_tab.lower() in TABS_KNOWLEDGE:
        tab_info = TABS_KNOWLEDGE[active_tab.lower()]
        ctx_parts.append(f"CURRENTLY ACTIVE TAB: '{tab_info['title']}' (id: '{active_tab}')")
        ctx_parts.append(f"- Purpose: {tab_info['purpose']}")
        ctx_parts.append("- Visible Widgets & Sections:")
        for w in tab_info.get("widgets", []):
            ctx_parts.append(f"  * {w}")
        ctx_parts.append(f"- Data Source: {tab_info['data_sources']}")
        ctx_parts.append(f"- How Student Should Use It: {tab_info['how_to_use']}")
        ctx_parts.append(f"- Important Limitation: {tab_info['limitations']}")
        ctx_parts.append("")

    # If page context (active filters, selected cards, current score) was passed by frontend:
    if page_context and isinstance(page_context, dict):
        ctx_parts.append("LIVE ON-SCREEN USER CONTEXT (The user is looking at this right now):")
        for k, v in page_context.items():
            if v is not None and v != "":
                ctx_parts.append(f"- {k}: {v}")
        ctx_parts.append("")

    # Concise registry of all other tabs so the coach can walk through the whole website
    ctx_parts.append("ALL WEBSITE TABS & MODULES OVERVIEW (Cite accurately if asked to explain the site):")
    for tab_id, info in TABS_KNOWLEDGE.items():
        ctx_parts.append(f"• [{info['title']}] (id: {tab_id}): {info['purpose']}")

    ctx_parts.append("================================================================================")
    return "\n".join(ctx_parts)
