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
  activeBg: "bg-[#ff3b5c]/15",
  text: "text-white font-semibold",
  icon: "text-[#ff3b5c]",
  border: "border-[#ff3b5c]/40",
  glow: "shadow-[0_0_15px_rgba(255,59,92,0.2)]",
  badge: "bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/40",
  indicator: "from-transparent via-[#ff3b5c] to-transparent"
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
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0c]/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
      {/* Subtle Crimson Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff3b5c]/30 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16161a] via-[#202026] to-[#2a2a34] shadow-md ring-1 ring-[#ff3b5c]/40">
            <GraduationCap className="h-5 w-5 text-[#ff3b5c]" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff3b5c] opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff3b5c] shadow-[0_0_8px_rgba(255,59,92,0.9)]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#f2f2f0] drop-shadow-sm font-['Space_Grotesk']">
                Pathfinder <span className="text-[#ff3b5c]">2.0</span>
              </span>
              <span className="rounded-md border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#ff3b5c] uppercase shadow-sm">
                AI
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-white/[0.12] bg-[#16161a] px-2 py-0.5 text-[10px] font-medium text-[#f2f2f0] uppercase tracking-wider">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-[#8a8a92]">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & Edit Candidate Profile"
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#16161a] px-3.5 py-1.5 shadow-sm backdrop-blur-xl hover:border-[#ff3b5c]/40 hover:bg-[#1a1a20] transition-all cursor-pointer text-left"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff3b5c]/20 text-[11px] font-bold text-[#ff3b5c] shadow-sm ring-1 ring-[#ff3b5c]/40">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-[#f2f2f0]">{username || "Student"}</span>
                {userRole === "admin" ? (
                  <span className="text-[9px] font-medium text-[#ff3b5c] bg-[#ff3b5c]/10 border border-[#ff3b5c]/30 px-1 rounded">ADMIN</span>
                ) : (
                  <ShieldCheck className="h-3 w-3 text-[#c7c7cf]" />
                )}
              </div>
              {email && <span className="text-[10px] text-[#8a8a92] leading-none">{email}</span>}
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#16161a] px-3 py-1.5 text-xs font-medium text-[#c7c7cf] transition-all hover:border-[#ff3b5c]/40 hover:text-white active:scale-95 shadow-sm cursor-pointer"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-white/[0.08] bg-[#0a0a0c]/80 px-4 sm:px-6">
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
                className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? `${theme.activeBg} ${theme.text} border ${theme.border} ${theme.glow}`
                    : "text-[#8a8a92] hover:bg-white/[0.04] hover:text-[#f2f2f0] border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? theme.icon : "text-[#8a8a92]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${isActive ? theme.badge : "bg-[#16161a] text-[#8a8a92] border-white/[0.08]"}`}>
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
