import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isOwnerAccount } from "@/lib/auth";
import {
  Target,
  Compass,
  TrendingUp,
  FileText,
  LogOut,
  Sparkles,
  ShieldCheck,
  User,
  GraduationCap,
  Lightbulb,
  Zap,
  Mic,
  Menu,
  X
} from "lucide-react";

export type TabId =
  | "overview"
  | "interview"
  | "skills"
  | "branches"
  | "analytics"
  | "profile"
  | "roles"
  | "projects"
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
  { id: "profile", label: "Profile / Settings", icon: User, badge: "Input" },
  { id: "overview", label: "Dashboard", icon: Target },
  { id: "skills", label: "6-Week Roadmap", icon: Compass, badge: "Sprint" },
  { id: "projects", label: "Project Blueprints", icon: Lightbulb },
  { id: "resume", label: "ATS Resume Studio", icon: FileText },
  { id: "interview", label: "Interview & Defense", icon: Mic, badge: "Live" },
  { id: "analytics", label: "Cohort Analytics", icon: TrendingUp, badge: "972" },
  { id: "branches", label: "Branches and Courses", icon: GraduationCap, badge: "Dept" },
];

const UNIFIED_BLACK_BROWN_THEME = {
  activeBg: "bg-[#050606]",
  text: "text-[#050606] font-semibold",
  icon: "text-[#050606]",
  border: "border-[#050606]",
  glow: "shadow-none",
  badge: "bg-[#000000] text-[#050606] border-[#050606]",
  indicator: "from-[#000000] via-[#050606] to-[#000000]"
};

const TAB_THEMES: Record<TabId, typeof UNIFIED_BLACK_BROWN_THEME> = {
  overview: UNIFIED_BLACK_BROWN_THEME,
  interview: UNIFIED_BLACK_BROWN_THEME,
  skills: UNIFIED_BLACK_BROWN_THEME,
  projects: UNIFIED_BLACK_BROWN_THEME,
  analytics: UNIFIED_BLACK_BROWN_THEME,
  resume: UNIFIED_BLACK_BROWN_THEME,
  branches: UNIFIED_BLACK_BROWN_THEME,
  profile: UNIFIED_BLACK_BROWN_THEME,
  roles: UNIFIED_BLACK_BROWN_THEME,
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  activeTab,
  setActiveTab,
  username,
  email,
  onLogout,
  userRole = "student",
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectTab = (tabId: TabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#050606] bg-[#000000]/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
      {/* Subtle Dual Horizon Accent */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#050606] to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Clickable Website Brand Logo — Styled strictly in #000000 & #050606 */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("overview");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none"
          title="Return to Dashboard Overview"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#000000] shadow-md ring-1 ring-[#050606] transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-[#050606] transition-colors group-hover:text-[#050606]" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#050606] opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#050606]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span id="brand-site-title" className="text-lg font-bold tracking-tight text-[#050606] drop-shadow-sm font-['Space_Grotesk'] group-hover:text-[#050606]">
                Pathfinder <span className="text-[#050606]">2.0</span>
              </span>
              <span className="rounded-md border border-[#050606] bg-[#000000] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#050606] uppercase shadow-sm">
                AI
              </span>
              {userRole === "admin" && (
                <span className="rounded-md border border-[#050606] bg-[#000000] px-2 py-0.5 text-[10px] font-medium text-[#050606] uppercase tracking-wider">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-[#050606] font-medium">Campus Placement &amp; Engineering Intelligence</p>
          </div>
        </button>

        {/* User Identity, Mobile Hamburger & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {(() => {
            const isBoss = isOwnerAccount(email);

            const displayUser = isBoss ? "Dileep (Boss)" : (username || "Student");
            const displayEmail = isBoss ? "dileepbommali16@gmail.com" : email;

            return (
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                title="View & Edit Candidate Profile"
                className="hidden sm:flex items-center gap-2.5 rounded-full border border-[#050606] bg-[#000000] px-3.5 py-1.5 shadow-sm backdrop-blur-xl hover:bg-[#050606] transition-all cursor-pointer text-left"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ring-1 bg-[#050606] text-[#050606] ring-[#050606]">
                  {isBoss ? "👑" : (username ? username.charAt(0).toUpperCase() : "U")}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-xs font-semibold text-[#050606]">{displayUser}</span>
                    {isBoss ? (
                      <span className="text-[9px] font-bold text-[#050606] bg-[#050606] border border-[#050606] px-1 rounded">BOSS</span>
                    ) : userRole === "admin" ? (
                      <span className="text-[9px] font-medium text-[#050606] bg-[#050606] border border-[#050606] px-1 rounded">ADMIN</span>
                    ) : (
                      <ShieldCheck className="h-3 w-3 text-[#050606]" />
                    )}
                  </div>
                  {displayEmail && <span className="text-[10px] text-[#050606] leading-none">{displayEmail}</span>}
                </div>
              </button>
            );
          })()}

          {/* Photo 3 - Item 3: Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[#050606] bg-[#000000] text-[#050606] hover:bg-[#050606] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-[#050606]" /> : <Menu className="h-5 w-5 text-[#050606]" />}
          </button>

          <button
            onClick={onLogout}
            data-agent-id="logout-btn"
            data-agent-danger="true"
            className="flex items-center gap-1.5 rounded-xl border border-[#050606] bg-[#000000] px-3 py-1.5 text-xs font-medium text-[#050606] transition-all hover:bg-[#050606] hover:text-[#050606] active:scale-95 shadow-sm cursor-pointer"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar (Desktop and Horizontal Scroll) */}
      <div className="border-t border-[#050606] bg-[#000000]/95 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const theme = TAB_THEMES[tab.id] || UNIFIED_BLACK_BROWN_THEME;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                data-agent-id={`tab-${tab.id}`}
                aria-label={tab.label}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? `${theme.activeBg} ${theme.text} border ${theme.border} ${theme.glow}`
                    : "bg-[#000000] text-[#050606] hover:bg-[#050606] hover:text-[#050606] border border-transparent"
                }`}
              >
                <span className="text-[10px] font-bold tabular-nums text-[#050606]">
                  {idx + 1}.
                </span>
                <Icon className={`h-3.5 w-3.5 ${isActive ? theme.icon : "text-[#050606]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${isActive ? theme.badge : "bg-[#050606] text-[#050606] border-[#050606]"}`}>
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

      {/* Photo 3 - Item 3: Mobile Menu Drawer Modal */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-[#050606] bg-[#000000] px-4 py-4 shadow-2xl overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TABS.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const theme = TAB_THEMES[tab.id] || UNIFIED_BLACK_BROWN_THEME;
                return (
                  <button
                    key={`mobile-${tab.id}`}
                    aria-label={tab.label}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-center justify-between rounded-xl p-3 text-left transition-all ${
                      isActive
                        ? `${theme.activeBg} ${theme.text} border ${theme.border}`
                        : "bg-[#000000] text-[#050606] hover:bg-[#050606] hover:text-[#050606] border border-[#050606]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-[#000000] text-[#050606]" : "bg-[#050606] text-[#050606]"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold">
                        <span className="mr-1.5 opacity-60">{idx + 1}.</span>
                        {tab.label}
                      </span>
                    </div>
                    {tab.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isActive ? theme.badge : "bg-[#050606] text-[#050606] border-[#050606]"}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

