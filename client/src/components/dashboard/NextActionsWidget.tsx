import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  ListTodo,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { TabId } from "./DashboardHeader";
import { StudentProfileState } from "./ProfileEvaluator";

interface NextActionsWidgetProps {
  profile: StudentProfileState;
  onNavigateTab: (tab: TabId) => void;
  onAskCoach: (query: string) => void;
}

export const NextActionsWidget: React.FC<NextActionsWidgetProps> = ({
  profile,
  onNavigateTab,
  onAskCoach,
}) => {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Dynamically compute real actionable tasks from student profile
  const tasks = [];

  if (profile.coding < 8) {
    tasks.push({
      id: "coding-dsa",
      priority: "High Priority",
      category: "Technical",
      title: "Master High-Frequency Blind 75 Patterns",
      detail: `Your coding rating is ${profile.coding}/10. Practice Two Pointers, Sliding Window, and Tree BFS/DFS to clear online screening tests.`,
      actionLabel: "Ask Coach for Practice Problem",
      action: () => onAskCoach("Give me a Medium Two Pointers LeetCode problem with step-by-step guidance."),
    });
  }

  if (profile.internships === 0) {
    tasks.push({
      id: "project-portfolio",
      priority: "Crucial",
      category: "Portfolio",
      title: "Deploy 1 Flagship Production-Grade Project",
      detail: "Zero recorded internships. Having 1 live deployed project with clean architecture significantly boosts Tier-1 shortlisting.",
      actionLabel: "Explore Flagship Projects",
      action: () => onNavigateTab("projects"),
    });
  }

  if (profile.cgpa < 7.5) {
    tasks.push({
      id: "academics-cutoff",
      priority: "Academic Cutoff",
      category: "Academics",
      title: "Target Tier-1 Cutoff Exemption Criteria",
      detail: `Current CGPA: ${profile.cgpa.toFixed(1)}. Aim for >= 7.5 in upcoming semesters to clear 92%+ campus drive screening bars.`,
      actionLabel: "View Placement Cutoff Strategy",
      action: () => onAskCoach("My CGPA is 7.2. What tier-1 companies recruit with CGPA >= 7.0 and how can I offset it with coding?"),
    });
  }

  tasks.push({
    id: "resume-ats",
    priority: "Screening",
    category: "Resume",
    title: "Audit Resume for SDE Keyword Densities",
    detail: "Run your resume through the ATS studio to verify action verbs and Google X-Y-Z bullet formatting.",
    actionLabel: "Open ATS Studio",
    action: () => onNavigateTab("resume"),
  });

  tasks.push({
    id: "mock-interview",
    priority: "Interview Prep",
    category: "Behavioral",
    title: "Conduct 1 Mock Technical Round",
    detail: "Test your live explanation of data structures and STAR behavioral answers with the AI Career Agent.",
    actionLabel: "Start Mock Interview",
    action: () => onAskCoach("Let's do a 5-minute mock interview for Software Engineer role. Ask me question 1."),
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Personalized Next Actions</span>
              <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                What to do next
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Immediate high-yield steps calculated to elevate your placement probability
            </p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="mt-5 space-y-3">
        {tasks.map((task) => {
          const isDone = Boolean(completed[task.id]);
          return (
            <div
              key={task.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all duration-200 ${
                isDone
                  ? "border-emerald-500/30 bg-emerald-950/20 opacity-70"
                  : "border-white/[0.06] bg-slate-950/50 hover:border-white/[0.12] hover:bg-slate-950/80"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleCheck(task.id)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500" />
                  )}
                </button>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        task.priority.includes("High") || task.priority.includes("Crucial")
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          : "border-purple-500/30 bg-purple-500/10 text-purple-300"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <h3
                      className={`text-sm font-semibold ${
                        isDone ? "line-through text-slate-400" : "text-white"
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    {task.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pl-8 sm:pl-0">
                <button
                  type="button"
                  onClick={task.action}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-300 active:scale-95 shadow-sm"
                >
                  <span>{task.actionLabel}</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
