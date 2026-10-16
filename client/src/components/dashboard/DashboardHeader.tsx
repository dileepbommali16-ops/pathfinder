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
  { id: "coach", label: "AI Career Coach", icon: Bot, badge: "Gemini" },
  { id: "projects", label: "Project Blueprints", icon: Lightbulb },
  { id: "analytics", label: "Cohort Analytics", icon: TrendingUp, badge: "972" },
  { id: "resume", label: "ATS Resume Studio", icon: FileText },
  { id: "branches", label: "Branches and Courses", icon: GraduationCap, badge: "Dept" },
  { id: "defense", label: "Project Defense", icon: ShieldAlert },
  { id: "profile", label: "Profile / Settings", icon: User, badge: "SSOT" },
];

const DEFAULT_ACTIVE_THEME = {
  activeBg: "bg-[#c76f3b]/15",
  text: "text-[#eae6e0] font-semibold",
  icon: "text-[#c76f3b]",
  border: "border-[#c76f3b]/40",
  glow: "shadow-[0_0_15px_rgba(199,111,59,0.2)]",
  badge: "bg-[#c76f3b]/20 text-[#eae6e0] border-[#c76f3b]/40",
  indicator: "from-transparent via-[#c76f3b] to-transparent"
};

const TAB_THEMES: Record<TabId, typeof DEFAULT_ACTIVE_THEME> = {
  overview: DEFAULT_ACTIVE_THEME,
  interview: {
    activeBg: "bg-[#8c3a2e]/25",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#c76f3b]",
    border: "border-[#8c3a2e]/50",
    glow: "shadow-[0_0_18px_rgba(140,58,46,0.3)]",
    badge: "bg-[#8c3a2e]/40 text-[#eae6e0] border-[#8c3a2e]/50",
    indicator: "from-transparent via-[#8c3a2e] to-transparent"
  },
  action: {
    activeBg: "bg-[#d97d48]/15",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#d97d48]",
    border: "border-[#d97d48]/40",
    glow: "shadow-[0_0_15px_rgba(217,125,72,0.2)]",
    badge: "bg-[#d97d48]/20 text-[#eae6e0] border-[#d97d48]/40",
    indicator: "from-transparent via-[#d97d48] to-transparent"
  },
  skills: {
    activeBg: "bg-[#b8673a]/15",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#b8673a]",
    border: "border-[#b8673a]/40",
    glow: "shadow-[0_0_15px_rgba(184,103,58,0.2)]",
    badge: "bg-[#b8673a]/20 text-[#eae6e0] border-[#b8673a]/40",
    indicator: "from-transparent via-[#b8673a] to-transparent"
  },
  coach: {
    activeBg: "bg-[#c47846]/15",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#c47846]",
    border: "border-[#c47846]/40",
    glow: "shadow-[0_0_15px_rgba(196,120,70,0.2)]",
    badge: "bg-[#c47846]/20 text-[#eae6e0] border-[#c47846]/40",
    indicator: "from-transparent via-[#c47846] to-transparent"
  },
  projects: DEFAULT_ACTIVE_THEME,
  analytics: {
    activeBg: "bg-[#8c3a2e]/20",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#b8673a]",
    border: "border-[#8c3a2e]/40",
    glow: "shadow-[0_0_15px_rgba(140,58,46,0.2)]",
    badge: "bg-[#8c3a2e]/30 text-[#eae6e0] border-[#8c3a2e]/40",
    indicator: "from-transparent via-[#8c3a2e] to-transparent"
  },
  resume: {
    activeBg: "bg-[#b8673a]/15",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#b8673a]",
    border: "border-[#b8673a]/40",
    glow: "shadow-[0_0_15px_rgba(184,103,58,0.2)]",
    badge: "bg-[#b8673a]/20 text-[#eae6e0] border-[#b8673a]/40",
    indicator: "from-transparent via-[#b8673a] to-transparent"
  },
  branches: {
    activeBg: "bg-[#d97d48]/15",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#d97d48]",
    border: "border-[#d97d48]/40",
    glow: "shadow-[0_0_15px_rgba(217,125,72,0.2)]",
    badge: "bg-[#d97d48]/20 text-[#eae6e0] border-[#d97d48]/40",
    indicator: "from-transparent via-[#d97d48] to-transparent"
  },
  defense: {
    activeBg: "bg-[#8c3a2e]/20",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#8c3a2e]",
    border: "border-[#8c3a2e]/40",
    glow: "shadow-[0_0_15px_rgba(140,58,46,0.2)]",
    badge: "bg-[#8c3a2e]/30 text-[#eae6e0] border-[#8c3a2e]/40",
    indicator: "from-transparent via-[#8c3a2e] to-transparent"
  },
  profile: {
    activeBg: "bg-[#b8673a]/15",
    text: "text-[#eae6e0] font-semibold",
    icon: "text-[#b8673a]",
    border: "border-[#b8673a]/40",
    glow: "shadow-[0_0_15px_rgba(184,103,58,0.2)]",
    badge: "bg-[#b8673a]/20 text-[#eae6e0] border-[#b8673a]/40",
    indicator: "from-transparent via-[#b8673a] to-transparent"
  },
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
    <header className="sticky top-0 z-50 border-b border-[rgba(234,230,224,0.08)] bg-[#141318]/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
      {/* Subtle Copper Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#c76f3b]/35 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1c1a22] via-[#24222b] to-[#292632] shadow-md ring-1 ring-[#c76f3b]/40">
            <GraduationCap className="h-5 w-5 text-[#c76f3b]" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c76f3b] opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#c76f3b] shadow-[0_0_8px_rgba(199,111,59,0.9)]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#eae6e0] drop-shadow-sm font-['Space_Grotesk']">
                Pathfinder <span className="text-[#c76f3b]">2.0</span>
              </span>
              <span className="rounded-md border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#c76f3b] uppercase shadow-sm">
                AI
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-[rgba(234,230,224,0.12)] bg-[#1c1a22] px-2 py-0.5 text-[10px] font-medium text-[#eae6e0] uppercase tracking-wider">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-[#938e87]">Campus Placement & Engineering Intelligence</p>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & Edit Candidate Profile"
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] px-3.5 py-1.5 shadow-sm backdrop-blur-xl hover:border-[#c76f3b]/40 hover:bg-[#24222b] transition-all cursor-pointer text-left"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c76f3b]/20 text-[11px] font-bold text-[#c76f3b] shadow-sm ring-1 ring-[#c76f3b]/40">
              {username ? username.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-semibold text-[#eae6e0]">{username || "Student"}</span>
                {userRole === "admin" ? (
                  <span className="text-[9px] font-medium text-[#c76f3b] bg-[#c76f3b]/10 border border-[#c76f3b]/30 px-1 rounded">ADMIN</span>
                ) : (
                  <ShieldCheck className="h-3 w-3 text-[#938e87]" />
                )}
              </div>
              {email && <span className="text-[10px] text-[#938e87] leading-none">{email}</span>}
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] px-3 py-1.5 text-xs font-medium text-[#938e87] transition-all hover:border-[#c76f3b]/40 hover:text-[#eae6e0] active:scale-95 shadow-sm cursor-pointer"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-[rgba(234,230,224,0.08)] bg-[#141318]/90 px-4 sm:px-6">
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
                    : "text-[#938e87] hover:bg-white/[0.04] hover:text-[#eae6e0] border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? theme.icon : "text-[#938e87]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${isActive ? theme.badge : "bg-[#1c1a22] text-[#938e87] border-[rgba(234,230,224,0.08)]"}`}>
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
