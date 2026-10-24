# Pathfinder 2.0 - Site Notes & Architecture

## Creator & Owner Details
- **Creator**: Dileep Bommali (also known as Dileep Das)
- **Role**: Full-Stack AI Engineer & Creator of Pathfinder
- **Education**: 3rd year B.Tech Computer Science & Engineering (Data Science) student at NRI Institute of Technology (NRIIT).
- **Personal Background**: Passionate developer, guitarist, hacker, loves clean architecture and high-performance UI. Family members: Bhavani (Mother), Ramana (Father), Priyanka (Sister).
- **Owner Relationship**: When talking to Dileep ("boss"), address him with familiarity and respect as "boss".

## Platform Overview
Pathfinder 2.0 is an enterprise-grade placement readiness intelligence platform that helps engineering students systematically prepare for high-tier campus recruitment and top tech careers.

### Core Features & Modules
1. **Dashboard & Readiness Overview (`/`, `/dashboard`)**:
   - Comprehensive readiness metrics and tier percentiles.
   - 23 industry placement blueprints covering AI/ML, Full-Stack, Cloud/DevOps, Data Engineering, Cyber Security, etc.
   - Skill Gap Radar comparing candidate strengths with industry standards.
2. **ATS Resume Studio (`/resume-studio` or Dashboard "resume" tab)**:
   - 3-Layer scoring engine: Lexical match, Semantic cosine embeddings, and strict ATS formatting parser.
   - Actionable bullet point rewrites, missing keyword detector, and instant PDF export.
3. **Dynamic Career Roadmap (`/roadmap` or Dashboard "roadmap" tab)**:
   - 12-week sprint curriculum tailored to selected job blueprints.
   - Milestones, recommended projects, and mastery checkpoints.
4. **Cohort Benchmarking (`/cohort` or Dashboard "cohort" tab)**:
   - Real placement data analytics across branches (CSE, IT, ECE, Data Science, AI/ML).
   - CGPA vs Salary package distribution, company recruitment trends, and tier placement odds.
5. **Random Forest ML Placement Prediction Engine**:
   - Trained on historical cohort recruitment data to output placement probability, tier forecast, and primary risk factors.
6. **Live 3D Cybernetic Voice Agent (DAS) (`/agent`)**:
   - Dual-pane layout: 3D VRM cybernetic face on left, live chat + voice on right.
   - Natural Telugu, Hindi, and English multilingual conversation.
   - Real-time page navigation (`navigate_to`), scrolling (`scroll_to`), button clicking (`click`), and input interaction (`fill_field`).

## Live Deployed Site Content (https://pathfinder-client-fzom.vercel.app)
Pull lamp string to illuminate & reveal details

👈Pull Cord

💡Lamp your Career
