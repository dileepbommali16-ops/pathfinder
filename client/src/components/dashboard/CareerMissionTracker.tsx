import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Trophy,
  Target,
  Award
} from "lucide-react";
import { StudentProfileState } from "./ProfileEvaluator";

interface CareerMissionTrackerProps {
  profile: StudentProfileState;
  onNavigateTab: (tabId: any) => void;
}

interface MissionTask {
  id: string;
  title: string;
  purpose: string;
  effort: string;
  skill: string;
  completed: boolean;
  actionTab?: string;
}

interface MissionWeek {
  weekNumber: number;
  theme: string;
  description: string;
  tasks: MissionTask[];
}

const DEFAULT_WEEKS: MissionWeek[] = [
  {
    weekNumber: 1,
    theme: "Core DSA Patterns & Foundation Sprints",
    description: "Build rapid pattern recognition across highest-frequency campus screening topics.",
    tasks: [
      {
        id: "w1-t1",
        title: "Solve 10 Two-Pointer & Sliding Window LeetCode Mediums",
        purpose: "Covers 45% of online automated HackerRank screening questions.",
        effort: "4 hours",
        skill: "DSA (Arrays/Strings)",
        completed: true,
        actionTab: "coach"
      },
      {
        id: "w1-t2",
        title: "Master Binary Search & Monotonic Stack Edge Cases",
        purpose: "Required for logarithmic time complexity search problems.",
        effort: "3 hours",
        skill: "Algorithms",
        completed: false,
        actionTab: "coach"
      },
      {
        id: "w1-t3",
        title: "Revise DBMS Indexing, ACID Properties & B-Tree fundamentals",
        purpose: "Guaranteed question in all Core CS technical interview rounds.",
        effort: "2.5 hours",
        skill: "Database Systems",
        completed: false,
        actionTab: "defense"
      }
    ]
  },
  {
    weekNumber: 2,
    theme: "Flagship Project Architecture & API Development",
    description: "Engineer an authentic, production-grade application to anchor your portfolio.",
    tasks: [
      {
        id: "w2-t1",
        title: "Select & Initialize Flagship Project Repository",
        purpose: "Pick a high-impact architecture blueprint aligned with your target role.",
        effort: "3 hours",
        skill: "System Design",
        completed: false,
        actionTab: "projects"
      },
      {
        id: "w2-t2",
        title: "Implement FastAPI / Node Backend with Rate Limiting & Auth",
        purpose: "Demonstrates token buckets, async endpoints, and clean API contracts.",
        effort: "6 hours",
        skill: "Backend Engineering",
        completed: false,
        actionTab: "projects"
      },
      {
        id: "w2-t3",
        title: "Containerize application with Docker & create docker-compose.yml",
        purpose: "Shows modern deployment hygiene and reproducible environments.",
        effort: "2 hours",
        skill: "DevOps & Docker",
        completed: false,
        actionTab: "projects"
      }
    ]
  },
  {
    weekNumber: 3,
    theme: "Live Cloud Deployment & ATS Resume Optimization",
    description: "Deploy project to public cloud and format accomplishments with the Google X-Y-Z formula.",
    tasks: [
      {
        id: "w3-t1",
        title: "Deploy live frontend to Vercel and backend to Render",
        purpose: "Gives interviewers a clickable live URL to test directly.",
        effort: "3 hours",
        skill: "Cloud Deployment",
        completed: true,
        actionTab: "overview"
      },
      {
        id: "w3-t2",
        title: "Re-write 3 Project Resume Bullets using Google X-Y-Z formula",
        purpose: "Accomplished [X] measured by [Y] doing [Z] raises ATS scan scores by 35%.",
        effort: "2 hours",
        skill: "Resume Architecture",
        completed: false,
        actionTab: "resume"
      },
      {
        id: "w3-t3",
        title: "Run ATS Resume Intelligence Scanner & export ReportLab PDF",
        purpose: "Verifies keyword density and eliminates layout parsing errors.",
        effort: "1.5 hours",
        skill: "ATS Optimization",
        completed: false,
        actionTab: "resume"
      }
    ]
  },
  {
    weekNumber: 4,
    theme: "Technical Mock Interviews & Project Defense",
    description: "Master real-time articulation, trade-off defense, and behavioral STAR stories.",
    tasks: [
      {
        id: "w4-t1",
        title: "Complete 3 Interactive AI Technical Mock Interview Rounds",
        purpose: "Builds spontaneous articulation muscle under timed pressure.",
        effort: "3 hours",
        skill: "Mock Interviews",
        completed: false,
        actionTab: "coach"
      },
      {
        id: "w4-t2",
        title: "Practice Project Defense: Architecture, Scaling & Security Trade-offs",
        purpose: "Prepares you to defend database choices and 10x traffic spikes.",
        effort: "2.5 hours",
        skill: "System Defense",
        completed: false,
        actionTab: "defense"
      },
      {
        id: "w4-t3",
        title: "Structure 3 STAR Behavioral Stories (Conflict, Leadership, Failure)",
        purpose: "Guarantees top evaluation marks in HR and Managerial rounds.",
        effort: "2 hours",
        skill: "STAR Storytelling",
        completed: false,
        actionTab: "coach"
      }
    ]
  }
];

export const CareerMissionTracker: React.FC<CareerMissionTrackerProps> = ({
  profile,
  onNavigateTab
}) => {
  const [weeks, setWeeks] = useState<MissionWeek[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_career_mission");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_WEEKS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pathfinder_career_mission", JSON.stringify(weeks));
    }
  }, [weeks]);

  const toggleTask = (weekIndex: number, taskId: string) => {
    setWeeks(prev => {
      const copy = [...prev];
      copy[weekIndex] = {
        ...copy[weekIndex],
        tasks: copy[weekIndex].tasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      };
      return copy;
    });
  };

  const handleResetMission = () => {
    setWeeks(DEFAULT_WEEKS);
  };

  // Progress metrics
  const allTasks = weeks.flatMap(w => w.tasks);
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedTasks / allTasks.length) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_20px_rgba(199, 111, 59,0.2)]">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[#eae6e0] sm:text-2xl">
                  Personalized 30-Day Career Mission
                </h2>
                <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">
                  Sprint Roadmap
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#938e87]">
                Action-oriented weekly execution plan customized for your role as <strong>{profile.targetRole}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetMission}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#141318] px-3 py-1.5 text-xs font-semibold text-[#938e87] hover:text-[#eae6e0] hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#141318] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#c76f3b]" />
              <span className="text-xs font-bold text-[#eae6e0]">Overall 30-Day Execution Progress</span>
            </div>
            <span className="text-sm font-black text-[#c76f3b]">
              {completedTasks} of {allTasks.length} Milestones Achieved ({progressPercent}%)
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1c1a22]">
            <div
              className="h-full bg-gradient-to-r from-[#c76f3b] to-[#c76f3b] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Weekly Mission Cards */}
      <div className="space-y-5">
        {weeks.map((wk, wkIdx) => {
          const wkCompleted = wk.tasks.filter(t => t.completed).length;
          const wkPct = Math.round((wkCompleted / wk.tasks.length) * 100);

          return (
            <div
              key={wk.weekNumber}
              className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 backdrop-blur-2xl transition-all hover:border-[#c76f3b]/30"
            >
              <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-xs font-black text-[#c76f3b]">
                      WEEK {wk.weekNumber}
                    </span>
                    <h3 className="text-sm font-bold text-[#eae6e0]">{wk.theme}</h3>
                  </div>
                  <p className="mt-1 text-xs text-[#938e87]">{wk.description}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-[#938e87]">
                  <span>{wkCompleted}/{wk.tasks.length} Done</span>
                  <span className="text-[#c76f3b] font-bold">({wkPct}%)</span>
                </div>
              </div>

              {/* Tasks Checklist */}
              <div className="mt-4 space-y-3">
                {wk.tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(wkIdx, task.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      task.completed
                        ? "border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#938e87]"
                        : "border-white/[0.08] bg-[#141318] hover:border-[#c76f3b]/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                            task.completed
                              ? "border-[#c76f3b] bg-[#c76f3b] text-white"
                              : "border-white/[0.08] bg-[#1c1a22] text-transparent"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>

                        <div>
                          <span className={`text-xs font-bold ${task.completed ? "line-through text-[#938e87]" : "text-[#eae6e0]"}`}>
                            {task.title}
                          </span>
                          <p className="mt-0.5 text-xs text-[#938e87]">{task.purpose}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="rounded-md border border-white/[0.08] bg-[#1c1a22] px-2 py-0.5 font-semibold text-[#938e87]">
                              ⏱️ {task.effort}
                            </span>
                            <span className="rounded-md border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2 py-0.5 font-semibold text-[#c76f3b]">
                              🎯 {task.skill}
                            </span>
                          </div>
                        </div>
                      </div>

                      {task.actionTab && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateTab(task.actionTab);
                          }}
                          className="shrink-0 rounded-lg border border-white/[0.08] bg-[#1c1a22] px-2.5 py-1 text-[11px] font-semibold text-[#eae6e0] hover:border-[#c76f3b]/40 transition-all cursor-pointer"
                        >
                          Execute →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
