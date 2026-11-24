import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X } from "lucide-react";
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
      setErrorMessage("Please enter your username or email address (or continue as Guest below).");
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
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#08090a] text-[#F7F8F8] font-['Outfit',sans-serif] selection:bg-white/20 selection:text-white">
      {/* Subtle ElevenLabs pastel atmospheric washes over Linear obsidian canvas */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-44 left-1/4 h-[520px] w-[520px] rounded-full blur-[150px]"
          style={{ background: "radial-gradient(circle, rgba(168,200,232,0.11), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full blur-[150px]"
          style={{ background: "radial-gradient(circle, rgba(167,229,211,0.09), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 left-10 h-[400px] w-[400px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(200,184,224,0.09), transparent 70%)" }}
        />
      </div>

      {/* Minimal Wordmark Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <PathfinderLogo size={34} variant="monochrome" />
          <span className="text-[17px] font-semibold tracking-tight text-[#F7F8F8] font-['Space_Grotesk']">
            Pathfinder <span className="text-[#8a8f98]">2.0</span>
          </span>
        </div>
      </header>

      {/* Main Split Studio Layout */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-2 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:pt-6">
        {/* Left Showcase Column */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:col-span-7"
        >
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[#F7F8F8] sm:text-5xl font-['Space_Grotesk']">
            Placement readiness, measured before interview day.
          </h1>

          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-[#8a8f98]">
            Model your offer probability, spar with a full-duplex 3D voice interviewer, and audit
            your resume in one workspace.
          </p>

          {/* Single Embedded Product Film Stage */}
          <div
            onClick={() => setShowDemoModal(true)}
            className="group relative mt-8 cursor-pointer overflow-hidden rounded-2xl border border-[#23252a] bg-[#0c0d10] shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
          >
            <video
              src="/demo/pathfinder-launch.mp4"
              poster="/og-image.png"
              autoPlay
              muted
              loop
              playsInline
              className="aspect-video w-full object-cover opacity-85 transition-opacity duration-300 group-hover:opacity-100"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <button
                type="button"
                id="btn-watch-launch-film"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDemoModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f5] px-4 py-2 text-xs font-medium text-[#111215] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Play launch film · 0:26</span>
              </button>
            </div>
          </div>

          {/* Quiet Hairline Spec Strip */}
          <div className="mt-5 grid grid-cols-3 gap-6 border-t border-[#1b1d22] pt-4 text-xs text-[#8a8f98]">
            <span>972-student ML cohort</span>
            <span>Full-duplex 3D voice</span>
            <span>PDF &amp; DOCX ATS lab</span>
          </div>
        </motion.section>

        {/* Right Sign-In Card */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <div className="rounded-2xl border border-[#23252a] bg-[#0f1012]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#F7F8F8] font-['Space_Grotesk']">
                Sign in to Pathfinder
              </h2>
              <p className="mt-1 text-sm text-[#8a8f98]">
                Continue with an account or open a guest session.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-100">
                {errorMessage}
              </div>
            )}

            {socialError && (
              <div className="mb-4 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#cbd5e1]">
                {socialError}
              </div>
            )}

            {/* Monochrome OAuth Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-oauth-google"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("google")}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#262930] bg-[#15171b] px-3 py-2.5 text-xs font-medium text-[#f7f8f8] transition-colors hover:border-[#383c46] hover:bg-[#1b1e23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
              >
                <svg className="h-4 w-4 fill-current text-[#F7F8F8]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z" />
                </svg>
                <span>{socialLoading === "google" ? "Redirecting..." : "Google"}</span>
              </button>

              <button
                id="btn-oauth-github"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("github")}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#262930] bg-[#15171b] px-3 py-2.5 text-xs font-medium text-[#f7f8f8] transition-colors hover:border-[#383c46] hover:bg-[#1b1e23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
              >
                <svg className="h-4 w-4 fill-current text-[#F7F8F8]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15v3.19c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                <span>{socialLoading === "github" ? "Redirecting..." : "GitHub"}</span>
              </button>
            </div>

            {/* Lowercase Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#202227]" />
              <span className="text-xs text-[#62666d]">or</span>
              <div className="h-px flex-1 bg-[#202227]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username-input"
                  className="mb-1.5 block text-xs font-medium text-[#cbd5e1]"
                >
                  Name
                </label>
                <input
                  id="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Dileep Bommali"
                  autoComplete="name"
                  className="w-full rounded-xl border border-[#23252a] bg-[#090a0c] px-3.5 py-2.5 text-sm text-[#f7f8f8] placeholder-[#62666d] outline-none transition-colors focus:border-[#f7f8f8]/45 focus:ring-1 focus:ring-[#f7f8f8]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="login-email-input"
                  className="mb-1.5 block text-xs font-medium text-[#cbd5e1]"
                >
                  Email
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#23252a] bg-[#090a0c] px-3.5 py-2.5 text-sm text-[#f7f8f8] placeholder-[#62666d] outline-none transition-colors focus:border-[#f7f8f8]/45 focus:ring-1 focus:ring-[#f7f8f8]/20"
                />
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                className="flex w-full items-center justify-center rounded-xl bg-[#F7F8F8] px-4 py-2.5 text-sm font-medium text-[#090A0C] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#23252a] bg-transparent px-4 py-2.5 text-xs font-medium text-[#94a3b8] transition-colors hover:border-[#363942] hover:bg-[#15171b] hover:text-[#f7f8f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>Continue as Guest</span>
            </button>
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
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[#23252a] bg-[#08090c] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#1b1d22] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <PathfinderLogo size={22} variant="monochrome" />
                  <span className="text-sm font-medium text-[#F7F8F8]">
                    Pathfinder 2.0 — Product Launch Film
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close video preview"
                  onClick={() => setShowDemoModal(false)}
                  className="rounded-lg p-1.5 text-[#8a8f98] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
