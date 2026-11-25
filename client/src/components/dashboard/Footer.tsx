import React, { useState } from "react";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import { Phone, Mail, MapPin, ArrowUp } from "lucide-react";
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
    <footer className="relative z-10 mt-20 border-t border-[#1F1F23] bg-[#000000]/90 text-[#A1A1AA]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Column 1: Brand & System Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <PathfinderLogo size={30} variant="monochrome" />
              <span className="text-base font-semibold tracking-[-0.02em] text-[#FAFAFA]">
                Pathfinder
              </span>
              <span className="rounded border border-[#27272A] bg-[#111113] px-1.5 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
                2.0
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Full-stack engineering placement intelligence calibrated on 972 verified campus
              offers, pairing scikit-learn probability models with live 3D voice coaching.
            </p>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#1F1F23] bg-[#0C0C0E] px-2.5 py-1 font-mono text-[11px] text-[#D4D4D8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <span>All 7 subsystems operational</span>
            </div>
          </div>

          {/* Column 2: Core Modules */}
          <div>
            <h3 className="mb-3 text-xs font-semibold text-[#FAFAFA]">Core modules</h3>
            <ul className="space-y-2 text-xs">
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
                  className="flex items-center gap-1.5 text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  <span>Coding &amp; viva arena</span>
                  <span className="rounded border border-[#27272A] bg-[#111113] px-1 font-mono text-[9px] text-[#D4D4D8]">
                    LIVE
                  </span>
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

          {/* Column 3: Institutional Analytics */}
          <div>
            <h3 className="mb-3 text-xs font-semibold text-[#FAFAFA]">Institutional data</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("analytics");
                    scrollToTop();
                  }}
                  className="text-left text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
                >
                  972 cohort explorer
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

          {/* Column 4: Placement Desk */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#FAFAFA]">Placement desk</h3>
            <p className="text-xs text-[#A1A1AA]">
              Questions on cohort benchmarks or institutional setup:
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <a
                href="mailto:support@pathfinder-ai.io?subject=Pathfinder%20Placement%20Inquiry"
                className="flex items-center gap-2.5 text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded border border-[#27272A] bg-[#0C0C0E] text-[#FAFAFA]">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="font-mono text-[11px]">support@pathfinder-ai.io</span>
              </a>

              <a
                href="tel:+918000000000"
                className="flex items-center gap-2.5 text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded border border-[#27272A] bg-[#0C0C0E] text-[#FAFAFA]">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <span className="font-mono text-[11px] tabular-nums">+91 80000 00000</span>
              </a>

              <div className="flex items-center gap-2.5 text-[#71717A]">
                <div className="flex h-6 w-6 items-center justify-center rounded border border-[#1F1F23] bg-[#0C0C0E] text-[#A1A1AA]">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <span>Hyderabad · India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#1F1F23] pt-6 text-xs text-[#71717A] sm:flex-row">
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
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#242429] bg-[#0C0C0E] px-2.5 text-xs text-[#D4D4D8] transition-colors hover:border-[#3F3F46] hover:text-[#FAFAFA]"
            >
              <span>Top</span>
              <ArrowUp className="h-3 w-3" />
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
