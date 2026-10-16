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
  ShieldAlert,
  Zap,
  Mic
} from "lucide-react";

export type TabId =
  | "overview"
  | "interview"
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
  { id: "interview", label: "AI Mock Interview", icon: Mic, badge: "Live" },
  { id: "action", label: "Readiness Command", icon: Zap, badge: "Instant" },
  { id: "skills", label: "6-Week Roadmap", icon: Compass, badge: "Sprint" },
  { id: "coach", label: "DAS AI Voice Coach", icon: Bot, badge: "Voice" },
  { id: "projects", label: "Project Blueprints", icon: Lightbulb },
  { id: "analytics", label: "Cohort Analytics", icon: TrendingUp, badge: "972" },
  { id: "resume", label: "ATS Resume Studio", icon: FileText },
  { id: "branches", label: "Branches and Courses", icon: GraduationCap, badge: "Dept" },
  { id: "defense", label: "Project Defense", icon: ShieldAlert },
  { id: "profile", label: "Profile / Settings", icon: User, badge: "SSOT" },
];

const WINE_THEME = {
  activeBg: "bg-[#9f1239]/20",
  text: "text-[#f8fafc] font-semibold",
  icon: "text-[#9f1239]",
  border: "border-[#9f1239]/50",
  glow: "shadow-[0_0_18px_rgba(159,18,57,0.3)]",
  badge: "bg-[#9f1239]/30 text-[#f8fafc] border-[#9f1239]/50",
  indicator: "from-transparent via-[#9f1239] to-transparent"
};

const VIOLET_THEME = {
  activeBg: "bg-[#7c3aed]/20",
  text: "text-[#f8fafc] font-semibold",
  icon: "text-[#7c3aed]",
  border: "border-[#7c3aed]/50",
  glow: "shadow-[0_0_18px_rgba(124,58,237,0.3)]",
  badge: "bg-[#7c3aed]/30 text-[#f8fafc] border-[#7c3aed]/50",
  indicator: "from-transparent via-[#7c3aed] to-transparent"
};

const MONO_THEME = {
  activeBg: "bg-white/15",
  text: "text-white font-semibold",
  icon: "text-white",
  border: "border-white/40",
  glow: "shadow-[0_0_15px_rgba(255,255,255,0.18)]",
  badge: "bg-white/20 text-white border-white/40",
  indicator: "from-transparent via-white to-transparent"
};

const TAB_THEMES: Record<TabId, typeof WINE_THEME> = {
  overview: WINE_THEME,
  interview: VIOLET_THEME,
  action: WINE_THEME,
  skills: WINE_THEME,
  coach: VIOLET_THEME,
  projects: VIOLET_THEME,
  analytics: WINE_THEME,
  resume: MONO_THEME,
  branches: VIOLET_THEME,
  defense: VIOLET_THEME,
  profile: MONO_THEME,
  roles: VIOLET_THEME,
  missions: WINE_THEME
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
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0b10]/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
      {/* Subtle Dual Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#11131c] via-[#161926] to-[#1c2030] shadow-md ring-1 ring-[#7c3aed]/40">
            <GraduationCap className="h-5 w-5 text-[#7c3aed]" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9f1239] opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#9f1239] shadow-[0_0_8px_rgba(159,18,57,0.9)]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#f8fafc] drop-shadow-sm font-['Space_Grotesk']">
                Pathfinder <span className="text-[#9f1239]">2.0</span>
              </span>
              <span className="rounded-md border border-[#7c3aed]/40 bg-[#7c3aed]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#7c3aed] uppercase shadow-sm">
                AI
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-white/10 bg-[#11131c] px-2 py-0.5 text-[10px] font-medium text-[#f8fafc] uppercase tracking-wider">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-[#94a3b8]">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & Edit Candidate Profile"
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#11131c] px-3.5 py-1.5 shadow-sm backdrop-blur-xl hover:border-[#7c3aed]/40 hover:bg-[#161926] transition-all cursor-pointer text-left"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed]/20 text-[11px] font-bold text-[#7c3aed] shadow-sm ring-1 ring-[#7c3aed]/40">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-[#f8fafc]">{username || "Student"}</span>
                {userRole === "admin" ? (
                  <span className="text-[9px] font-medium text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-1 rounded">ADMIN</span>
                ) : (
                  <ShieldCheck className="h-3 w-3 text-[#94a3b8]" />
                )}
              </div>
              {email && <span className="text-[10px] text-[#94a3b8] leading-none">{email}</span>}
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#11131c] px-3 py-1.5 text-xs font-medium text-[#94a3b8] transition-all hover:border-[#9f1239]/40 hover:text-[#f8fafc] active:scale-95 shadow-sm cursor-pointer"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#0a0b10]/90 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const theme = TAB_THEMES[tab.id] || WINE_THEME;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? `${theme.activeBg} ${theme.text} border ${theme.border} ${theme.glow}`
                    : "text-[#94a3b8] hover:bg-white/[0.04] hover:text-[#f8fafc] border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? theme.icon : "text-[#94a3b8]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${isActive ? theme.badge : "bg-[#11131c] text-[#94a3b8] border-[rgba(255,255,255,0.08)]"}`}>
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
