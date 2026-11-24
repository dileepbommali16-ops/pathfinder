import React, { useState } from "react";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import {
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Github,
  Sparkles,
  Bot,
  FileText,
  Target,
  ArrowUp
} from "lucide-react";
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
    <footer className="mt-20 border-t border-white/[0.08] bg-[#000000] text-[#94a3b8] transition-colors relative z-10">
      {/* Top Ambient Horizon Gradient */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#2B2024] to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Brand & Positioning */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <PathfinderLogo size={36} className="transition-transform hover:scale-105" />
              <span className="text-lg font-bold tracking-tight text-[#F7F8F8] font-['Space_Grotesk']">
                Pathfinder <span className="text-[#FD0053]">2.0</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#94a3b8]">
              Autonomous full-stack AI career intelligence platform benchmarked on 972 verified campus records. Calibrates student profiles, tutors production architectures, and prepares engineering candidates for Tier-1 recruitment filters.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2B2024] bg-[#2B2024] px-3 py-1 text-[11px] font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span>All 7 Engineering Pillars Operational</span>
            </div>
          </div>

          {/* Column 2: Platform Modules */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc] mb-3">
              Core Intelligence
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("overview"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  Executive Readiness Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("interview"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>Interview &amp; Project Defense Simulator</span>
                  <span className="text-[9px] bg-[#2B2024] text-[#f8fafc] border border-[#2B2024] px-1 rounded">Live</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("overview");
                    window.dispatchEvent(new CustomEvent("das-toggle-focus", { detail: { focus: true } }));
                    scrollToTop();
                    setTimeout(() => document.getElementById("das-command-input")?.focus(), 180);
                  }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  DAS AI Voice Coach (EN / TE / HI)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("projects"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  28 Production Project Blueprints
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("resume"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  ATS Resume Studio & Scanner
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Institutional Analytics & Governance */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc] mb-3">
              Institutional Intelligence
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("analytics"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  972 Placement Cohort Explorer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("branches"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  Branch Placement Cutoffs & Stats
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("skills"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  6-Week Career Sprint Roadmap
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab("overview");
                    setTimeout(() => {
                      document.getElementById("career-action-center")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 180);
                  }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  Readiness Command Center
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onNavigateTab("profile"); scrollToTop(); }}
                  className="hover:text-[#f8fafc] transition-colors cursor-pointer text-left"
                >
                  Single Source of Truth Profile
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Support (Clickable Phone & Email) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
              Placement Desk & Support
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Have questions regarding placement data or AI coach benchmarking? Connect directly:
            </p>
            <div className="space-y-2 pt-1 text-xs">
              {/* Photo 3 - Item 19: Clickable Email */}
              <a
                href="mailto:support@pathfinder-ai.io?subject=Pathfinder%20Placement%20Inquiry"
                className="flex items-center gap-2.5 text-[#94a3b8] hover:text-[#f8fafc] transition-colors group cursor-pointer"
                title="Send an email to Pathfinder Support"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2B2024] text-white group-hover:brightness-110 transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span>support@pathfinder-ai.io</span>
              </a>

              {/* Photo 3 - Item 18: Clickable Phone Number */}
              <a
                href="tel:+918000123456"
                className="flex items-center gap-2.5 text-[#94a3b8] hover:text-[#f8fafc] transition-colors group cursor-pointer"
                title="Call Placement Office Helpline"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2B2024] text-white group-hover:brightness-110 transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <span>+91 (800) 012-3456 (Placement Helpline)</span>
              </a>

              <div className="flex items-center gap-2.5 text-[#94a3b8] pt-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2B2024] text-[#94a3b8]">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <span>National Engineering Campus, Academic Block</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="mt-12 pt-6 border-t border-[#2B2024] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748b]">
          {/* Dynamic Copyright Year & Open Source */}
          <div className="flex flex-wrap items-center gap-2">
            <span>© {currentYear} Pathfinder 2.0. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-[#94a3b8]">MIT License Open Verification</span>
            <span className="hidden sm:inline">•</span>
            <button
              type="button"
              onClick={() => openCompliance("privacy")}
              className="text-[#94a3b8] hover:text-[#f8fafc] underline-offset-4 hover:underline transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="hidden sm:inline">•</span>
            <button
              type="button"
              onClick={() => openCompliance("terms")}
              className="text-[#94a3b8] hover:text-[#f8fafc] underline-offset-4 hover:underline transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>OWASP 19-Point Hardened</span>
            </span>

            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-lg border border-[#2B2024] bg-[#000000] px-2.5 py-1 text-xs text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#2B2024] transition-colors cursor-pointer"
              title="Back to top"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>Top</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Compliance & Governance Modal */}
      <ComplianceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
      />
    </footer>
  );
};
