import React, { useState } from "react";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import { TabId } from "./DashboardHeader";
import { ComplianceModal } from "./ComplianceModals";

interface FooterProps {
  onNavigateTab: (tab: TabId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab }) => {
  const currentYear = new Date().getFullYear();
  const [modalType, setModalType] = useState<"privacy" | "terms">("privacy");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCompliance = (type: "privacy" | "terms") => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative z-10 mt-28 border-t border-white/[0.08] bg-black/90 text-[#A1A1AA]">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & System Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <PathfinderLogo size={30} variant="monochrome" />
              <span className="text-base font-semibold tracking-[-0.025em] text-[#FAFAFA]">
                Pathfinder
              </span>
              <span className="rounded border border-white/[0.1] bg-[#121216] px-1.5 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
                2.0
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Full-stack engineering placement intelligence calibrated on a 972-record synthetic
              placement dataset, augmented from a 215-record public baseline, pairing scikit-learn
              probability models with live 3D voice coaching.
            </p>
          </div>

          {/* Column 2: Core Modules */}
          <div>
            <h3 className="mb-4 text-xs font-semibold text-[#FAFAFA]">Core modules</h3>
            <ul className="space-y-3 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("overview");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  Readiness overview
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("interview");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  Coding &amp; viva arena
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("overview");
                    window.dispatchEvent(
                      new CustomEvent("das-toggle-focus", { detail: { focus: true } })
                    );
                    scrollToTop();
                    setTimeout(() => document.getElementById("das-command-input")?.focus(), 180);
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  DAS 3D voice coach (EN / TE / HI)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("projects");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  28 system blueprints
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("resume");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  JD &amp; ATS resume lab
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Dataset */}
          <div>
            <h3 className="mb-4 text-xs font-semibold text-[#FAFAFA]">Dataset</h3>
            <ul className="space-y-3 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("analytics");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  Placement dataset analytics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("branches");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  Department cutoffs &amp; stats
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("skills");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  6-week execution roadmap
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("profile");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  Candidate profile settings
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Dataset Credit & Attribution */}
          <div className="space-y-3" data-dataset-credit="public-baseline-215">
            <h3 className="text-xs font-semibold text-[#FAFAFA]">Dataset Credit</h3>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Uses a 972-record synthetic placement dataset, augmented from a 215-record public
              baseline (not private college records).
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <p className="font-mono text-[11px] text-[#D4D4D8]">
                Baseline: 215-record public placement dataset (source URL &amp; license credit pending)
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("profile");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  Open profile settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-6 text-xs text-[#71717A] sm:flex-row">
          <p>© {currentYear} Pathfinder 2.0 Career Intelligence. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => openCompliance("privacy")}
              className="transition-colors hover:text-[#FAFAFA]"
            >
              Privacy policy
            </button>
            <button
              type="button"
              onClick={() => openCompliance("terms")}
              className="transition-colors hover:text-[#FAFAFA]"
            >
              Terms of service
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="pf-btn-secondary inline-flex h-8 items-center rounded-lg px-3.5 text-xs text-[#D4D4D8] hover:text-[#FAFAFA]"
            >
              Back to top
            </button>
          </div>
        </div>
      </div>

      <ComplianceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
      />
    </footer>
  );
};
