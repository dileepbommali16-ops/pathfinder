import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { API_BASE } from "@/lib/apiClient";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import {
  AnimatedMetric,
  ShaderBackdrop,
  SpotlightSurface,
  WORKSPACE_SLIDES,
} from "@/components/ui/TitaniumPrimitives";

export interface ComputeLandingPageProps {
  onNavigateLogin: () => void;
  onGuestLogin: () => void;
}

const SLIDE_PREVIEWS: Record<
  string,
  { eyebrow: string; metric: string; metricLabel: string; points: string[] }
> = {
  overview: {
    eyebrow: "Slide 01 · Predictive Engine",
    metric: "120 Trees",
    metricLabel: "Hybrid score · Random Forest + evidence rubric",
    points: [
      "Hybrid score: Random Forest (88% cross-validation accuracy on a 972-record synthetic placement dataset, generated to demonstrate the pipeline) blended with an evidence rubric (projects, skills, GitHub, LeetCode, certifications, ATS)",
      "5-axis competency telemetry across academics, DSA, projects & STAR",
      "Reference cutoff benchmarks across Google, Razorpay, Amazon & TCS Digital",
    ],
  },
  resume: {
    eyebrow: "Slide 02 · JD & ATS Lab",
    metric: "5-Axis ATS",
    metricLabel: "Uninflated rubric & Google X-Y-Z audit",
    points: [
      "Instant job-description keyword parser against your skill ledger",
      "Structured Google X-Y-Z resume templates & 1-page ATS PDF export",
      "Strict hiring-manager rubric scoring with zero score inflation",
    ],
  },
  interview: {
    eyebrow: "Slide 03 · 11-Runtime Arena",
    metric: "11 Langs",
    metricLabel: "Sandboxed execution & voice defense",
    points: [
      "Execute timed company problems in Python, C++, Rust, Go, Java & TypeScript",
      "Speak complexity trade-offs and system reasoning aloud to DAS",
      "Combined code-accuracy + viva rubric scoring with optimal reference code",
    ],
  },
  projects: {
    eyebrow: "Slide 04 · Engineering Catalog",
    metric: "28 Stacks",
    metricLabel: "Software RAG & Embedded blueprints",
    points: [
      "20 production software & GenAI RAG pipelines plus 8 hardware/IoT systems",
      "End-to-end architecture diagrams, tech stack rationale & X-Y-Z resume bullets",
      "Direct 1-click architecture defense walkthrough with DAS AI",
    ],
  },
  analytics: {
    eyebrow: "Slide 05 · Synthetic Dataset Analytics",
    metric: "972 Rows",
    metricLabel: "Synthetic dataset (generated to demonstrate the pipeline) & exports",
    points: [
      "Slice placement conversion across dataset year, branch, domain & CGPA band",
      "Report format view with CSV/PDF export tables",
      "Interactive 6-week placement sprint roadmap persisted per candidate",
    ],
  },
  progress: {
    eyebrow: "Slide 06 · My Progress Journey",
    metric: "Activity Trend",
    metricLabel: "Computed from your activity in this browser",
    points: [
      "Readiness trend line from hybrid Random Forest + evidence rubric re-scores in this session",
      "Best ATS scan, Coding Arena average & interview scorecards in one view",
      "Next-best-step guidance that links straight to the right slide",
    ],
  },
  profile: {
    eyebrow: "Slide 07 · Candidate Single Source of Truth",
    metric: "Live Sync",
    metricLabel: "Real-time prediction recalibration",
    points: [
      "Edit your CGPA, conversion scale, active backlogs, internships & links",
      "Role tracks mapped across Software, AI/ML, Embedded VLSI, EV, Robotics & Civil",
      "Saving immediately re-computes offer odds across every workspace slide",
    ],
  },
};

const VOICE_BAR_HEIGHTS = [24, 46, 72, 92, 64, 38, 84, 98, 58, 76, 42, 28];

export const ComputeLandingPage: React.FC<ComputeLandingPageProps> = ({
  onNavigateLogin,
  onGuestLogin,
}) => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [previewSlideId, setPreviewSlideId] = useState<string>(WORKSPACE_SLIDES[0].id);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Wake the cloud backend early while the visitor explores the landing page
  useEffect(() => {
    const pingAt =
      typeof window !== "undefined" ? Number((window as any).__PF_LANDING_HEALTH_PING_AT__ || 0) : 0;
    if (!pingAt || Date.now() - pingAt > 10000) {
      fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => { });
    }
    const followUpId = window.setTimeout(() => {
      fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => { });
    }, 25000);
    return () => window.clearTimeout(followUpId);
  }, []);

  useEffect(() => {
    if (!showDemoModal) return;
    const video = modalVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      video.play().catch(() => { });
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDemoModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDemoModal]);

  const activeSlide =
    WORKSPACE_SLIDES.find((s) => s.id === previewSlideId) || WORKSPACE_SLIDES[0];
  const activeSlideDetail = SLIDE_PREVIEWS[activeSlide.id] || SLIDE_PREVIEWS.overview;

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip bg-[#050507] text-[#FAFAFA] antialiased selection:bg-[#FAFAFA] selection:text-[#09090B]">
      <ShaderBackdrop />

      {/* Floating Titanium Header — Single Sign in CTA */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050507]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-10">
          <a
            href="#top"
            className="inline-flex min-h-10 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
          >
            <PathfinderLogo size={30} variant="monochrome" />
            <span className="text-[15px] font-semibold tracking-[-0.025em] text-[#FAFAFA]">
              Pathfinder
            </span>
            <span className="rounded-md border border-white/[0.1] bg-[#111115] px-2 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA] tabular-nums">
              2.0
            </span>
          </a>

          <nav
            aria-label="Primary landing navigation"
            className="hidden items-center gap-9 text-[13px] font-medium text-[#A1A1AA] md:flex"
          >
            <a
              href="#walkthrough"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA]"
            >
              Walkthrough
            </a>
            <a
              href="#capabilities"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA]"
            >
              Architecture
            </a>
            <a
              href="#workspaces"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA]"
            >
              7 Workspaces
            </a>
            <a
              href="#benchmarks"
              className="inline-flex min-h-10 items-center transition-colors duration-150 hover:text-[#FAFAFA]"
            >
              Benchmarks
            </a>
          </nav>

          <button
            id="nav-sign-in"
            type="button"
            onClick={onNavigateLogin}
            className="pf-btn-secondary inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-medium active:scale-[0.98] sm:text-[13px]"
          >
            Sign in
          </button>
        </div>
      </header>

      <main id="top" className="relative z-10 mx-auto max-w-7xl px-5 sm:px-10">
        {/* Hero Stage — Spacious Editorial Scale & Exact 1 Get started CTA */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-[#0D0D11]/90 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#D4D4D8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FAFAFA]" />
              <span>Pathfinder 2.0 · Placement Intelligence Workbench</span>
            </div>

            <h1
              className="mt-7 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-[#FAFAFA] sm:text-6xl lg:text-[64px]"
              style={{ textWrap: "balance" }}
            >
              Placement readiness, engineered from structured signals.
            </h1>

            <p
              className="mt-6 max-w-2xl text-base leading-[1.7] text-[#A1A1AA] sm:text-lg"
              style={{ textWrap: "pretty" }}
            >
              Estimate your offer probability against a 972-record synthetic placement dataset,
              generated to demonstrate the pipeline, write and execute solutions across 11
              compiler runtimes, and defend system trade-offs aloud with DAS — your live 3D
              holographic voice mentor.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                id="hero-get-started"
                type="button"
                onClick={onNavigateLogin}
                className="pf-btn-primary inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium active:scale-[0.98]"
              >
                Get started
              </button>
              <button
                id="btn-landing-guest"
                type="button"
                onClick={onGuestLogin}
                className="pf-btn-secondary inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium active:scale-[0.98]"
              >
                Explore as guest
              </button>
            </div>
          </motion.div>
        </section>

        {/* Studio Hardware Video Stage */}
        <section id="walkthrough" className="pb-24 sm:pb-32">
          <div className="pf-titanium-card group relative rounded-2xl p-2 sm:p-3">
            {/* Machined window titlebar */}
            <div className="flex items-center justify-between gap-4 px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/[0.16]" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/[0.12]" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
              </div>

              <div className="hidden rounded-md border border-white/[0.08] bg-[#070709] px-3 py-1 font-mono text-[11px] text-[#A1A1AA] sm:block">
                pathfinder-client-fzom.vercel.app
              </div>

              <span className="font-mono text-[11px] text-[#8A8A92] tabular-nums">
                00:55 · 1080p · Puck Voice
              </span>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-black">
              <video
                src="/demo/pathfinder-launch.mp4"
                poster="/og-image.png"
                autoPlay
                muted
                loop
                playsInline
                className="pointer-events-none aspect-[16/9] w-full object-cover opacity-95 transition-opacity duration-200 group-hover:opacity-100"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <button
                id="btn-watch-launch-film"
                type="button"
                onClick={() => setShowDemoModal(true)}
                aria-label="Open Pathfinder 2.0 55-second product walkthrough with sound"
                className="absolute inset-0 flex items-end justify-between gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] sm:p-6 cursor-pointer"
              >
                <span className="inline-flex h-10 items-center justify-center rounded-lg border border-white/25 bg-black/85 px-4 text-xs font-medium text-[#FAFAFA] backdrop-blur-md transition-colors duration-150 group-hover:bg-black active:scale-[0.98] sm:text-sm">
                  Watch 55s walkthrough
                </span>
                <span className="hidden rounded-md border border-white/15 bg-black/80 px-3 py-1.5 font-mono text-[11px] text-[#D4D4D8] tabular-nums sm:inline-block">
                  Click anywhere to open with sound
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Asymmetric 12-Column Linear Bento Grid */}
        <section id="capabilities" className="border-t border-white/[0.07] py-24 sm:py-32">
          <div className="mb-12 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A92]">
              Core Architecture
            </span>
            <h2
              className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-4xl"
              style={{ textWrap: "balance" }}
            >
              Built like an internal engineering workbench, not a static form.
            </h2>
            <p className="mt-3 text-sm leading-[1.7] text-[#A1A1AA] sm:text-base">
              Every module shares one live candidate state so code runs, resume audits, and
              hiring predictions stay continuously synchronized.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Bento 1 (7 cols): Random Forest Readiness */}
            <SpotlightSurface className="rounded-2xl p-8 sm:p-10 lg:col-span-7">
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#8A8A92]">
                    <span>01 · PLACEMENT PROBABILITY ENGINE</span>
                    <span>120 ESTIMATORS</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-2xl">
                    Hybrid score: Random Forest + evidence rubric
                  </h3>
                  <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#A1A1AA]">
                    Blends Random Forest (88% cross-validation accuracy on a 972-record synthetic
                    placement dataset, generated to demonstrate the pipeline) with an evidence rubric
                    (projects, skills, GitHub, LeetCode, certifications, ATS).
                  </p>
                </div>

                {/* Model Output Preview Micro-Widget */}
                <div className="pf-subpanel rounded-xl p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#8A8A92]">
                        Model Preview · Hybrid Score (RF + Rubric)
                      </span>
                      <div className="mt-1 font-mono text-3xl font-semibold text-[#FAFAFA] tabular-nums">
                        84.5%
                      </div>
                    </div>
                    <span className="rounded-md border border-white/[0.1] bg-[#16161C] px-2.5 py-1 font-mono text-[11px] text-[#E4E4E7]">
                      Example Output
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { name: "Academics & Cutoff", pct: 78 },
                      { name: "DSA & Problem Solving", pct: 84 },
                      { name: "Production Projects", pct: 90 },
                    ].map((axis) => (
                      <div key={axis.name} className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[11px] text-[#A1A1AA]">
                          <span>{axis.name}</span>
                          <span className="text-[#FAFAFA] tabular-nums">{axis.pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-[#FAFAFA]"
                            style={{ width: `${axis.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SpotlightSurface>

            {/* Bento 2 (5 cols): Live 3D Voice Mentor */}
            <SpotlightSurface className="rounded-2xl p-8 sm:p-10 lg:col-span-5">
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#8A8A92]">
                    <span>02 · LIVE 3D VOICE MENTOR</span>
                    <span>EN / TE / HI</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-2xl">
                    Full-duplex coaching with DAS
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#A1A1AA]">
                    Rehearse technical explanations and architecture defense aloud with real-time
                    Puck neural speech and 3D lip-sync feedback.
                  </p>
                </div>

                {/* Voice Waveform Micro-Widget */}
                <div className="pf-subpanel rounded-xl p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono text-[11px] text-[#FAFAFA]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FAFAFA]" />
                      DAS Audio Stream
                    </span>
                    <span className="font-mono text-[10px] text-[#8A8A92]">24kHz PCM</span>
                  </div>
                  <div className="my-6 flex h-16 items-end justify-between gap-2 px-1">
                    {VOICE_BAR_HEIGHTS.map((h, i) => (
                      <span
                        key={i}
                        className="w-full rounded-full bg-gradient-to-t from-[#52525B] to-[#FAFAFA]"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-black/50 px-3.5 py-2.5 font-mono text-[11px] text-[#A1A1AA]">
                    "Walk me through your idempotency strategy at 3,000 RPS."
                  </div>
                </div>
              </div>
            </SpotlightSurface>

            {/* Bento 3 (5 cols): JD & ATS Diff Lab */}
            <SpotlightSurface className="rounded-2xl p-8 sm:p-10 lg:col-span-5">
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#8A8A92]">
                    <span>03 · JD &amp; ATS DIFF LAB</span>
                    <span>GOOGLE X-Y-Z</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-2xl">
                    Zero-fluff recruiter audit
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#A1A1AA]">
                    Paste any job description or upload a PDF resume to surface exact keyword gaps
                    and generate quantified impact rewrites.
                  </p>
                </div>

                {/* ATS Before / After Preview */}
                <div className="pf-subpanel space-y-3 rounded-xl p-5 sm:p-6">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-[#8A8A92]">
                    ATS Diff Preview
                  </span>
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/40 px-3.5 py-2.5">
                    <span className="font-mono text-xs text-[#8A8A92]">Baseline resume</span>
                    <span className="font-mono text-sm font-semibold text-[#A1A1AA] tabular-nums">
                      54%
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.14] bg-[#16161C] px-3.5 py-2.5">
                    <span className="font-mono text-xs text-[#FAFAFA]">After X-Y-Z sync</span>
                    <span className="font-mono text-sm font-semibold text-[#FAFAFA] tabular-nums">
                      89%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px] text-[#D4D4D8]">
                    <span className="rounded border border-white/[0.08] bg-black/50 px-2 py-1">
                      FastAPI
                    </span>
                    <span className="rounded border border-white/[0.08] bg-black/50 px-2 py-1">
                      Redis TTL
                    </span>
                    <span className="rounded border border-white/[0.08] bg-black/50 px-2 py-1">
                      Docker
                    </span>
                  </div>
                </div>
              </div>
            </SpotlightSurface>

            {/* Bento 4 (7 cols): 11-Runtime Coding & Viva Arena */}
            <SpotlightSurface className="rounded-2xl p-8 sm:p-10 lg:col-span-7">
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#8A8A92]">
                    <span>04 · 11-LANGUAGE COMPILER ARENA</span>
                    <span>SANDBOX EXECUTION</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-2xl">
                    Real code execution paired with oral defense
                  </h3>
                  <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#A1A1AA]">
                    Solve Amazon, Google, Microsoft, and Deloitte company tracks across 11
                    languages while proving time and space complexity in your own words.
                  </p>
                </div>

                {/* Clean Monospace Terminal Preview */}
                <div className="pf-subpanel overflow-hidden rounded-xl">
                  <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/50 px-4 py-2.5 font-mono text-[11px] text-[#A1A1AA]">
                    <span>solution.py · Python 3.11</span>
                    <span className="text-[#FAFAFA]">PASSED</span>
                  </div>
                  <pre className="overflow-x-auto p-5 font-mono text-xs leading-[1.65] text-[#D4D4D8]">
                    {`def first_occurrence(arr, target):
    lo, hi, ans = 0, len(arr) - 1, -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target: ans, hi = mid, mid - 1`}
                  </pre>
                </div>
              </div>
            </SpotlightSurface>
          </div>
        </section>

        {/* Interactive 7-Slide Workspace Previewer */}
        <section id="workspaces" className="border-t border-white/[0.07] py-24 sm:py-32">
          <div className="mb-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A92]">
                7 Integrated Slides
              </span>
              <h2
                className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-4xl"
                style={{ textWrap: "balance" }}
              >
                Seven spacious workspaces inside one studio.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#A1A1AA]">
              Switch effortlessly across every phase of placement prep without losing context or
              crowding the screen.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {WORKSPACE_SLIDES.map((slide) => {
              const isSelected = slide.id === activeSlide.id;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setPreviewSlideId(slide.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors duration-150 ${isSelected
                    ? "border-white/[0.28] bg-[#16161C] text-[#FAFAFA]"
                    : "border-white/[0.07] bg-[#0B0B0E] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
                    }`}
                >
                  <span className="font-mono text-[11px] text-[#8A8A92] tabular-nums">
                    {slide.index}
                  </span>
                  <span className="mt-1.5 text-xs font-semibold sm:text-[13px]">
                    {slide.label}
                  </span>
                </button>
              );
            })}
          </div>

          <SpotlightSurface className="mt-6 rounded-2xl p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="space-y-4 lg:col-span-7">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#A1A1AA]">
                  {activeSlideDetail.eyebrow}
                </span>
                <h3 className="text-2xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-3xl">
                  {activeSlide.label}
                </h3>
                <p className="text-sm leading-relaxed text-[#A1A1AA] sm:text-base">
                  {activeSlide.subtitle}
                </p>
                <ul className="space-y-3 pt-2">
                  {activeSlideDetail.points.map((pt, idx) => (
                    <li
                      key={pt}
                      className="flex items-start gap-3 text-xs leading-relaxed text-[#E4E4E7] sm:text-sm"
                    >
                      <span className="mt-0.5 font-mono text-[11px] text-[#8A8A92] tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5">
                <div className="pf-subpanel rounded-2xl p-7 sm:p-8">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A92]">
                    Workspace Capability
                  </span>
                  <div className="mt-3 font-mono text-4xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-5xl">
                    {activeSlideDetail.metric}
                  </div>
                  <p className="mt-2 text-xs text-[#A1A1AA] sm:text-sm">
                    {activeSlideDetail.metricLabel}
                  </p>
                </div>
              </div>
            </div>
          </SpotlightSurface>
        </section>

        {/* Dataset & Platform Benchmarks Strip */}
        <section id="benchmarks" className="border-t border-white/[0.07] py-20 sm:py-24">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <SpotlightSurface className="rounded-2xl p-7">
              <span className="font-mono text-[11px] text-[#8A8A92]">01 · DATASET</span>
              <div className="mt-3 font-mono text-3xl font-semibold text-[#FAFAFA] sm:text-4xl">
                <AnimatedMetric value={972} />
              </div>
              <p className="mt-2 text-sm text-[#A1A1AA]">
                Synthetic placement records (generated to demonstrate the pipeline)
              </p>
            </SpotlightSurface>

            <SpotlightSurface className="rounded-2xl p-7">
              <span className="font-mono text-[11px] text-[#8A8A92]">02 · RUNTIMES</span>
              <div className="mt-3 font-mono text-3xl font-semibold text-[#FAFAFA] sm:text-4xl">
                <AnimatedMetric value={11} />
              </div>
              <p className="mt-2 text-sm text-[#A1A1AA]">Sandboxed execution languages</p>
            </SpotlightSurface>

            <SpotlightSurface className="rounded-2xl p-7">
              <span className="font-mono text-[11px] text-[#8A8A92]">03 · ARCHITECTURES</span>
              <div className="mt-3 font-mono text-3xl font-semibold text-[#FAFAFA] sm:text-4xl">
                <AnimatedMetric value={28} />
              </div>
              <p className="mt-2 text-sm text-[#A1A1AA]">Software &amp; hardware blueprints</p>
            </SpotlightSurface>

            <SpotlightSurface className="rounded-2xl p-7">
              <span className="font-mono text-[11px] text-[#8A8A92]">04 · SPRINT CADENCE</span>
              <div className="mt-3 font-mono text-3xl font-semibold text-[#FAFAFA] sm:text-4xl">
                <AnimatedMetric value={6} suffix=" wk" />
              </div>
              <p className="mt-2 text-sm text-[#A1A1AA]">Tracked placement sprint roadmap</p>
            </SpotlightSurface>
          </div>
        </section>
      </main>

      {/* Spacious Minimal Footer — Zero Duplicate CTAs */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-14 text-xs text-[#8A8A92] sm:flex-row sm:px-10">
          <div className="flex items-center gap-3 text-[#D4D4D8]">
            <PathfinderLogo size={22} variant="monochrome" />
            <span className="font-medium text-[#FAFAFA]">Pathfinder 2.0</span>
          </div>
          <p className="text-center font-mono text-[11px] text-[#8A8A92] sm:text-right">
            Hybrid Score (Random Forest + Evidence Rubric) · 972-Record Synthetic Dataset · Live 3D Voice Coach
          </p>
        </div>
      </footer>

      {/* Product Walkthrough Modal (Sound On with Puck Voice) */}
      <AnimatePresence>
        {showDemoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => setShowDemoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="pf-titanium-card relative w-full max-w-5xl overflow-hidden rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <PathfinderLogo size={24} variant="monochrome" />
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    Pathfinder 2.0 — Product Walkthrough
                  </span>
                  <span className="hidden rounded border border-white/[0.1] bg-[#141418] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA] sm:inline-block">
                    Puck Voice
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close video preview"
                  onClick={() => setShowDemoModal(false)}
                  className="pf-btn-secondary inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs font-medium"
                >
                  Close
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
