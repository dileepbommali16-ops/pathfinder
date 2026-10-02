import React from "react";
import {
  Sparkles,
  Target,
  Compass,
  Bot,
  FileText,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Zap,
  Mic
} from "lucide-react";
import { TabId } from "./DashboardHeader";

interface AIActionCenterProps {
  onNavigateTab: (tab: TabId) => void;
  onTriggerCalculate: () => void;
  onStartMockInterview: () => void;
  targetRole: string;
}

export const AIActionCenter: React.FC<AIActionCenterProps> = ({
  onNavigateTab,
  onTriggerCalculate,
  onStartMockInterview,
  targetRole,
}) => {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analyzedSuccess, setAnalyzedSuccess] = React.useState(false);

  const handleAnalyzeReadiness = () => {
    setIsAnalyzing(true);
    onTriggerCalculate();
    const el = document.getElementById("career-digital-twin") || document.getElementById("career-readiness-assessment");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzedSuccess(true);
      setTimeout(() => setAnalyzedSuccess(false), 3500);
    }, 600);
  };

  const actions = [
    {
      id: "calculate",
      title: "Analyze Career Readiness",
      description: "Run Random Forest ML sensitivity on current CGPA, internships & coding scores.",
      icon: Target,
      tag: isAnalyzing ? "Evaluating..." : analyzedSuccess ? "Analyzed ✓" : "Instant ML",
      accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
      btnClass: isAnalyzing ? "border-emerald-400 animate-pulse bg-emerald-500/20" : "hover:border-emerald-500/50 hover:bg-emerald-500/10",
      action: handleAnalyzeReadiness,
      actionText: isAnalyzing ? "Evaluating ML Vectors..." : analyzedSuccess ? "Assessment Updated ✓" : "Launch Tool",
    },
    {
      id: "missions",
      title: "30-Day Sprint Mission",
      description: `Structured sprint roadmap & milestones customized for ${targetRole || "SDE"}.`,
      icon: Compass,
      tag: "AI Guided",
      accent: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
      btnClass: "hover:border-purple-500/50 hover:bg-purple-500/10",
      action: () => onNavigateTab("missions"),
    },
    {
      id: "interview",
      title: "Start AI Mock Interview",
      description: "Interactive technical & STAR behavioral questions with instant AI scoring.",
      icon: Mic,
      tag: "Live Simulation",
      accent: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
      btnClass: "hover:border-cyan-500/50 hover:bg-cyan-500/10",
      action: onStartMockInterview,
    },
    {
      id: "resume",
      title: "Audit Resume with ATS",
      description: "Detect missing keywords, parse PDF bullet points and align with recruiter standards.",
      icon: FileText,
      tag: "ATS Scanner",
      accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
      btnClass: "hover:border-amber-500/50 hover:bg-amber-500/10",
      action: () => onNavigateTab("resume"),
    },
    {
      id: "projects",
      title: "Suggest Flagship Projects",
      description: "Production-grade project blueprints mapped directly to your missing skill gaps.",
      icon: Lightbulb,
      tag: "Portfolio",
      accent: "from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400",
      btnClass: "hover:border-rose-500/50 hover:bg-rose-500/10",
      action: () => onNavigateTab("projects"),
    },
    {
      id: "analytics",
      title: "Cohort Placement Trends",
      description: "Compare your branch and graduation year against 650+ verified campus offers.",
      icon: TrendingUp,
      tag: "Campus Data",
      accent: "from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400",
      btnClass: "hover:border-teal-500/50 hover:bg-teal-500/10",
      action: () => onNavigateTab("analytics"),
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>AI Action Center</span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                Command Hub
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              One-click career intelligence tools integrated with your active candidate profile
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={act.action}
              className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-br ${act.accent} p-4 text-left transition-all duration-200 active:scale-[0.98] shadow-sm ${act.btnClass}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] backdrop-blur-md shadow-inner group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {act.tag}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {act.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
                <span>{act.actionText || "Launch Tool"}</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
