import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Volume2, ArrowRight, Check } from "lucide-react";
import { API_BASE, fetchWithTimeout } from "@/lib/apiClient";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";

interface LampLoginProps {
  onLogin: (user: {
    username: string;
    email: string;
    isNewUser?: boolean;
    bypassOnboarding?: boolean;
  }) => void;
  initialError?: string | null;
}

const TELEMETRY_CELLS = [
  { index: "01", value: "972", label: "Verified cohort records" },
  { index: "02", value: "11", label: "Compiler runtimes" },
  { index: "03", value: "28", label: "System blueprints" },
];

const SYSTEM_CAPABILITIES = [
  "Random Forest placement probability calibrated on real campus cutoffs",
  "Live 3D voice mock interviews and STAR architecture defense with DAS",
  "Single-column ATS resume diagnostics and 6-week execution sprints",
];

export const LampLogin: React.FC<LampLoginProps> = ({ onLogin, initialError }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const submittingRef = useRef(false);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

  // Wake the (possibly sleeping) Render backend early; fire and forget
  useEffect(() => {
    fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  // Reset the social loading state when the page is restored from back/forward cache
  useEffect(() => {
    const handlePageShow = () => {
      setSocialLoading(null);
      setSocialError(null);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Safety net: never stay on "Redirecting..." forever
  useEffect(() => {
    if (!socialLoading) return;
    const timer = setTimeout(() => {
      setSocialLoading(null);
      setSocialError(null);
      setErrorMessage("Connection timed out. Please try signing in again.");
    }, 20000);
    return () => clearTimeout(timer);
  }, [socialLoading]);

  useEffect(() => {
    if (!showDemoModal) return;
    const v = modalVideoRef.current;
    if (v) {
      v.currentTime = 0;
      v.muted = false;
      v.play().catch(() => {});
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDemoModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDemoModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const cleanUser = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUser && !cleanEmail) {
      setErrorMessage("Enter your full name or email address, or continue in guest mode below.");
      return;
    }

    submittingRef.current = true;
    window.setTimeout(() => {
      submittingRef.current = false;
    }, 1500);

    const finalUser = cleanUser || cleanEmail;
    const finalEmail =
      cleanEmail ||
      (cleanUser.includes("@")
        ? cleanUser
        : `${cleanUser.toLowerCase().replace(/\s+/g, ".")}@pathfinder.ai`);

    setErrorMessage(null);
    onLogin({
      username: finalUser,
      email: finalEmail,
    });
  };

  const handleSocialLogin = async (platform: "google" | "github") => {
    const providerName = platform === "google" ? "Google" : "GitHub";
    setErrorMessage(null);
    setSocialError(null);
    setSocialLoading(platform);
    setSocialError(`Connecting to ${providerName}...`);

    try {
      try {
        const checkResp = await fetchWithTimeout(`${API_BASE}/api/auth/oauth-urls`, {}, 3000);
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          const isConfigured = platform === "google" ? checkData.google_configured : checkData.github_configured;
          if (!isConfigured) {
            setSocialLoading(null);
            setSocialError(null);
            setErrorMessage(
              `${providerName} sign-in is not configured yet on Render. Set ${providerName.toUpperCase()}_CLIENT_ID and ${providerName.toUpperCase()}_CLIENT_SECRET in your backend environment.`
            );
            return;
          }
        }
      } catch {
        // Fall back to direct redirect if pre-check encounters network issues
      }

      window.location.href = `${API_BASE}/api/auth/${platform}/start?origin=${encodeURIComponent(window.location.origin)}`;
    } catch {
      setSocialLoading(null);
      setSocialError(null);
      setErrorMessage(`${providerName} sign-in is unavailable right now. Please try again.`);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#09090B] text-[#FAFAFA] antialiased selection:bg-[#FAFAFA] selection:text-[#09090B]">
      <div className="mx-auto grid min-h-dvh w-full lg:grid-cols-12">
        {/* LEFT COLUMN — COMPUTE Architectural Product Showcase */}
        <section className="relative flex flex-col justify-between border-b border-[#1F1F23] bg-[#09090B] px-6 py-8 sm:px-10 lg:col-span-7 lg:border-r lg:border-b-0 xl:px-16 xl:py-10">
          {/* Top Brand & Operational Telemetry Bar */}
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PathfinderLogo size={32} variant="monochrome" />
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#FAFAFA]">
                  Pathfinder
                </span>
                <span className="rounded border border-[#27272A] bg-[#111113] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#A1A1AA] tabular-nums">
                  2.0
                </span>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-md border border-[#1F1F23] bg-[#0E0E11] px-2.5 py-1 font-mono text-[11px] text-[#A1A1AA] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <span>Operational · ML + 3D Voice</span>
            </div>
          </header>

          {/* Center Editorial Proposition + Walkthrough Frame */}
          <div className="my-10 max-w-xl lg:my-auto lg:py-8">
            <h1
              className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-[#FAFAFA] sm:text-[42px]"
              style={{ textWrap: "balance" }}
            >
              Placement readiness measured in real engineering signals
            </h1>

            <p
              className="mt-4 max-w-[56ch] text-[15px] leading-[1.6] text-[#A1A1AA]"
              style={{ textWrap: "pretty" }}
            >
              Benchmark your profile against 972 verified campus offers, ship code in an
              11-language compiler arena, and rehearse technical rounds with DAS — our live 3D
              voice interviewer.
            </p>

            {/* Capability Checklist */}
            <ul className="mt-6 space-y-2.5">
              {SYSTEM_CAPABILITIES.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[13px] text-[#D4D4D8]">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#27272A] bg-[#141417] text-[#FAFAFA]">
                    <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {/* Concentric Architectural Video Frame (Outer 12px rounded-xl -> Inner 8px rounded-lg) */}
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
              aria-label="Play Pathfinder 2.0 55-second product film"
              className="group mt-7 cursor-pointer rounded-xl border border-[#222226] bg-[#0E0E11] p-1.5 transition-colors duration-200 hover:border-[#3F3F46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[11px] text-[#71717A]">
                <span className="text-[#A1A1AA]">pathfinder-launch.mp4</span>
                <span className="tabular-nums">00:55 · Puck Voice</span>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-[#050506] outline-1 -outline-offset-1 outline-white/10">
                <video
                  src="/demo/pathfinder-launch.mp4"
                  poster="/og-image.png"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="aspect-[16/9] max-h-[230px] w-full object-cover opacity-85 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <button
                    type="button"
                    id="btn-watch-launch-film"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDemoModal(true);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#FAFAFA] px-3.5 text-xs font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Watch product walkthrough</span>
                  </button>
                  <span className="hidden rounded border border-white/15 bg-black/70 px-2 py-1 font-mono text-[10px] text-[#D4D4D8] sm:inline-block">
                    1080p · Sound on click
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Flush Telemetry Ledger (COMPUTE 1px Hairline Grid) */}
          <div className="grid grid-cols-3 divide-x divide-[#1F1F23] overflow-hidden rounded-lg border border-[#1F1F23] bg-[#0C0C0E]">
            {TELEMETRY_CELLS.map((cell) => (
              <div key={cell.index} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-lg font-semibold tracking-tight text-[#FAFAFA] tabular-nums sm:text-xl">
                    {cell.value}
                  </span>
                  <span className="font-mono text-[10px] text-[#52525B] tabular-nums">
                    {cell.index}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-[#A1A1AA]">{cell.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN — Auth Flows UI Kit Pure Monochrome Authentication Panel */}
        <main className="flex flex-col justify-center bg-[#050507] px-6 py-12 sm:px-12 lg:col-span-5 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[380px]"
          >
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#FAFAFA]">
                Sign in to Pathfinder
              </h2>
              <p className="mt-1.5 text-sm text-[#A1A1AA]">
                Enter your workspace credentials or continue with single sign-on.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-[#3F3F46] bg-[#141417] px-3.5 py-2.5 text-xs leading-relaxed text-[#FAFAFA]"
              >
                {errorMessage}
              </div>
            )}

            {socialError && (
              <div
                role="status"
                aria-live="polite"
                className="mt-5 rounded-lg border border-[#27272A] bg-[#111113] px-3.5 py-2.5 font-mono text-xs text-[#D4D4D8]"
              >
                {socialError}
              </div>
            )}

            {/* OAuth Providers — Official Icons on Flat Monochrome Surfaces */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                id="btn-oauth-google"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("google")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#111113] px-3 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{socialLoading === "google" ? "Redirecting..." : "Google"}</span>
              </button>

              <button
                id="btn-oauth-github"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("github")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#111113] px-3 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0 fill-current text-[#FAFAFA]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15v3.19c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                <span>{socialLoading === "github" ? "Redirecting..." : "GitHub"}</span>
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#1F1F23]" />
              <span className="text-xs text-[#71717A]">or continue with email</span>
              <div className="h-px flex-1 bg-[#1F1F23]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username-input"
                  className="mb-1.5 block text-xs font-medium text-[#D4D4D8]"
                >
                  Full name
                </label>
                <input
                  id="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Dileep Bommali"
                  autoComplete="name"
                  className="h-10 w-full rounded-lg border border-[#27272A] bg-[#0C0C0E] px-3 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors duration-150 focus:border-[#A1A1AA] focus:ring-2 focus:ring-white/10"
                />
              </div>

              <div>
                <label
                  htmlFor="login-email-input"
                  className="mb-1.5 block text-xs font-medium text-[#D4D4D8]"
                >
                  Campus or work email
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  autoComplete="email"
                  className="h-10 w-full rounded-lg border border-[#27272A] bg-[#0C0C0E] px-3 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors duration-150 focus:border-[#A1A1AA] focus:ring-2 focus:ring-white/10"
                />
              </div>

              {/* Single Crisp High-Contrast Monochrome Primary CTA */}
              <button
                id="btn-auth-submit"
                type="submit"
                className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#FAFAFA] px-4 text-sm font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                <span>Sign in to workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Quiet Secondary Entry — Non-Competing Text Action with 40px Hit Area */}
            <div className="mt-6 flex items-center justify-between border-t border-[#1F1F23] pt-5 text-xs text-[#71717A]">
              <span>Evaluating without an account?</span>
              <button
                id="btn-demo-guest"
                type="button"
                onClick={() =>
                  onLogin({
                    username: "Guest Student",
                    email: "guest@pathfinder.ai",
                    bypassOnboarding: true,
                  })
                }
                className="inline-flex min-h-10 items-center gap-1 font-medium text-[#D4D4D8] underline decoration-[#3F3F46] underline-offset-4 transition-colors duration-150 hover:text-[#FAFAFA] hover:decoration-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                <span>Continue as guest</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        </main>
      </div>

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
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
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

export default LampLogin;
