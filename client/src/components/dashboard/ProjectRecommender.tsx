import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  Code2,
  Layers,
  ArrowRight,
  Sparkles,
  Bot,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check
} from "lucide-react";
import { TabId } from "./DashboardHeader";

interface ProjectRecommenderProps {
  targetRole: string;
  onAskCoach: (query: string) => void;
  apiBase?: string;
}

interface ProjectBlueprint {
  id: string;
  title: string;
  domain: string;
  roleMatch?: string;
  difficulty: "Intermediate" | "Advanced" | string;
  techStack: string[];
  overview: string;
  features: string[];
  resumeBullet: string;
}

const PROJECTS_BY_ROLE: Record<string, ProjectBlueprint[]> = {
  default: [
    {
      id: "proj-1",
      title: "Distributed Asynchronous Job Queue & Rate Limiter",
      domain: "Backend & Systems",
      roleMatch: "Software Development Engineer (SDE)",
      difficulty: "Advanced",
      techStack: ["Python", "FastAPI", "Redis Streams", "Docker", "PostgreSQL"],
      overview: "A fault-tolerant distributed background task orchestrator with token-bucket rate limiting and exponential backoff retry mechanisms.",
      features: [
        "Token bucket rate-limiting middleware restricting client bursts",
        "Redis stream worker pool with consumer groups and dead-letter queue",
        "PostgreSQL state persistence with ACID transaction locks",
        "Prometheus & Grafana telemetry tracking job throughput"
      ],
      resumeBullet: "Engineered a distributed async task queue handling 3,500+ tasks/sec using Redis Streams and FastAPI, reducing job processing latency by 44% with zero message drop."
    },
    {
      id: "proj-2",
      title: "Real-Time Collaborative Code & Canvas Studio",
      domain: "Full-Stack Web",
      roleMatch: "Full-Stack Web Developer",
      difficulty: "Advanced",
      techStack: ["React", "TypeScript", "Node.js", "WebSockets", "WebRTC"],
      overview: "Low-latency browser IDE supporting synchronized multi-user code editing, syntax highlighting, and live peer-to-peer audio preview.",
      features: [
        "Operational Transformation (OT) conflict resolution for concurrent keystrokes",
        "WebSocket heartbeat connection recovery with state hydration",
        "Sandboxed browser code execution environment",
        "Role-based workspace invitation and session authentication"
      ],
      resumeBullet: "Architected a real-time collaborative code editor supporting 50+ concurrent typing sessions with <15ms peer synchronization via WebSockets and Operational Transformation."
    },
    {
      id: "proj-3",
      title: "Agentic AI Placement & Knowledge Assistant",
      domain: "Applied AI / ML",
      roleMatch: "Data Scientist / ML Engineer",
      difficulty: "Intermediate",
      techStack: ["Python", "Scikit-Learn", "Gemini API", "FastAPI", "Pandas"],
      overview: "An intelligent career analytics platform combining machine learning probability scoring with generative AI conversational mentoring.",
      features: [
        "Random Forest classifier trained on 650+ verified placement outcomes",
        "Context-grounded LLM agent with multilingual mirroring (English & Telugu)",
        "Automated ATS PDF resume text extraction and keyword alignment",
        "Sliding-window API rate limiting and token usage budget guardrails"
      ],
      resumeBullet: "Developed an AI career copilot combining Scikit-Learn Random Forest (86% accuracy) and Gemini GenAI to provide personalized placement roadmaps for 600+ students."
    }
  ],
};

export const ProjectRecommender: React.FC<ProjectRecommenderProps> = ({
  targetRole,
  onAskCoach,
  apiBase,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectBlueprint[]>(PROJECTS_BY_ROLE.default);

  useEffect(() => {
    if (!apiBase) return;
    let isMounted = true;
    fetch(`${apiBase}/api/data/projects`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data) && data.length > 0) {
          setProjectsList(data);
        }
      })
      .catch((err) => console.warn("Projects API fetch warning:", err));
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const projects = projectsList;

  const handleCopyBullet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-950/70 to-slate-900/50 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Lightbulb className="h-3.5 w-3.5" />
              Flagship Portfolio Blueprints
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs text-slate-300">
              Target: {targetRole || "Software Development Engineer (SDE)"}
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            AI Project Recommender
          </h1>

          <p className="text-sm leading-relaxed text-slate-300">
            Tier-1 recruiters prioritize end-to-end deployed systems over generic tutorials. These curated architectures are engineered to close your technical skill gaps and provide bulletproof talking points in interviews.
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {projects.map((proj) => {
          const isCopied = copiedId === proj.id;
          return (
            <div
              key={proj.id}
              className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-slate-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-300 hover:border-amber-500/30 hover:bg-slate-900/70 hover:shadow-amber-500/5"
            >
              <div className="space-y-4">
                {/* Meta Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    {proj.domain}
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    {proj.difficulty}
                  </span>
                </div>

                {/* Title & Overview */}
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                    {proj.title}
                  </h2>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {proj.overview}
                  </p>
                </div>

                {/* Tech Stack Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proj.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Key Architecture Features */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Key Implementation Features:
                  </span>
                  <ul className="space-y-1.5">
                    {proj.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resume Ready Bullet */}
                <div className="rounded-2xl border border-white/[0.06] bg-slate-950/60 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>Google X-Y-Z Resume Bullet:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyBullet(proj.id, proj.resumeBullet)}
                      className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Copy bullet point to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] italic text-slate-300 leading-relaxed">
                    "{proj.resumeBullet}"
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(
                      `Let's discuss how to build '${proj.title}'. What should the system architecture look like and what libraries should I install first?`
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border border-amber-500/30 py-2.5 text-xs font-bold text-white transition-all hover:border-amber-400/50 hover:brightness-110 active:scale-95 shadow-sm"
                >
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                  <span>Discuss Architecture with AI Coach</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
