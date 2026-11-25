import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  onBack?: () => void;
}

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
    <div className="flex min-h-dvh w-full flex-col justify-between overflow-x-clip bg-[#09090B] px-4 py-6 text-[#FAFAFA] antialiased selection:bg-[#FAFAFA] selection:text-[#09090B] sm:px-8">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        {onBack ? (
          <button
            id="btn-back-landing"
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-[#A1A1AA] transition-colors duration-150 hover:bg-[#141418] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to home</span>
          </button>
        ) : (
          <div />
        )}
      </header>

      {/* Pure Auth Flows Centered Card */}
      <main className="mx-auto my-8 w-full max-w-[400px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-[#1F1F23] bg-[#0C0C0F] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.65)] sm:p-8"
        >
          <div>
            <PathfinderLogo size={32} variant="monochrome" />
            <h1
              className="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA]"
              style={{ textWrap: "balance" }}
            >
              Sign in to Pathfinder
            </h1>
            <p className="mt-1 text-[13px] text-[#A1A1AA]" style={{ textWrap: "pretty" }}>
              Continue with Google or GitHub, or enter your campus email.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-[#3F3F46] bg-[#141418] px-3.5 py-2.5 text-xs leading-relaxed text-[#FAFAFA]"
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#141418] px-3 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#1A1A20] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] disabled:opacity-50"
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#141418] px-3 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#1A1A20] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA] disabled:opacity-50"
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

          <div className="my-5 flex items-center gap-3">
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
                className="h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors duration-150 focus:border-[#A1A1AA] focus:ring-2 focus:ring-white/10"
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
                className="h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors duration-150 focus:border-[#A1A1AA] focus:ring-2 focus:ring-white/10"
              />
            </div>

            {/* Single Primary CTA */}
            <button
              id="btn-auth-submit"
              type="submit"
              className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#FAFAFA] px-4 text-sm font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              <span>Sign in</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quiet Secondary Entry */}
          <div className="mt-5 flex items-center justify-between border-t border-[#1F1F23] pt-4 text-xs text-[#71717A]">
            <span>Just exploring?</span>
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

      {/* Bottom Minimal Caption */}
      <footer className="text-center text-[11px] text-[#52525B]">
        Pathfinder 2.0 · Autonomous Placement Intelligence
      </footer>
    </div>
  );
};

export default LampLogin;
