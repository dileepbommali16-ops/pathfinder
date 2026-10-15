import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE, fetchWithTimeout } from "@/lib/apiClient";

interface LampLoginProps {
  onLogin: (user: { username: string; email: string; isNewUser?: boolean; bypassOnboarding?: boolean }) => void;
  initialError?: string | null;
}

interface FireflyCoord {
  id: number;
  size: number;
  duration: number;
  delay: number;
  x: string[];
  y: string[];
}

// Pre-computed swirling orbital dots (Motion ga tiruguthuu) and wandering yellow dots
const SWIRL_RING_1 = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 2 * Math.PI;
  const radius = 220 + (i % 6) * 70; // 220px to 570px
  const x = Math.round(500 + radius * Math.cos(angle));
  const y = Math.round(500 + radius * Math.sin(angle));
  const size = (i % 3) + 3; // 3px to 5px
  return { id: `ring1-${i}`, x, y, size, delay: `${(i % 6) * 0.4}s` };
});

const SWIRL_RING_2 = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * 2 * Math.PI;
  const radius = 260 + (i % 7) * 80; // 260px to 740px
  const x = Math.round(750 + radius * Math.cos(angle));
  const y = Math.round(750 + radius * Math.sin(angle));
  const size = (i % 4) + 2.5; // 2.5px to 5.5px
  return { id: `ring2-${i}`, x, y, size, delay: `${(i % 7) * 0.5}s` };
});

const WANDERING_YELLOW_DOTS = [
  { top: "8%", left: "10%", size: 4, duration: "18s", delay: "0s" },
  { top: "14%", left: "25%", size: 3, duration: "22s", delay: "2s" },
  { top: "6%", left: "45%", size: 5, duration: "20s", delay: "1s" },
  { top: "18%", left: "62%", size: 4, duration: "24s", delay: "3s" },
  { top: "11%", left: "82%", size: 3, duration: "19s", delay: "0.5s" },
  { top: "22%", left: "92%", size: 5, duration: "25s", delay: "2.5s" },
  { top: "29%", left: "7%", size: 3, duration: "21s", delay: "4s" },
  { top: "33%", left: "38%", size: 4, duration: "17s", delay: "1.5s" },
  { top: "27%", left: "55%", size: 5, duration: "23s", delay: "3.5s" },
  { top: "36%", left: "75%", size: 3, duration: "26s", delay: "0s" },
  { top: "42%", left: "88%", size: 4, duration: "19s", delay: "2s" },
  { top: "48%", left: "15%", size: 5, duration: "22s", delay: "4.5s" },
  { top: "53%", left: "32%", size: 3, duration: "20s", delay: "1s" },
  { top: "58%", left: "48%", size: 4, duration: "24s", delay: "3s" },
  { top: "46%", left: "68%", size: 3, duration: "18s", delay: "0.5s" },
  { top: "55%", left: "85%", size: 5, duration: "25s", delay: "2.5s" },
  { top: "64%", left: "6%", size: 4, duration: "21s", delay: "4s" },
  { top: "68%", left: "22%", size: 3, duration: "19s", delay: "1.5s" },
  { top: "72%", left: "42%", size: 5, duration: "23s", delay: "3.5s" },
  { top: "65%", left: "58%", size: 3, duration: "26s", delay: "0s" },
  { top: "75%", left: "78%", size: 4, duration: "20s", delay: "2s" },
  { top: "70%", left: "94%", size: 5, duration: "22s", delay: "4.5s" },
  { top: "82%", left: "12%", size: 3, duration: "24s", delay: "1s" },
  { top: "86%", left: "28%", size: 4, duration: "18s", delay: "3s" },
  { top: "79%", left: "50%", size: 5, duration: "25s", delay: "0.5s" },
  { top: "85%", left: "68%", size: 3, duration: "21s", delay: "2.5s" },
  { top: "89%", left: "84%", size: 4, duration: "19s", delay: "4s" },
  { top: "94%", left: "40%", size: 5, duration: "23s", delay: "1.5s" },
  { top: "92%", left: "60%", size: 3, duration: "22s", delay: "3.5s" },
  { top: "95%", left: "75%", size: 4, duration: "20s", delay: "0.5s" },
];

export const LampLogin: React.FC<LampLoginProps> = ({ onLogin, initialError }) => {
  const [isOn, setIsOn] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [fireflies, setFireflies] = useState<FireflyCoord[]>([]);

  const isDraggingRef = useRef(false);
  const maxDragYRef = useRef(0);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (initialError) {
      setErrorMessage(initialError);
    }
  }, [initialError]);

  // Wake the (possibly sleeping) Render backend early; fire and forget
  useEffect(() => {
    fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => {});
  }, []);

  // Reset the social loading state when the page is restored from the back/forward cache
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

  // Generate glowing firefly lights when the lamp turns on
  useEffect(() => {
    if (isOn) {
      const generated: FireflyCoord[] = Array.from({ length: 28 }, (_, i) => ({
        id: i,
        size: Math.random() * 5 + 3,
        duration: Math.random() * 15 + 20,
        delay: Math.random() * 2,
        x: Array.from({ length: 5 }, () => `${Math.random() * 95}vw`),
        y: Array.from({ length: 5 }, () => `${Math.random() * 92}vh`),
      }));
      setFireflies(generated);
    } else {
      setFireflies([]);
    }
  }, [isOn]);

  // Reliable lamp toggle with spring animation
  const toggleLamp = () => {
    setDragOffset({ x: 0, y: 35 });
    setTimeout(() => {
      setDragOffset({ x: 0, y: 0 });
    }, 160);
    React.startTransition(() => {
      setIsOn((prev) => !prev);
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    maxDragYRef.current = 0;
    startPos.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dy = Math.max(0, Math.min(90, (e.clientY - startPos.current.y) * 0.8));
    const dx = Math.max(-25, Math.min(25, (e.clientX - startPos.current.x) * 0.25));
    if (dy > maxDragYRef.current) {
      maxDragYRef.current = dy;
    }
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    const pulledY = maxDragYRef.current;
    setDragOffset({ x: 0, y: 0 });

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (pulledY > 12) {
      // Deliberate downward cord pull - toggle the lamp!
      toggleLamp();
      maxDragYRef.current = 999; // Flag to suppress immediate synthetic click
    } else {
      maxDragYRef.current = 0;
    }
  };

  const handleCordClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (maxDragYRef.current === 999) {
      maxDragYRef.current = 0;
      return;
    }
    toggleLamp();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUser = username.trim() || email.trim() || (authMode === "signup" ? "New Candidate" : "Student");
    const finalEmail = email.trim() || (username.includes("@") ? username.trim() : "candidate@pathfinder.ai");

    if (!finalUser) {
      setErrorMessage("Please enter your username or email address.");
      return;
    }

    React.startTransition(() => {
      onLogin({
        username: finalUser,
        email: finalEmail,
        isNewUser: authMode === "signup"
      });
    });
  };

  const handleSocialLogin = async (platform: "google" | "github") => {
    const providerName = platform === "google" ? "Google" : "GitHub";
    setErrorMessage(null);
    setSocialError(null);
    setSocialLoading(platform);
    setSocialError(`Connecting to ${providerName}...`);

    try {
      // Pre-check if OAuth provider credentials are configured on the backend
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
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-700 font-['Outfit',sans-serif] ${
        isOn ? "bg-[#0a0a0c]" : "bg-[#050507]"
      }`}
    >
      <style>{`
        @keyframes swirlRotateClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes swirlRotateCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes yellowDotDrift {
          0% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.45; }
          33% { transform: translate3d(24px, -30px, 0) scale(1.2); opacity: 0.95; }
          66% { transform: translate3d(-18px, -55px, 0) scale(0.85); opacity: 0.55; }
          100% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.45; }
        }
        @keyframes yellowDotPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>

      {/* Ambient Room Light Glow */}
      <div
        className={`pointer-events-none absolute -top-[30%] left-0 h-[1000px] w-[1000px] rounded-full transition-all duration-700 ${
          isOn ? "scale-150 opacity-100" : "scale-50 opacity-15"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(199,199,207,0.03) 35%, transparent 70%)",
        }}
      />

      {/* Top Right Ambient Glow */}
      <div
        className={`pointer-events-none absolute -top-[10%] -right-[10%] h-[700px] w-[700px] rounded-full transition-all duration-1000 ${
          isOn ? "opacity-30 scale-125" : "opacity-10 scale-90"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,59,92,0.03) 40%, transparent 70%)",
        }}
      />

      {/* Bottom Center Desk Radiance */}
      <div
        className={`pointer-events-none absolute -bottom-[20%] left-[20%] h-[600px] w-[900px] rounded-full transition-all duration-700 ${
          isOn ? "opacity-40 scale-110" : "opacity-0 scale-75"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(255,59,92,0.02) 50%, transparent 75%)",
        }}
      />

      {/* Background Starlight Dots Swirling in Motion */}
      <div
        className={`pointer-events-none fixed inset-0 z-10 overflow-hidden transition-opacity duration-700 ${
          isOn ? "opacity-95" : "opacity-75"
        }`}
        style={{ contain: "strict" }}
      >
        {/* Swirling Clockwise Dots Ring */}
        <div
          className="absolute -top-[150px] -left-[150px] w-[1000px] h-[1000px] pointer-events-none"
          style={{
            animation: "swirlRotateClockwise 38s linear infinite",
            willChange: "transform",
          }}
        >
          {SWIRL_RING_1.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                boxShadow: "0 0 8px 2px rgba(255,255,255,0.9), 0 0 16px rgba(220,225,240,0.5)",
                animation: "yellowDotPulse 3.5s ease-in-out infinite alternate",
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        {/* Swirling Counter-Clockwise Dots Ring */}
        <div
          className="absolute top-[5%] right-[-200px] w-[1500px] h-[1500px] pointer-events-none"
          style={{
            animation: "swirlRotateCounter 48s linear infinite",
            willChange: "transform",
          }}
        >
          {SWIRL_RING_2.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                boxShadow: "0 0 8px 2px rgba(255,255,255,0.85), 0 0 16px rgba(200,210,230,0.5)",
                animation: "yellowDotPulse 4s ease-in-out infinite alternate",
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        {/* Free Floating & Wandering Starlight Dots */}
        {WANDERING_YELLOW_DOTS.map((dot, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-white"
            style={{
              top: dot.top,
              left: dot.left,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              boxShadow: "0 0 8px 2px rgba(255,255,255,0.9), 0 0 16px rgba(220,225,240,0.5)",
              animation: `yellowDotDrift ${dot.duration} ease-in-out infinite alternate`,
              animationDelay: dot.delay,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      {/* Floating Fireflies (Radiant Starlight when lamp is turned ON) */}
      {isOn && (
        <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" style={{ contain: "strict" }}>
          {fireflies.map((f) => (
            <motion.span
              key={f.id}
              className="absolute rounded-full bg-white"
              style={{
                width: f.size,
                height: f.size,
                boxShadow:
                  "0 0 10px 3px rgba(255,255,255,0.95), 0 0 20px rgba(220,225,245,0.6)",
              }}
              animate={{
                x: f.x,
                y: f.y,
                opacity: [0.35, 0.95, 0.45, 1, 0.35],
              }}
              transition={{
                duration: f.duration,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: f.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Split Layout */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* LEFT: Desk Lamp with interactive pull cord */}
        <section className="relative flex flex-1 flex-col items-center justify-center py-6 lg:py-0">
          {/* Prompt instruction when light is off */}
          {!isOn && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pointer-events-none absolute top-4 flex flex-col items-center gap-2 text-center text-[#8a8a92] lg:top-14"
            >
              <span className="text-xs sm:text-sm font-medium tracking-wide uppercase">Pull lamp string to illuminate &amp; reveal details</span>
              <span className="h-4 w-0.5 animate-bounce bg-gradient-to-b from-[#ff3b5c]/80 to-transparent" />
            </motion.div>
          )}

          {/* Lamp Container */}
          <div className="relative flex flex-col items-center select-none scale-100 sm:scale-110">
            {/* Lamp Head (Visual only) */}
            <div
              className={`relative z-30 h-[50px] w-[140px] rounded-t-[140px] rounded-b-[4px] border-b-2 border-[#050505] bg-[#16161a] transition-all duration-500 ${
                isOn
                  ? "shadow-[inset_0_-3px_10px_rgba(255,59,92,0.3),inset_0_2px_5px_rgba(255,255,255,0.15),0_10px_20px_rgba(0,0,0,0.9)]"
                  : "shadow-[inset_0_2px_5px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.9)]"
              }`}
            />

            {/* Lamp Bulb Glow (Visual only) */}
            <div
              className={`absolute top-[40px] z-20 h-[20px] w-[90px] rounded-full bg-white transition-opacity duration-500 pointer-events-none ${
                isOn
                  ? "opacity-100 shadow-[0_0_40px_20px_rgba(255,255,255,0.9),0_0_80px_40px_rgba(255,59,92,0.4)]"
                  : "opacity-10"
              }`}
            />

            {/* Light Beam */}
            <div
              className={`pointer-events-none absolute top-[45px] z-10 h-[380px] w-[540px] blur-[8px] transition-opacity duration-500 ${
                isOn ? "opacity-100" : "opacity-0"
              }`}
              style={{
                clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
                background:
                  "linear-gradient(to bottom, rgba(242, 242, 240, 0.85) 0%, rgba(255, 59, 92, 0.2) 60%, transparent 100%)",
              }}
            />

            {/* Lamp Stem */}
            <div
              className={`relative z-20 h-[290px] w-[6px] transition-all duration-500 ${
                isOn
                  ? "bg-gradient-to-r from-[#050505] via-[#241c20] to-[#050505] shadow-[0_0_10px_rgba(255,59,92,0.2)]"
                  : "bg-gradient-to-r from-[#050505] via-[#2a2a2a] to-[#050505]"
              }`}
            />

            {/* Lamp Base (Visual only, cord is the exclusive trigger) */}
            <div
              className={`relative z-20 h-[16px] w-[100px] rounded-t-[30px] rounded-b-[4px] border-b-2 border-[#050505] bg-[#16161a] transition-all duration-500 ${
                isOn
                  ? "shadow-[inset_0_2px_6px_rgba(255,59,92,0.25),0_10px_20px_rgba(0,0,0,0.9)]"
                  : "shadow-[inset_0_2px_5px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.9)]"
              }`}
            />

            {/* Desk Surface Glow */}
            <div
              className={`pointer-events-none absolute -bottom-[40px] z-10 h-[100px] w-[550px] rounded-full transition-opacity duration-500 ${
                isOn ? "opacity-100" : "opacity-0"
              }`}
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, rgba(255,59,92,0.08) 50%, transparent 70%)",
              }}
            />

            {/* Pull Cord String Mechanism (Interactive Trigger) */}
            <div
              role="button"
              tabIndex={0}
              id="lamp-pull-string-trigger"
              onClick={handleCordClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Pull or click this string to toggle the lamp (ON / OFF)"
              className="absolute top-[45px] left-[calc(50%+25px)] z-30 w-[60px] h-[125px] flex flex-col items-center justify-start cursor-pointer select-none touch-none group"
            >
              {/* String Wire */}
              <svg
                className="pointer-events-none w-[60px] h-[75px] overflow-visible"
                aria-hidden="true"
              >
                <path
                  d={`M 30 0 L ${30 + dragOffset.x} ${60 + dragOffset.y}`}
                  stroke={!isOn ? "#ffffff" : "#71717a"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className={!isOn ? "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" : ""}
                />
              </svg>

              {/* String Pull Bead / Handle */}
              <div
                className={`relative -mt-1 h-[26px] w-[14px] rounded-full transition-transform ${
                  isDragging ? "transition-none" : "duration-200 ease-out"
                } ${
                  !isOn
                    ? "animate-pulse shadow-[0_0_20px_rgba(255,59,92,0.9),inset_0_2px_3px_rgba(255,255,255,0.9)] ring-2 ring-[#ff3b5c]/80 scale-110 group-hover:scale-125"
                    : "shadow-[inset_0_2px_3px_rgba(255,255,255,0.4),0_3px_6px_rgba(0,0,0,0.8)] group-hover:scale-110"
                }`}
                style={{
                  transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                  background: !isOn
                    ? "linear-gradient(to bottom, #ffffff, #ff3b5c, #c7c7cf)"
                    : "linear-gradient(to bottom, #71717a, #3f3f46)",
                }}
              />
            </div>

            {/* Bouncing Visual Badge pointing directly to the lamp string */}
            {!isOn && (
              <div
                onClick={toggleLamp}
                className="absolute top-[108px] left-[calc(50%+85px)] z-30 flex items-center gap-1.5 rounded-full bg-[#16161a] border border-[#ff3b5c]/40 px-3 py-1 text-[11px] font-extrabold text-[#f2f2f0] shadow-[0_0_20px_rgba(255,59,92,0.3)] backdrop-blur-md cursor-pointer animate-bounce hover:scale-105 active:scale-95 transition-all"
                title="Click or pull the lamp string to reveal candidate details"
              >
                <span>👈</span>
                <span>Pull Cord</span>
              </div>
            )}

            {/* Lamp your Career Tagline (Pure caption below lamp base - Visual only) */}
            <div className="mt-5 text-center select-none pointer-events-none z-20">
              <span
                id="lamp-career-caption"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161a] px-4 py-2 text-xs font-bold text-[#f2f2f0] backdrop-blur-md shadow-[0_0_15px_rgba(255,59,92,0.15)]"
              >
                <span className="text-[#ff3b5c]">✦</span>
                <span>Lamp your Career</span>
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT: Glassmorphic Login Card - Revealed only after lamp cord is pulled */}
        <section className="relative flex flex-1 items-center justify-center px-4 py-4 sm:px-6 sm:pb-8 lg:px-8 lg:pb-0">
          {!isOn ? (
            <div className="hidden lg:block w-full max-w-[420px] min-h-[360px]" aria-hidden="true" />
          ) : (
            <div
              className="relative w-full max-w-[420px] rounded-[22px] border border-white/[0.08] bg-[#16161a] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-500 pointer-events-auto"
            >
            {/* Glossy top border line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff3b5c]/30 to-transparent" />

            {/* Header */}
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3b5c] font-bold text-white shadow-[0_10px_25px_rgba(255,59,92,0.35)]">
                AI
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f2f2f0]">
                {authMode === "signup" ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="mt-1 text-sm text-[#8a8a92]">
                {authMode === "signup"
                  ? "Join Pathfinder & unlock step-wise career onboarding"
                  : "Sign in to Pathfinder Career Intelligence"}
              </p>
            </div>

            {/* Mode Switcher: Sign In vs Sign Up */}
            <div className="mb-5 flex rounded-xl border border-white/[0.08] bg-[#0a0a0c] p-1">
              <button
                type="button"
                id="tab-auth-signin"
                onClick={() => {
                  setAuthMode("signin");
                  setErrorMessage(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                  authMode === "signin"
                    ? "bg-[#ff3b5c] text-white shadow-md"
                    : "text-[#8a8a92] hover:text-[#f2f2f0]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-auth-signup"
                onClick={() => {
                  setAuthMode("signup");
                  setErrorMessage(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                  authMode === "signup"
                    ? "bg-[#ff3b5c] text-white shadow-md"
                    : "text-[#8a8a92] hover:text-[#f2f2f0]"
                }`}
              >
                Sign Up / New Student
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 px-3.5 py-2 text-center text-xs text-[#ff3b5c]">
                {errorMessage}
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8a92]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Username or Student ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#121215] py-3.5 pl-11 pr-4 text-sm text-[#f2f2f0] placeholder-[#8a8a92]/60 outline-none transition-all focus:border-[#ff3b5c]/60 focus:ring-2 focus:ring-[#ff3b5c]/20"
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8a92]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#121215] py-3.5 pl-11 pr-4 text-sm text-[#f2f2f0] placeholder-[#8a8a92]/60 outline-none transition-all focus:border-[#ff3b5c]/60 focus:ring-2 focus:ring-[#ff3b5c]/20"
                />
              </div>

              {/* Password Input with Hacker Eye Toggle */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8a92]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  id="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#121215] py-3.5 pl-11 pr-12 text-sm text-[#f2f2f0] placeholder-[#8a8a92]/60 outline-none transition-all focus:border-[#ff3b5c]/60 focus:ring-2 focus:ring-[#ff3b5c]/20"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[#8a8a92] hover:text-[#ff3b5c] hover:bg-white/[0.06] active:scale-90 transition-all cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password (Hacker Eye)"}
                >
                  {showPassword ? (
                    // Eye Slash
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    // Hacker Eye
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-auth-submit"
                className="w-full rounded-2xl bg-[#ff3b5c] py-3.5 text-base font-semibold text-white transition-all hover:bg-[#e0304f] hover:shadow-[0_0_25px_rgba(255,59,92,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {authMode === "signup" ? "Create Account & Start Onboarding" : "Sign In to Dashboard"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-[1px] flex-1 bg-white/[0.08]" />
              <span className="text-[11px] font-semibold tracking-wider text-[#8a8a92] uppercase">
                Or Continue With
              </span>
              <span className="h-[1px] flex-1 bg-white/[0.08]" />
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-oauth-google"
                disabled={Boolean(socialLoading)}
                onClick={() => handleSocialLogin("google")}
                className={`flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-[#121215] py-3 text-sm font-medium text-[#f2f2f0] transition-all cursor-pointer ${
                  socialLoading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-[#ff3b5c]/30 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                <span className="text-base font-bold text-[#ff3b5c]">G</span>
                <span>{socialLoading === "google" ? "Redirecting..." : "Google"}</span>
              </button>

              <button
                type="button"
                id="btn-oauth-github"
                disabled={Boolean(socialLoading)}
                onClick={() => handleSocialLogin("github")}
                className={`flex items-center justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-[#121215] py-3 text-sm font-medium text-[#f2f2f0] transition-all cursor-pointer ${
                  socialLoading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-[#ff3b5c]/30 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                <span className="text-sm text-[#ff3b5c]">●</span>
                <span>{socialLoading === "github" ? "Redirecting..." : "GitHub"}</span>
              </button>
            </div>

            {/* Inline notice for unconfigured provider */}
            {socialError && (
              <p className="mt-2 text-center text-xs font-medium text-[#ff3b5c]">
                {socialError}
              </p>
            )}

            {/* Demo / Guest shortcuts */}
            <div className="mt-5 space-y-2.5 text-center">
              <button
                type="button"
                id="btn-demo-guest"
                onClick={() =>
                  React.startTransition(() => {
                    onLogin({
                      username: "Guest Evaluator",
                      email: "evaluator@pathfinder.ai",
                      bypassOnboarding: true
                    });
                  })
                }
                className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-[#f2f2f0] hover:bg-white/[0.1] hover:border-[#ff3b5c]/40 transition-all shadow-[0_0_15px_rgba(255,59,92,0.15)] active:scale-[0.98] cursor-pointer"
              >
                <span>⚡ Continue in Guest / Demo Mode &rarr;</span>
              </button>

              <button
                type="button"
                id="btn-demo-wizard"
                onClick={() =>
                  React.startTransition(() => {
                    onLogin({
                      username: "New Student",
                      email: "newstudent@pathfinder.ai",
                      isNewUser: true
                    });
                  })
                }
                className="block w-full text-xs text-[#8a8a92] hover:text-[#f2f2f0] font-medium transition-colors underline underline-offset-4 cursor-pointer"
              >
                Start as New Student (Step-Wise Onboarding Wizard) &rarr;
              </button>
            </div>
          </div>
          )}
        </section>
      </div>
    </div>
  );
};
