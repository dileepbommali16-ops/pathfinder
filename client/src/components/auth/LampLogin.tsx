import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ArrowRight,
  Mic,
  LineChart,
  FileCheck2,
  X,
  Sparkles,
  ShieldCheck,
  Terminal,
} from "lucide-react";
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

const CAPABILITIES = [
  {
    icon: Mic,
    title: "Real-Time 3D Voice Coach",
    detail: "Bidirectional multimodal conversation with synchronized lip-sync and hands-free workflows.",
  },
  {
    icon: LineChart,
    title: "Explainable Placement Engine",
    detail: "Weighted probability modeling across CGPA, DSA velocity, internships, and live what-if tuning.",
  },
  {
    icon: FileCheck2,
    title: "Mock Interview & ATS Lab",
    detail: "Adaptive technical interviews, structured rubric feedback, and instant PDF skill extraction.",
  },
];

export const LampLogin: React.FC<LampLoginProps> = ({ onLogin, initialError }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const submittingRef = useRef(false);

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
      setErrorMessage("Please enter your username or email address (or use Guest / Demo Mode below).");
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#010102] text-[#F7F8F8] font-['Outfit',sans-serif] selection:bg-[#FD0053]/30 selection:text-white">
      {/* Subtle ElevenLabs x Linear atmospheric layer (GPU composite only) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full opacity-25 blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(253,0,83,0.42), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full opacity-20 blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.34), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 left-10 h-[400px] w-[400px] rounded-full opacity-15 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.32), transparent 70%)" }}
        />
        {/* Crisp orbital vector grid */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.14]"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <circle cx="360" cy="430" r="240" stroke="rgba(255,255,255,0.22)" strokeWidth="0.75" />
          <circle cx="360" cy="430" r="390" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75" strokeDasharray="6 10" />
          <circle cx="360" cy="430" r="540" stroke="rgba(255,255,255,0.08)" strokeWidth="0.75" />
          <path d="M0 112H1440" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
          <path d="M0 792H1440" stroke="rgba(255,255,255,0.05)" strokeWidth="0.75" />
        </svg>
      </div>

      {/* Minimal Top Navigation Bar */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <PathfinderLogo size={36} showPulse />
          <div className="flex items-center gap-2.5">
            <span className="text-[17px] font-semibold tracking-tight text-[#F7F8F8] font-['Space_Grotesk']">
              Pathfinder <span className="text-[#FD0053]">2.0</span>
            </span>
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-[#8a8f98] sm:inline-flex">
              AI Career Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-watch-launch-film-top"
            onClick={() => setShowDemoModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-[#F7F8F8] transition-colors hover:border-white/25 hover:bg-white/[0.09]"
          >
            <Play className="h-3 w-3 fill-current text-[#FD0053]" />
            <span>Watch Launch Film</span>
          </button>
        </div>
      </header>

      {/* Main Split Editorial Layout */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-6 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:pt-12">
        {/* Left Hero Story & Capabilities */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:col-span-7"
        >
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-[#0B0C10]/80 px-3.5 py-1.5 text-xs font-medium text-[#cbd5e1]">
            <Sparkles className="h-3.5 w-3.5 text-[#FD0053]" />
            <span>Autonomous Placement Readiness &amp; 3D Voice Coaching</span>
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-[#F7F8F8] sm:text-5xl lg:text-[56px] font-['Space_Grotesk']">
            Engineering placement clarity at{" "}
            <span className="bg-gradient-to-r from-[#FFFFFF] via-[#FCA5A5] to-[#FD0053] bg-clip-text text-transparent">
              real-time speed.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#8a8f98] sm:text-[17px]">
            Model your placement probability with explainable telemetry, spar with a live 3D voice
            interviewer, and turn skill gaps into concrete weekly execution.
          </p>

          {/* Hero Action Pills */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              id="btn-watch-launch-film"
              onClick={() => setShowDemoModal(true)}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#F5F5F5] px-5 py-2.5 text-sm font-medium text-[#111111] shadow-sm transition-all hover:bg-white"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111111] text-white transition-transform group-hover:scale-105">
                <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
              </span>
              <span>Watch Product Film</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onLogin({
                  username: "Guest Student",
                  email: "guest@pathfinder.ai",
                  bypassOnboarding: true,
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-white/30 hover:bg-white/[0.07]"
            >
              <Terminal className="h-3.5 w-3.5 text-[#8a8f98]" />
              <span>Instant Guest Workspace</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#8a8f98]" />
            </button>
          </div>

          {/* 3 Clean Telemetry Capability Rows */}
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.08] bg-[#08090D]/90 p-4 transition-colors hover:border-white/[0.16]"
              >
                <div className="mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[#FD0053]">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-[13px] font-semibold tracking-tight text-[#F7F8F8]">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#8a8f98]">{detail}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Right Obsidian Access Card */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <div className="relative rounded-2xl border border-white/[0.1] bg-[#08090D]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8a8f98]">
                  Workspace Access
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#F7F8F8] font-['Space_Grotesk']">
                  Enter Pathfinder 2.0
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-rose-200">
                {errorMessage}
              </div>
            )}

            {socialError && (
              <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-200">
                {socialError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username-input"
                  className="mb-1.5 block text-xs font-medium text-[#cbd5e1]"
                >
                  Full Name or Handle
                </label>
                <input
                  id="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Dileep Bommali"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/[0.1] bg-[#030406] px-3.5 py-2.5 text-sm text-[#F7F8F8] placeholder-[#64748b] outline-none transition-colors focus:border-[#FD0053]/70 focus:ring-1 focus:ring-[#FD0053]/40"
                />
              </div>

              <div>
                <label
                  htmlFor="login-email-input"
                  className="mb-1.5 block text-xs font-medium text-[#cbd5e1]"
                >
                  Academic or Work Email
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/[0.1] bg-[#030406] px-3.5 py-2.5 text-sm text-[#F7F8F8] placeholder-[#64748b] outline-none transition-colors focus:border-[#FD0053]/70 focus:ring-1 focus:ring-[#FD0053]/40"
                />
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FD0053] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#e1004a] active:scale-[0.99]"
              >
                <span>Sign In to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
                Single Sign-On
              </span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {/* OAuth Providers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-oauth-google"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("google")}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-[#0D0F14] px-3 py-2.5 text-xs font-medium text-[#F7F8F8] transition-colors hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>{socialLoading === "google" ? "Redirecting..." : "Google"}</span>
              </button>

              <button
                id="btn-oauth-github"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("github")}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-[#0D0F14] px-3 py-2.5 text-xs font-medium text-[#F7F8F8] transition-colors hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-50"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15v3.19c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                <span>{socialLoading === "github" ? "Redirecting..." : "GitHub"}</span>
              </button>
            </div>

            {/* Instant Guest Shortcut */}
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-2 text-xs font-medium text-[#94a3b8] transition-colors hover:border-white/30 hover:bg-white/[0.03] hover:text-white"
            >
              <span>Guest / Demo Mode</span>
            </button>

            <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4 text-[11px] text-[#64748b]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#8a8f98]" />
                Student, Mentor &amp; Admin Roles
              </span>
              <span>v2.0 Live</span>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Cinema Product Film Modal */}
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
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#08090c] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <PathfinderLogo size={24} />
                  <span className="text-sm font-medium text-[#F7F8F8]">
                    Pathfinder 2.0 — Product Launch Film
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close video preview"
                  onClick={() => setShowDemoModal(false)}
                  className="rounded-lg p-1.5 text-[#8a8f98] transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="aspect-video w-full bg-black">
                <video
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
