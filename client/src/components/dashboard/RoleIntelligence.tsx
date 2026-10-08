import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Layers,
  Code2,
  BookOpen,
  Briefcase,
  Mic,
  FileText,
  Target,
  Check
} from "lucide-react";
import { StudentProfileState } from "./ProfileEvaluator";

interface RoleIntelligenceProps {
  currentProfile: StudentProfileState;
  onUpdateTargetRole: (newRole: string) => void;
  onNavigateTab: (tabId: any) => void;
  onAskCoach?: (query: string) => void;
  apiBase?: string;
}

interface RoleBlueprint {
  id: string;
  title: string;
  tier: string;
  alignment?: number;
  requiredSkills: string[];
  existingSkills: string[];
  missingSkills: string[];
  recommendedProject: {
    title: string;
    tech: string[];
    whyItMatters: string;
  };
  interviewTopics: string[];
  resumeFocus: string;
  pathStages: Array<{ step: string; detail: string }>;
}

const ROLES_DATA: RoleBlueprint[] = [
  {
    id: "sde",
    title: "Software Development Engineer (SDE)",
    tier: "Tier-1 Product",
    alignment: 82,
    requiredSkills: ["Data Structures & Algorithms", "System Design", "Java / C++ / Python", "DBMS / SQL", "Operating Systems", "REST APIs"],
    existingSkills: ["Python", "Basic Algorithms", "Coursework CS Fundamentals"],
    missingSkills: ["High-Frequency Blind 75 LeetCode Patterns", "Distributed System Design", "ACID Transaction Locks"],
    recommendedProject: {
      title: "Distributed Asynchronous Job Queue & Rate Limiter",
      tech: ["Python", "FastAPI", "Redis Streams", "Docker"],
      whyItMatters: "Proves you understand concurrency, token-bucket rate limiting, and failure recovery."
    },
    interviewTopics: ["Two Pointers & Sliding Window", "Binary Trees & Graph Traversals", "Indexing & Query Optimization", "Multithreading & Concurrency"],
    resumeFocus: "Emphasize low latency, algorithm time/space complexities, and quantifiable throughput metrics (Google X-Y-Z formula).",
    pathStages: [
      { step: "1. Core DSA", detail: "Arrays, Two-Pointers, Sliding Window, Monotonic Stacks (15 days)" },
      { step: "2. Flagship Backend", detail: "Build and deploy async task queue with Redis & Docker (12 days)" },
      { step: "3. System Design", detail: "Caching strategies, database partitioning, RESTful contracts (8 days)" },
      { step: "4. Interview Practice", detail: "Timed LeetCode medium rounds + STAR project defense (7 days)" }
    ]
  },
  {
    id: "fullstack",
    title: "Full Stack Developer",
    tier: "Enterprise High-Scale",
    alignment: 78,
    requiredSkills: ["React / Next.js", "TypeScript", "Node.js / FastAPI", "PostgreSQL", "TailwindCSS", "State Management", "CI/CD"],
    existingSkills: ["React basics", "HTML/CSS", "Python API consumption"],
    missingSkills: ["TypeScript strict mode", "Production CI/CD pipelines", "WebSocket real-time synchronization"],
    recommendedProject: {
      title: "Real-Time Collaborative Code & Canvas Studio",
      tech: ["React", "TypeScript", "Node.js", "WebSockets", "WebRTC"],
      whyItMatters: "Demonstrates full-stack proficiency, state reconciliation, and responsive browser UI architecture."
    },
    interviewTopics: ["React component lifecycle & re-render optimization", "CORS & JWT authentication flow", "Database schema normalization", "SSR vs CSR trade-offs"],
    resumeFocus: "Highlight clean UI design systems, responsive accessibility, and verified GitHub live deployment URLs.",
    pathStages: [
      { step: "1. Modern Frontend", detail: "React 19, TypeScript strict typing, and Tailwind styling (10 days)" },
      { step: "2. Backend & Auth", detail: "FastAPI / Node with JWT auth and Postgres migrations (12 days)" },
      { step: "3. Real-Time Sync", detail: "WebSockets and optimistic UI state updates (8 days)" },
      { step: "4. Deployment & Lighthouse", detail: "Deploy to Vercel/Render with 95+ Lighthouse score (5 days)" }
    ]
  },
  {
    id: "ai-engineer",
    title: "AI Engineer",
    tier: "AI Startup / Growth",
    alignment: 84,
    requiredSkills: ["Python", "LLM Orchestration (LangChain / GenAI)", "Vector Databases (Pinecone / Chroma)", "FastAPI", "Prompt Engineering", "RAG Architecture"],
    existingSkills: ["Python syntax", "Gemini API integration", "Basic data manipulation"],
    missingSkills: ["Hybrid Vector Retrieval (BM25 + Semantic Search)", "Agentic Multi-Step Tool Calling", "Evaluation benchmarks"],
    recommendedProject: {
      title: "Multi-Agent Regulatory Document Research Engine (RAG)",
      tech: ["Python", "Google GenAI", "FastAPI", "Qdrant / ChromaDB", "Streamlit / React"],
      whyItMatters: "Proves enterprise RAG retrieval precision, chunking strategies, and hallucination guardrails."
    },
    interviewTopics: ["Vector embeddings & cosine similarity", "Chunking strategies & re-ranking", "Evaluation metrics (Faithfulness, Answer Relevance)", "Latency & token cost optimization"],
    resumeFocus: "Quantify context retrieval precision, hallucination reduction %, and token cost savings.",
    pathStages: [
      { step: "1. Advanced Python & SDKs", detail: "Async programming, Pydantic data schemas, Google GenAI SDK (7 days)" },
      { step: "2. Vector & RAG Pipeline", detail: "Document ingestion, recursive chunking, and similarity search (14 days)" },
      { step: "3. Agent Tool Use", detail: "Implement function calling, search grounding, and error recovery (10 days)" },
      { step: "4. Deployment & Defense", detail: "Package with Docker, deploy to cloud, prepare defense questions (7 days)" }
    ]
  },
  {
    id: "ml-engineer",
    title: "Machine Learning Engineer",
    tier: "Tier-1 Product",
    alignment: 74,
    requiredSkills: ["Python", "Scikit-Learn", "PyTorch / TensorFlow", "Pandas & NumPy", "Model Evaluation & Tuning", "MLOps & Docker"],
    existingSkills: ["NumPy basics", "RandomForest baseline", "Basic Pandas cleaning"],
    missingSkills: ["Feature engineering & cross-validation", "Model drift monitoring", "FastAPI inference serving with Docker"],
    recommendedProject: {
      title: "End-to-End Placement Intelligence & Attrition Predictor",
      tech: ["Python", "Scikit-Learn", "FastAPI", "Docker", "Pandas"],
      whyItMatters: "Covers data leakage prevention, hyperparameter tuning, model explainability (SHAP), and containerized serving."
    },
    interviewTopics: ["Bias-Variance trade-off", "Precision vs Recall vs F1-score", "Regularization (L1/L2)", "Ensemble methods (Random Forest vs XGBoost)"],
    resumeFocus: "Feature engineering choices, cross-validated accuracy gains, and production inference latency.",
    pathStages: [
      { step: "1. Math & Statistics", detail: "Linear algebra, matrix calculus, and probability distributions (10 days)" },
      { step: "2. Classical ML Mastery", detail: "Supervised and unsupervised models in Scikit-Learn (14 days)" },
      { step: "3. Model Serving", detail: "Wrap trained pickle in FastAPI endpoint with Docker (8 days)" },
      { step: "4. MLOps Basics", detail: "Model versioning and input schema validation (6 days)" }
    ]
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    tier: "Enterprise High-Scale",
    alignment: 72,
    requiredSkills: ["SQL (Advanced)", "Python / R", "Exploratory Data Analysis (EDA)", "Statistical Testing (A/B Tests)", "Machine Learning", "Tableau / BI"],
    existingSkills: ["Python", "Descriptive statistics", "Basic SQL"],
    missingSkills: ["Window functions (LEAD/LAG, Partition By)", "A/B hypothesis testing (P-values, Z-tests)", "Executive business dashboarding"],
    recommendedProject: {
      title: "Cohort Retention & Predictive Customer Lifetime Value Engine",
      tech: ["Python", "Pandas", "PostgreSQL", "Statsmodels", "Seaborn"],
      whyItMatters: "Shows commercial understanding, cohort attrition analysis, and statistical significance testing."
    },
    interviewTopics: ["Hypothesis testing & confidence intervals", "Advanced SQL CTEs and Window Functions", "Handling imbalanced datasets (SMOTE)", "Translating business problems to ML objectives"],
    resumeFocus: "Emphasize business ROI, churn reduction percentage, and executive communication.",
    pathStages: [
      { step: "1. Advanced SQL", detail: "Complex joins, subqueries, CTEs, and window functions (10 days)" },
      { step: "2. Applied Statistics", detail: "A/B testing, hypothesis formulation, power analysis (10 days)" },
      { step: "3. Predictive Modeling", detail: "Classification, regression, and survival analysis in Python (12 days)" },
      { step: "4. Business Storytelling", detail: "Executive summary decks and data presentation (6 days)" }
    ]
  },
  {
    id: "data-engineer",
    title: "Data Engineer",
    tier: "Enterprise High-Scale",
    alignment: 66,
    requiredSkills: ["SQL (Expert)", "Python", "Apache Spark / PySpark", "Airflow / Prefect", "Data Warehousing (BigQuery / Snowflake)", "Kafka"],
    existingSkills: ["Python", "Basic SQL queries"],
    missingSkills: ["Distributed batch processing (Spark)", "DAG orchestration (Airflow)", "Data modeling (Star/Snowflake schema)"],
    recommendedProject: {
      title: "Automated Medallion Architecture Data Pipeline (ETL)",
      tech: ["Python", "DuckDB / Spark", "PostgreSQL", "Airflow", "Docker"],
      whyItMatters: "Proves raw-to-curated data transformations, idempotency, data quality checks, and scheduled runs."
    },
    interviewTopics: ["OLAP vs OLTP database architecture", "Partitioning & clustering strategies", "Idempotent pipeline design", "Handling late-arriving data in streaming"],
    resumeFocus: "Pipeline throughput (records/sec), query optimization speedups, and data quality guarantees.",
    pathStages: [
      { step: "1. SQL & Data Modeling", detail: "Dimensional modeling, slowly changing dimensions (SCD), indexing (10 days)" },
      { step: "2. ETL Engineering", detail: "Python ETL scripts with automated schema validation (10 days)" },
      { step: "3. Orchestration & Cloud", detail: "Airflow DAG scheduling and data warehouse integration (12 days)" },
      { step: "4. Distributed Systems", detail: "PySpark transformations on large datasets (8 days)" }
    ]
  },
  {
    id: "devops",
    title: "DevOps & Cloud Engineer",
    tier: "Enterprise High-Scale",
    alignment: 64,
    requiredSkills: ["Linux / Bash", "Docker & Containers", "Kubernetes", "CI/CD (GitHub Actions)", "Cloud (AWS / GCP)", "Terraform (IaC)"],
    existingSkills: ["Linux commands", "Basic Git"],
    missingSkills: ["Multi-stage Dockerfile optimization", "Kubernetes deployments & services", "Automated GitHub Actions CI/CD matrix"],
    recommendedProject: {
      title: "GitOps Automated Microservices Deployment & Monitoring",
      tech: ["Docker", "Kubernetes (k3s)", "GitHub Actions", "Prometheus", "Grafana"],
      whyItMatters: "Proves zero-downtime rolling updates, automated pull request testing, and cluster telemetry."
    },
    interviewTopics: ["Container networking and volume mounts", "Kubernetes pods, services, ingress, and replicas", "Zero-downtime blue/green deployment strategy", "Security hardening & secret management in CI"],
    resumeFocus: "Deployment frequency, test automation time reductions, and cloud infrastructure cost savings.",
    pathStages: [
      { step: "1. Linux & Scripting", detail: "Bash automation, networking commands, permissions (8 days)" },
      { step: "2. Docker & Containerization", detail: "Multi-stage builds, non-root users, image optimization (10 days)" },
      { step: "3. CI/CD Automation", detail: "GitHub Actions workflows for automated build, test, and lint (10 days)" },
      { step: "4. Cloud & Kubernetes", detail: "Deploy services to AWS/GCP with health checks and ingress (12 days)" }
    ]
  }
];

export const RoleIntelligence: React.FC<RoleIntelligenceProps> = ({
  currentProfile,
  onUpdateTargetRole,
  onNavigateTab,
  onAskCoach,
  apiBase,
}) => {
  const [roles, setRoles] = useState<RoleBlueprint[]>(ROLES_DATA);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("sde");

  useEffect(() => {
    if (!apiBase) return;
    let isMounted = true;
    fetch(`${apiBase}/api/data/roles`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data) && data.length > 0) {
          setRoles(data);
        }
      })
      .catch((err) => console.warn("Roles API fetch warning:", err));
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const activeRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleSelectRole = (role: RoleBlueprint) => {
    setSelectedRoleId(role.id);
    onUpdateTargetRole(role.title);
  };

  const isCurrentTarget = currentProfile.targetRole.toLowerCase().includes(activeRole.title.toLowerCase().split(" ")[0]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  Target Role Intelligence Matrix
                </h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Career Path Simulator
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Deep-dive into specific tech roles. Compare your profile, identify required skills, and explore tailored project blueprints.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Current Target:</span>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              {currentProfile.targetRole}
            </span>
          </div>
        </div>

        {/* Role Selector Chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {roles.map(r => {
            const isSelected = r.id === selectedRoleId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-200 shadow-md ring-1 ring-cyan-500/30"
                    : "border border-white/[0.08] bg-slate-950/40 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span>{r.title}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                  (r.alignment ?? 0) >= 80 ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/20 text-cyan-300"
                }`}>
                  {r.alignment ?? 0}% Match
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Role Detailed Intelligence */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Skills & Gaps Breakdown */}
        <div className="space-y-6 lg:col-span-2">
          {/* Role Alignment Summary Card */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
              <div>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  {activeRole.tier}
                </span>
                <h3 className="mt-1.5 text-lg font-bold text-white">{activeRole.title}</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Candidate Alignment</span>
                  <span className="text-2xl font-black text-emerald-400">{activeRole.alignment}%</span>
                </div>

                {!isCurrentTarget ? (
                  <button
                    type="button"
                    onClick={() => handleSelectRole(activeRole)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="h-4 w-4" />
                    <span>Set as My Target Role</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Active Target Role</span>
                  </span>
                )}
              </div>
            </div>

            {/* Skills Comparison Matrix */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {/* Existing Skills */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Your Existing Foundations</h4>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeRole.existingSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">High-Priority Skill Gaps</h4>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeRole.missingSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Career Path Simulator: Progressive Stages */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Career Path Simulator: 4-Stage Progressive Execution
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {activeRole.pathStages.map((stage, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-slate-950/60 p-3">
                    <span className="text-xs font-bold text-cyan-300 block">{stage.step}</span>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{stage.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Flagship Project Anchor */}
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-tr from-slate-900/60 via-slate-950/80 to-cyan-950/30 p-6 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Recommended Flagship Project for this Role</h4>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("projects")}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View Full Blueprints →
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4">
              <h5 className="text-sm font-bold text-white">{activeRole.recommendedProject.title}</h5>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {activeRole.recommendedProject.whyItMatters}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Tech Stack:</span>
                {activeRole.recommendedProject.tech.map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Interview & Resume Directives */}
        <div className="space-y-6">
          {/* Key Interview Topics */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-cyan-400 border-b border-white/[0.08] pb-3">
              <Mic className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Top Interview Topics</h4>
            </div>

            <ul className="mt-4 space-y-2.5">
              {activeRole.interviewTopics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => {
                const prompt = `Let's do an interactive mock interview practice round for the ${activeRole.title} role. Ask me question 1 on ${activeRole.interviewTopics[0] || "core technical concepts"}.`;
                if (onAskCoach) {
                  onAskCoach(prompt);
                } else {
                  onNavigateTab("coach");
                }
              }}
              className="mt-5 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-center text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              Start Practice Round with AI Coach →
            </button>
          </div>

          {/* Resume Strategy */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-white/[0.08] pb-3">
              <FileText className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Resume Alignment Strategy</h4>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              {activeRole.resumeFocus}
            </p>

            <button
              type="button"
              onClick={() => onNavigateTab("resume")}
              className="mt-5 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-center text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              Audit ATS Resume →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
