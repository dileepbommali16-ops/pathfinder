import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isOwnerAccount } from "@/lib/auth";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import { WORKSPACE_SLIDES } from "@/components/ui/TitaniumPrimitives";

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

const TABS: { id: TabId; label: string }[] = WORKSPACE_SLIDES.map((s) => ({
  id: s.id as TabId,
  label: s.label,
}));

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
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));
  const activeTabMeta = TABS[activeIndex];
  const slideBadge = `Slide ${String(activeIndex + 1).padStart(2, "0")} / 06`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#050507]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-10">
        {/* Left: Brand & Active Slide Breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex min-h-10 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            title="Return to Overview"
          >
            <PathfinderLogo size={30} showPulse />
            <div className="flex items-center gap-2">
              <span
                id="brand-site-title"
                className="text-[15px] font-semibold tracking-[-0.025em] text-[#FAFAFA]"
              >
                Pathfinder
              </span>
              <span className="rounded-md border border-white/[0.1] bg-[#121216] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA] tabular-nums">
                2.0
              </span>
            </div>
          </button>

          <span className="hidden text-white/[0.16] sm:inline" aria-hidden="true">
            /
          </span>

          <span className="hidden truncate text-xs font-medium text-[#D4D4D8] sm:inline">
            {activeTabMeta?.label || "Workspace"}
          </span>

          <span className="hidden rounded-md border border-white/[0.08] bg-[#0F0F13] px-2 py-0.5 font-mono text-[10px] text-[#8A8A92] tabular-nums md:inline-block">
            {slideBadge}
          </span>

          {userRole === "admin" && (
            <span className="hidden rounded-md border border-white/[0.12] bg-[#141418] px-2 py-0.5 font-mono text-[10px] font-medium text-[#D4D4D8] md:inline-block">
              Admin
            </span>
          )}
        </div>

        {/* Right: Candidate Identity & Sign Out */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="View & edit candidate profile"
            className="pf-btn-secondary hidden h-10 items-center gap-2.5 rounded-lg px-3.5 text-left sm:flex"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.08] font-mono text-[10px] font-semibold text-[#FAFAFA]">
              {displayUser.charAt(0).toUpperCase()}
            </span>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-xs font-medium text-[#FAFAFA]">{displayUser}</span>
              {isBoss ? (
                <span className="rounded border border-white/[0.16] bg-[#1C1C22] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#FAFAFA]">
                  OWNER
                </span>
              ) : userRole === "admin" ? (
                <span className="rounded border border-white/[0.14] bg-[#18181D] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#D4D4D8]">
                  ADMIN
                </span>
              ) : null}
              {displayEmail && (
                <span className="hidden font-mono text-[10px] text-[#8A8A92] xl:inline">
                  {displayEmail}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="pf-btn-secondary inline-flex h-10 items-center justify-center rounded-lg px-3.5 text-xs font-medium md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>

          <button
            onClick={onLogout}
            data-agent-id="logout-btn"
            data-agent-danger="true"
            className="pf-btn-secondary inline-flex h-10 items-center rounded-lg px-3.5 text-xs font-medium text-[#D4D4D8] hover:text-[#FAFAFA] active:scale-[0.98]"
            title="Sign out of Pathfinder"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Spacious 6-Slide Segmented Navigation Dock — Zero Icons */}
      <div className="border-t border-white/[0.06] bg-black/75 px-5 py-2.5 sm:px-10">
        <nav
          aria-label="Primary workspace navigation"
          className="mx-auto flex w-full max-w-[1400px] items-center gap-2 overflow-x-auto scrollbar-none lg:grid lg:grid-cols-6"
        >
          {TABS.map((tab, idx) => {
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
                className={`relative flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] ${isActive
                    ? "border border-white/[0.16] bg-[#141419] text-[#FAFAFA] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border border-transparent text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#FAFAFA]"
                  }`}
              >
                <span
                  className={`font-mono text-[11px] tabular-nums ${isActive ? "text-[#FAFAFA]" : "text-[#8A8A92]"
                    }`}
                >
                  {indexLabel}
                </span>
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full bg-[#FAFAFA]"
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
            className="overflow-hidden border-t border-white/[0.08] bg-[#09090B] px-5 py-4 md:hidden"
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {TABS.map((tab, idx) => {
                const isActive = activeTab === tab.id;
                const indexLabel = String(idx + 1).padStart(2, "0");
                return (
                  <button
                    key={`mobile-${tab.id}`}
                    aria-label={tab.label}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors ${isActive
                        ? "border-white/[0.22] bg-[#16161C] text-[#FAFAFA]"
                        : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.15] hover:text-[#FAFAFA]"
                      }`}
                  >
                    <span className="font-mono text-[11px] text-[#8A8A92] tabular-nums">
                      {indexLabel}
                    </span>
                    <span className="text-xs font-medium">{tab.label}</span>
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
