import React, { useState, useEffect } from "react";
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
    requiredSkills: [
      "Data Structures & Algorithms",
      "System Design",
      "Java / C++ / Python",
      "DBMS / SQL",
      "Operating Systems",
      "REST APIs",
    ],
    existingSkills: ["Python", "Basic Algorithms", "Coursework CS Fundamentals"],
    missingSkills: [
      "High-Frequency Blind 75 LeetCode Patterns",
      "Distributed System Design",
      "ACID Transaction Locks",
    ],
    recommendedProject: {
      title: "Distributed Asynchronous Job Queue & Rate Limiter",
      tech: ["Python", "FastAPI", "Redis Streams", "Docker"],
      whyItMatters:
        "Proves you understand concurrency, token-bucket rate limiting, and failure recovery.",
    },
    interviewTopics: [
      "Two Pointers & Sliding Window",
      "Binary Trees & Graph Traversals",
      "Indexing & Query Optimization",
      "Multithreading & Concurrency",
    ],
    resumeFocus:
      "Emphasize low latency, algorithm time/space complexities, and quantifiable throughput metrics (Google X-Y-Z formula).",
    pathStages: [
      { step: "1. Core DSA", detail: "Arrays, Two-Pointers, Sliding Window, Monotonic Stacks (15 days)" },
      { step: "2. Flagship Backend", detail: "Build and deploy async task queue with Redis & Docker (12 days)" },
      { step: "3. System Design", detail: "Caching strategies, database partitioning, RESTful contracts (8 days)" },
      { step: "4. Interview Practice", detail: "Timed LeetCode medium rounds + STAR project defense (7 days)" },
    ],
  },
  {
    id: "fullstack",
    title: "Full Stack Developer",
    tier: "Enterprise High-Scale",
    alignment: 78,
    requiredSkills: [
      "React / Next.js",
      "TypeScript",
      "Node.js / FastAPI",
      "PostgreSQL",
      "TailwindCSS",
      "State Management",
      "CI/CD",
    ],
    existingSkills: ["React basics", "HTML/CSS", "Python API consumption"],
    missingSkills: [
      "TypeScript strict mode",
      "Production CI/CD pipelines",
      "WebSocket real-time synchronization",
    ],
    recommendedProject: {
      title: "Real-Time Collaborative Code & Canvas Studio",
      tech: ["React", "TypeScript", "Node.js", "WebSockets", "WebRTC"],
      whyItMatters:
        "Demonstrates full-stack proficiency, state reconciliation, and responsive browser UI architecture.",
    },
    interviewTopics: [
      "React component lifecycle & re-render optimization",
      "CORS & JWT authentication flow",
      "Database schema normalization",
      "SSR vs CSR trade-offs",
    ],
    resumeFocus:
      "Highlight clean UI design systems, responsive accessibility, and verified GitHub live deployment URLs.",
    pathStages: [
      { step: "1. Modern Frontend", detail: "React 19, TypeScript strict typing, and Tailwind styling (10 days)" },
      { step: "2. Backend & Auth", detail: "FastAPI / Node with JWT auth and Postgres migrations (12 days)" },
      { step: "3. Real-Time Sync", detail: "WebSockets and optimistic UI state updates (8 days)" },
      { step: "4. Deployment & Lighthouse", detail: "Deploy to Vercel/Render with 95+ Lighthouse score (5 days)" },
    ],
  },
  {
    id: "ai-engineer",
    title: "AI Engineer",
    tier: "AI Startup / Growth",
    alignment: 84,
    requiredSkills: [
      "Python",
      "LLM Orchestration (LangChain / GenAI)",
      "Vector Databases (Pinecone / Chroma)",
      "FastAPI",
      "Prompt Engineering",
      "RAG Architecture",
    ],
    existingSkills: ["Python syntax", "Gemini API integration", "Basic data manipulation"],
    missingSkills: [
      "Hybrid Vector Retrieval (BM25 + Semantic Search)",
      "Agentic Multi-Step Tool Calling",
      "Evaluation benchmarks",
    ],
    recommendedProject: {
      title: "Multi-Agent Regulatory Document Research Engine (RAG)",
      tech: ["Python", "Google GenAI", "FastAPI", "Qdrant / ChromaDB", "Streamlit / React"],
      whyItMatters:
        "Proves enterprise RAG retrieval precision, chunking strategies, and hallucination guardrails.",
    },
    interviewTopics: [
      "Vector embeddings & cosine similarity",
      "Chunking strategies & re-ranking",
      "Evaluation metrics (Faithfulness, Answer Relevance)",
      "Latency & token cost optimization",
    ],
    resumeFocus:
      "Quantify context retrieval precision, hallucination reduction %, and token cost savings.",
    pathStages: [
      { step: "1. Advanced Python & SDKs", detail: "Async programming, Pydantic data schemas, Google GenAI SDK (7 days)" },
      { step: "2. Vector & RAG Pipeline", detail: "Document ingestion, recursive chunking, and similarity search (14 days)" },
      { step: "3. Agent Tool Use", detail: "Implement function calling, search grounding, and error recovery (10 days)" },
      { step: "4. Deployment & Defense", detail: "Package with Docker, deploy to cloud, prepare defense questions (7 days)" },
    ],
  },
  {
    id: "ml-engineer",
    title: "Machine Learning Engineer",
    tier: "Tier-1 Product",
    alignment: 74,
    requiredSkills: [
      "Python",
      "Scikit-Learn",
      "PyTorch / TensorFlow",
      "Pandas & NumPy",
      "Model Evaluation & Tuning",
      "MLOps & Docker",
    ],
    existingSkills: ["NumPy basics", "RandomForest baseline", "Basic Pandas cleaning"],
    missingSkills: [
      "Feature engineering & cross-validation",
      "Model drift monitoring",
      "FastAPI inference serving with Docker",
    ],
    recommendedProject: {
      title: "End-to-End Placement Intelligence & Attrition Predictor",
      tech: ["Python", "Scikit-Learn", "FastAPI", "Docker", "Pandas"],
      whyItMatters:
        "Covers data leakage prevention, hyperparameter tuning, model explainability (SHAP), and containerized serving.",
    },
    interviewTopics: [
      "Bias-Variance trade-off",
      "Precision vs Recall vs F1-score",
      "Regularization (L1/L2)",
      "Ensemble methods (Random Forest vs XGBoost)",
    ],
    resumeFocus:
      "Feature engineering choices, cross-validated accuracy gains, and production inference latency.",
    pathStages: [
      { step: "1. Math & Statistics", detail: "Linear algebra, matrix calculus, and probability distributions (10 days)" },
      { step: "2. Classical ML Mastery", detail: "Supervised and unsupervised models in Scikit-Learn (14 days)" },
      { step: "3. Model Serving", detail: "Wrap trained pickle in FastAPI endpoint with Docker (8 days)" },
      { step: "4. MLOps Basics", detail: "Model versioning and input schema validation (6 days)" },
    ],
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    tier: "Enterprise High-Scale",
    alignment: 72,
    requiredSkills: [
      "SQL (Advanced)",
      "Python / R",
      "Exploratory Data Analysis (EDA)",
      "Statistical Testing (A/B Tests)",
      "Machine Learning",
      "Tableau / BI",
    ],
    existingSkills: ["Python", "Descriptive statistics", "Basic SQL"],
    missingSkills: [
      "Window functions (LEAD/LAG, Partition By)",
      "A/B hypothesis testing (P-values, Z-tests)",
      "Executive business dashboarding",
    ],
    recommendedProject: {
      title: "Cohort Retention & Predictive Customer Lifetime Value Engine",
      tech: ["Python", "Pandas", "PostgreSQL", "Statsmodels", "Seaborn"],
      whyItMatters:
        "Shows commercial understanding, cohort attrition analysis, and statistical significance testing.",
    },
    interviewTopics: [
      "Hypothesis testing & confidence intervals",
      "Advanced SQL CTEs and Window Functions",
      "Handling imbalanced datasets (SMOTE)",
      "Translating business problems to ML objectives",
    ],
    resumeFocus: "Emphasize business ROI, churn reduction percentage, and executive communication.",
    pathStages: [
      { step: "1. Advanced SQL", detail: "Complex joins, subqueries, CTEs, and window functions (10 days)" },
      { step: "2. Applied Statistics", detail: "A/B testing, hypothesis formulation, power analysis (10 days)" },
      { step: "3. Predictive Modeling", detail: "Classification, regression, and survival analysis in Python (12 days)" },
      { step: "4. Business Storytelling", detail: "Executive summary decks and data presentation (6 days)" },
    ],
  },
  {
    id: "data-engineer",
    title: "Data Engineer",
    tier: "Enterprise High-Scale",
    alignment: 66,
    requiredSkills: [
      "SQL (Expert)",
      "Python",
      "Apache Spark / PySpark",
      "Airflow / Prefect",
      "Data Warehousing (BigQuery / Snowflake)",
      "Kafka",
    ],
    existingSkills: ["Python", "Basic SQL queries"],
    missingSkills: [
      "Distributed batch processing (Spark)",
      "DAG orchestration (Airflow)",
      "Data modeling (Star/Snowflake schema)",
    ],
    recommendedProject: {
      title: "Automated Medallion Architecture Data Pipeline (ETL)",
      tech: ["Python", "DuckDB / Spark", "PostgreSQL", "Airflow", "Docker"],
      whyItMatters:
        "Proves raw-to-curated data transformations, idempotency, data quality checks, and scheduled runs.",
    },
    interviewTopics: [
      "OLAP vs OLTP database architecture",
      "Partitioning & clustering strategies",
      "Idempotent pipeline design",
      "Handling late-arriving data in streaming",
    ],
    resumeFocus:
      "Pipeline throughput (records/sec), query optimization speedups, and data quality guarantees.",
    pathStages: [
      { step: "1. SQL & Data Modeling", detail: "Dimensional modeling, slowly changing dimensions (SCD), indexing (10 days)" },
      { step: "2. ETL Engineering", detail: "Python ETL scripts with automated schema validation (10 days)" },
      { step: "3. Orchestration & Cloud", detail: "Airflow DAG scheduling and data warehouse integration (12 days)" },
      { step: "4. Distributed Systems", detail: "PySpark transformations on large datasets (8 days)" },
    ],
  },
  {
    id: "devops",
    title: "DevOps & Cloud Engineer",
    tier: "Enterprise High-Scale",
    alignment: 64,
    requiredSkills: [
      "Linux / Bash",
      "Docker & Containers",
      "Kubernetes",
      "CI/CD (GitHub Actions)",
      "Cloud (AWS / GCP)",
      "Terraform (IaC)",
    ],
    existingSkills: ["Linux commands", "Basic Git"],
    missingSkills: [
      "Multi-stage Dockerfile optimization",
      "Kubernetes deployments & services",
      "Automated GitHub Actions CI/CD matrix",
    ],
    recommendedProject: {
      title: "GitOps Automated Microservices Deployment & Monitoring",
      tech: ["Docker", "Kubernetes (k3s)", "GitHub Actions", "Prometheus", "Grafana"],
      whyItMatters:
        "Proves zero-downtime rolling updates, automated pull request testing, and cluster telemetry.",
    },
    interviewTopics: [
      "Container networking and volume mounts",
      "Kubernetes pods, services, ingress, and replicas",
      "Zero-downtime blue/green deployment strategy",
      "Security hardening & secret management in CI",
    ],
    resumeFocus:
      "Deployment frequency, test automation time reductions, and cloud infrastructure cost savings.",
    pathStages: [
      { step: "1. Linux & Scripting", detail: "Bash automation, networking commands, permissions (8 days)" },
      { step: "2. Docker & Containerization", detail: "Multi-stage builds, non-root users, image optimization (10 days)" },
      { step: "3. CI/CD Automation", detail: "GitHub Actions workflows for automated build, test, and lint (10 days)" },
      { step: "4. Cloud & Kubernetes", detail: "Deploy services to AWS/GCP with health checks and ingress (12 days)" },
    ],
  },
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

  const personalizedRoles = React.useMemo(() => {
    const rawUserSkills = (
      currentProfile.technicalSkills?.length
        ? currentProfile.technicalSkills
        : currentProfile.skills || []
    )
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    const normUserSkills = rawUserSkills.map((s) => s.toLowerCase());
    const cgpaBonus = Math.max(-10, Math.min(12, ((currentProfile.cgpa || 7.5) - 7.5) * 6));
    const codingBonus = Math.max(-8, Math.min(12, ((currentProfile.coding || 6) - 6) * 3));
    const expBonus = Math.min(10, (currentProfile.internships || 0) * 5);

    return roles.map((role) => {
      const benchmarkPool = Array.from(
        new Set(
          [...(role.existingSkills || []), ...(role.missingSkills || [])]
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      if (benchmarkPool.length === 0) return role;

      const matched: string[] = [];
      const missing: string[] = [];
      for (const reqSkill of benchmarkPool) {
        const reqLow = reqSkill.toLowerCase();
        const reqTokens = reqLow.split(/[^a-z0-9+.#]+/).filter((t) => t.length >= 2);
        const hasSkill = normUserSkills.some(
          (us) =>
            us.includes(reqLow) ||
            reqLow.includes(us) ||
            (reqTokens.length > 0 && reqTokens.some((tok) => us.includes(tok)))
        );
        if (hasSkill) matched.push(reqSkill);
        else missing.push(reqSkill);
      }

      const extraUserMatched = rawUserSkills.filter(
        (us) => !matched.some((m) => m.toLowerCase() === us.toLowerCase())
      );
      const effectiveMatched = matched.length > 0 ? matched : extraUserMatched.slice(0, 4);
      const skillRatio = matched.length / Math.max(1, benchmarkPool.length);
      const rawScore = Math.round(skillRatio * 72 + 16 + cgpaBonus + codingBonus + expBonus);
      const dynamicAlignment = Math.max(18, Math.min(98, rawScore));

      return {
        ...role,
        alignment: dynamicAlignment,
        existingSkills:
          effectiveMatched.length > 0
            ? effectiveMatched
            : ["Add core technical skills in Profile / Settings"],
        missingSkills: missing.length > 0 ? missing : ["System Design & Scale Benchmarking"],
      };
    });
  }, [roles, currentProfile]);

  const activeRole = personalizedRoles.find((r) => r.id === selectedRoleId) || personalizedRoles[0];

  const handleSelectRole = (role: RoleBlueprint) => {
    setSelectedRoleId(role.id);
    onUpdateTargetRole(role.title);
  };

  const isCurrentTarget = currentProfile.targetRole
    .toLowerCase()
    .includes(activeRole.title.toLowerCase().split(" ")[0]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl">
                Target Role Intelligence Matrix
              </h2>
              <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                Career Simulator
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#A1A1AA] sm:text-sm">
              Compare your profile against target tech roles, inspect missing skills, and review
              blueprints.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A1A1AA]">Current Target:</span>
            <span className="rounded-lg border border-[#27272A] bg-[#101014] px-3 py-1.5 text-xs font-medium text-[#FAFAFA]">
              {currentProfile.targetRole}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {personalizedRoles.map((r) => {
            const isSelected = r.id === selectedRoleId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "border-[#FAFAFA]/45 bg-[#18181E] text-[#FAFAFA]"
                    : "border-[#222226] bg-[#101014] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
                }`}
              >
                <span>{r.title}</span>
                <span className="rounded bg-[#0B0B0E] px-1.5 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
                  {r.alignment ?? 0}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Role Detailed Intelligence */}
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-5 sm:flex-row sm:items-center">
              <div>
                <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                  {activeRole.tier}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-[#FAFAFA]">{activeRole.title}</h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="block font-mono text-[10px] text-[#8A8A92]">Alignment</span>
                  <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                    {activeRole.alignment}%
                  </span>
                </div>

                {!isCurrentTarget ? (
                  <button
                    type="button"
                    onClick={() => handleSelectRole(activeRole)}
                    className="inline-flex h-10 items-center rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors hover:bg-[#E4E4E7] cursor-pointer"
                  >
                    Set as Target Role
                  </button>
                ) : (
                  <span className="inline-flex h-10 items-center rounded-lg border border-[#3F3F46] bg-[#141418] px-3.5 text-xs font-medium text-[#FAFAFA]">
                    Active Target Role
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-[#222226] bg-[#101014] p-5">
                <h4 className="text-xs font-semibold text-[#FAFAFA]">Existing Foundations</h4>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeRole.existingSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-[#27272A] bg-[#0B0B0E] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-5">
                <h4 className="text-xs font-semibold text-[#FAFAFA]">High-Priority Gaps</h4>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeRole.missingSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-[#27272A] bg-[#141418] px-2.5 py-1 text-xs font-medium text-[#D4D4D8]"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-medium text-[#A1A1AA]">4-Stage Execution Plan</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {activeRole.pathStages.map((stage, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#222226] bg-[#101014] p-4"
                  >
                    <span className="block text-xs font-semibold text-[#FAFAFA]">{stage.step}</span>
                    <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">{stage.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#FAFAFA]">
                Recommended Flagship Project
              </h4>
              <button
                type="button"
                onClick={() => onNavigateTab("projects")}
                className="text-xs font-medium text-[#D4D4D8] hover:text-[#FAFAFA] hover:underline cursor-pointer"
              >
                View full blueprints
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#222226] bg-[#101014] p-5">
              <h5 className="text-sm font-semibold text-[#FAFAFA]">
                {activeRole.recommendedProject.title}
              </h5>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                {activeRole.recommendedProject.whyItMatters}
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#8A8A92]">Tech Stack:</span>
                {activeRole.recommendedProject.tech.map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded border border-[#27272A] bg-[#0B0B0E] px-2 py-0.5 text-[11px] font-medium text-[#FAFAFA]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <h4 className="border-b border-[#1F1F23] pb-3.5 text-xs font-semibold text-[#FAFAFA]">
              Top Interview Topics
            </h4>

            <ul className="mt-4 space-y-2.5">
              {activeRole.interviewTopics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-[#D4D4D8]">
                  <span className="font-mono text-[10px] text-[#8A8A92] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
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
                  onNavigateTab("interview");
                }
              }}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#141418] text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] cursor-pointer"
            >
              Start Practice Round with AI Coach
            </button>
          </div>

          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <h4 className="border-b border-[#1F1F23] pb-3.5 text-xs font-semibold text-[#FAFAFA]">
              Resume Alignment Strategy
            </h4>

            <p className="mt-4 text-xs leading-relaxed text-[#A1A1AA]">
              {activeRole.resumeFocus}
            </p>

            <button
              type="button"
              onClick={() => onNavigateTab("resume")}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#141418] text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] cursor-pointer"
            >
              Audit ATS Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
