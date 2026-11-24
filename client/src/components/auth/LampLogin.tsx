import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Volume2 } from "lucide-react";
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

const STUDIO_METRICS = [
  { value: "972", label: "Cohort ML records" },
  { value: "11", label: "Compiler languages" },
  { value: "28", label: "System blueprints" },
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
      setErrorMessage("Taking longer than usual. Please try again.");
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
      setErrorMessage("Please enter your username or email address (or explore the guest workspace below).");
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
              `${providerName} sign-in is not configured yet on Render. Please set ${providerName.toUpperCase()}_CLIENT_ID and ${providerName.toUpperCase()}_CLIENT_SECRET in your Render backend environment variables.`
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
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#05070E] text-[#F8FAFC] font-['Outfit',sans-serif] selection:bg-indigo-500/30 selection:text-white">
      {/* Dimensional sapphire & cyan subsurface lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 left-1/4 h-[620px] w-[620px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(79,70,229,0.18), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.13), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-36 left-8 h-[420px] w-[420px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.09), transparent 72%)" }}
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.12]"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ maskImage: "radial-gradient(ellipse at 50% 35%, black 35%, transparent 82%)" }}
        >
          <path d="M0 140H1440M0 320H1440M0 500H1440M0 680H1440" stroke="rgba(148,163,184,0.22)" strokeWidth="0.75" />
          <path d="M240 0V900M540 0V900M840 0V900M1140 0V900" stroke="rgba(148,163,184,0.16)" strokeWidth="0.75" />
        </svg>
      </div>

      {/* Studio Brand Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <PathfinderLogo size={36} variant="studio" />
          <span className="text-[18px] font-semibold tracking-tight text-[#F8FAFC] font-['Space_Grotesk']">
            Pathfinder <span className="text-[#818CF8]">2.0</span>
          </span>
        </div>

        <p className="hidden text-xs font-medium tracking-wide text-[#7C869B] sm:block">
          Random Forest ML · 3D Puck Voice · 11-Lang Compiler
        </p>
      </header>

      {/* Main Split Studio Workspace */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-2 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:pt-6">
        {/* Left Showcase Column */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:col-span-7"
        >
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[#F8FAFC] sm:text-5xl font-['Space_Grotesk']">
            Turn campus preparation into{" "}
            <span className="bg-gradient-to-r from-[#F8FAFC] via-[#E0E7FF] to-[#93C5FD] bg-clip-text text-transparent">
              predictable offers.
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-[#94A3B8]">
            Benchmark against 972 placement records, practice in an 11-language coding arena, and
            train with DAS — your real-time 3D Puck voice mentor.
          </p>

          {/* Architectural Video Showcase Window (Single Film Trigger) */}
          <div
            onClick={() => setShowDemoModal(true)}
            className="group relative mt-7 cursor-pointer overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0B0F1A] shadow-[0_30px_90px_rgba(0,0,0,0.75)] transition-colors hover:border-indigo-400/35"
          >
            {/* Window Title Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#0E1322]/90 px-4 py-2.5 text-[11px] text-[#8A94A6]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="ml-2 font-medium text-[#CBD5E1]">
                  pathfinder-launch.mp4 · Puck Voice Walkthrough
                </span>
              </div>
              <span className="rounded bg-white/[0.06] px-2 py-0.5 font-medium text-[#93C5FD]">
                0:48 HD
              </span>
            </div>

            <div className="relative">
              <video
                src="/demo/pathfinder-launch.mp4"
                poster="/og-image.png"
                autoPlay
                muted
                loop
                playsInline
                className="aspect-video w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070E]/85 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <button
                  type="button"
                  id="btn-watch-launch-film"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDemoModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#4F46E5]/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-[#6366F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Play Full Film with Puck Voice · 0:48</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Dimensional Dark-Slate Metric Tiles */}
          <div className="mt-5 grid grid-cols-3 gap-3.5">
            {STUDIO_METRICS.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.07] bg-[#0C101C]/85 px-4 py-3"
              >
                <div className="text-lg font-semibold tracking-tight text-[#F8FAFC] font-['Space_Grotesk']">
                  {item.value}
                </div>
                <div className="text-xs text-[#8A94A6]">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Right Dimensional Graphite Auth Card */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <div className="rounded-2xl border border-white/[0.10] bg-gradient-to-b from-[#111624]/95 to-[#0A0D16]/98 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_32px_90px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#F8FAFC] font-['Space_Grotesk']">
                Sign in to Pathfinder
              </h2>
              <p className="mt-1 text-sm text-[#8A94A6]">
                Use Google, GitHub, or your campus credentials.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-100">
                {errorMessage}
              </div>
            )}

            {socialError && (
              <div className="mb-4 rounded-xl border border-sky-400/25 bg-sky-400/10 px-3.5 py-2.5 text-xs text-sky-100">
                {socialError}
              </div>
            )}

            {/* Official 4-Color Google + Crisp GitHub SSO */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-oauth-google"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("google")}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.10] bg-[#161C2E] px-3 py-2.5 text-xs font-medium text-[#F8FAFC] transition-colors hover:border-indigo-400/40 hover:bg-[#1C243B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-50"
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
                className="flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.10] bg-[#161C2E] px-3 py-2.5 text-xs font-medium text-[#F8FAFC] transition-colors hover:border-indigo-400/40 hover:bg-[#1C243B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0 fill-current text-[#F8FAFC]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15v3.19c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                <span>{socialLoading === "github" ? "Redirecting..." : "GitHub"}</span>
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-xs text-[#64748B]">or continue with email</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username-input"
                  className="mb-1.5 block text-xs font-medium text-[#CBD5E1]"
                >
                  Full Name
                </label>
                <input
                  id="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Dileep Bommali"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/[0.10] bg-[#070A12] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/25"
                />
              </div>

              <div>
                <label
                  htmlFor="login-email-input"
                  className="mb-1.5 block text-xs font-medium text-[#CBD5E1]"
                >
                  Campus or Work Email
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/[0.10] bg-[#070A12] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/25"
                />
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#6366F1] to-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-4px_rgba(79,70,229,0.55)] transition-all hover:from-[#7275F8] hover:to-[#5850EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                <span>Sign In to Dashboard</span>
              </button>
            </form>

            {/* Single Guest Shortcut */}
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
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-[#CBD5E1] transition-colors hover:border-white/[0.20] hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              <span>Explore Guest Workspace</span>
            </button>
          </div>
        </motion.section>
      </main>

      {/* Cinema Product Film Modal (Sound On with Puck Voice) */}
      <AnimatePresence>
        {showDemoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
            onClick={() => setShowDemoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080B14] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <PathfinderLogo size={22} variant="studio" />
                  <span className="text-sm font-medium text-[#F8FAFC]">
                    Pathfinder 2.0 — Product Launch Film
                  </span>
                  <span className="hidden items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300 sm:inline-flex">
                    <Volume2 className="h-3 w-3" />
                    Puck Voice Audio
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close video preview"
                  onClick={() => setShowDemoModal(false)}
                  className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
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
