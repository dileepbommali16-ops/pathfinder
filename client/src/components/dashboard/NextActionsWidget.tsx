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
    <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B4A]/10 text-[#FF6B4A] border border-[#FF6B4A]/20 shadow-[0_0_12px_rgba(255,107,74,0.2)]">
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#F2F2F3] flex items-center gap-2">
              <span>Personalized Next Actions</span>
              <span className="rounded-md border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF6B4A]">
                What to do next
              </span>
            </h2>
            <p className="text-xs text-[#A1A1AA]">
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
                  ? "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 opacity-70"
                  : "border-[#2A2A30] bg-[#141417] hover:border-[#FF6B4A]/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleCheck(task.id)}
                  className="mt-0.5 text-[#A1A1AA] hover:text-[#FF6B4A] transition-colors cursor-pointer"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-[#FF6B4A]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#A1A1AA]" />
                  )}
                </button>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        task.priority.includes("High") || task.priority.includes("Crucial")
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          : "border-[#2A2A30] bg-[#1B1B1F] text-[#F2F2F3]"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <h3
                      className={`text-sm font-semibold ${
                        isDone ? "line-through text-[#A1A1AA]" : "text-[#F2F2F3]"
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-2xl">
                    {task.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pl-8 sm:pl-0">
                <button
                  type="button"
                  onClick={task.action}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#1B1B1F] px-3 py-1.5 text-xs font-semibold text-[#F2F2F3] transition-all hover:border-[#FF6B4A]/40 hover:bg-[#FF6B4A]/10 hover:text-[#FF8A6E] active:scale-95 shadow-sm cursor-pointer"
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
