/**
 * AskMeColumn.tsx: Clickable questions sidebar for desktop / chips row on mobile.
 * Contains 8 essential questions covering site guide, projects, placement, mock interview, and multilingual examples.
 */

import React from "react";
import { Sparkles, Compass, FileText, Layers, Target, Mic, Globe } from "lucide-react";

export interface AskMeQuestion {
  id: string;
  title: string;
  desc: string;
  prompt: string;
  icon: React.ReactNode;
}

export const DEFAULT_ASK_ME_QUESTIONS: AskMeQuestion[] = [
  {
    id: "site_guide",
    title: "Explain the website",
    desc: "Walk me through all tabs and key features",
    prompt: "Can you explain all pages and features of the Pathfinder website and how to use them?",
    icon: <Compass className="h-4 w-4 text-cyan-400" />,
  },
  {
    id: "resume_builder",
    title: "Where is the resume builder?",
    desc: "One-page ATS format studio",
    prompt: "Where is the resume builder located and how does it generate an ATS-compliant resume?",
    icon: <FileText className="h-4 w-4 text-violet-400" />,
  },
  {
    id: "project_ideas",
    title: "Project ideas for my branch",
    desc: "Tailored to CSE, AIML, or ECE",
    prompt: "What are the best production-grade portfolio projects for my branch and target role?",
    icon: <Layers className="h-4 w-4 text-emerald-400" />,
  },
  {
    id: "build_project",
    title: "Build a project step-by-step",
    desc: "Interactive blueprint tutoring",
    prompt: "Can you tutor me step-by-step through building the Distributed Task Queue project blueprint?",
    icon: <Layers className="h-4 w-4 text-amber-400" />,
  },
  {
    id: "placement_chances",
    title: "Check my placement chances",
    desc: "Probability & cutoff analysis",
    prompt: "What is my placement probability based on the 972 cohort records and how can I boost it?",
    icon: <Target className="h-4 w-4 text-pink-400" />,
  },
  {
    id: "mock_interview",
    title: "Start a mock interview",
    desc: "Technical STAR evaluation",
    prompt: "Let's conduct a technical mock interview! Ask me your first question.",
    icon: <Mic className="h-4 w-4 text-blue-400" />,
  },
  {
    id: "telugu_example",
    title: "తెలుగు ఉదాహరణ (Telugu)",
    desc: "ప్లేస్‌మెంట్ రోడ్‌మ్యాప్",
    prompt: "నాకు క్యాంపస్ ప్లేస్‌మెంట్స్ కోసం 6-వారాల DSA రోడ్‌మ్యాప్ తెలుగులో వివరించండి.",
    icon: <Globe className="h-4 w-4 text-amber-300" />,
  },
  {
    id: "hindi_example",
    title: "हिंदी उदाहरण (Hindi)",
    desc: "प्लेसमेंट की तैयारी",
    prompt: "पाथफाइंडर की मदद से मैं टीयर-1 कंपनी के लिए कैसे तैयारी करूँ? हिंदी में समझाइए।",
    icon: <Globe className="h-4 w-4 text-teal-300" />,
  },
];

export interface AskMeColumnProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export const AskMeColumn: React.FC<AskMeColumnProps> = ({ onSelectPrompt, disabled = false }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Ask Me
        </span>
        <span className="text-[10px] text-slate-400 font-mono">1-Click Prompts</span>
      </div>

      {/* Vertical List for Desktop */}
      <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
        {DEFAULT_ASK_ME_QUESTIONS.map((q) => (
          <button
            key={q.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(q.prompt)}
            className="w-full text-left rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-cyan-950/40 hover:border-cyan-500/30 p-3 transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 group-hover:scale-110 transition-transform mt-0.5">{q.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">{q.title}</p>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{q.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
