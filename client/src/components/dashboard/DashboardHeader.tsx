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
  Lightbulb,
  Calendar,
  ShieldAlert,
  Zap
} from "lucide-react";

export type TabId =
  | "overview"
  | "action"
  | "skills"
  | "branches"
  | "analytics"
  | "coach"
  | "profile"
  | "roles"
  | "missions"
  | "projects"
  | "defense"
  | "resume";

interface DashboardHeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  username: string;
  email?: string;
  onLogout: () => void;
  userRole?: string;
}


const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "overview", label: "Dashboard", icon: Target },
  { id: "action", label: "Readiness Command", icon: Zap, badge: "Instant" },
  { id: "skills", label: "6-Week Roadmap", icon: Compass, badge: "Sprint" },
  { id: "coach", label: "AI Career Coach", icon: Bot, badge: "Gemini" },
  { id: "projects", label: "Project Blueprints", icon: Lightbulb },
  { id: "analytics", label: "Cohort Analytics", icon: TrendingUp, badge: "972" },
  { id: "resume", label: "ATS Resume Studio", icon: FileText },
  { id: "branches", label: "Branches and Courses", icon: GraduationCap, badge: "Dept" },
  { id: "defense", label: "Project Defense", icon: ShieldAlert },
  { id: "profile", label: "Profile / Settings", icon: User, badge: "SSOT" },
];


const TAB_THEMES: Record<TabId, { activeBg: string; text: string; icon: string; border: string; glow: string; badge: string; indicator: string }> = {
  overview: {
    activeBg: "bg-emerald-500/15",
    text: "text-emerald-300",
    icon: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    indicator: "from-emerald-400 to-teal-400"
  },
  action: {
    activeBg: "bg-emerald-500/15",
    text: "text-emerald-300",
    icon: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    indicator: "from-emerald-400 to-teal-400"
  },
  skills: {
    activeBg: "bg-purple-500/15",
    text: "text-purple-300",
    icon: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.15)]",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    indicator: "from-purple-400 to-indigo-400"
  },
  coach: {
    activeBg: "bg-cyan-500/15",
    text: "text-cyan-300",
    icon: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_18px_rgba(6,182,212,0.15)]",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    indicator: "from-cyan-400 to-teal-400"
  },
  projects: {
    activeBg: "bg-amber-500/15",
    text: "text-amber-300",
    icon: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.15)]",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    indicator: "from-amber-400 to-orange-400"
  },
  analytics: {
    activeBg: "bg-blue-500/15",
    text: "text-blue-300",
    icon: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.15)]",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    indicator: "from-blue-400 to-indigo-400"
  },
  resume: {
    activeBg: "bg-rose-500/15",
    text: "text-rose-300",
    icon: "text-rose-400",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_18px_rgba(244,63,94,0.15)]",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    indicator: "from-rose-400 to-pink-400"
  },
  branches: {
    activeBg: "bg-indigo-500/15",
    text: "text-indigo-300",
    icon: "text-indigo-400",
    border: "border-indigo-500/30",
    glow: "shadow-[0_0_18px_rgba(99,102,241,0.15)]",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    indicator: "from-indigo-400 to-purple-400"
  },
  defense: {
    activeBg: "bg-emerald-500/15",
    text: "text-emerald-300",
    icon: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    indicator: "from-emerald-400 to-teal-400"
  },
  profile: {
    activeBg: "bg-slate-500/15",
    text: "text-slate-200",
    icon: "text-slate-300",
    border: "border-white/20",
    glow: "shadow-[0_0_18px_rgba(255,255,255,0.08)]",
    badge: "bg-slate-500/20 text-slate-300 border-white/20",
    indicator: "from-slate-300 to-slate-400"
  },
  roles: {
    activeBg: "bg-blue-500/15",
    text: "text-blue-300",
    icon: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.15)]",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    indicator: "from-blue-400 to-indigo-400"
  },
  missions: {
    activeBg: "bg-purple-500/15",
    text: "text-purple-300",
    icon: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.15)]",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    indicator: "from-purple-400 to-indigo-400"
  }
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  activeTab,
  setActiveTab,
  username,
  email,
  onLogout,
  userRole = "student",
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#060813]/85 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
      {/* Subtle Glowing Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />

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
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-400 uppercase shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                AI 2.0
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-purple-500/40 bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & Edit Candidate Profile"
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl hover:border-cyan-500/40 hover:bg-white/[0.06] transition-all cursor-pointer text-left"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 text-[11px] font-bold text-slate-950 shadow-sm">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-slate-200">{username || "Student"}</span>
                {userRole === "admin" ? (
                  <span className="text-[9px] font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-1 rounded">ADMIN</span>
                ) : (
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                )}
              </div>
              {email && <span className="text-[10px] text-slate-400 leading-none">{email}</span>}
            </div>
          </button>

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
        <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const theme = TAB_THEMES[tab.id] || TAB_THEMES.overview;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? `${theme.activeBg} ${theme.text} border ${theme.border} ${theme.glow}`
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? theme.icon : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${isActive ? theme.badge : "bg-white/[0.04] text-slate-400 border-white/[0.06]"}`}>
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className={`absolute inset-x-2 -bottom-2 h-[2px] rounded-full bg-gradient-to-r ${theme.indicator}`}
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
