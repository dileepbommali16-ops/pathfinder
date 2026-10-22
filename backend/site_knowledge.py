"""
Pathfinder 2.0 - Authoritative Site Knowledge Registry
Contains structured metadata, purpose, widget explanations, data provenance,
and architecture details for every tab, screen, and capability on the platform.
"""

from typing import Dict, Any, Optional, List

PLATFORM_ARCHITECTURE = {
    "frontend": "React 19, Vite, Tailwind CSS, Framer Motion, Radix UI, Recharts, Lucide Icons",
    "backend": "FastAPI, Python 3.11, Uvicorn, Scikit-Learn, Pandas",
    "database": "Persistent SQLite in WAL mode (data/pathfinder_production.db) with automatic JSON migrations",
    "ai_engine": "Google Gemini API (gemini-2.0-flash, gemini-2.5-flash, gemini-3.8-flash, gemini-3.5-flash-lite) with multi-turn history & repeat protection",
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

FLAGSHIP_PROJECTS_DIRECTORY: Dict[str, Dict[str, Any]] = {
    "proj-sde-1": {
        "id": "proj-sde-1",
        "ps_code": "PROJ-SDE-01",
        "category": "Software",
        "title": "Distributed Asynchronous Job Queue & Rate Limiter",
        "domain": "Backend Systems & Concurrency",
        "org": "Pathfinder Engineering Core",
        "branches": "CSE, IT, AIML",
        "problem_statement": "Web applications experience severe performance degradation or HTTP 504 gateway timeouts when computationally heavy tasks (PDF rendering, bulk notifications, data pipeline jobs) run synchronously in the HTTP request loop. Additionally, unregulated traffic spikes from abusive clients can cause server resource exhaustion and cascading failures.",
        "stack_rationale": "• Python 3.11 + FastAPI: Native async ASGI event-loop concurrency, automatic OpenAPI generation, and sub-millisecond route handling.\n• Redis 7.2 (Streams & Hashes): In-memory sub-millisecond task queuing with consumer groups, automatic pending list tracking (PEL), and atomic Token-Bucket rate limiting via Lua scripts.\n• PostgreSQL 16 (WAL Mode): ACID persistence for completed task receipts, audit logs, and client API keys.\n• Docker & Docker Compose: Multi-container orchestration isolating Redis, Postgres, API gateway, and 3 independent worker nodes.",
        "architecture": "Client Request -> Token Bucket Middleware (Redis Lua) -> FastAPI Ingestion Gateway -> Redis Task Stream (XADD) -> Worker Consumer Pool (XREADGROUP x3) -> PostgreSQL Persistence -> Prometheus Metrics & Grafana",
        "roadmap": "Phase 1: Environment Setup & Docker Compose (FastAPI, Redis, Postgres); Phase 2: Atomic Token-Bucket Rate Limiter Middleware via Redis Lua scripts; Phase 3: Task Ingestion Endpoint (POST /api/jobs) with UUID generation & XADD streaming; Phase 4: Worker Consumer Group with XREADGROUP, simulated payload execution & XACK; Phase 5: Dead-Letter Queue (DLQ) with exponential backoff retry policies; Phase 6: PostgreSQL job history persistence & GET /api/jobs/{id} polling status.",
        "implementation_details": "• Core Libraries: `fastapi`, `uvicorn[standard]`, `redis-py` (asyncio), `asyncpg`, `pydantic v2`, `prometheus-client`.\n• Rate Limiting: Lua script executes atomic check-and-decrement on token bucket with 60 tokens/min burst tolerance.\n• Worker Resiliency: Worker reads with `XREADGROUP GROUP workers consumer_1 BLOCK 2000 COUNT 5 STREAMS jobs >`. Upon successful completion, emits `XACK` to remove task from PEL.",
        "pitfalls": "1. Forgetting to acknowledge tasks with `XACK`: If workers crash or omit `XACK`, tasks remain trapped in the Pending Entries List (PEL) and are endlessly redelivered upon restart.\n2. Unbounded Redis Stream memory growth: Always set `maxlen ~ 100000` on `XADD` to automatically prune processed tasks and avoid memory overflow.\n3. Synchronous database calls in async worker loops: Blocks the asyncio event loop; always use `asyncpg` or run blocking operations in `asyncio.to_thread`.",
        "database_design": "• PostgreSQL Table `jobs`:\n  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()\n  - `user_id`: VARCHAR(64) NOT NULL\n  - `job_type`: VARCHAR(50) NOT NULL (e.g. 'pdf_render', 'csv_export')\n  - `status`: VARCHAR(20) NOT NULL (ENUM: 'pending', 'processing', 'completed', 'failed')\n  - `payload`: JSONB NOT NULL\n  - `retry_count`: INT DEFAULT 0\n  - `max_retries`: INT DEFAULT 3\n  - `error_message`: TEXT NULL\n  - `created_at`: TIMESTAMPTZ DEFAULT NOW()\n  - `completed_at`: TIMESTAMPTZ NULL\n  - Index: `CREATE INDEX idx_jobs_status_created ON jobs (status, created_at DESC)`\n• Redis Keys:\n  - `stream:jobs`: Redis Stream storing serialized job payloads\n  - `ratelimit:{client_ip}`: Redis Hash tracking `{tokens, last_updated}` with 60s TTL\n  - `dlq:jobs`: Dead-letter stream storing jobs that exceeded max_retries",
        "defense": "Interviewer will ask: 'Why Redis Streams instead of Celery or RabbitMQ?' Answer: 'Celery introduces heavy framework coupling and complex serialization. RabbitMQ requires a separate Erlang runtime and clustering overhead. Redis Streams provides native consumer groups with acknowledgment semantics at sub-millisecond latencies, and allows us to reuse our existing Redis instance for both atomic Token-Bucket rate limiting and task streaming, drastically reducing operational complexity.'"
    },
    "proj-fullstack-1": {
        "id": "proj-fullstack-1",
        "ps_code": "PROJ-FS-01",
        "category": "Software",
        "title": "Real-Time Collaborative Code & Canvas Studio",
        "domain": "Full-Stack Web & WebSockets",
        "org": "Pathfinder Engineering Core",
        "branches": "CSE, IT, AIML",
        "problem_statement": "Collaborative browser tools like Google Docs or Figma require instantaneous synchronization between distributed clients. Naive WebSocket broadcasting causes race conditions, text overwrites, and cursor desynchronization when multiple developers type simultaneously on slow or unstable network connections.",
        "stack_rationale": "• React 19 + TypeScript: Modern virtual DOM diffing, component state isolation, and type safety.\n• Monaco Editor: The industrial editor powering VS Code, providing full syntax highlighting, AST parsing, and multi-cursor rendering.\n• Yjs (CRDT): Conflict-free Replicated Data Types guaranteeing eventual consistency without central operational transformation (OT) merge locks.\n• Node.js + ws + y-websocket: Ultra-lightweight WebSocket connection hub broadcasting binary delta updates.\n• Redis Pub/Sub: Backplane clustering enabling multi-node horizontal scaling across multiple WebSocket servers.",
        "architecture": "React Monaco Editor -> y-monaco Binding -> Yjs CRDT Doc -> y-websocket Client -> Node.js WebSocket Hub -> Redis Pub/Sub Cluster -> Wasm Sandboxed Runner",
        "roadmap": "Phase 1: Scaffold React 19 + Vite + TypeScript frontend with Monaco Editor; Phase 2: Set up Node.js WebSocket server with y-websocket provider; Phase 3: Bind Monaco Editor to Yjs Text type with y-monaco for real-time multi-cursor broadcasting; Phase 4: Room-based document multiplexing (/rooms/:roomId) with awareness user presence; Phase 5: Integrate WebAssembly (Pyodide) in-browser sandboxed code execution; Phase 6: Redis Pub/Sub backplane clustering & session persistence in SQLite.",
        "implementation_details": "• Core Libraries: `react@19`, `@monaco-editor/react`, `yjs`, `y-websocket`, `y-monaco`, `ws`, `ioredis`.\n• Conflict Resolution: Yjs assigns each character a unique Lamport timestamp and client ID, creating a deterministic CRDT tree that converges identically across all peers.\n• Awareness Protocol: Broadcasts cursor position `{anchor, head}`, user name, and cursor color without persisting cursor movements to document history.",
        "pitfalls": "1. Sending full document strings over WebSockets on every keystroke: Saturates network bandwidth within seconds; must emit binary delta updates via Yjs.\n2. Unhandled WebSocket disconnections: Clients must implement exponential backoff reconnection with state vector catchup.\n3. Memory leaks from stale client awareness states: Must listen to connection close and evict disconnected user cursors.",
        "database_design": "• SQLite / PostgreSQL Table `code_rooms`:\n  - `id`: VARCHAR(64) PRIMARY KEY\n  - `title`: VARCHAR(120) NOT NULL\n  - `language`: VARCHAR(32) DEFAULT 'python'\n  - `created_by`: VARCHAR(64) NOT NULL\n  - `last_snapshot`: BLOB NULL (Yjs binary state document)\n  - `created_at`: TIMESTAMPTZ DEFAULT NOW()\n  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()\n• In-Memory Redis Keys:\n  - `room:{id}:clients`: Redis Set tracking connected socket IDs\n  - `channel:room:{id}`: Redis Pub/Sub channel multiplexing cross-pod updates",
        "defense": "Interviewer will ask: 'How do you handle two developers typing on the exact same character position simultaneously?' Answer: 'We use Yjs CRDTs (Conflict-free Replicated Data Types). Each character inserted is assigned a unique Lamport timestamp and client ID, creating a deterministic tree structure. Both clients converge to identical text deterministically without central locks or merge conflicts.'"
    },
    "proj-ai-1": {
        "id": "proj-ai-1",
        "ps_code": "PROJ-AI-01",
        "category": "Software",
        "title": "Multi-Agent Regulatory Document Research Engine (RAG)",
        "domain": "Generative AI & Agentic Workflows",
        "org": "Pathfinder Engineering Core",
        "branches": "CSE, IT, AIML",
        "problem_statement": "Generic Large Language Models hallucinate or lose contextual nuance when answering queries about 100-page regulatory compliances, SEC filings, or legal agreements with complex nested tables, producing answers that cannot be verified or legally defended.",
        "stack_rationale": "• Python 3.11 + FastAPI: High-performance async microservice pipeline.\n• PyMuPDF & pdfplumber: High-fidelity document parsing extracting raw text, table structures, and precise bounding box coordinates (page, x0, y0, x1, y1).\n• Google Gemini API (gemini-2.0-flash): Advanced multimodal vision and fast contextual reasoning with 1M+ token context window.\n• Qdrant Vector DB: Production HNSW vector database with native payload filtering by document ID, page number, and section.\n• LangGraph: Multi-agent state machine orchestrating retriever, document critic, and answer synthesis agents.",
        "architecture": "PDF Ingestion -> PyMuPDF OCR & Table Parser -> Gemini Embeddings -> Qdrant Vector DB -> Hybrid Ranker (BM25 + Dense) -> LangGraph Agents (Retriever -> Critic -> Synthesizer) -> Citation UI with Bounding Boxes",
        "roadmap": "Phase 1: PDF Document Ingestion & PyMuPDF structural parsing; Phase 2: Recursive semantic chunking preserving table hierarchies and section metadata; Phase 3: Dense vector embedding generation & Qdrant HNSW indexing; Phase 4: Hybrid search combining BM25 keyword matching with dense cosine similarity; Phase 5: Multi-agent verification loop (Retriever -> Hallucination Critic -> Synthesizer); Phase 6: Interactive React PDF viewer highlighting source bounding boxes on click.",
        "implementation_details": "• Core Libraries: `fastapi`, `pymupdf`, `google-genai`, `qdrant-client`, `rank_bm25`, `langgraph`, `pydantic`.\n• Chunking Strategy: Section-aware recursive splitter (512 tokens, 64 token overlap) retaining document parent-child hierarchical trees.\n• Hallucination Defense: The Critic Agent checks if every factual statement in the generated draft has a direct textual quotation in the retrieved passage; if not, triggers re-retrieval.",
        "pitfalls": "1. Fixed-character naive chunking: Splits tables and sentences in half, causing vector search to miss context. Always use structural semantic chunking.\n2. Pure vector search on domain acronyms: Dense embeddings frequently miss exact regulatory clause numbers (e.g. 'Section 404(b)'); hybrid search with BM25 keyword matching solves this.\n3. Failing to cache embeddings: Re-embedding 100-page PDFs on every query costs money and causes latency; always index once in Qdrant with persistent storage.",
        "database_design": "• Qdrant Collection `regulatory_chunks`:\n  - Vector Dimension: 768 (Cosine distance)\n  - Payload Schema: `{doc_id: str, chunk_id: str, page_number: int, section_title: str, text: str, bbox: [x0, y0, x1, y1]}`\n• SQLite Table `documents`:\n  - `id`: VARCHAR(64) PRIMARY KEY\n  - `filename`: VARCHAR(255) NOT NULL\n  - `page_count`: INT NOT NULL\n  - `file_hash`: VARCHAR(64) UNIQUE NOT NULL\n  - `status`: VARCHAR(20) DEFAULT 'indexed'\n  - `created_at`: TIMESTAMPTZ DEFAULT NOW()",
        "defense": "Interviewer will ask: 'How do you guarantee the LLM isn\'t hallucinating answers about legal regulations?' Answer: 'We implement an autonomous Reflection Verification Agent. Before returning the answer, a critic LLM evaluates the generated response strictly against the retrieved source chunks. If a claim lacks exact coordinate backing in the source text, the critic rejects it and prompts the retrieval agent to re-query.'"
    },
    "proj-data-1": {
        "id": "proj-data-1",
        "ps_code": "PROJ-DATA-01",
        "category": "Software",
        "title": "High-Throughput Financial Market Data Lake & Stream Processing",
        "domain": "Data Engineering & Stream Analytics",
        "org": "Pathfinder Engineering Core",
        "branches": "CSE, IT, AIML",
        "problem_statement": "Financial trading and market analytics platforms process millions of tick-by-tick price events per second. Traditional relational databases (PostgreSQL, MySQL) fail under continuous high-frequency insert loads and take minutes to execute historical aggregation queries across millions of rows.",
        "stack_rationale": "• Python 3.11 + Apache Kafka: Distributed append-only log handling 50k+ events/sec with zero message drop.\n• DuckDB: In-process analytical columnar engine executing vectorized SQL queries over Parquet files 18x faster than Pandas.\n• Parquet (Snappy compressed): Columnar storage format partitioned by year/month/day/symbol, reducing disk footprint by 75%.\n• Apache Airflow: Scheduled DAG orchestration managing daily compaction, schema validation, and partition pruning.\n• Docker: Isolated container topology for Kafka KRaft, DuckDB worker, and analytics dashboard.",
        "architecture": "Market WebSocket Stream -> Kafka Topic (market-ticks) -> DuckDB Stream Aggregator -> Partitioned Parquet Lakehouse -> Airflow Orchestrator -> Streamlit Analytics Dashboard",
        "roadmap": "Phase 1: Deploy Kafka cluster (KRaft mode) via Docker Compose; Phase 2: Ingest live WebSocket market ticks and publish JSON messages to Kafka topic 'market-ticks'; Phase 3: Implement stream aggregator calculating 1m, 5m, and 1h rolling OHLCV candlesticks; Phase 4: Batch write partitioned Parquet lake files (year/month/day/symbol) with Snappy compression; Phase 5: Build DuckDB analytical query layer for sub-100ms historical scans; Phase 6: Deploy Airflow DAG for midnight file compaction and data quality validation.",
        "implementation_details": "• Core Libraries: `kafka-python`, `duckdb`, `pyarrow`, `pandas`, `fastapi`, `streamlit`.\n• Windowing & Watermarking: 10-second watermarking tolerance buffer handling late-arriving network packets without corrupting candle intervals.\n• Vectorized Scanning: DuckDB uses SIMD-accelerated Parquet readers, reading only the requested price columns and skipping entire row groups using Parquet min/max statistics.",
        "pitfalls": "1. The 'Small Files Problem': Writing a separate Parquet file for every tick generates millions of tiny files, destroying query performance. Must buffer in memory and flush in 5-minute batches.\n2. Out-of-memory crashes on continuous streaming: Consumer loops must implement backpressure and avoid accumulating unbounded Python lists in RAM.\n3. Timezone discrepancies: Always normalize timestamps to UTC nanoseconds at the ingestion gateway before publishing to Kafka.",
        "database_design": "• Parquet Columnar Lakehouse Schema:\n  - `timestamp`: TIMESTAMP_NS (UTC)\n  - `symbol`: VARCHAR(16) (e.g. 'BTCUSDT', 'AAPL')\n  - `open`: DECIMAL(12, 4)\n  - `high`: DECIMAL(12, 4)\n  - `low`: DECIMAL(12, 4)\n  - `close`: DECIMAL(12, 4)\n  - `volume`: DECIMAL(18, 8)\n  - `trade_count`: INT\n• Partitioning Scheme: `/lake/ticks/year=YYYY/month=MM/day=DD/symbol=TICKER/data.parquet`\n• DuckDB Query View: `CREATE VIEW v_candlesticks AS SELECT * FROM read_parquet('/lake/ticks/*/*/*/*/*.parquet')`",
        "defense": "Interviewer will ask: 'Why write to a Parquet data lake instead of a standard PostgreSQL database?' Answer: 'PostgreSQL row-oriented storage slows down exponentially under millions of append operations and takes seconds to scan millions of ticks for analytics. Columnar Parquet compressed with Snappy uses 75% less storage, and DuckDB executes vectorized analytical queries over 10M rows in under 80 milliseconds.'"
    },
    "proj-devops-1": {
        "id": "proj-devops-1",
        "ps_code": "PROJ-DEVOPS-01",
        "category": "Software",
        "title": "Automated Multi-Environment GitOps & Canary Deployment Engine",
        "domain": "Cloud Infrastructure & GitOps",
        "org": "Pathfinder Engineering Core",
        "branches": "CSE, IT, AIML",
        "problem_statement": "Manual production deployments and all-at-once rolling updates cause devastating outages when subtle regressions or unhandled edge cases slip past testing. Engineering teams lack automated progressive delivery mechanisms that safely test new versions on a tiny fraction of live user traffic before full rollout.",
        "stack_rationale": "• Kubernetes (k3s / minikube): Industry-standard container orchestration with declarative desired-state reconciliation.\n• Docker + BuildKit: Multi-stage slim container builds reducing production image size by 68%.\n• Argo Rollouts: Cloud-native progressive delivery controller providing percentage-based canary traffic shifting and automated rollback hooks.\n• Prometheus: Real-time telemetry monitoring measuring latency percentiles (p95/p99) and HTTP 5xx error rates.\n• GitHub Actions: Declarative CI/CD pipeline building images, running tests, and updating GitOps deployment manifests.",
        "architecture": "GitHub PR -> GitHub Actions CI -> Slim Docker Build -> GitOps Manifest Repository -> Argo Rollouts Controller -> Traefik Ingress (10% Canary -> 90% Stable) -> Prometheus Health Watchdog -> Auto Rollback / Auto Promote",
        "roadmap": "Phase 1: Set up local k3s cluster and install Argo Rollouts controller; Phase 2: Create multi-stage slim Dockerfile for microservice (<50MB image footprint); Phase 3: Implement GitHub Actions workflow deploying ephemeral preview environments on PR creation; Phase 4: Configure Argo Rollout progressive delivery steps (10% canary -> 5-min pause -> 50% -> 100%); Phase 5: Write Prometheus AnalysisTemplate measuring p99 latency < 250ms and 5xx errors < 0.5%; Phase 6: Simulate artificial fault injection and verify automated rollback in under 15 seconds.",
        "implementation_details": "• Core Tools: `k3s`, `argo-rollouts`, `helm`, `traefik`, `prometheus`, `github-actions`.\n• Progressive Shifting: Argo Rollouts splits ingress traffic using weighted service endpoints without duplicating stateful dependencies.\n• Analysis Metrics: Prometheus query `sum(rate(http_requests_total{status=~'5..'}[1m])) / sum(rate(http_requests_total[1m])) * 100` evaluated every 30 seconds during rollout.",
        "pitfalls": "1. Stateful database changes during canary rollbacks: If the canary version executes an irreversible destructive database migration (e.g. dropping a column), rolling back crashes the stable version. Must always follow the expand-and-contract migration pattern.\n2. Premature canary promotion: Pausing for only 10 seconds before 100% rollout fails to uncover memory leaks or cache warm-up delays. Always evaluate telemetry for at least 3-5 minutes under realistic traffic.",
        "database_design": "• GitOps Repository Single Source of Truth:\n  - `deploy/base/`: Common Kubernetes Service, ConfigMap, and Secrets\n  - `deploy/overlays/preview/`: Ephemeral namespace manifests for pull requests\n  - `deploy/overlays/staging/`: Staging environment configurations\n  - `deploy/overlays/production/`: Production Rollout manifest with Canary AnalysisTemplate\n• Prometheus Metric Store: Time-series database storing HTTP status codes, request latencies, and container memory utilization.",
        "defense": "Interviewer will ask: 'What happens if a canary release introduces a subtle bug that only affects 2% of users?' Answer: 'Our Prometheus AnalysisTemplate continuously queries error rates and p99 latency during each canary traffic step. The moment error rate spikes above 0.5% or latency exceeds 250ms, the Argo Rollout controller immediately terminates the canary pods and reverts 100% of traffic to the stable revision in under 12 seconds.'"
    },
    "proj-embedded-1": {
        "id": "proj-embedded-1",
        "ps_code": "PROJ-EMBED-01",
        "category": "Hardware",
        "title": "Industrial Edge Sensor Telemetry & Anomaly Node",
        "domain": "Embedded Systems & Edge Computing",
        "org": "Pathfinder Engineering Core",
        "branches": "ECE, EEE, IoT, Mechanical",
        "problem_statement": "Industrial rotating machinery (pumps, turbines, conveyor motors) fails unpredictably from bearing wear and thermal stress. Streaming continuous high-frequency vibration signals over Wi-Fi drains battery power in days and saturates industrial network bandwidth.",
        "stack_rationale": "• ESP32 Microcontroller: Low-cost dual-core 240MHz SoC with built-in Wi-Fi, Bluetooth LE, and hardware cryptographic acceleration.\n• FreeRTOS: Preemptive real-time multitasking kernel guaranteeing deterministic sensor sampling timing and network communication priority.\n• MPU6050 / ADXL345: High-precision 3-axis I2C accelerometer measuring mechanical vibration frequencies up to 1kHz.\n• DS18B20: 1-Wire digital temperature sensor measuring equipment casing heat (-55°C to +125°C).\n• MQTT over TLS (mTLS): Secure cryptographic IoT telemetry protocol transmitting compact JSON payloads to cloud brokers.\n• Edge Impulse / TinyML: On-device vibration anomaly classification model running inference directly on the ESP32 core.",
        "architecture": "I2C Vibration Sensor + 1-Wire Temp Sensor -> ESP32 FreeRTOS (Task 1: Sensor Sampling 100Hz, Task 2: TinyML Anomaly Inference, Task 3: MQTT Publisher) -> mTLS MQTT Broker -> InfluxDB Time-Series -> Grafana Dashboard",
        "roadmap": "Phase 1: Wire ESP32 with MPU6050 accelerometer over I2C and DS18B20 over 1-Wire bus; Phase 2: Implement FreeRTOS preemptive tasks (Sensor Task priority 3, Network Task priority 1) with inter-task queues; Phase 3: Train TinyML 1D-CNN or k-means anomaly detection model on normal baseline motor vibration; Phase 4: Flash TinyML C++ model onto ESP32 and compute Root Mean Square (RMS) acceleration and peak frequencies; Phase 5: Implement mTLS encrypted MQTT publisher pushing telemetry packets every 30 seconds; Phase 6: Configure ESP32 deep-sleep cycling with accelerometer threshold interrupt wake-up, achieving 15µA quiescent draw.",
        "implementation_details": "• Core Tools: `ESP-IDF / Arduino C++`, `FreeRTOS`, `PubSubClient`, `Edge Impulse TinyML`, `Mosquitto MQTT`, `InfluxDB`.\n• Power Optimization: CPU runs in active mode for 80ms during sampling/inference, then sleeps at 15µA in deep sleep until next timer or vibration spike.\n• Hardware Watchdog: FreeRTOS task watchdog timer (WDT) triggers automatic microcontroller reboot if sensor bus hangs.",
        "pitfalls": "1. Using blocking `delay()` functions in FreeRTOS: Blocks other critical real-time tasks and starves the Wi-Fi watchdog, causing kernel panic. Always use `vTaskDelayUntil()` for deterministic scheduling.\n2. Connecting Wi-Fi continuously: Consumes 120-180mA continuously, killing batteries in 36 hours. Always buffer samples in RTC memory and connect in short bursts.\n3. Floating I2C bus lines: Missing pull-up resistors on SDA/SCL lines causes bus lockups in noisy industrial environments. Always use 4.7kΩ pull-up resistors.",
        "database_design": "• InfluxDB Time-Series Measurement `industrial_telemetry`:\n  - Tags: `device_id`, `machine_id`, `location`\n  - Fields: `vibration_rms` (float), `peak_frequency_hz` (float), `temp_celsius` (float), `anomaly_score` (float), `battery_voltage` (float)\n  - Retention Policy: 90 days with continuous downsampling queries to 1-hour averages for historical trending.",
        "defense": "Interviewer will ask: 'Why do anomaly detection on the edge instead of streaming raw vibration data to the cloud?' Answer: 'Streaming raw 100Hz 3-axis accelerometer data continuously consumes high Wi-Fi bandwidth and drains batteries within hours. By running a TinyML anomaly detection model directly on the ESP32, we transmit only summarized statistics and critical anomaly alerts, extending battery life from 2 days to over 9 months.'"
    }
}

INDUSTRY_PROJECTS_DIRECTORY: Dict[str, Dict[str, Any]] = {
    "PF-IND-146": {
        "ps_code": "PF-IND-146",
        "category": "Software",
        "title": "AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic",
        "org": "National Cyber Intelligence & FinTech Consortium",
        "branches": "CSE, IT, Cybersecurity, Data Science",
        "problem_statement": "Illicit actors exploit cryptocurrency mixers (Wasabi, CoinJoin) and complex multi-hop peeling chains to obscure the provenance of ransom and fraud funds, rendering conventional linear transaction lookups ineffective.",
        "stack_rationale": "• Python 3.11 + Web3.py / Bitcoin RPC: Real-time mempool WebSocket streaming.\n• Neo4j Graph DB: Graph property model storing UTXO transaction addresses as nodes and transfers as directed edges.\n• PyTorch Geometric (PyG): Graph Convolutional Networks (GCN) classifying automated mixing topologies.\n• FastAPI + Cytoscape.js: Interactive real-time graph visualization for forensics investigators.",
        "architecture": "Mempool WebSocket Stream -> UTXO Transaction Graph Ingestion -> Neo4j Graph DB -> Peeling Chain Trace Algorithm -> Graph Convolutional Network (GCN) Mixer Classifier -> FastAPI -> Cytoscape.js Canvas",
        "roadmap": "Phase 1: Connect to Bitcoin RPC node/mempool WebSocket API; Phase 2: Model UTXO inputs/outputs into Neo4j graph nodes & edges; Phase 3: Train GCN on known mixer patterns (Wasabi, CoinJoin); Phase 4: Build risk scoring heuristics (peeling chains, hop counts); Phase 5: Visualize transaction flow graph with alert triggers in Cytoscape.js.",
        "implementation_details": "• Libraries: `networkx`, `web3`, `neo4j`, `torch-geometric`, `fastapi`, `redis`.\n• Heuristics: Multi-input clustering heuristic associates inputs signed in the same transaction with a single entity, collapsing address graphs.",
        "pitfalls": "1. Ingesting full Bitcoin blockchain into memory: Over 600GB; must stream only active mempool and sliding window transactions.\n2. Circular references in graph traversal: Peeling chain traversals must set max hop depth limits to prevent infinite loops.",
        "database_design": "• Neo4j Graph Schema:\n  - `(:Address {hash: string, cluster_id: string, risk_score: float})`\n  - `(:Transaction {txid: string, timestamp: datetime, total_btc: float})`\n  - `(:Address)-[:SENT {amount: float}]->(:Transaction)`\n  - `(:Transaction)-[:RECEIVED {amount: float}]->(:Address)`",
        "defense": "Interviewer will ask: 'How do you handle Bitcoin transaction anonymity?' Answer: 'We use heuristic address clustering (multi-input ownership heuristics) and Graph Neural Networks to identify structural peeling-chain patterns characteristic of automated mixing protocols.'"
    },
    "PF-IND-147": {
        "ps_code": "PF-IND-147",
        "category": "Software",
        "title": "Automated Model for Analysis of .IQ and .wav Radio Files with Signal Parameter Extraction",
        "org": "National Cyber Intelligence & FinTech Consortium",
        "branches": "ECE, CSE, Aerospace, Telecommunications",
        "problem_statement": "Electronic surveillance operators must rapidly identify unknown radio frequency transmissions buried under heavy electromagnetic interference and noise, where manual spectrogram inspection is too slow.",
        "stack_rationale": "• Python + SciPy + NumPy: High-speed Fourier transform (FFT) and Welch power spectral density calculation.\n• PyTorch ResNet-18: 2D convolutional neural network trained on RadioML modulation datasets (QPSK, FSK, 16-QAM).\n• FastAPI + Three.js / WebGL: Real-time interactive waterfall spectrogram visualization in the browser.",
        "architecture": "Binary .IQ/.wav Ingestion -> Short-Time Fourier Transform (STFT) -> 2D Spectrogram Tensors -> ResNet-18 Modulation Classifier -> SciPy Spectral Parameter Engine (Carrier Freq, Bandwidth, SNR) -> WebGL Waterfall Spectrogram",
        "roadmap": "Phase 1: Parse raw binary I/Q channels into complex numpy arrays; Phase 2: Compute FFT and Welch power spectral densities; Phase 3: Train CNN classifier on RadioML synthetic modulation dataset (QPSK, FSK, 16QAM); Phase 4: Build automated SNR and Doppler frequency drift extractors; Phase 5: Render interactive waterfall FFT visualization.",
        "implementation_details": "• Libraries: `scipy`, `numpy`, `torch`, `torchvision`, `fastapi`.\n• Signal Parsing: Raw .IQ samples interleaved as 16-bit signed integers converted to `I + 1j * Q` complex float32 arrays.",
        "pitfalls": "1. High noise floor masking weak carriers: Preprocessing must include adaptive bandpass filtering and spectral subtraction.\n2. Frequency offset from oscillator drift: Must calculate center of mass in frequency domain before modulation classification.",
        "database_design": "• SQLite / TimescaleDB `signal_records`:\n  - `id`: UUID PRIMARY KEY\n  - `carrier_freq_mhz`: FLOAT, `bandwidth_khz`: FLOAT, `snr_db`: FLOAT\n  - `modulation`: VARCHAR(32), `confidence`: FLOAT\n  - `spectrogram_path`: VARCHAR(255), `timestamp`: TIMESTAMPTZ",
        "defense": "Interviewer will ask: 'How does your model perform under heavy noise?' Answer: 'We preprocess signals using adaptive bandpass filtering and train on augmented synthetic noise profiles down to -6dB SNR, achieving 93.8% classification accuracy.'"
    },
    "PF-IND-153": {
        "ps_code": "PF-IND-153",
        "category": "Software",
        "title": "AI-Based Network Attack Forecasting & Threat Detection from Raw Network Traffic Data",
        "org": "National Cyber Intelligence & FinTech Consortium",
        "branches": "CSE, IT, Cybersecurity",
        "problem_statement": "Traditional Intrusion Detection Systems (IDS) detect attacks only after payloads hit servers. Organizations need predictive security engines that forecast multi-stage cyber-attacks during initial reconnaissance beacons.",
        "stack_rationale": "• Zeek / Suricata: High-throughput packet parsing extracting flow connection records from raw PCAP streams.\n• Apache Kafka: High-velocity message queue streaming 25k connection events/sec.\n• PyTorch Temporal Graph Attention Network (GAT): Graph attention model forecasting attack kill-chain progression.\n• Elasticsearch & Kibana: Real-time SIEM security visualization.",
        "architecture": "Raw PCAP Stream -> Zeek Protocol Analyzer -> Apache Kafka Message Queue -> Temporal Graph Attention Network (GAT) -> Anomaly Forecaster -> Elasticsearch / Kibana SIEM",
        "roadmap": "Phase 1: Deploy Zeek tap to extract flow records from PCAP streams; Phase 2: Stream connection logs into Kafka queues; Phase 3: Train GAT model on CICIDS2017 dataset to predict attack progression; Phase 4: Implement anomaly scoring with dynamic thresholding; Phase 5: Connect SIEM dashboard with automated iptables firewall isolation rules.",
        "implementation_details": "• Libraries: `torch`, `torch-geometric`, `kafka-python`, `elasticsearch`, `scapy`.\n• Kill-Chain Modeling: Graph nodes represent IP addresses; edges represent ports/protocols weighted by connection frequency.",
        "pitfalls": "1. Massive alert fatigue from false positives: Dynamic thresholding and graph temporal pooling filter out transient connection drops.\n2. Dropping packets under high bandwidth: Kernel-level ring buffers (PF_RING) must be used for packet capture.",
        "database_design": "• Elasticsearch Index `network-threats`:\n  - `@timestamp`: date, `src_ip`: ip, `dest_ip`: ip, `protocol`: keyword, `threat_level`: keyword, `predicted_next_step`: text",
        "defense": "Interviewer will ask: 'Why forecasting instead of traditional detection?' Answer: 'Traditional IDS detects attacks after the payload hits. Our temporal graph attention model identifies initial port scans and reconnaissance beacons, forecasting full multi-stage compromises 8.4 minutes in advance.'"
    },
    "PF-IND-158": {
        "ps_code": "PF-IND-158",
        "category": "Software",
        "title": "Single-Pass Drone Video to Accurate 3D Model Generation System",
        "org": "National Cyber Intelligence & FinTech Consortium",
        "branches": "CSE, ECE, Robotics, Civil Engineering",
        "problem_statement": "Surveying disaster zones or infrastructure via aerial drones requires accurate 3D spatial reconstructions, but traditional photogrammetry takes hours of computation on high-end desktop workstations.",
        "stack_rationale": "• Python + PyTorch + CUDA: Accelerated GPU computation.\n• SuperPoint + LightGlue: High-speed feature extraction and matching robust to illumination changes.\n• COLMAP + Instant-NGP / 3D Gaussian Splatting: State-of-the-art novel view synthesis rendering 3D scenes in minutes.\n• Three.js: Browser-based measurement canvas for interactive inspection.",
        "architecture": "4K Aerial Drone Video -> SuperPoint & LightGlue Optical Keyframer -> COLMAP Structure-from-Motion (SfM) -> Instant-NGP / 3D Gaussian Splatting Engine -> Open3D Mesh Generator -> Three.js Web Viewer",
        "roadmap": "Phase 1: Extract sharp keyframes using Laplacian variance filtering; Phase 2: Run COLMAP SfM to compute camera poses and sparse point clouds; Phase 3: Train 3D Gaussian Splatting model for photorealistic novel view synthesis; Phase 4: Extract textured polygon mesh (GLTF) using Poisson surface reconstruction; Phase 5: Deploy browser-based measurement canvas in Three.js.",
        "implementation_details": "• Libraries: `torch`, `colmap`, `open3d`, `opencv-python`, `three.js`.\n• Keyframe Filter: Frames with Laplacian blur score below threshold are automatically discarded.",
        "pitfalls": "1. Camera pose drift on straight flight paths: Integrate drone onboard GPS/IMU metadata as priors in COLMAP bundle adjustment.\n2. Excessive polygon count crashing web browsers: Must decimate output meshes to <200k polygons using quadric mesh decimation.",
        "database_design": "• Storage: S3 / MinIO storing keyframe images, camera pose JSONs, and `.ply` / `.splat` 3D Gaussian models.",
        "defense": "Interviewer will ask: 'How do you prevent motion blur from drone flight?' Answer: 'We filter keyframes based on blur metrics and integrate drone gimbal IMU telemetry into COLMAP\'s initial pose priors to accelerate convergence.'"
    },
    "PF-IND-162": {
        "ps_code": "PF-IND-162",
        "category": "Software",
        "title": "AI-Based Detection and Classification of Industrial Fires Using NASA FIRMS Satellite Data",
        "org": "National Cyber Intelligence & FinTech Consortium",
        "branches": "CSE, IT, Data Science, Civil, Environmental",
        "problem_statement": "Industrial conflagrations in oil refineries and chemical plants require instant satellite detection, but standard thermal imagery triggers false alarms on permitted industrial gas flares.",
        "stack_rationale": "• GeoPandas + GDAL: Spatial analysis intersecting satellite fire coordinates with OpenStreetMap industrial polygons.\n• XGBoost: Gradient boosting classifying licensed flare stacks vs uncontrolled conflagrations.\n• NASA FIRMS API: 375m VIIRS thermal anomaly streaming.\n• Leaflet.js + PostGIS: Real-time map dashboard with geo-spatial queries.",
        "architecture": "NASA VIIRS & MODIS Thermal APIs -> GeoPandas Spatial Join -> OpenStreetMap Industrial Polygons -> XGBoost Heat Source Classifier -> PostGIS DB -> Leaflet.js Real-Time Map",
        "roadmap": "Phase 1: Stream active fire coordinates from NASA FIRMS API (VIIRS 375m); Phase 2: Perform spatial intersection with OpenStreetMap refinery/factory polygons; Phase 3: Train XGBoost classifier to differentiate licensed gas flares from accidental conflagrations; Phase 4: Estimate fire spread vectors using wind speed telemetry; Phase 5: Trigger automated SMS/Webhook alerts with geo-coordinates.",
        "implementation_details": "• Libraries: `geopandas`, `xgboost`, `shapely`, `leaflet`, `postgis`.\n• Temporal Persistence: Flare stacks burn continuously with steady Brightness Temperature; accidental fires show rapid radiant power spikes.",
        "pitfalls": "1. Cloud cover obscuring thermal signatures: Must combine infrared VIIRS with radar SAR imagery (Sentinel-1) during cloudy conditions.",
        "database_design": "• PostGIS Table `fire_events`:\n  - `id`: UUID PRIMARY KEY, `geom`: GEOMETRY(Point, 4326), `brightness_temp_kelvin`: FLOAT, `frp_mw`: FLOAT, `is_flare`: BOOLEAN, `recorded_at`: TIMESTAMPTZ",
        "defense": "Interviewer will ask: 'How do you avoid false alarms from legal refinery flare stacks?' Answer: 'We maintain a spatial registry of licensed industrial flare points and cross-check temporal thermal persistence: flare stacks exhibit steady heat, while accidental fires show exponential radiant power growth.'"
    },
    "PF-IND-167": {
        "ps_code": "PF-IND-167",
        "category": "Software",
        "title": "SatQuery AI: Interactive Vision-Language Assistant for Remote Sensing Satellite Imagery",
        "org": "Earth Observation & Satellite Intelligence Labs",
        "branches": "CSE, AIML, ECE, Aerospace",
        "problem_statement": "Remote sensing analysts must manually query multi-gigabyte satellite rasters for land changes, flood zones, and urban sprawl. A conversational vision-language model enables natural-language geospatial inquiries.",
        "stack_rationale": "• Python + Rasterio + GDAL: Parsing multispectral GeoTIFF imagery from ISRO Bhuvan and Sentinel satellites.\n• PaliGemma / CLIP: Vision-language multimodal embeddings bridging geospatial imagery and natural language.\n• Qdrant Vector DB: Indexing multispectral tile vectors with geospatial coordinates.\n• FastAPI + React: Interactive chat canvas with bounding box overlays.",
        "architecture": "High-Res Satellite GeoTIFF -> Band Normalization -> PaliGemma / CLIP Multimodal Encoder -> Qdrant Vector DB -> Natural Language Spatial Parser -> Segmented Raster Output",
        "roadmap": "Phase 1: Ingest multispectral tiles from ISRO Bhuvan / Sentinel datasets; Phase 2: Generate visual embeddings with a geospatial vision-language model; Phase 3: Index tiles in Qdrant with spatial metadata (lat/lon, date, band); Phase 4: Fine-tune model to answer complex spatial queries ('locate new urban developments'); Phase 5: Return bounding boxes and segmentation masks.",
        "implementation_details": "• Libraries: `rasterio`, `transformers`, `qdrant-client`, `fastapi`, `leaflet`.\n• Band Normalization: Calculates NDVI (Normalized Difference Vegetation Index) and NDWI (Water Index) before passing to transformer.",
        "pitfalls": "1. Geospatial coordinate loss during resizing: Always maintain affine transform matrices to project model predictions back onto real GPS coordinates.",
        "database_design": "• Qdrant Collection `satellite_tiles` (768-dim embeddings with metadata: `bbox`, `cloud_cover`, `sensor`, `date`).",
        "defense": "Interviewer will ask: 'How does this handle multispectral bands beyond RGB?' Answer: 'We project 4-band and 8-band rasters into dense latent embeddings using custom band-weighting layers before passing them into the multimodal transformer.'"
    },
    "PF-IND-168": {
        "ps_code": "PF-IND-168",
        "category": "Software",
        "title": "AI-ML Based Intelligent Dead Reckoning System for Seamless GNSS-Denied Navigation",
        "org": "Earth Observation & Satellite Intelligence Labs",
        "branches": "ECE, EEE, Robotics, Smart Vehicles, CSE",
        "problem_statement": "In tunnels, dense urban canyons, or military jamming environments, GPS/GNSS signals are completely blocked. Standard IMU double-integration accumulates quadratic drift errors, rendering navigation useless within minutes.",
        "stack_rationale": "• C++ / Python + Eigen3: High-speed matrix algebra.\n• Extended Kalman Filter (EKF): Sensor fusion combining accelerometer, gyroscope, and magnetometer readings.\n• Physics-Informed Neural Network (PINN): Real-time IMU bias drift estimation and Zero-Velocity Update (ZUPT) trigger detection.\n• ROS2 Humble: Standard robotics odometry streaming.",
        "architecture": "9-Axis IMU Stream (100Hz) -> High-Pass Filter -> Physics-Informed Neural Network (PINN) Bias Estimator -> Extended Kalman Filter (EKF) -> 3D Odometry Publisher",
        "roadmap": "Phase 1: Interface 9-DOF IMU sensor via I2C/SPI at 100Hz; Phase 2: Implement double-integration kinematics with drift suppression; Phase 3: Train a 1D CNN to recognize footstep / wheel stationary phases for Zero-Velocity Updates (ZUPT); Phase 4: Fuse measurements in an EKF; Phase 5: Validate trajectory accuracy in underground tunnels.",
        "implementation_details": "• Algorithms: Zero-Velocity Updates (ZUPT) detect moments when vehicle/foot is stationary to reset velocity error to 0.0.",
        "pitfalls": "1. Sensor temperature drift: Accelerometer bias changes with chip temperature; must calibrate with polynomial temperature lookup curves.",
        "database_design": "• Binary Rosbag2 storage tracking 3D trajectory tuples: `{timestamp, pos_x, pos_y, pos_z, q_w, q_x, q_y, q_z, covariance}`.",
        "defense": "Interviewer will ask: 'Why does standard IMU integration fail?' Answer: 'Double integrating accelerometer bias produces quadratic distance error over time. Our PINN continuously predicts sensor bias and applies ZUPT zero-velocity constraints to limit drift to <1.1% over 5km.'"
    },
    "PF-IND-117": {
        "ps_code": "PF-IND-117",
        "category": "Software",
        "title": "Sovereign On-Premise Agentic AI Workbench Using Open-Weight Multimodal LLMs",
        "org": "Industrial Sovereign AI Systems Consortium",
        "branches": "CSE, IT, AIML",
        "problem_statement": "Critical infrastructure and petrochemical refineries possess confidential P&ID blueprints and operating manuals that cannot be uploaded to public cloud AI APIs due to national security regulations.",
        "stack_rationale": "• vLLM + Llama-3-Vision (8B AWQ): High-throughput local GPU inference running 4-bit quantized open-weight vision models.\n• LangGraph: Autonomous multi-agent pipeline parsing complex engineering diagrams.\n• ChromaDB (AES-256 encrypted): Air-gapped local vector database.\n• Docker: Air-gapped network namespace with zero internet access.",
        "architecture": "Air-Gapped Gateway -> NGINX Reverse Proxy -> LangGraph Orchestrator -> vLLM Llama-3-Vision Engine -> ChromaDB Encrypted Vector Store -> Local Audit Logger",
        "roadmap": "Phase 1: Set up completely air-gapped Linux GPU workstation; Phase 2: Deploy vLLM serving 4-bit quantized open-weight vision models; Phase 3: Implement LangGraph multi-agent pipeline for P&ID engineering diagram parsing; Phase 4: Encrypt vector storage with AES-256; Phase 5: Build local auditing web UI.",
        "implementation_details": "• Offline Assurance: Docker container runs with `--network none` verifying zero outbound packets.",
        "pitfalls": "1. GPU VRAM exhaustion: 8B vision models require 16GB+ VRAM unquantized; must use AWQ/GPTQ 4-bit quantization to fit into single consumer RTX GPU.",
        "database_design": "• Encrypted SQLite / ChromaDB storing documents with AES-GCM 256-bit encryption keys stored in TPM.",
        "defense": "Interviewer will ask: 'How do you guarantee zero data leakage?' Answer: 'The system is deployed inside an isolated Docker network with zero egress routes, verifying that no external API calls or telemetry packets leave the on-premise hardware.'"
    },
    "PF-IND-123": {
        "ps_code": "PF-IND-123",
        "category": "Software",
        "title": "Edge-AI Distributed Fleet Coordination & Collision Avoidance for Autonomous Mobile Robots",
        "org": "Advanced Robotics & Edge Fleet Systems",
        "branches": "CSE, ECE, Robotics, EEE",
        "problem_statement": "Automated warehouses operating dozens of mobile robots suffer bottlenecks and gridlock at high-traffic intersections, especially when centralized Wi-Fi drops.",
        "stack_rationale": "• ROS2 Humble: Distributed robotics middleware.\n• Zenoh Protocol: Decentralized peer-to-peer pub/sub networking with microsecond latencies.\n• Conflict-Based Search (CBS): Multi-agent pathfinding algorithm generating collision-free trajectories.\n• TEB Local Planner: Dynamic obstacle avoidance for non-holonomic mobile robots.",
        "architecture": "AMR Robot Nodes -> Zenoh Peer-to-Peer Mesh -> Conflict-Based Search (CBS) Solver -> TEB Local Planner -> Digital Twin Fleet Canvas",
        "roadmap": "Phase 1: Model warehouse grid map with occupancy grids; Phase 2: Implement peer-to-peer discovery using Zenoh protocol; Phase 3: Implement Space-Time Conflict-Based Search to solve multi-agent path finding; Phase 4: Add local obstacle avoidance with dynamic window approach; Phase 5: Build central 3D monitoring dashboard.",
        "implementation_details": "• Decentralized Negotiation: If central dispatch drops, robots broadcast speed vectors to nearby peers using Zenoh mesh.",
        "pitfalls": "1. Deadlock in narrow corridors: Must establish virtual one-way directional priorities in space-time reservation tables.",
        "database_design": "• Redis In-Memory Spatial Index storing real-time coordinates `{robot_id, x, y, theta, linear_vel, battery}`.",
        "defense": "Interviewer will ask: 'What happens if Wi-Fi disconnects between robots?' Answer: 'We use decentralized peer-to-peer Zenoh mesh networking. If central connection drops, robots negotiate right-of-way locally using prioritized velocity obstacle protocols without colliding.'"
    },
    "PF-IND-127": {
        "ps_code": "PF-IND-127",
        "category": "Software",
        "title": "City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking & Urban Traffic Analytics",
        "org": "Advanced Robotics & Edge Fleet Systems",
        "branches": "CSE, IT, ECE, Data Science",
        "problem_statement": "Traffic authorities tracking suspicious vehicles across city camera networks must correlate vehicle identities across non-overlapping camera feeds under occlusions and variable lighting.",
        "stack_rationale": "• YOLOv10: Real-time vehicle and license plate bounding box detector.\n• DeepSORT + OSNet ReID: Deep appearance feature extractor for cross-camera vehicle re-identification.\n• Redis Streams + ClickHouse: High-throughput ingestion of 100k vehicle passage records/hour.\n• FastAPI + React: Live traffic heatmaps and trajectory tracking.",
        "architecture": "RTSP Multi-Camera Matrix (30x) -> YOLOv10 Plate & Vehicle Detector -> DeepSORT ReID Tracker -> Redis Stream Queue -> ClickHouse High-Throughput DB -> Real-Time Map Canvas",
        "roadmap": "Phase 1: Ingest RTSP camera feeds with multi-threaded OpenCV buffers; Phase 2: Train fine-tuned YOLOv10 model on Indian high-security registration plates; Phase 3: Implement DeepSORT appearance embeddings for cross-camera vehicle re-identification; Phase 4: Ingest coordinate trajectories into ClickHouse; Phase 5: Display live congestion heatmaps and alert routes.",
        "implementation_details": "• Perspective Rectification: Warps angled plates into flat rectangular crops before OCR character recognition.",
        "pitfalls": "1. Occluded plates in heavy traffic: Combine plate text with vehicle color/make/model ReID embeddings.",
        "database_design": "• ClickHouse Table `vehicle_passages`:\n  - `timestamp`: DateTime64, `camera_id`: LowCardinality(String), `plate_text`: String, `vehicle_type`: LowCardinality(String), `reid_vector`: Array(Float32)\n  - ENGINE = MergeTree() ORDER BY (plate_text, timestamp)",
        "defense": "Interviewer will ask: 'How do you handle occluded or high-speed license plates?' Answer: 'We combine high-speed frame interpolation with perspective warp rectification, ensuring clear plate text extraction even at 60 km/h and skewed 45° camera angles.'"
    },
    "PF-IND-112": {
        "ps_code": "PF-IND-112",
        "category": "Hardware",
        "title": "Modular Autonomous Mobile Robot (AMR) Platform for Smart Warehouse Automation",
        "org": "Industrial Robotics & Warehouse Automation Labs",
        "branches": "Robotics, Mechatronics, Mechanical, ECE, EEE",
        "problem_statement": "Small manufacturing warehouses require affordable autonomous material transport, but commercial AMRs cost upwards of $25,000 and have closed proprietary software.",
        "stack_rationale": "• STM32 Nucleo (C++): Hard real-time closed-loop PID velocity motor control with optical encoder feedback.\n• Raspberry Pi 5 (ROS2 Nav2): High-level SLAM mapping and path planning.\n• 2D RPLiDAR A1: 360-degree laser scanning for 12m obstacle detection.\n• NEMA 23 Steppers + Planetary Gearbox: High-torque 50kg payload drive.",
        "architecture": "2D RPLiDAR A1 + Wheel Optical Encoders -> STM32 Nucleo (PID Velocity Control) -> UART -> Raspberry Pi 5 (ROS2 Nav2 Stack) -> Dual NEMA 23 Motors + Planetary Gearbox -> Wireless Dock",
        "roadmap": "Phase 1: Design chassis, motor brackets, and payload lift in SolidWorks; Phase 2: Fabricate aluminum frame and assemble NEMA 23 motors with planetary gearboxes; Phase 3: Program STM32 closed-loop PID controller with optical encoder feedback; Phase 4: Deploy ROS2 Nav2 on Raspberry Pi 5 with RPLiDAR for SLAM mapping; Phase 5: Test autonomous payload docking under 50kg load.",
        "implementation_details": "• Master-Slave Architecture: Raspberry Pi 5 runs high-level navigation; STM32 handles deterministic real-time motor pulses.",
        "pitfalls": "1. Linux OS scheduling jitter: Running motor PWM directly from Raspberry Pi causes jerky wheel motion; always offload to dedicated microcontroller.",
        "database_design": "• Hardware Config: EEPROM calibration parameters `{wheel_radius_mm, wheel_base_mm, pid_kp, pid_ki, pid_kd}`.",
        "defense": "Interviewer will ask: 'Why dual controllers instead of just a Raspberry Pi?' Answer: 'Raspberry Pi runs a non-real-time Linux OS which can experience microsecond jitter during heavy computing. The STM32 microcontroller guarantees deterministic, real-time PID motor timing and safety cutoffs.'"
    },
    "PF-IND-113": {
        "ps_code": "PF-IND-113",
        "category": "Hardware",
        "title": "Wearable Robotic Exoskeleton / Human Augmentation Mobility Assistive System",
        "org": "Industrial Robotics & Warehouse Automation Labs",
        "branches": "Biomedical, Mechanical, ECE, Mechatronics",
        "problem_statement": "Industrial factory workers lifting heavy crates suffer chronic lumbar and knee fatigue, leading to musculoskeletal injuries and lost workdays.",
        "stack_rationale": "• Carbon Fiber & Al-6061: Lightweight ergonomic structural frame (<3.2kg total weight).\n• MyoWare 2.0 sEMG: Surface electromyography detecting quadriceps muscle activation before joint motion.\n• ESP32 (FreeRTOS): 18ms real-time gait phase estimation.\n• Harmonic BLDC Motor: High-torque density 35Nm knee torque assistance.",
        "architecture": "Surface EMG Electrodes (Quadriceps) + Knee IMU -> ESP32 FreeRTOS Controller -> Gait Phase Estimator -> CAN Bus Driver -> Harmonic BLDC Motor Actuator (35 Nm)",
        "roadmap": "Phase 1: Design ergonomic thigh and shank orthotic braces with quick-release ratchets; Phase 2: Mount MyoWare surface EMG sensors on leg muscles and filter noise; Phase 3: Program ESP32 with FreeRTOS to classify gait cycle phases in <18ms; Phase 4: Drive high-torque harmonic BLDC motor to deliver 30 Nm assistance during leg swing; Phase 5: Validate metabolic energy reduction.",
        "implementation_details": "• Triple Safety Cutoffs: Mechanical hard-stops at 120°, motor current limiters, and physical emergency stop lanyard.",
        "pitfalls": "1. Sweat degrading EMG signal: Use dry conductive silicone electrodes with differential filtering.",
        "database_design": "• SD Card Telemetry: Logs `{timestamp, emg_mv, knee_angle_deg, motor_torque_nm, battery_pct}` at 50Hz.",
        "defense": "Interviewer will ask: 'How do you prevent the motor from injuring the user\'s joint?' Answer: 'We implement a triple safety architecture: hardware mechanical hard-stops limiting knee angle to 120°, software current limiters cutting motor torque if back-EMF spikes, and an instant emergency kill-switch.'"
    },
    "PF-IND-118": {
        "ps_code": "PF-IND-118",
        "category": "Hardware",
        "title": "Passive Colorimetric H2S Exposure-Dosimeter Wristband with Edge-AI Optical Reading",
        "org": "Industrial Sovereign AI Systems Consortium",
        "branches": "Chemical, ECE, Instrumentation, Materials Science",
        "problem_statement": "Refinery workers risk sudden lethal poisoning from Hydrogen Sulfide (H2S) gas. Active battery-powered detectors are bulky, fail in rain/humidity, and workers forget to recharge them.",
        "stack_rationale": "• Passive Chemical Matrix: Lead acetate paper darkening proportionally to cumulative H2S ppm-hours with zero electrical power.\n• ESP32-S3-CAM: Ultra-low-power optical chamber taking hourly RGB photos under calibrated LED lighting.\n• TinyML Polynomial Regression: Converts color darkness into exact cumulative ppm-hour exposure.\n• BLE 5.0 Beacon: Broadcasts worker exposure logs to plant gateways.",
        "architecture": "Airborne H2S Gas -> Chemical Paper Matrix (Lead Acetate / Silver Nanoparticle Darkening) -> ESP32-S3 Miniature Optical Chamber -> TinyML Polynomial Regression -> BLE Beacon Gateway",
        "roadmap": "Phase 1: Formulate stable reactive chemical strip that darkens predictably with H2S ppm-hours; Phase 2: Design light-sealed optical chamber with calibrated white LEDs; Phase 3: Train TinyML polynomial regression model to convert RGB/HSV color coordinates to exact exposure dosage; Phase 4: Implement BLE advertising beacon transmitting hourly dosimetry; Phase 5: Package in an intrinsically safe explosion-proof silicone wristband.",
        "implementation_details": "• Deep Sleep: ESP32 sleeps 59 minutes and 55 seconds every hour, yielding 6+ months battery life on a tiny 200mAh coin cell.",
        "pitfalls": "1. Ambient light interference: Must use light-sealed internal optical cavity with known CRI LED pulse.",
        "database_design": "• BLE Telemetry Packet: `[Device_ID (2B), Cumulative_PPM_Hours (2B), Battery_mV (2B), Timestamp (4B)]`.",
        "defense": "Interviewer will ask: 'Why not use standard electrochemical sensors?' Answer: 'Electrochemical sensors require continuous battery power, need recalibration every few months, and fail in high humidity. Our passive chemical matrix requires ZERO power to absorb gas, and the camera wakes up only once an hour, yielding 6+ months battery life.'"
    },
    "PF-IND-020": {
        "ps_code": "PF-IND-020",
        "category": "Hardware",
        "title": "Innovative Solar Hand-Spinning Equipment for Khadi Artisan Productivity Enhancement",
        "org": "Renewable Energy Precision Machinery Lab",
        "branches": "Mechanical, EEE, Production Engineering, Rural Tech",
        "problem_statement": "Rural Khadi artisans spinning yarn on manual charkhas suffer severe shoulder fatigue and earn low daily wages due to limited spindle speeds and frequent power cuts.",
        "stack_rationale": "• 100W Solar PV + MPPT: Clean renewable power charging 12V LiFePO4 battery.\n• 12V 100W BLDC Motor: Highly efficient brushless motor driving multi-spindle pulleys.\n• Ergonomic Flywheel: Low-friction sealed ball bearing gear train.\n• Hybrid Foot Pedal Disengage: Allows manual mechanical spinning on cloudy days.",
        "architecture": "100W Solar PV Module -> MPPT Charge Controller -> 12V LiFePO4 Battery -> PWM Variable Speed Driver -> BLDC Motor -> Spindle Pulley Gear Train -> OLED Speed Display",
        "roadmap": "Phase 1: Redesign spinning chassis in SolidWorks for ergonomic posture and low friction; Phase 2: Fabricate multi-spindle head with high-precision sealed bearings; Phase 3: Integrate 100W BLDC motor with potentiometer speed knob and OLED RPM display; Phase 4: Connect 100W solar panel with MPPT charging a 12V lithium pack; Phase 5: Field test with rural artisans to verify 3x yarn output.",
        "implementation_details": "• Variable Speed Dial: Potentiometer controls motor RPM smoothly from 200 to 1200 RPM preventing thread snapping.",
        "pitfalls": "1. Thread breakage from motor jerk: Soft-start PWM ramp-up prevents sudden tension spikes on fragile cotton fibers.",
        "database_design": "• OLED Display showing live RPM, battery percentage, and operating hours.",
        "defense": "Interviewer will ask: 'What happens on cloudy days in rural areas?' Answer: 'The system has a hybrid pedal mechanism. When solar battery charge is depleted, artisans can disengage the motor and spin manually via mechanical foot treadle without losing production.'"
    },
    "PF-IND-022": {
        "ps_code": "PF-IND-022",
        "category": "Hardware",
        "title": "Smart Solar-Powered Drying & Compact Vacuum Packaging Automation System",
        "org": "Renewable Energy Precision Machinery Lab",
        "branches": "Mechanical, EEE, AgriTech, Mechatronics",
        "problem_statement": "Rural self-help groups drying spices, fruits, and agarbatti lose 30%+ of produce to moisture damage, insect infestations, and inadequate manual sealing.",
        "stack_rationale": "• Parabolic Solar Air Collector: Generates 55°C warm dry air using solar thermal energy.\n• SHT31 Temp & Humidity Array: Accurate real-time chamber moisture monitoring.\n• ESP32 Controller: Regulates automated air dampers and fan speeds.\n• 12V Diaphragm Vacuum Pump + Thermal Impulse Wire: Compact packaging sealing food at 0.8 bar vacuum.",
        "architecture": "Solar Thermal Parabolic Air Collector -> 12V DC Blowers -> SHT31 Humidity & Temp Array -> ESP32 Damper Controller -> Automated Vacuum Chamber -> Thermal Impulse Sealer",
        "roadmap": "Phase 1: Construct glazed solar air collector generating 55°C dry air flow; Phase 2: Build drying chamber with multi-tier product trays and servo-driven exhaust dampers; Phase 3: Program ESP32 to regulate airflow based on real-time humidity sensors; Phase 4: Fabricate compact vacuum chamber with 12V diaphragm pump; Phase 5: Integrate automated 2.5-second impulse sealing bar.",
        "implementation_details": "• Closed Thermal Loop: Cuts drying time from 36 hours (open sun) to 4.5 hours with zero insect exposure.",
        "pitfalls": "1. Case hardening from excessive heat: Drying temperatures must be modulated below 60°C to prevent surface crusting.",
        "database_design": "• ESP32 EEPROM profiles: Pre-stored drying recipes for spices, herbs, fruits, and agarbatti.",
        "defense": "Interviewer will ask: 'How does this protect product quality compared to open sun drying?' Answer: 'Open drying exposes goods to rain, bird droppings, and uneven UV degradation. Our closed solar collector cuts drying time from 36 hours to 4.5 hours while maintaining hygienic 10% moisture uniformity.'"
    },
    "PF-IND-025": {
        "ps_code": "PF-IND-025",
        "category": "Hardware",
        "title": "AI-Enabled Low-Cost Real-Time Mine Subsidence Monitoring & Early Warning System",
        "org": "Geotechnical Subterranean Hazards & Safety Labs",
        "branches": "Mining, Civil, ECE, EEE, IoT",
        "problem_statement": "Underground coal and mineral mines suffer sudden strata collapse and surface subsidence, endangering villages above the mine void with zero early evacuation warning.",
        "stack_rationale": "• Dual-Axis MEMS Inclinometer: Measures ground tilt down to 0.001-degree angular resolution.\n• Geophone Seismic Sensor: Measures low-frequency ground vibration velocity.\n• STM32 Low-Power MCU + LoRa SX1262 (868MHz): 10km wireless telemetry across rugged mining terrain.\n• Solar Harvester + IP68 Enclosure: Maintenance-free outdoor node.",
        "architecture": "Dual-Axis MEMS Tilt Sensor + Geophone -> STM32 Low-Power MCU -> LoRa SX1262 (868MHz Mesh) -> Surface Pithead Gateway -> Isolation Forest Anomaly Model -> SMS & Siren Warning",
        "roadmap": "Phase 1: Calibrate dual-axis MEMS inclinometer to achieve 0.001-degree angular resolution; Phase 2: Design ultra-low-power STM32 firmware sleeping at 15uA current draw; Phase 3: Configure LoRa point-to-multipoint mesh network spanning 10km across coal fields; Phase 4: Deploy pithead gateway running TinyML vibration isolation; Phase 5: Wire automated siren and cellular SMS alert system.",
        "implementation_details": "• Frequency Filtering: Haul trucks generate >30Hz vibrations with 0° net tilt; true subsidence causes <5Hz seismic waves and permanent angular ground shift.",
        "pitfalls": "1. LoRa packet loss from pit topology: Deploy repeaters on elevated overburden dumps to maintain line of sight.",
        "database_design": "• Gateway SQLite Database logging `{sensor_node_id, pitch_deg, roll_deg, geophone_velocity, battery_v, alert_state}`.",
        "defense": "Interviewer will ask: 'How do you prevent false alarms from heavy mining haul trucks?' Answer: 'Haul trucks generate high-frequency surface vibration (> 30Hz) with zero net angular ground tilt. Strata subsidence generates low-frequency seismic waves (< 5Hz) coupled with permanent angular displacement. Our onboard filter isolates this signature.'"
    },
    "PF-IND-026": {
        "ps_code": "PF-IND-026",
        "category": "Hardware",
        "title": "Mobile Quadruped Robot / Handheld Chemical Sensor Device for Real-Time Narcotics & Explosives Detection",
        "org": "Defense CBRN Sensing & Autonomous Security Systems",
        "branches": "ECE, Robotics, Instrumentation, Chemical, CSE",
        "problem_statement": "Railway stations and transit hubs require continuous screening for concealed explosives (RDX, TNT, PETN) and narcotics. Sniffer dogs fatigue after 30 minutes and static X-ray scanners miss trace chemical vapors.",
        "stack_rationale": "• Heated Metal-Oxide (MOS) Sensor Array: Multi-channel chemical sensor reacting to volatile organic and nitro vapors.\n• Micro-Diaphragm Intake Pump: Continuous 1.5 L/min air volume sampling.\n• Jetson Orin Nano: Edge AI running 1D-CNN chemical fingerprint classification in <1.2 seconds.\n• Unitree Quadruped Robot Chassis: Autonomous patrol across station platforms.",
        "architecture": "Micro-Diaphragm Air Sniffer Pump -> Multi-Channel Metal Oxide Sensor (MOS) Array -> 16-Bit ADC Digitizer -> Jetson Orin Nano (1D-CNN Fingerprint Matcher) -> Quadruped Robot Chassis / AR Screen",
        "roadmap": "Phase 1: Assemble gas sensor chamber with heated metal-oxide and photoionization detectors; Phase 2: Integrate micro-diaphragm intake pump drawing 1.5 L/min air volume; Phase 3: Train 1D-CNN on vapor signatures of RDX, TNT, Ammonium Nitrate, and Opiates; Phase 4: Mount sensor pack on quadruped robot chassis for autonomous platform patrol; Phase 5: Stream telemetry to Railway Protection Force dashboard.",
        "implementation_details": "• Chemometrics: Normalizes baseline resistance ratio `Rs/Ro` across 8 sensor channels to produce invariant chemical fingerprints.",
        "pitfalls": "1. Cross-contamination from perfume/alcohol vapors: Sensor array combines differential response signatures to distinguish ethanol from aromatic nitro explosives.",
        "database_design": "• Secure Flash DB storing encrypted vapor spectral profiles and geo-tagged incident logs.",
        "defense": "Interviewer will ask: 'Why a robotic sniffer instead of trained dogs?' Answer: 'Sniffer dogs suffer from fatigue after 30 minutes, require extensive handler training, and can be distracted. Our robotic electronic nose operates 24/7 without sensory adaptation and logs quantitative chemical ppm levels for legal evidence.'"
    }
}

# Unified 23 Projects Registry
ALL_PROJECTS_DIRECTORY: Dict[str, Dict[str, Any]] = {
    **FLAGSHIP_PROJECTS_DIRECTORY,
    **INDUSTRY_PROJECTS_DIRECTORY
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

    # If page context was passed by frontend:
    if page_context and isinstance(page_context, dict):
        ctx_parts.append("LIVE ON-SCREEN USER CONTEXT (The user is looking at this right now):")
        for k, v in page_context.items():
            if v is not None and v != "":
                ctx_parts.append(f"- {k}: {v}")
        ctx_parts.append("")

    # Concise registry of all other tabs
    ctx_parts.append("ALL WEBSITE TABS & MODULES OVERVIEW (Cite accurately if asked to explain the site):")
    for tab_id, info in TABS_KNOWLEDGE.items():
        ctx_parts.append(f"• [{info['title']}] (id: {tab_id}): {info['purpose']}")

    # 23 Project Architectures Reference
    ctx_parts.append("")
    ctx_parts.append("================================================================================")
    ctx_parts.append("23 PRODUCTION ENGINEERING ARCHITECTURES AVAILABLE (Referenced in catalog above)")
    ctx_parts.append("================================================================================")
    return "\n".join(ctx_parts)


def find_project_blueprint(
    query: str,
    history: Optional[List[Any]] = None,
    page_context: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Finds a matching project blueprint from all 23 projects.
    Checks:
    1. Direct PS codes, project IDs, and exact titles in query.
    2. Domain keywords in query.
    3. Active page_context (e.g. projectTitle, cardContext).
    4. Multi-turn conversation history (last discussed project).
    """
    if not query and not page_context and not history:
        return None

    clean_q = (query or "").strip()
    upper_q = clean_q.upper()
    lower_q = clean_q.lower()

    # 1. Match direct PS codes or IDs in query
    for p_id, proj in ALL_PROJECTS_DIRECTORY.items():
        if p_id.upper() in upper_q or proj["ps_code"].upper() in upper_q:
            return proj

    # 2. Match exact or substring titles in query
    for p_id, proj in ALL_PROJECTS_DIRECTORY.items():
        t_low = proj["title"].lower()
        if t_low in lower_q or lower_q in t_low and len(lower_q) > 8:
            return proj

    # 3. Keyword matching across all 23 projects
    keyword_map = [
        # Flagship 6
        ("distributed asynchronous", "proj-sde-1"),
        ("job queue", "proj-sde-1"),
        ("rate limiter", "proj-sde-1"),
        ("collaborative code", "proj-fullstack-1"),
        ("canvas studio", "proj-fullstack-1"),
        ("crdt", "proj-fullstack-1"),
        ("regulatory document", "proj-ai-1"),
        ("research engine", "proj-ai-1"),
        ("rag", "proj-ai-1"),
        ("financial market data lake", "proj-data-1"),
        ("stream processing", "proj-data-1"),
        ("duckdb", "proj-data-1"),
        ("gitops", "proj-devops-1"),
        ("canary deployment", "proj-devops-1"),
        ("industrial edge sensor", "proj-embedded-1"),
        ("anomaly node", "proj-embedded-1"),
        # Industry Blueprints 17
        ("bitcoin", "PF-IND-146"),
        ("crypto", "PF-IND-146"),
        (".iq", "PF-IND-147"),
        ("radio files", "PF-IND-147"),
        ("network attack", "PF-IND-153"),
        ("forecasting attack", "PF-IND-153"),
        ("drone video", "PF-IND-158"),
        ("3d model generation", "PF-IND-158"),
        ("industrial fires", "PF-IND-162"),
        ("firms", "PF-IND-162"),
        ("satquery", "PF-IND-167"),
        ("satellite", "PF-IND-167"),
        ("dead reckoning", "PF-IND-168"),
        ("gnss-denied", "PF-IND-168"),
        ("agentic ai workbench", "PF-IND-117"),
        ("mrpl", "PF-IND-117"),
        ("fleet coordination", "PF-IND-123"),
        ("bel", "PF-IND-123"),
        ("anpr", "PF-IND-127"),
        ("camera trajectory", "PF-IND-127"),
        ("amr platform", "PF-IND-112"),
        ("warehouse automation", "PF-IND-112"),
        ("exoskeleton", "PF-IND-113"),
        ("human augmentation", "PF-IND-113"),
        ("colorimetric", "PF-IND-118"),
        ("h2s", "PF-IND-118"),
        ("hand-spinning", "PF-IND-020"),
        ("khadi", "PF-IND-020"),
        ("solar-powered drying", "PF-IND-022"),
        ("mine subsidence", "PF-IND-025"),
        ("narcotics", "PF-IND-026"),
        ("explosives", "PF-IND-026")
    ]

    for kw, target_id in keyword_map:
        if kw in lower_q and target_id in ALL_PROJECTS_DIRECTORY:
            return ALL_PROJECTS_DIRECTORY[target_id]

    # 4. Check page_context if passed
    if page_context and isinstance(page_context, dict):
        proj_hint = page_context.get("projectTitle") or page_context.get("cardContext") or ""
        if proj_hint:
            hint_low = proj_hint.lower()
            for p_id, proj in ALL_PROJECTS_DIRECTORY.items():
                if proj["title"].lower() in hint_low or proj["ps_code"].lower() in hint_low:
                    return proj

    # 5. Check multi-turn conversation history for continuity (e.g. follow-up questions)
    if history:
        for msg in reversed(history[-6:]):
            text = getattr(msg, "content", "") or (msg.get("content") if isinstance(msg, dict) else "")
            text_low = text.lower()
            for p_id, proj in ALL_PROJECTS_DIRECTORY.items():
                if proj["title"].lower() in text_low or proj["ps_code"].lower() in text_low:
                    return proj

    return None


def generate_project_guide(
    proj: Dict[str, Any],
    query: str = "",
    history: Optional[List[Any]] = None
) -> str:
    """
    Generates a comprehensive, highly energetic A-to-Z architectural breakdown
    for the chosen project blueprint.
    Handles follow-up queries (database design, specific steps, pitfalls, defense)
    and adapts naturally to Telugu / Tenglish.
    """
    title = proj.get("title", "Project Blueprint")
    ps_code = proj.get("ps_code", "PROJ-01")
    cat = proj.get("category", "Software")
    branches = proj.get("branches", "Engineering")
    arch = proj.get("architecture", "Pipeline architecture")
    roadmap = proj.get("roadmap", "Phase-based implementation")
    defense = proj.get("defense", "Explain design trade-offs and edge failure handling.")
    prob = proj.get("problem_statement", f"Building a production-ready {title} system solving industry engineering bottlenecks.")
    stack_rat = proj.get("stack_rationale", f"Core technologies: {proj.get('stack', 'Full Stack')}")
    impl = proj.get("implementation_details", "Modular architecture with clean separation of concerns.")
    pitfalls = proj.get("pitfalls", "Avoid race conditions, unhandled errors, and memory leaks.")
    db_design = proj.get("database_design", "Relational persistence with indexed primary keys and caching.")

    q_low = query.lower() if query else ""

    # Check for Telugu / Tenglish intent
    is_telugu = any(
        kw in q_low
        for kw in ["ela", "cheyyali", "cheppu", "bro", "enti", "naku", "mana", "kuda", "ikkada", "chudu", "em cheyyali"]
    ) or any("\u0c00" <= c <= "\u0c7f" for c in query)

    # -------------------------------------------------------------
    # CASE 1: Specific Follow-up on Database Design
    # -------------------------------------------------------------
    if any(k in q_low for k in ("database", "schema", "table", "sql", "db design", "postgres", "sqlite", "redis keys")):
        if is_telugu:
            return f"""💾 **Database & Storage Architecture for `{title}` ({ps_code})**

Namaste bro! Ee project lo data persistence and caching design chala critical. Kindha complete schema and storage architecture detail ga undi:

### 1. Database Schema & Tables
{db_design}

### 2. High-Performance Indexing Strategy
- Primary lookup queries meedha composite indices veyali, for example `(status, created_at DESC)`.
- Foreign key relations meedha CASCADE delete locks undali.

### 3. Caching & Message Queue Patterns
- Hot data / active sessions ni In-Memory Redis lo petali (TTL 60 seconds).
- Heavy read queries ni database hit cheyyakunda Redis cache nunchi serve cheyali.

*Next database migration script leda SQLAlchemy/asyncpg code kavala bro? Ventane adugu! 🚀*"""
        else:
            return f"""💾 **Database & Storage Architecture for '{title}' ({ps_code})**

Here is the production-grade database schema, storage topology, and caching strategy engineered specifically for this architecture:

### 1. 🗄️ Relational & Vector Schemas
{db_design}

### 2. ⚡ High-Throughput Indexing & Concurrency Strategy
- **Composite Indexing**: High-frequency filter columns are explicitly indexed (e.g. status and timestamp) to guarantee sub-5ms query times under high table volume.
- **Connection Pooling**: Use asynchronous connection pooling (e.g. `asyncpg.create_pool(min_size=5, max_size=20)`) to prevent database connection exhaustion during traffic bursts.
- **Transaction Isolation**: Apply row-level locks or optimistic locking (`SELECT FOR UPDATE SKIP LOCKED`) to eliminate race conditions between concurrent worker threads.

### 3. 🛡️ Data Integrity & Failure Recovery
- WAL (Write-Ahead Logging) mode enabled to guarantee zero data loss during unexpected crashes.
- Periodic checkpoint compaction to keep disk footprints minimal.

*Need the exact SQL migration DDL or async repository code for this schema? Just ask! 🚀*"""

    # -------------------------------------------------------------
    # CASE 2: Specific Follow-up on Common Pitfalls
    # -------------------------------------------------------------
    if any(k in q_low for k in ("pitfall", "mistake", "error", "problem", "trap", "avoid")):
        return f"""⚠️ **Common Engineering Pitfalls & How to Avoid Them for '{title}'**

When building and defending this architecture, avoid these critical mistakes:

{pitfalls}

### 💡 Pro Senior Advice:
1. Always write unit tests for edge failure modes before building the frontend.
2. Add structured logging with request correlation IDs to trace errors across microservice boundaries.
3. Keep mock test scripts ready to demonstrate how the system gracefully survives network drops or invalid inputs!"""

    # -------------------------------------------------------------
    # CASE 3: Full Comprehensive A-to-Z Build Blueprint
    # -------------------------------------------------------------
    intro = ""
    if is_telugu:
        intro = (
            f"🔥 **Namaste bro! Super choice!** Ee project `{title}` ({ps_code}) chala high-impact production architecture!\n"
            f"Idhi portfolio lo leda technical interview lo explain chesthe recruiters and judges ki solid impression ivvadam guarantee. "
            f"First to last complete ga ela build cheyyalo, system pipeline, hardware/software stack, "
            f"6-phase build order inka technical defense tips motham A-to-Z detail ga kindha ichanu chudu:\n\n"
        )
    else:
        intro = (
            f"🚀 **Outstanding choice!** Project **'{title}'** ({ps_code}) is a premier {cat} engineering architecture blueprint. "
            f"Here is your complete A-to-Z production blueprint engineered for portfolio excellence "
            f"and technical interview viva defense:\n\n"
        )

    roadmap_parts = [r.strip() for r in roadmap.split(";") if r.strip()]
    formatted_roadmap = ""
    for i, phase in enumerate(roadmap_parts, 1):
        formatted_roadmap += f"- **{phase}**\n"

    guide = f"""{intro}### 1. 📋 Problem Understanding & Scope
- **What It Solves**: {prob}
- **Domain & Track**: {cat} Systems
- **Recommended Branches**: `{branches}`
- **Difficulty Level**: Production Enterprise Grade

---

### 2. 🛠️ Recommended Tech Stack with Rationale
{stack_rat}

---

### 3. 🏗️ End-to-End System Architecture Pipeline
```text
{arch}
```

---

### 4. 🗺️ Chronological Build Order (Step 1 to Last Step)
{formatted_roadmap}

---

### 5. ⚙️ Key Implementation Details & Core Libraries
{impl}

---

### 6. ⚠️ Common Pitfalls & Mistakes to Avoid
{pitfalls}

---

### 7. 🛡️ Technical Viva & System Architecture Defense
> **Key Technical Inquiry**:
> {defense}

---

### 8. 🚀 Next Immediate Action to Start
1. Create a dedicated workspace directory for `{ps_code.lower()}`.
2. Initialize repository and install core dependencies.
3. Build and verify the ingestion/sensor module first before touching the UI.

{"*Inka database schema kavala leda specific code module kavali ante adugu bro, ventane build chedhdham! 🚀*" if is_telugu else "*Ask me anytime if you want the database schema, code templates, or circuit pinouts for any module! Let's build it! 🚀*"}"""

    return guide
