import React from "react";
import { motion } from "framer-motion";
import {
  Target,
  Compass,
  Bot,
  TrendingUp,
  FileText,
  LogOut,
  Sparkles,
  ShieldCheck,
  User,
  GraduationCap,
  Lightbulb
} from "lucide-react";

export type TabId = "overview" | "roadmap" | "coach" | "projects" | "analytics" | "resume";

interface DashboardHeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  username: string;
  email?: string;
  onLogout: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "overview", label: "Readiness Command", icon: Target },
  { id: "roadmap", label: "6-Week Roadmap", icon: Compass },
  { id: "coach", label: "AI Career Coach", icon: Bot, badge: "Gemini" },
  { id: "projects", label: "Project Blueprints", icon: Lightbulb, badge: "AI" },
  { id: "analytics", label: "Cohort Analytics", icon: TrendingUp },
  { id: "resume", label: "ATS Resume Studio", icon: FileText },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  activeTab,
  setActiveTab,
  username,
  email,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#060813]/85 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
      {/* Subtle Glowing Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/25 ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5 text-slate-950" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white drop-shadow-sm">Pathfinder</span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                AI 2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 text-[11px] font-bold text-slate-950 shadow-sm">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-slate-200">{username || "Student"}</span>
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              </div>
              {email && <span className="text-[10px] text-slate-400 leading-none">{email}</span>}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 active:scale-95 shadow-sm"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-white/[0.05] bg-black/20 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.15)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="rounded bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-x-2 -bottom-2 h-[2px] rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
