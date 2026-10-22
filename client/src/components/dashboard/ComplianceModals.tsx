import React from "react";
import { X, ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "privacy" | "terms";
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/[0.08] bg-[#0a0b10] p-6 sm:p-8 shadow-2xl text-[#f8fafc]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl border border-white/[0.08] bg-[#11131c] text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {type === "privacy" ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/15 text-[#7c3aed] ring-1 ring-[#7c3aed]/40">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-['Space_Grotesk'] text-[#f8fafc]">
                  Data Privacy Policy
                </h2>
                <p className="text-xs text-[#94a3b8]">Effective Date: October 2026 · Standard Enterprise Governance</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-[#94a3b8] leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  1. Zero Voice Retention Policy
                </h3>
                <p>
                  Pathfinder 2.0 processes conversational speech streams in real time via the Web Speech API and transient server-sent events. We do not store raw microphone audio, voiceprints, or acoustic recordings on disk or cloud storage.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  2. Candidate Profile Confidentiality
                </h3>
                <p>
                  Academic records (CGPA, active backlogs, internship scores) are stored exclusively in an isolated SQLite database utilizing Write-Ahead Logging (WAL) and Row-Level Security (RLS). Cross-user profile access is prevented by server-side JWT session validation.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  3. Benchmark Data Disclosure
                </h3>
                <p>
                  The historical benchmark database comprises 972 verified campus recruitment outcomes across 9 engineering departments. All candidate names and identifiers have been fully anonymized in compliance with DPDP and FERPA privacy regulations.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  4. Third-Party Intelligence Providers
                </h3>
                <p>
                  Large Language Model queries are routed via encrypted HTTPS endpoints with prompt token minimization. Confidential identifiers and passwords are never transmitted to external model providers.
                </p>
              </section>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9f1239]/15 text-[#9f1239] ring-1 ring-[#9f1239]/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-['Space_Grotesk'] text-[#f8fafc]">
                  Terms of Service & Usage
                </h2>
                <p className="text-xs text-[#94a3b8]">Effective Date: October 2026 · Academic & Recruiter Evaluation</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-[#94a3b8] leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#9f1239]" />
                  1. Placement Prediction Disclaimer
                </h3>
                <p>
                  Pathfinder 2.0 provides probabilistic career readiness assessments generated by a trained Random Forest model (88% validation accuracy). Predictions reflect historical placement trends and do not constitute an official employment guarantee.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#9f1239]" />
                  2. Project Blueprint IP & Educational Licensing
                </h3>
                <p>
                  All 28 engineering project blueprints and architecture pipelines are published under the MIT License for academic learning, portfolio building, and technical interview preparation.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#9f1239]" />
                  3. Acceptable Use & Automated Scraping
                </h3>
                <p>
                  Automated scraping, denial-of-service stress testing without prior authorization, and attempted extraction of backend API credentials are strictly prohibited and actively rate-limited by sliding-window security filters.
                </p>
              </section>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-white/[0.08] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#11131c] hover:bg-white/10 text-[#f8fafc] border border-white/[0.08] transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
