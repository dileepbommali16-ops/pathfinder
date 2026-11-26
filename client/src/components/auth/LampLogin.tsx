import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { API_BASE, fetchWithTimeout } from "@/lib/apiClient";
import { PathfinderLogo } from "@/components/common/PathfinderLogo";
import { ShaderBackdrop, SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

interface LampLoginProps {
  onLogin: (user: {
    username: string;
    email: string;
    isNewUser?: boolean;
    bypassOnboarding?: boolean;
  }) => void;
  initialError?: string | null;
  onBack?: () => void;
}

const STUDIO_HIGHLIGHTS = [
  {
    index: "01",
    title: "972-Record Synthetic Placement Dataset",
    detail: "Random Forest odds trained on a 972-record synthetic placement dataset, augmented from a 215-record public baseline.",
  },
  {
    index: "02",
    title: "Live 3D Voice Mentor (DAS)",
    detail: "Speak naturally in English, Telugu, or Hindi with full-duplex Puck voice.",
  },
  {
    index: "03",
    title: "11 Compiler Runtimes + ATS Lab",
    detail: "Test DSA rounds, parse PDF resumes, and export tailored 1-page profiles.",
  },
];

export const LampLogin: React.FC<LampLoginProps> = ({ onLogin, initialError, onBack }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

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
      setErrorMessage("Connection timed out. Please try signing in again.");
    }, 20000);
    return () => clearTimeout(timer);
  }, [socialLoading]);

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
          const isConfigured =
            platform === "google" ? checkData.google_configured : checkData.github_configured;
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
    <div className="relative flex min-h-dvh w-full flex-col justify-between overflow-x-clip bg-[#050507] px-5 py-6 text-[#FAFAFA] antialiased selection:bg-[#FAFAFA] selection:text-[#09090B] sm:px-10">
      <ShaderBackdrop />

      {/* Top Navigation Chrome */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        {onBack ? (
          <button
            id="btn-back-landing"
            type="button"
            onClick={onBack}
            className="pf-btn-secondary inline-flex h-10 items-center rounded-lg px-4 text-xs font-medium text-[#D4D4D8] hover:text-[#FAFAFA]"
          >
            Back to home
          </button>
        ) : (
          <div />
        )}
      </header>

      {/* Spacious Two-Column Titanium Studio Auth Layout (Zero Videos) */}
      <main className="relative z-10 mx-auto my-auto grid w-full max-w-5xl items-center gap-12 py-10 lg:grid-cols-12 lg:gap-16">
        {/* Left Pitch Column (Desktop) */}
        <div className="hidden flex-col space-y-8 lg:col-span-6 lg:flex">
          <div className="flex items-center gap-3.5">
            <PathfinderLogo size={42} variant="monochrome" />
            <div>
              <span className="block text-base font-semibold tracking-[-0.02em] text-[#FAFAFA]">
                Pathfinder 2.0
              </span>
              <span className="font-mono text-[11px] text-[#8A8A92]">
                COMPUTE STUDIO WORKSPACE
              </span>
            </div>
          </div>

          <h2
            className="text-3xl font-semibold leading-[1.12] tracking-[-0.035em] text-[#FAFAFA] xl:text-4xl"
            style={{ textWrap: "balance" }}
          >
            From structured preparation to engineering offers.
          </h2>

          <div className="space-y-4">
            {STUDIO_HIGHLIGHTS.map((item) => (
              <div
                key={item.index}
                className="pf-subpanel flex items-start gap-4 rounded-xl p-4 sm:p-5"
              >
                <span className="mt-0.5 font-mono text-xs text-[#8A8A92] tabular-nums">
                  {item.index}
                </span>
                <div>
                  <div className="text-sm font-medium text-[#FAFAFA]">{item.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[440px] lg:col-span-6"
        >
          <SpotlightSurface className="rounded-2xl p-7 sm:p-10">
            <div>
              <div className="lg:hidden">
                <PathfinderLogo size={36} variant="monochrome" />
              </div>
              <h1
                className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] lg:mt-0"
                style={{ textWrap: "balance" }}
              >
                Sign in to Pathfinder
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
                Continue with Google or GitHub, or enter your name and email.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-white/[0.14] bg-[#14141A] px-4 py-3 text-xs leading-relaxed text-[#FAFAFA]"
              >
                {errorMessage}
              </div>
            )}

            {socialError && (
              <div
                role="status"
                aria-live="polite"
                className="mt-5 rounded-xl border border-white/[0.1] bg-[#101014] px-4 py-3 font-mono text-xs text-[#D4D4D8]"
              >
                {socialError}
              </div>
            )}

            {/* Official OAuth Providers */}
            <div className="mt-7 grid grid-cols-2 gap-3.5">
              <button
                id="btn-oauth-google"
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin("google")}
                className="pf-btn-secondary inline-flex h-11 items-center justify-center gap-2.5 rounded-xl px-3.5 text-xs font-medium active:scale-[0.98] disabled:opacity-50"
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
                className="pf-btn-secondary inline-flex h-11 items-center justify-center gap-2.5 rounded-xl px-3.5 text-xs font-medium active:scale-[0.98] disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4 shrink-0 fill-current text-[#FAFAFA]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15v3.19c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                <span>{socialLoading === "github" ? "Redirecting..." : "GitHub"}</span>
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="font-mono text-[11px] text-[#8A8A92]">or continue with email</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
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
                  placeholder="Your full name"
                  autoComplete="name"
                  className="pf-input h-11 w-full rounded-xl px-4 text-sm text-[#FAFAFA] placeholder-[#8A8A92]"
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
                  className="pf-input h-11 w-full rounded-xl px-4 text-sm text-[#FAFAFA] placeholder-[#8A8A92]"
                />
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                className="pf-btn-primary mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium active:scale-[0.98]"
              >
                Sign in
              </button>
            </form>

            <div className="mt-6 space-y-2.5 border-t border-white/[0.08] pt-5">
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
                className="pf-btn-secondary inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-medium active:scale-[0.98] cursor-pointer"
              >
                Explore Interactive Demo (Guest)
              </button>
              <p className="text-center text-[11px] text-[#8A8A92]">
                No sign-up needed — loads a clearly labeled sample profile
              </p>
            </div>
          </SpotlightSurface>
        </motion.div>
      </main>

      <footer className="relative z-10 text-center font-mono text-[11px] text-[#8A8A92]">
        Pathfinder 2.0 · Autonomous Placement Intelligence
      </footer>
    </div>
  );
};

export default LampLogin;
