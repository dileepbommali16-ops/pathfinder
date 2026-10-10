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
    },
    "projects": {
        "title": "Flagship Project Blueprints & Engineering Architectures",
        "purpose": "Curated repository of 23 production architectures (15 Software + 8 Hardware & IoT) spanning all engineering departments (CSE, IT, ECE, EEE, Mech, Civil, Mining, Chemical, Biomedical).",
        "widgets": [
            "Category Filters: All Architectures (23), Software Systems (15), Hardware & Embedded (8).",
            "Full Architectural Pipeline Summaries and Tech Stack / Hardware Components chips.",
            "Key Implementation Features & Google X-Y-Z Resume Bullets with one-click clipboard copy.",
            "Discuss Architecture with AI Coach Button: Instant handoff to Gemini Coach for A-to-Z build roadmaps and technical interview defense masterclasses."
        ],
        "data_sources": "Curated production engineering architectures across cloud, distributed systems, embedded IoT, robotics, and applied AI.",
        "how_to_use": "Select your branch architecture, copy the resume bullet, or click 'Discuss Architecture with AI Coach' for step-by-step guidance.",
        "limitations": "Prototypes should be customized according to lab availability and team project scope."
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

    # Inject SIH 2026 Problem Statement Registry (10 Software + 7 Hardware)
    ctx_parts.append("")
    ctx_parts.append("================================================================================")
    ctx_parts.append("OFFICIAL SIH 2026 PROBLEM STATEMENTS DIRECTORY (10 SOFTWARE + 7 HARDWARE BLUEPRINTS)")
    ctx_parts.append("Use this deep architectural knowledge whenever a student asks how to build any of these:")
    for ps_id, p in SIH_PROJECTS_DIRECTORY.items():
        ctx_parts.append(f"[{p['ps_code']} - {p['category'].upper()}] '{p['title']}' ({p['org']}) - Recommended for: {p['branches']}")
        ctx_parts.append(f"  • Architecture: {p['architecture']}")
        ctx_parts.append(f"  • Libraries & Hardware: {p['stack']}")
        ctx_parts.append(f"  • Build Roadmap: {p['roadmap']}")
        ctx_parts.append(f"  • Hackathon Defense Tip: {p['defense']}")
    ctx_parts.append("================================================================================")

    ctx_parts.append("================================================================================")
    return "\n".join(ctx_parts)


SIH_PROJECTS_DIRECTORY: Dict[str, Dict[str, Any]] = {
    "SIH26146": {
        "ps_code": "SIH26146",
        "category": "Software",
        "title": "AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic",
        "org": "National Technical Research Organisation (NTRO)",
        "branches": "CSE, IT, Cybersecurity, Data Science",
        "architecture": "Mempool WebSocket Stream -> UTXO Transaction Graph Ingestion -> Neo4j Graph DB -> Peeling Chain Trace Algorithm -> Graph Convolutional Network (GCN) Mixer Classifier -> FastAPI -> Cytoscape.js Canvas",
        "stack": "Python 3.11, NetworkX, Web3.py, Neo4j, PyTorch Geometric, FastAPI, Redis, Cytoscape.js",
        "roadmap": "Phase 1: Connect to Bitcoin RPC node/mempool API; Phase 2: Model UTXO inputs/outputs into Neo4j graph nodes & edges; Phase 3: Train GCN on known mixer patterns (Wasabi, CoinJoin); Phase 4: Build risk scoring heuristics (peeling chains, hop counts); Phase 5: Visualize transaction flow graph with alert triggers.",
        "defense": "Judges will ask: 'How do you handle Bitcoin transaction anonymity?' Answer: We use heuristic address clustering (multi-input ownership heuristics) and Graph Neural Networks to identify structural peeling-chain patterns characteristic of automated mixing protocols."
    },
    "SIH26147": {
        "ps_code": "SIH26147",
        "category": "Software",
        "title": "Automated Model for Analysis of .IQ and .wav Radio Files with Signal Parameter Extraction",
        "org": "National Technical Research Organisation (NTRO)",
        "branches": "ECE, CSE, Aerospace, Telecommunications",
        "architecture": "Binary .IQ/.wav Ingestion -> Short-Time Fourier Transform (STFT) -> 2D Spectrogram Tensors -> ResNet-18 Modulation Classifier -> SciPy Spectral Parameter Engine (Carrier Freq, Bandwidth, SNR) -> WebGL Waterfall Spectrogram",
        "stack": "Python, SciPy, PyTorch, GNU Radio, NumPy, Matplotlib, FastAPI, Three.js",
        "roadmap": "Phase 1: Parse raw binary I/Q channels into complex numpy arrays; Phase 2: Compute FFT and Welch power spectral densities; Phase 3: Train CNN classifier on RadioML synthetic modulation dataset (QPSK, FSK, 16QAM); Phase 4: Build automated SNR and Doppler frequency drift extractors; Phase 5: Render interactive waterfall FFT visualization.",
        "defense": "Judges will ask: 'How does your model perform under heavy noise?' Answer: We preprocess signals using adaptive bandpass filtering and train on augmented synthetic noise profiles down to -6dB SNR, achieving 93.8% classification accuracy."
    },
    "SIH26153": {
        "ps_code": "SIH26153",
        "category": "Software",
        "title": "AI-Based Network Attack Forecasting & Threat Detection from Raw Network Traffic Data",
        "org": "National Technical Research Organisation (NTRO)",
        "branches": "CSE, IT, Cybersecurity",
        "architecture": "Raw PCAP Stream -> Zeek Protocol Analyzer -> Apache Kafka Message Queue -> Temporal Graph Attention Network (GAT) -> Anomaly Forecaster -> Elasticsearch / Kibana SIEM",
        "stack": "Python, Zeek / Suricata, PyTorch LSTM/GAT, Apache Kafka, Elasticsearch, Docker",
        "roadmap": "Phase 1: Deploy Zeek tap to extract flow records from PCAP streams; Phase 2: Stream connection logs into Kafka queues; Phase 3: Train GAT model on CICIDS2017 dataset to predict attack progression; Phase 4: Implement anomaly scoring with dynamic thresholding; Phase 5: Connect SIEM dashboard with automated iptables firewall isolation rules.",
        "defense": "Judges will ask: 'Why forecasting instead of traditional detection?' Answer: Traditional IDS detects attacks after the payload hits. Our temporal graph attention model identifies initial port scans and reconnaissance beacons, forecasting full multi-stage compromises 8.4 minutes in advance."
    },
    "SIH26158": {
        "ps_code": "SIH26158",
        "category": "Software",
        "title": "Single-Pass Drone Video to Accurate 3D Model Generation System",
        "org": "National Technical Research Organisation (NTRO)",
        "branches": "CSE, ECE, Robotics, Civil Engineering",
        "architecture": "4K Aerial Drone Video -> SuperPoint & LightGlue Optical Keyframer -> COLMAP Structure-from-Motion (SfM) -> Instant-NGP / 3D Gaussian Splatting Engine -> Open3D Mesh Generator -> Three.js Web Viewer",
        "stack": "Python, PyTorch, Instant-NGP, COLMAP, Open3D, CUDA, Three.js, FastAPI",
        "roadmap": "Phase 1: Extract sharp keyframes using Laplacian variance filtering; Phase 2: Run COLMAP SfM to compute camera poses and sparse point clouds; Phase 3: Train 3D Gaussian Splatting model for photorealistic novel view synthesis; Phase 4: Extract textured polygon mesh (GLTF) using Poisson surface reconstruction; Phase 5: Deploy browser-based measurement canvas.",
        "defense": "Judges will ask: 'How do you prevent motion blur from drone flight?' Answer: We filter keyframes based on blur metrics and integrate drone gimbal IMU telemetry into COLMAP's initial pose priors to accelerate convergence."
    },
    "SIH26162": {
        "ps_code": "SIH26162",
        "category": "Software",
        "title": "AI-Based Detection and Classification of Industrial Fires Using NASA FIRMS Satellite Data",
        "org": "National Technical Research Organisation (NTRO)",
        "branches": "CSE, IT, Data Science, Civil, Environmental",
        "architecture": "NASA VIIRS & MODIS Thermal APIs -> GeoPandas Spatial Join -> OpenStreetMap Industrial Polygons -> XGBoost Heat Source Classifier -> PostGIS DB -> Leaflet.js Real-Time Map",
        "stack": "Python, GeoPandas, GDAL, XGBoost, NASA FIRMS API, OpenStreetMap, Leaflet.js, PostGIS",
        "roadmap": "Phase 1: Stream active fire coordinates from NASA FIRMS API (VIIRS 375m); Phase 2: Perform spatial intersection with OpenStreetMap refinery/factory polygons; Phase 3: Train XGBoost classifier to differentiate licensed gas flares from accidental conflagrations; Phase 4: Estimate fire spread vectors using wind speed telemetry; Phase 5: Trigger automated SMS/Webhook alerts with geo-coordinates.",
        "defense": "Judges will ask: 'How do you avoid false alarms from legal refinery flare stacks?' Answer: We maintain a spatial registry of licensed industrial flare points and cross-check temporal thermal persistence: flare stacks exhibit steady heat, while accidental fires show exponential radiant power growth."
    },
    "SIH26167": {
        "ps_code": "SIH26167",
        "category": "Software",
        "title": "SatQuery AI: Interactive Vision-Language Assistant for Remote Sensing Satellite Imagery",
        "org": "Indian Space Research Organisation (ISRO)",
        "branches": "CSE, AIML, ECE, Aerospace",
        "architecture": "High-Res Satellite GeoTIFF -> Band Normalization -> PaliGemma / CLIP Multimodal Encoder -> Qdrant Vector DB -> Natural Language Spatial Parser -> Segmented Raster Output",
        "stack": "Python, HuggingFace Transformers, PaliGemma, Qdrant, Rasterio, GDAL, FastAPI, React",
        "roadmap": "Phase 1: Ingest multispectral tiles from ISRO Bhuvan / Sentinel datasets; Phase 2: Generate visual embeddings with a geospatial vision-language model; Phase 3: Index tiles in Qdrant with spatial metadata (lat/lon, date, band); Phase 4: Fine-tune model to answer complex spatial queries ('locate new urban developments'); Phase 5: Return bounding boxes and segmentation masks.",
        "defense": "Judges will ask: 'How does this handle multispectral bands beyond RGB?' Answer: We project 4-band and 8-band rasters into dense latent embeddings using custom band-weighting layers before passing them into the multimodal transformer."
    },
    "SIH26168": {
        "ps_code": "SIH26168",
        "category": "Software",
        "title": "AI-ML Based Intelligent Dead Reckoning System for Seamless GNSS-Denied Navigation",
        "org": "Indian Space Research Organisation (ISRO)",
        "branches": "ECE, EEE, Robotics, Smart Vehicles, CSE",
        "architecture": "9-Axis IMU Stream (100Hz) -> High-Pass Filter -> Physics-Informed Neural Network (PINN) Bias Estimator -> Extended Kalman Filter (EKF) -> 3D Odometry Publisher",
        "stack": "C++, Python, Extended Kalman Filter, PyTorch, ROS2 Humble, NumPy, Eigen3",
        "roadmap": "Phase 1: Interface 9-DOF IMU sensor via I2C/SPI at 100Hz; Phase 2: Implement double-integration kinematics with drift suppression; Phase 3: Train a 1D CNN to recognize footstep / wheel stationary phases for Zero-Velocity Updates (ZUPT); Phase 4: Fuse measurements in an EKF; Phase 5: Validate trajectory accuracy in underground tunnels.",
        "defense": "Judges will ask: 'Why does standard IMU integration fail?' Answer: Double integrating accelerometer bias produces quadratic distance error over time. Our PINN continuously predicts sensor bias and applies ZUPT zero-velocity constraints to limit drift to <1.1% over 5km."
    },
    "SIH26117": {
        "ps_code": "SIH26117",
        "category": "Software",
        "title": "Sovereign On-Premise Agentic AI Workbench Using Open-Weight Multimodal LLMs",
        "org": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
        "branches": "CSE, IT, AIML",
        "architecture": "Air-Gapped Gateway -> NGINX Reverse Proxy -> LangGraph Orchestrator -> vLLM Llama-3-Vision Engine -> ChromaDB Encrypted Vector Store -> Local Audit Logger",
        "stack": "Python, vLLM, Llama-3-Vision (8B AWQ), LangGraph, Ollama, ChromaDB, Docker",
        "roadmap": "Phase 1: Set up completely air-gapped Linux GPU workstation; Phase 2: Deploy vLLM serving 4-bit quantized open-weight vision models; Phase 3: Implement LangGraph multi-agent pipeline for P&ID engineering diagram parsing; Phase 4: Encrypt vector storage with AES-256; Phase 5: Build local auditing web UI.",
        "defense": "Judges will ask: 'How do you guarantee zero data leakage?' Answer: The system is deployed inside an isolated Docker network with zero egress routes, verifying that no external API calls or telemetry packets leave the on-premise hardware."
    },
    "SIH26123": {
        "ps_code": "SIH26123",
        "category": "Software",
        "title": "Edge-AI Distributed Fleet Coordination & Collision Avoidance for Autonomous Mobile Robots",
        "org": "Bharat Electronics Limited (BEL)",
        "branches": "CSE, ECE, Robotics, EEE",
        "architecture": "AMR Robot Nodes -> Zenoh Peer-to-Peer Mesh -> Conflict-Based Search (CBS) Solver -> TEB Local Planner -> Digital Twin Fleet Canvas",
        "stack": "Python, C++, ROS2 Humble, Zenoh / MQTT, TEB Local Planner, React, Docker",
        "roadmap": "Phase 1: Model warehouse grid map with occupancy grids; Phase 2: Implement peer-to-peer discovery using Zenoh protocol; Phase 3: Implement Space-Time Conflict-Based Search to solve multi-agent path finding; Phase 4: Add local obstacle avoidance with dynamic window approach; Phase 5: Build central 3D monitoring dashboard.",
        "defense": "Judges will ask: 'What happens if Wi-Fi disconnects between robots?' Answer: We use decentralized peer-to-peer Zenoh mesh networking. If central connection drops, robots negotiate right-of-way locally using prioritized velocity obstacle protocols without colliding."
    },
    "SIH26127": {
        "ps_code": "SIH26127",
        "category": "Software",
        "title": "City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking & Urban Traffic Analytics",
        "org": "Bharat Electronics Limited (BEL)",
        "branches": "CSE, IT, ECE, Data Science",
        "architecture": "RTSP Multi-Camera Matrix (30x) -> YOLOv10 Plate & Vehicle Detector -> DeepSORT ReID Tracker -> Redis Stream Queue -> ClickHouse High-Throughput DB -> Real-Time Map Canvas",
        "stack": "Python, YOLOv10, DeepSORT, OpenCV, Redis, ClickHouse, FastAPI, React",
        "roadmap": "Phase 1: Ingest RTSP camera feeds with multi-threaded OpenCV buffers; Phase 2: Train fine-tuned YOLOv10 model on Indian high-security registration plates; Phase 3: Implement DeepSORT appearance embeddings for cross-camera vehicle re-identification; Phase 4: Ingest coordinate trajectories into ClickHouse; Phase 5: Display live congestion heatmaps and alert routes.",
        "defense": "Judges will ask: 'How do you handle occluded or high-speed license plates?' Answer: We combine high-speed frame interpolation with perspective warp rectification, ensuring clear plate text extraction even at 60 km/h and skewed 45° camera angles."
    },
    "SIH26112": {
        "ps_code": "SIH26112",
        "category": "Hardware",
        "title": "Modular Autonomous Mobile Robot (AMR) Platform for Smart Warehouse Automation",
        "org": "Autodesk",
        "branches": "Robotics, Mechatronics, Mechanical, ECE, EEE",
        "architecture": "2D RPLiDAR A1 + Wheel Optical Encoders -> STM32 Nucleo (PID Velocity Control) -> UART -> Raspberry Pi 5 (ROS2 Nav2 Stack) -> Dual NEMA 23 Motors + Planetary Gearbox -> Wireless Dock",
        "stack": "SolidWorks, 3D Printing, STM32, Raspberry Pi 5, RPLiDAR A1, ROS2 Nav2, 24V LiFePO4 BMS",
        "roadmap": "Phase 1: Design chassis, motor brackets, and payload lift in SolidWorks; Phase 2: Fabricate aluminum frame and assemble NEMA 23 motors with planetary gearboxes; Phase 3: Program STM32 closed-loop PID controller with optical encoder feedback; Phase 4: Deploy ROS2 Nav2 on Raspberry Pi 5 with RPLiDAR for SLAM mapping; Phase 5: Test autonomous payload docking under 50kg load.",
        "defense": "Judges will ask: 'Why dual controllers instead of just a Raspberry Pi?' Answer: Raspberry Pi runs a non-real-time Linux OS which can experience microsecond jitter during heavy computing. The STM32 microcontroller guarantees deterministic, real-time PID motor timing and safety cutoffs."
    },
    "SIH26113": {
        "ps_code": "SIH26113",
        "category": "Hardware",
        "title": "Wearable Robotic Exoskeleton / Human Augmentation Mobility Assistive System",
        "org": "Autodesk",
        "branches": "Biomedical, Mechanical, ECE, Mechatronics",
        "architecture": "Surface EMG Electrodes (Quadriceps) + Knee IMU -> ESP32 FreeRTOS Controller -> Gait Phase Estimator -> CAN Bus Driver -> Harmonic BLDC Motor Actuator (35 Nm)",
        "stack": "Carbon Fiber / AL-6061, MyoWare 2.0 sEMG, ESP32, FreeRTOS, Harmonic BLDC, Li-Ion Pack",
        "roadmap": "Phase 1: Design ergonomic thigh and shank orthotic braces with quick-release ratchets; Phase 2: Mount MyoWare surface EMG sensors on leg muscles and filter noise; Phase 3: Program ESP32 with FreeRTOS to classify gait cycle phases in <18ms; Phase 4: Drive high-torque harmonic BLDC motor to deliver 30 Nm assistance during leg swing; Phase 5: Validate metabolic energy reduction.",
        "defense": "Judges will ask: 'How do you prevent the motor from injuring the user's joint?' Answer: We implement a triple safety architecture: hardware mechanical hard-stops limiting knee angle to 120°, software current limiters cutting motor torque if back-EMF spikes, and an instant emergency kill-switch."
    },
    "SIH26118": {
        "ps_code": "SIH26118",
        "category": "Hardware",
        "title": "Passive Colorimetric H2S Exposure-Dosimeter Wristband with Edge-AI Optical Reading",
        "org": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
        "branches": "Chemical, ECE, Instrumentation, Materials Science",
        "architecture": "Airborne H2S Gas -> Chemical Paper Matrix (Lead Acetate / Silver Nanoparticle Darkening) -> ESP32-S3 Miniature Optical Chamber -> TinyML Polynomial Regression -> BLE Beacon Gateway",
        "stack": "Lead Acetate Chemical Strips, Silicone IP67 Wristband, ESP32-S3-CAM, BLE 5.0, TinyML",
        "roadmap": "Phase 1: Formulate stable reactive chemical strip that darkens predictably with H2S ppm-hours; Phase 2: Design light-sealed optical chamber with calibrated white LEDs; Phase 3: Train TinyML polynomial regression model to convert RGB/HSV color coordinates to exact exposure dosage; Phase 4: Implement BLE advertising beacon transmitting hourly dosimetry; Phase 5: Package in an intrinsically safe explosion-proof silicone wristband.",
        "defense": "Judges will ask: 'Why not use standard electrochemical sensors?' Answer: Electrochemical sensors require continuous battery power, need recalibration every few months, and fail in high humidity. Our passive chemical matrix requires ZERO power to absorb gas, and the camera wakes up only once an hour, yielding 6+ months battery life."
    },
    "SIH26020": {
        "ps_code": "SIH26020",
        "category": "Hardware",
        "title": "Innovative Solar Hand-Spinning Equipment for Khadi Artisan Productivity Enhancement",
        "org": "Ministry of MSME",
        "branches": "Mechanical, EEE, Production Engineering, Rural Tech",
        "architecture": "100W Solar PV Module -> MPPT Charge Controller -> 12V LiFePO4 Battery -> PWM Variable Speed Driver -> BLDC Motor -> Spindle Pulley Gear Train -> OLED Speed Display",
        "stack": "SolidWorks CAD, 12V 100W BLDC Motor, LiFePO4 12V 20Ah Battery, Solar MPPT, OLED Display",
        "roadmap": "Phase 1: Redesign spinning chassis in SolidWorks for ergonomic posture and low friction; Phase 2: Fabricate multi-spindle head with high-precision sealed bearings; Phase 3: Integrate 100W BLDC motor with potentiometer speed knob and OLED RPM display; Phase 4: Connect 100W solar panel with MPPT charging a 12V lithium pack; Phase 5: Field test with rural artisans to verify 3x yarn output.",
        "defense": "Judges will ask: 'What happens on cloudy days in rural areas?' Answer: The system has a hybrid pedal mechanism. When solar battery charge is depleted, artisans can disengage the motor and spin manually via mechanical foot treadle without losing production."
    },
    "SIH26022": {
        "ps_code": "SIH26022",
        "category": "Hardware",
        "title": "Smart Solar-Powered Drying & Compact Vacuum Packaging Automation System",
        "org": "Ministry of MSME",
        "branches": "Mechanical, EEE, AgriTech, Mechatronics",
        "architecture": "Solar Thermal Parabolic Air Collector -> 12V DC Blowers -> SHT31 Humidity & Temp Array -> ESP32 Damper Controller -> Automated Vacuum Chamber -> Thermal Impulse Sealer",
        "stack": "Solar Thermal Collector, 12V DC Fans, SHT31 Sensors, ESP32 Controller, 12V Vacuum Pump, Impulse Wire",
        "roadmap": "Phase 1: Construct glazed solar air collector generating 55°C dry air flow; Phase 2: Build drying chamber with multi-tier product trays and servo-driven exhaust dampers; Phase 3: Program ESP32 to regulate airflow based on real-time humidity sensors; Phase 4: Fabricate compact vacuum chamber with 12V diaphragm pump; Phase 5: Integrate automated 2.5-second impulse sealing bar.",
        "defense": "Judges will ask: 'How does this protect product quality compared to open sun drying?' Answer: Open drying exposes goods to rain, bird droppings, and uneven UV degradation. Our closed solar collector cuts drying time from 36 hours to 4.5 hours while maintaining hygienic 10% moisture uniformity."
    },
    "SIH26025": {
        "ps_code": "SIH26025",
        "category": "Hardware",
        "title": "AI-Enabled Low-Cost Real-Time Mine Subsidence Monitoring & Early Warning System",
        "org": "Ministry of Coal",
        "branches": "Mining, Civil, ECE, EEE, IoT",
        "architecture": "Dual-Axis MEMS Tilt Sensor + Geophone -> STM32 Low-Power MCU -> LoRa SX1262 (868MHz Mesh) -> Surface Pithead Gateway -> Isolation Forest Anomaly Model -> SMS & Siren Warning",
        "stack": "Dual-Axis MEMS Inclinometer, Geophone Sensor, LoRa SX1262, STM32 MCU, Solar Harvester, IP68 Enclosure",
        "roadmap": "Phase 1: Calibrate dual-axis MEMS inclinometer to achieve 0.001-degree angular resolution; Phase 2: Design ultra-low-power STM32 firmware sleeping at 15uA current draw; Phase 3: Configure LoRa point-to-multipoint mesh network spanning 10km across coal fields; Phase 4: Deploy pithead gateway running TinyML vibration isolation; Phase 5: Wire automated siren and cellular SMS alert system.",
        "defense": "Judges will ask: 'How do you prevent false alarms from heavy mining haul trucks?' Answer: Haul trucks generate high-frequency surface vibration (> 30Hz) with zero net angular ground tilt. Strata subsidence generates low-frequency seismic waves (< 5Hz) coupled with permanent angular displacement. Our onboard filter isolates this signature."
    },
    "SIH26026": {
        "ps_code": "SIH26026",
        "category": "Hardware",
        "title": "Mobile Quadruped Robot / Handheld Chemical Sensor Device for Real-Time Narcotics & Explosives Detection",
        "org": "Ministry of Railways",
        "branches": "ECE, Robotics, Instrumentation, Chemical, CSE",
        "architecture": "Micro-Diaphragm Air Sniffer Pump -> Multi-Channel Metal Oxide Sensor (MOS) Array -> 16-Bit ADC Digitizer -> Jetson Orin Nano (1D-CNN Fingerprint Matcher) -> Quadruped Robot Chassis / AR Screen",
        "stack": "MOS Gas Sensor Array, PID Sensor, Air Sampling Pump, Jetson Orin Nano, 12-DOF Quadruped, FLIR Thermal",
        "roadmap": "Phase 1: Assemble gas sensor chamber with heated metal-oxide and photoionization detectors; Phase 2: Integrate micro-diaphragm intake pump drawing 1.5 L/min air volume; Phase 3: Train 1D-CNN on vapor signatures of RDX, TNT, Ammonium Nitrate, and Opiates; Phase 4: Mount sensor pack on quadruped robot chassis for autonomous platform patrol; Phase 5: Stream telemetry to Railway Protection Force dashboard.",
        "defense": "Judges will ask: 'Why a robotic sniffer instead of trained dogs?' Answer: Sniffer dogs suffer from fatigue after 30 minutes, require extensive handler training, and can be distracted. Our robotic electronic nose operates 24/7 without sensory adaptation and logs quantitative chemical ppm levels for legal evidence."
    }
}


def find_project_blueprint(query: str) -> Optional[Dict[str, Any]]:
    """
    Finds a matching project blueprint or SIH 2026 problem statement from a query.
    Checks PS codes, exact titles, and domain keywords.
    """
    if not query:
        return None

    clean_q = query.strip()
    upper_q = clean_q.upper()
    lower_q = clean_q.lower()

    # 1. Match direct PS codes (e.g. SIH26146, SIH26020)
    for ps_id, proj in SIH_PROJECTS_DIRECTORY.items():
        if ps_id in upper_q or proj["ps_code"] in upper_q:
            return proj

    # 2. Match titles or domain phrases in SIH directory
    for ps_id, proj in SIH_PROJECTS_DIRECTORY.items():
        title_lower = proj["title"].lower()
        if title_lower in lower_q:
            return proj

    # Keyword signature matching
    sih_keywords = [
        ("bitcoin", "SIH26146"),
        ("crypto", "SIH26146"),
        (".iq", "SIH26147"),
        ("radio files", "SIH26147"),
        ("network attack", "SIH26153"),
        ("forecasting attack", "SIH26153"),
        ("drone video", "SIH26158"),
        ("3d model generation", "SIH26158"),
        ("industrial fires", "SIH26162"),
        ("firms", "SIH26162"),
        ("satquery", "SIH26167"),
        ("satellite", "SIH26167"),
        ("isro", "SIH26167"),
        ("dead reckoning", "SIH26168"),
        ("gnss-denied", "SIH26168"),
        ("agentic ai workbench", "SIH26117"),
        ("mrpl", "SIH26117"),
        ("fleet coordination", "SIH26123"),
        ("bel", "SIH26123"),
        ("anpr", "SIH26127"),
        ("camera trajectory", "SIH26127"),
        ("amr platform", "SIH26112"),
        ("warehouse automation", "SIH26112"),
        ("exoskeleton", "SIH26113"),
        ("human augmentation", "SIH26113"),
        ("colorimetric", "SIH26118"),
        ("h2s", "SIH26118"),
        ("wristband", "SIH26118"),
        ("hand-spinning", "SIH26020"),
        ("khadi", "SIH26020"),
        ("solar-powered drying", "SIH26022"),
        ("agarbatti", "SIH26022"),
        ("packaging system", "SIH26022"),
        ("mine subsidence", "SIH26025"),
        ("coal mines", "SIH26025"),
        ("narcotics", "SIH26026"),
        ("explosives", "SIH26026"),
        ("sniffer", "SIH26026"),
        ("quadruped", "SIH26026")
    ]

    for kw, target_ps in sih_keywords:
        if kw in lower_q and target_ps in SIH_PROJECTS_DIRECTORY:
            return SIH_PROJECTS_DIRECTORY[target_ps]

    # 3. Check flagship platform projects from data/projects.json
    try:
        from backend.data_service import get_projects
        all_projs = get_projects()
        for p in all_projs:
            t = p.get("title", "").lower()
            if t and (t in lower_q or p.get("psCode", "").upper() in upper_q):
                return {
                    "ps_code": p.get("psCode", p.get("id")),
                    "category": p.get("category", "Software").capitalize(),
                    "title": p.get("title"),
                    "org": p.get("organization", "Pathfinder Engineering"),
                    "branches": p.get("branch", "CSE / IT / AIML"),
                    "architecture": p.get("architectureSummary", p.get("overview")),
                    "stack": ", ".join(p.get("techStack", [])),
                    "roadmap": f"Phase 1: Environment & Dependencies ({', '.join(p.get('techStack', [])[:2])}); Phase 2: Ingestion & Core Logic; Phase 3: Backend Pipeline; Phase 4: UI Dashboard; Phase 5: Verification & Benchmarks.",
                    "defense": f"Judges Question: 'What is the performance bottleneck in {p.get('title')}?' Answer: Bottleneck was mitigated through asynchronous task buffering and indexed state caching, enabling the benchmark metric: {p.get('resumeBullet')}."
                }
    except Exception:
        pass

    return None


def generate_project_guide(proj: Dict[str, Any], query: str = "") -> str:
    """
    Generates a comprehensive, highly energetic A-to-Z architectural breakdown
    for the chosen project blueprint or SIH 2026 problem statement.
    Adapts naturally if the query uses Telugu or Roman Telugu.
    """
    title = proj.get("title", "Project Blueprint")
    ps_code = proj.get("ps_code", "SIH2026")
    cat = proj.get("category", "Software")
    org = proj.get("org", "National Hackathon Organization")
    branches = proj.get("branches", "Engineering")
    arch = proj.get("architecture", "Pipeline architecture")
    stack = proj.get("stack", "Full Stack")
    roadmap = proj.get("roadmap", "Phase-based implementation")
    defense = proj.get("defense", "Explain design trade-offs and edge failure handling.")

    # Check for Telugu / Tenglish intent in query
    is_telugu = any(
        kw in query.lower()
        for kw in ["ela", "cheyyali", "cheppu", "bro", "enti", "naku", "mana", "kuda", "ikkada", "chudu", "em cheyyali"]
    ) or any("\u0c00" <= c <= "\u0c7f" for c in query)

    intro = ""
    if is_telugu:
        intro = (
            f"🔥 **Namaste bro! Super choice!** Ee project `{title}` chala high-impact engineering architecture!\n"
            f"Idhi portfolio lo leda technical interview lo explain chesthe recruiters ki solid impression ivvadam guarantee. "
            f"First to last complete ga ela build cheyyalo, system architecture, hardware/software stack, "
            f"5-phase roadmap inka technical defense tips motham A-to-Z detail ga kindha ichanu chudu:\n\n"
        )
    else:
        intro = (
            f"🚀 **Outstanding choice!** Project **'{title}'** is a premier {cat} engineering architecture blueprint. "
            f"Here is your complete A-to-Z production blueprint engineered for portfolio excellence "
            f"and technical interview viva defense:\n\n"
        )

    # Format roadmap phases nicely
    roadmap_parts = [r.strip() for r in roadmap.split(";") if r.strip()]
    formatted_roadmap = ""
    for i, phase in enumerate(roadmap_parts, 1):
        formatted_roadmap += f"- **{phase}**\n"

    guide = f"""{intro}### 1. 📋 Project Identity & Scope
- **Domain & Track**: {cat} Systems
- **Recommended Branches**: `{branches}`
- **Difficulty Level**: Production Enterprise Grade

---

### 2. 🏗️ End-to-End System Architecture Pipeline
```text
{arch}
```

---

### 3. 🛠️ Required Hardware & Software Stack
- **Core Technologies & Libraries**: `{stack}`
- **Data Persistence & Cache**: SQLite (WAL Mode) / PostgreSQL / Neo4j / In-Memory Buffers
- **Integration Layer**: RESTful APIs & WebSockets for millisecond-level telemetry

---

### 4. 🗺️ 5-Phase Step-by-Step Build Roadmap (First to Last)
{formatted_roadmap}

---

### 5. 🛡️ Hackathon Judges & Viva Defense Masterclass
> **Key Judge Inquiry**:
> {defense}

---

### 6. 🚀 Next Immediate Action to Start
1. Create a dedicated workspace directory for `{ps_code.lower()}`.
2. Initialize repository and install core dependencies:
   ```bash
   # Quick initial command
   pip install --upgrade {stack.split(',')[0].strip().lower()}
   ```
3. Implement the ingestion/sensor module first before building the UI.

{"*Inka emaina doubt unna leda specific code module kavali ante adugu bro, ventane build chedhdham! 🚀*" if is_telugu else "*Ask me anytime if you want code templates or circuit pinouts for any module! Let's build it! 🚀*"}"""

    return guide


