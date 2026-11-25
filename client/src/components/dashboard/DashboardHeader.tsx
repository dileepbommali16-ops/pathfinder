import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isOwnerAccount } from "@/lib/auth";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import {
  Target,
  TrendingUp,
  FileText,
  LogOut,
  ShieldCheck,
  User,
  Lightbulb,
  Mic,
  Menu,
  X,
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
  { id: "overview", label: "Overview", icon: Target, badge: "LIVE" },
  { id: "resume", label: "JD & Resume Lab", icon: FileText, badge: "ATS" },
  { id: "interview", label: "Coding & Viva Arena", icon: Mic, badge: "11-Lang" },
  { id: "projects", label: "Project Blueprints", icon: Lightbulb, badge: "28" },
  { id: "analytics", label: "Cohort & Roadmap", icon: TrendingUp, badge: "972" },
  { id: "profile", label: "Profile & Settings", icon: User },
];

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

  const isBoss = isOwnerAccount(email);
  const displayUser = isBoss ? "Dileep" : username || "Student";
  const displayEmail = isBoss ? "dileepbommali16@gmail.com" : email;
  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1F1F23] bg-[#000000]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        {/* Left: Architectural Brand & Breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="group flex items-center gap-2.5 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            title="Return to Overview"
          >
            <PathfinderLogo size={30} showPulse />
            <div className="flex items-center gap-2">
              <span
                id="brand-site-title"
                className="text-[15px] font-semibold tracking-[-0.02em] text-[#FAFAFA]"
              >
                Pathfinder
              </span>
              <span className="rounded border border-[#27272A] bg-[#111113] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA] tabular-nums">
                2.0
              </span>
            </div>
          </button>

          <span className="hidden text-[#27272A] sm:inline" aria-hidden="true">
            /
          </span>

          <span className="hidden truncate text-xs font-medium text-[#A1A1AA] sm:inline">
            {activeTabMeta?.label || "Workspace"}
          </span>

          {userRole === "admin" && (
            <span className="hidden rounded border border-[#27272A] bg-[#141418] px-2 py-0.5 font-mono text-[10px] font-medium text-[#D4D4D8] md:inline-block">
              Admin
            </span>
          )}
        </div>

        {/* Right: Candidate Identity, Mobile Menu & Sign Out */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & edit candidate profile"
            className="hidden h-9 items-center gap-2.5 rounded-lg border border-[#242429] bg-[#0C0C0E] px-3 text-left transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#141418] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] sm:flex"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#18181B] font-mono text-[10px] font-semibold text-[#FAFAFA] ring-1 ring-[#27272A]">
              {displayUser.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-xs font-medium text-[#FAFAFA]">{displayUser}</span>
              {isBoss ? (
                <span className="rounded border border-[#3F3F46] bg-[#18181B] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#FAFAFA]">
                  OWNER
                </span>
              ) : userRole === "admin" ? (
                <span className="rounded border border-[#3F3F46] bg-[#18181B] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#D4D4D8]">
                  ADMIN
                </span>
              ) : (
                <ShieldCheck className="h-3 w-3 text-[#71717A]" />
              )}
              {displayEmail && (
                <span className="hidden font-mono text-[10px] text-[#71717A] lg:inline">
                  {displayEmail}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#242429] bg-[#0C0C0E] text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#141418] md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <button
            onClick={onLogout}
            data-agent-id="logout-btn"
            data-agent-danger="true"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#242429] bg-[#0C0C0E] px-3 text-xs font-medium text-[#A1A1AA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#141418] hover:text-[#FAFAFA] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            title="Sign out of Pathfinder"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Secondary Navigation Rail (COMPUTE Numbered Tabs) */}
      <div className="border-t border-[#18181B] bg-[#000000]/92 px-4 sm:px-6">
        <nav
          aria-label="Primary workspace navigation"
          className="mx-auto flex w-full max-w-[1440px] flex-nowrap items-center gap-1.5 overflow-x-auto py-2 scrollbar-none"
        >
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const indexLabel = String(idx + 1).padStart(2, "0");
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                data-agent-id={`tab-${tab.id}`}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] ${
                  isActive
                    ? "border border-[#2E2E34] bg-[#16161A] text-[#FAFAFA]"
                    : "border border-transparent text-[#A1A1AA] hover:bg-[#111114] hover:text-[#FAFAFA]"
                }`}
              >
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    isActive ? "text-[#A1A1AA]" : "text-[#52525B]"
                  }`}
                >
                  {indexLabel}
                </span>
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#FAFAFA]" : "text-[#71717A]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 font-mono text-[9px] tabular-nums ${
                      isActive
                        ? "border-[#3F3F46] bg-[#0C0C0E] text-[#FAFAFA]"
                        : "border-[#222226] bg-[#0C0C0E] text-[#71717A]"
                    }`}
                  >
                    {tab.badge === "LIVE" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    )}
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-x-2 -bottom-[9px] h-[1.5px] bg-[#FAFAFA]"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[#1F1F23] bg-[#09090B] px-4 py-3 md:hidden"
          >
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {TABS.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const indexLabel = String(idx + 1).padStart(2, "0");
                return (
                  <button
                    key={`mobile-${tab.id}`}
                    aria-label={tab.label}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex min-h-11 items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "border-[#3F3F46] bg-[#16161A] text-[#FAFAFA]"
                        : "border-[#1F1F23] bg-[#0C0C0E] text-[#A1A1AA] hover:border-[#2E2E34] hover:text-[#FAFAFA]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                        {indexLabel}
                      </span>
                      <Icon className="h-4 w-4 text-[#D4D4D8]" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
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
