/**
 * Pathfinder 2.0 - Client-Side Site Knowledge Registry
 * Provides tab metadata, widget guides, and helper functions to package
 * live on-screen context when the user clicks 'Ask Coach about this'.
 */

export interface TabKnowledge {
  id: string;
  title: string;
  purpose: string;
  widgets: string[];
  dataSource: string;
  howToUse: string;
  limitations: string;
}

export const SITE_KNOWLEDGE: Record<string, TabKnowledge> = {
  overview: {
    id: "overview",
    title: "Dashboard / Platform Overview",
    purpose: "Central command center displaying high-level placement readiness probability, vector gauges, and immediate diagnostic feedback.",
    widgets: [
      "Hero Metrics: Live Placement Readiness Probability Gauge (0-100%), Readiness Tier Badge, and Quick Stats.",
      "Vector Breakdown: Academic index (CGPA), Coding/DSA proficiency, Communication confidence, Practical internship experience, and Backlog eligibility penalty.",
      "Next Immediate Actions Widget: High-impact milestones to boost probability within 7-14 days.",
      "What-If Scenario Simulator: Interactive sandbox to preview how raising CGPA, coding, or adding an internship affects probability."
    ],
    dataSource: "Real-time inference from RandomForestClassifier trained on 972 records. Input values come from the user's active Student Profile.",
    howToUse: "Review your overall readiness gauge. Click 'What-If Simulator' or 'Readiness Command' to see which exact skill lever provides the highest score delta.",
    limitations: "The percentage score is a statistical probability estimation based on historical placement distributions, not a contractual employment guarantee."
  },
  action: {
    id: "action",
    title: "Readiness Command / AI Action Centre",
    purpose: "Prescriptive tactical hub that translates assessment gaps into concrete, prioritized daily tasks and milestone checklists.",
    widgets: [
      "Readiness Diagnostic Matrix: Visual gap analysis across Academics, DSA, Projects, and Communication.",
      "Action Card Deck: Prioritized interventions categorized by High/Medium Impact (e.g., Blind 75 LeetCode sprints, STAR interview stories, Resume keyword alignment).",
      "What-If Simulator: Fine-grained slider experiment to calculate expected ROI on time investments."
    ],
    dataSource: "Generated dynamically by evaluating the candidate's profile against the verified benchmark cutoffs of top-tier hiring companies.",
    howToUse: "Focus on the top 2 'High Impact' actions first. Complete the recommended tasks to systematically eliminate eligibility barriers.",
    limitations: "Recommendations prioritize general campus drive criteria and should be tailored if targeting niche research or specialized domains."
  },
  skills: {
    id: "skills",
    title: "6-Week Roadmap & Skill Intelligence",
    purpose: "A sprint-based, structured curriculum guiding the student through DSA, System Design, Core CS, Mock Coding, and Resume Optimization.",
    widgets: [
      "6-Week Timeline: Week-by-week interactive checklist with actionable deliverables.",
      "Skill Gap Radar / Vector Matrix: Visualizes student ratings against required industry standards.",
      "Skill Intelligence Explorer: Deep-dive into technical topics (Arrays, Trees, Dynamic Programming, OS, DBMS, Networks) with recommended resources."
    ],
    dataSource: "Curated technical hiring rubrics from top tech recruiters combined with AI-generated personalized sprint adjustments.",
    howToUse: "Follow one week at a time. Mark actions as completed as you finish coding problems, project modules, or core CS revisions.",
    limitations: "Pacing can be accelerated or extended based on the student's graduation semester and current backlog status."
  },
  coach: {
    id: "coach",
    title: "AI Career Coach Console",
    purpose: "Interactive real-time mentor powered by Google Gemini, capable of conducting mock interviews, explaining code architecture, dissecting platform charts, and chatting warmly in English, Telugu, or Roman Telugu.",
    widgets: [
      "Chat Thread: Multi-turn conversational interface with markdown formatting, code blocks, and syntax highlighting.",
      "Quick Action Chips: Pre-populated prompts ('Start Mock Interview', 'Find My Skill Gaps', 'Review My Resume', 'Suggest Flagship Project', 'Placement Preparation Plan').",
      "Controls: Stop Generation, Regenerate, Clear Chat, and Server Wake-up notification indicator."
    ],
    dataSource: "Direct live inference from Google Gemini models with full site knowledge injection, candidate profile grounding, and verified platform statistics.",
    howToUse: "Ask anything! Whether you want technical system design explanations, mock behavioral questions, emotional encouragement, or explanations of specific charts on the website.",
    limitations: "The AI mentor provides guidance and educational mentorship; it does not grade official university coursework or guarantee job placement."
  },
  projects: {
    id: "projects",
    title: "Project Blueprints & Architecture Recommender",
    purpose: "Curated collection of industry-grade, resume-worthy software projects designed to demonstrate production engineering skills.",
    widgets: [
      "Project Cards: Domain filtering (Full-Stack, Cloud/DevOps, AI/ML, Distributed Systems).",
      "Blueprint Modal: Complete system architecture diagram, tech stack recommendations, database schemas, step-by-step build order, and interview defense talking points.",
      "'Discuss Architecture with AI Coach' Button: Hands off the project context directly to the coach for custom technical discussion."
    ],
    dataSource: "data/projects.json containing verified engineering specifications used by successful alumni hires.",
    howToUse: "Select a flagship project aligned with your target role. Read the architecture pattern, implement the suggested stack, and deploy with a live demo URL.",
    limitations: "Students should write original code and understand the implementation deeply rather than cloning boilerplate templates."
  },
  analytics: {
    id: "analytics",
    title: "Cohort Analytics & Placement Benchmarks",
    purpose: "Empirical historical analytics dashboard analyzing placement rates, salary packages, and academic correlations across 9 engineering departments.",
    widgets: [
      "Department Filter & Year Selector (2024, 2025, 2026).",
      "Placement Distribution Charts: Placed vs Unplaced ratios per branch.",
      "Salary Package Rankings: Highest and average LPA across departments (CSM/AIML highest at 44.6 LPA, CSE at 44.0 LPA).",
      "CGPA vs Placement Correlation Scatter: Demonstrates that CGPA >= 7.5 combined with practical internships maximizes clearance probability."
    ],
    dataSource: "Verified database of 972 historical student placement records (sample-placement-2024-2026.csv and data/placement_records.json).",
    howToUse: "Compare your branch and CGPA bracket to historical placement cohorts to set realistic package targets and identify benchmark percentiles.",
    limitations: "Historical cohort trends provide statistical baselines; macroeconomic hiring shifts between academic years may influence drive volumes."
  },
  resume: {
    id: "resume",
    title: "ATS Resume Studio",
    purpose: "AI-powered resume evaluation engine that parses candidate CVs, scores them against ATS criteria, and provides line-by-line optimization tips.",
    widgets: [
      "PDF Upload & Text Paste Area.",
      "ATS Score Meter (0-100) with Strengths & Weaknesses breakdown.",
      "Keyword Gap Matcher: Identifies high-frequency industry keywords missing from the resume.",
      "Formatting & Layout Diagnostic: Highlights formatting traps (tables, graphics, unselectable fonts) that fail automated scanners."
    ],
    dataSource: "Gemini structured JSON analysis and regex keyword matching against verified job descriptions for software engineering roles.",
    howToUse: "Upload your resume in PDF format. Review the keyword gaps and formatting tips. Update your bullet points with measurable impact metrics.",
    limitations: "ATS scoring evaluates keyword and formatting hygiene; human interviewers will evaluate technical depth and personal communication during rounds."
  },
  branches: {
    id: "branches",
    title: "Branches & Courses Intelligence",
    purpose: "Department-specific curriculum guides and placement statistics across CSE, IT, ECE, EEE, MECH, CIVIL, AIML, CSD, and CSM.",
    widgets: [
      "Department Overview Cards with Student Counts and Placement Ratios.",
      "Core Subjects Checklist (OS, DBMS, Networks, Microprocessors, CAD, Power Systems).",
      "Top Tech Hiring Recruiters by Branch."
    ],
    dataSource: "Derived from data/branches.json and verified cohort placement records.",
    howToUse: "Find your department to discover core academic subjects most frequently tested during campus technical rounds.",
    limitations: "Non-circuital branches (MECH, CIVIL) should focus on core departmental opportunities or follow the IT transition roadmap if targeting software roles."
  },
  defense: {
    id: "defense",
    title: "Project Defense Console",
    purpose: "Interactive technical viva and interview simulator designed to test how well a candidate can defend their project code and architecture.",
    widgets: [
      "Tough Interview Question Prompts (e.g. 'Why Redis over RabbitMQ?', 'How do you handle race conditions?', 'What happens if your database dies?').",
      "Architectural Defense Rubric: Tips on explaining trade-offs, bottlenecks, scalability, and security measures.",
      "'Practice Defending with Coach' Button: Pre-populates the chosen technical defense question into the AI chat."
    ],
    dataSource: "Real questions asked by hiring managers and tech leads during Tier-1 product company interviews.",
    howToUse: "Click through the defense questions for your project stack. Practice articulating trade-offs aloud, then verify your explanation with the AI Coach.",
    limitations: "Simulations focus on common architectural trade-offs; interviewers may ask deeper proprietary questions about your specific code."
  },
  roles: {
    id: "roles",
    title: "Role Intelligence & Target Pathways",
    purpose: "Comprehensive roadmap and requirement breakdown for top hiring profiles (SDE, Frontend, Backend, Data Engineer, Cloud/DevOps, AI/ML).",
    widgets: [
      "Role Cards with Market Demand Ratings and Average Package Ranges.",
      "Must-Have vs Good-to-Have Skill Trees.",
      "Interview Round Breakdown (Online Assessment -> Technical Round 1 -> Technical Round 2 -> HR/Managerial)."
    ],
    dataSource: "data/roles.json and current job market competencies.",
    howToUse: "Select your target role. Verify that your skills and projects align with the 'Must-Have' criteria before applying to campus drives.",
    limitations: "Company expectations vary; Tier-1 product firms emphasize DSA and system design, while service firms may emphasize aptitude and domain basics."
  },
  missions: {
    id: "missions",
    title: "Career Mission Tracker",
    purpose: "Gamified milestone progression system turning the semester into manageable, rewarded objectives.",
    widgets: [
      "Mission Badges (e.g., 'LeetCode 50 Century', 'Flagship Deployer', 'Resume ATS 80+', 'Mock Master').",
      "Progress Trackers: Real-time status reflecting student checklist completions."
    ],
    dataSource: "Persistent user profile state in SQLite.",
    howToUse: "Complete weekly missions to build consistency and confidence leading up to the campus recruitment season.",
    limitations: "Badges track personal preparation discipline and effort; they serve as internal motivational milestones."
  },
  profile: {
    id: "profile",
    title: "Profile & Settings (Single Source of Truth)",
    purpose: "Candidate identity management and academic record editor (CGPA, backlogs, internships, coding, communication, target role).",
    widgets: [
      "Profile Edit Form with instant validation.",
      "Snapshot History: Timestamped log of previous probability calculations.",
      "CSV Export: Download historical assessment snapshots.",
      "Reset / Demo Mode: Load realistic sample profiles or reset local draft."
    ],
    dataSource: "Persistent SQLite database (`data/pathfinder_production.db`) linked to authenticated JWT or browser session ID.",
    howToUse: "Keep your CGPA, backlogs, and completed internships up to date. Every change dynamically recalculates your placement readiness probability across the platform.",
    limitations: "Data entered by the user is used for assessment modeling; accuracy of predictions depends on honest input values."
  }
};

export const getTabKnowledge = (tabId: string): TabKnowledge | undefined => {
  return SITE_KNOWLEDGE[tabId.toLowerCase()];
};
