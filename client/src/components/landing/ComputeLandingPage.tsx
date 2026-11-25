import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Play, Volume2, X } from "lucide-react";
import { API_BASE } from "@/lib/apiClient";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";

export interface ComputeLandingPageProps {
  onNavigateLogin: () => void;
  onGuestLogin: () => void;
}

const BENCHMARKS = [
  { index: "01", value: "972", label: "Verified campus offers" },
  { index: "02", value: "11", label: "Compiler runtimes" },
  { index: "03", value: "28", label: "System architecture blueprints" },
  { index: "04", value: "6 wk", label: "Calibrated sprint roadmap" },
];

const CAPABILITIES = [
  {
    index: "01",
    title: "Placement probability engine",
    description:
      "Random Forest model calibrated on 972 real engineering placement records, branch cutoffs, CGPA thresholds, and backlog gates.",
  },
  {
    index: "02",
    title: "Live 3D voice interviewer (DAS)",
    description:
      "Real-time WebSocket technical and behavioral interviews, STAR architecture defense, and hands-free coaching.",
  },
  {
    index: "03",
    title: "11-language compiler arena",
    description:
      "Timed coding assessments in C, C++, Java, Python, TypeScript, Go, Rust, C#, Kotlin, PHP, and Ruby with complexity feedback.",
  },
  {
    index: "04",
    title: "ATS resume diagnostics & verification",
    description:
      "Single-column ATS parsing, job-description keyword gap analysis, and live GitHub repository verification.",
  },
];

export const ComputeLandingPage: React.FC<ComputeLandingPageProps> = ({
  onNavigateLogin,
  onGuestLogin,
}) => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Wake the cloud backend early while the visitor explores the landing page
  useEffect(() => {
    fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showDemoModal) return;
    const video = modalVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      video.play().catch(() => {});
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDemoModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDemoModal]);

  return (
    <div className="min-h-dvh w-full overflow-x-clip bg-[#09090B] text-[#FAFAFA] antialiased selection:bg-[#FAFAFA] selection:text-[#09090B]">
      {/* Sticky Architectural Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#1F1F23] bg-[#09090B]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-10">
          <a
            href="#top"
            className="inline-flex min-h-10 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
          >
            <PathfinderLogo size={28} variant="monochrome" />
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#FAFAFA]">
              Pathfinder
            </span>
            <span className="rounded border border-[#27272A] bg-[#111113] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#A1A1AA] tabular-nums">
              2.0
            </span>
          </a>

          <nav
            aria-label="Primary landing navigation"
            className="hidden items-center gap-7 text-[13px] text-[#A1A1AA] md:flex"
          >
            <a
              href="#walkthrough"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              Product tour
            </a>
            <a
              href="#capabilities"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              Capabilities
            </a>
            <a
              href="#benchmarks"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              Benchmarks
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              id="nav-sign-in"
              type="button"
              onClick={onNavigateLogin}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#27272A] bg-[#111113] px-3.5 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] sm:text-[13px]"
            >
              Sign in
            </button>
            <button
              id="nav-get-started"
              type="button"
              onClick={onNavigateLogin}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] sm:text-[13px]"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Main Architectural Frame */}
      <main id="top" className="mx-auto max-w-6xl lg:border-x lg:border-[#18181B]">
        {/* Hero Section */}
        <section className="px-6 pt-14 pb-12 sm:px-10 sm:pt-20 sm:pb-14">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#1F1F23] bg-[#0E0E11] px-2.5 py-1 text-xs text-[#A1A1AA]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span>Random Forest ML + Live 3D Voice Agent</span>
          </div>

          <h1
            className="mt-5 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-[#FAFAFA] sm:text-5xl"
            style={{ textWrap: "balance" }}
          >
            Placement readiness measured in real engineering signals.
          </h1>

          <p
            className="mt-4 max-w-[56ch] text-[15px] leading-[1.6] text-[#A1A1AA] sm:text-base"
            style={{ textWrap: "pretty" }}
          >
            Benchmark your profile against 972 verified campus offers, ship code in 11 compiler
            runtimes, and rehearse technical rounds with DAS — our live 3D voice interviewer.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              id="hero-get-started"
              type="button"
              onClick={onNavigateLogin}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FAFAFA] px-5 text-sm font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              <span>Get started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              id="btn-landing-guest"
              type="button"
              onClick={onGuestLogin}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[#27272A] bg-[#111113] px-5 text-sm font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              Try guest workspace
            </button>
          </div>
        </section>

        {/* Product Walkthrough Stage */}
        <section
          id="walkthrough"
          className="border-t border-[#1F1F23] px-6 py-10 sm:px-10 sm:py-12"
        >
          <div
            onClick={() => setShowDemoModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowDemoModal(true);
              }
            }}
            aria-label="Open Pathfinder 2.0 55-second product walkthrough with sound"
            className="group cursor-pointer rounded-xl border border-[#222226] bg-[#0C0C0E] p-1.5 transition-colors duration-200 hover:border-[#3F3F46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] sm:p-2"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[11px] text-[#71717A]">
              <span className="text-[#A1A1AA]">pathfinder-2.0-walkthrough</span>
              <span className="tabular-nums">00:55 · 1080p · Puck Voice</span>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-[#050506] outline-1 -outline-offset-1 outline-white/10">
              <video
                src="/demo/pathfinder-launch.mp4"
                poster="/og-image.png"
                autoPlay
                muted
                loop
                playsInline
                className="aspect-[16/9] w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 sm:bottom-4 sm:left-4 sm:right-4">
                <button
                  id="btn-watch-launch-film"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDemoModal(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-black/75 px-4 text-xs font-medium text-[#FAFAFA] backdrop-blur-md transition-colors duration-150 hover:bg-black/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] sm:text-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Watch walkthrough with sound</span>
                </button>
                <span className="hidden rounded-md border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-[11px] text-[#D4D4D8] tabular-nums sm:inline-block">
                  00:55 · Interactive preview
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Verified Telemetry Ledger */}
        <section
          id="benchmarks"
          aria-label="Verified platform benchmarks"
          className="grid grid-cols-2 divide-y divide-[#1F1F23] border-y border-[#1F1F23] bg-[#0B0B0E] sm:divide-x lg:grid-cols-4 lg:divide-y-0"
        >
          {BENCHMARKS.map((item) => (
            <div key={item.index} className="px-6 py-6 sm:px-8">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-2xl font-semibold tracking-tight text-[#FAFAFA] tabular-nums sm:text-3xl">
                  {item.value}
                </span>
                <span className="font-mono text-[11px] text-[#52525B] tabular-nums">
                  {item.index}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-[#A1A1AA]">{item.label}</p>
            </div>
          ))}
        </section>

        {/* Core Capabilities 2x2 Hairline Grid */}
        <section
          id="capabilities"
          className="grid gap-px border-b border-[#1F1F23] bg-[#1F1F23] sm:grid-cols-2"
        >
          {CAPABILITIES.map((cap) => (
            <div key={cap.index} className="bg-[#09090B] p-6 sm:p-8">
              <div className="font-mono text-xs text-[#71717A] tabular-nums">{cap.index}</div>
              <h2
                className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[#FAFAFA]"
                style={{ textWrap: "balance" }}
              >
                {cap.title}
              </h2>
              <p
                className="mt-2 max-w-[48ch] text-sm leading-[1.6] text-[#A1A1AA]"
                style={{ textWrap: "pretty" }}
              >
                {cap.description}
              </p>
            </div>
          ))}
        </section>

        {/* Bottom Closing Band */}
        <section className="px-6 py-12 sm:px-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2
                className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl"
                style={{ textWrap: "balance" }}
              >
                Ready to measure your placement readiness?
              </h2>
              <p className="mt-1.5 text-sm text-[#A1A1AA]">
                Open your calibrated readiness model or rehearse live with DAS.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onNavigateLogin}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#FAFAFA] px-4 text-sm font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                <span>Sign in to Pathfinder</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onGuestLogin}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#27272A] bg-[#111113] px-4 text-sm font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                Continue as guest
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#1F1F23]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-[#71717A] sm:flex-row sm:px-10">
          <div className="flex items-center gap-2.5 text-[#A1A1AA]">
            <PathfinderLogo size={20} variant="monochrome" />
            <span>Pathfinder 2.0</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateLogin}
              className="inline-flex min-h-10 items-center rounded-md px-3 text-xs text-[#A1A1AA] transition-colors duration-150 hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onGuestLogin}
              className="inline-flex min-h-10 items-center rounded-md px-3 text-xs text-[#A1A1AA] transition-colors duration-150 hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              Guest workspace
            </button>
          </div>
        </div>
      </footer>

      {/* Product Walkthrough Modal (Sound On with Puck Voice) */}
      <AnimatePresence>
        {showDemoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm"
            onClick={() => setShowDemoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-[#27272A] bg-[#09090B] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#1F1F23] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <PathfinderLogo size={22} variant="monochrome" />
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    Pathfinder 2.0 — Product Walkthrough
                  </span>
                  <span className="hidden items-center gap-1.5 rounded border border-[#27272A] bg-[#111113] px-2 py-0.5 font-mono text-[11px] text-[#A1A1AA] sm:inline-flex">
                    <Volume2 className="h-3 w-3" />
                    Puck Voice
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close video preview"
                  onClick={() => setShowDemoModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-[#A1A1AA] transition-colors duration-150 hover:bg-[#18181B] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="aspect-video w-full bg-black">
                <video
                  ref={modalVideoRef}
                  src="/demo/pathfinder-launch.mp4"
                  poster="/og-image.png"
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComputeLandingPage;
