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
  activeBg: "bg-[#FF6B4A]/15",
  text: "text-[#F2F2F3]",
  icon: "text-[#FF6B4A]",
  border: "border-[#FF6B4A]/40",
  glow: "shadow-[0_0_18px_rgba(255,107,74,0.2)]",
  badge: "bg-[#FF6B4A]/20 text-[#FF6B4A] border-[#FF6B4A]/30",
  indicator: "from-[#FF6B4A] to-[#FF8A6E]"
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
    <header className="sticky top-0 z-50 border-b border-[#2A2A30] bg-[#1B1B1F]/90 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
      {/* Subtle Glowing Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF6B4A]/25 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#C2452B] to-[#FF6B4A] shadow-lg shadow-[#FF6B4A]/25 ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF8A6E] opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF6B4A] shadow-[0_0_8px_rgba(255,107,74,0.8)]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#F2F2F3] drop-shadow-sm">Pathfinder</span>
              <span className="rounded-md border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#FF6B4A] uppercase shadow-[0_0_10px_rgba(255,107,74,0.2)]">
                AI 2.0
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-[#FF6B4A]/40 bg-[#FF6B4A]/20 px-2 py-0.5 text-[10px] font-bold text-[#FF8A6E] uppercase tracking-wider shadow-[0_0_10px_rgba(255,107,74,0.3)]">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA]">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & Edit Candidate Profile"
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-[#2A2A30] bg-[#141417] px-3.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:border-[#FF6B4A]/40 hover:bg-[#1B1B1F] transition-all cursor-pointer text-left"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#C2452B] to-[#FF6B4A] text-[11px] font-bold text-white shadow-sm">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-[#F2F2F3]">{username || "Student"}</span>
                {userRole === "admin" ? (
                  <span className="text-[9px] font-bold text-[#FF6B4A] bg-[#FF6B4A]/10 border border-[#FF6B4A]/30 px-1 rounded">ADMIN</span>
                ) : (
                  <ShieldCheck className="h-3 w-3 text-[#FF6B4A]" />
                )}
              </div>
              {email && <span className="text-[10px] text-[#A1A1AA] leading-none">{email}</span>}
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#141417] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 active:scale-95 shadow-sm"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-[#2A2A30] bg-black/20 px-4 sm:px-6">
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
                    : "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F2F2F3] border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? theme.icon : "text-[#A1A1AA]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${isActive ? theme.badge : "bg-[#141417] text-[#A1A1AA] border-[#2A2A30]"}`}>
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
