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

const DEFAULT_ACTIVE_THEME = {
  activeBg: "bg-white/10",
  text: "text-white",
  icon: "text-white",
  border: "border-white/20",
  glow: "shadow-[0_0_15px_rgba(255,255,255,0.12)]",
  badge: "bg-white/15 text-white border-white/30",
  indicator: "from-white/60 via-white to-white/60"
};

const TAB_THEMES: Record<TabId, typeof DEFAULT_ACTIVE_THEME> = {
  overview: DEFAULT_ACTIVE_THEME,
  action: DEFAULT_ACTIVE_THEME,
  skills: DEFAULT_ACTIVE_THEME,
  coach: DEFAULT_ACTIVE_THEME,
  projects: DEFAULT_ACTIVE_THEME,
  analytics: DEFAULT_ACTIVE_THEME,
  resume: DEFAULT_ACTIVE_THEME,
  branches: DEFAULT_ACTIVE_THEME,
  defense: DEFAULT_ACTIVE_THEME,
  profile: DEFAULT_ACTIVE_THEME,
  roles: DEFAULT_ACTIVE_THEME,
  missions: DEFAULT_ACTIVE_THEME
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
    <header className="sticky top-0 z-50 border-b border-[#2A2A30] bg-[#141417]/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      {/* Subtle Glowing Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-zinc-800 via-zinc-700 to-zinc-600 shadow-md ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white drop-shadow-sm font-['Space_Grotesk']">Pathfinder</span>
              <span className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-zinc-200 uppercase shadow-sm">
                AI 2.0
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white uppercase tracking-wider">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & Edit Candidate Profile"
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 shadow-sm backdrop-blur-xl hover:border-white/30 hover:bg-white/[0.08] transition-all cursor-pointer text-left"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/20">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-zinc-100">{username || "Student"}</span>
                {userRole === "admin" ? (
                  <span className="text-[9px] font-medium text-white bg-white/15 border border-white/30 px-1 rounded">ADMIN</span>
                ) : (
                  <ShieldCheck className="h-3 w-3 text-zinc-300" />
                )}
              </div>
              {email && <span className="text-[10px] text-zinc-400 leading-none">{email}</span>}
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-white/30 hover:bg-white/[0.08] hover:text-white active:scale-95 shadow-sm"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-[#2A2A30] bg-black/30 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const theme = TAB_THEMES[tab.id] || DEFAULT_ACTIVE_THEME;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? `${theme.activeBg} ${theme.text} border ${theme.border} ${theme.glow}`
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? theme.icon : "text-zinc-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${isActive ? theme.badge : "bg-[#141417] text-zinc-300 border-[#2A2A30]"}`}>
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
