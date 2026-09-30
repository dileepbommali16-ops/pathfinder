import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LampLoginProps {
  onLogin: (user: { username: string; email: string }) => void;
}

interface FireflyCoord {
  id: number;
  size: number;
  duration: number;
  delay: number;
  x: string[];
  y: string[];
}

export const LampLogin: React.FC<LampLoginProps> = ({ onLogin }) => {
  const [isOn, setIsOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fireflies, setFireflies] = useState<FireflyCoord[]>([]);

  const startPos = useRef({ x: 0, y: 0 });

  // Generate random firefly coordinates when lamp turns on
  useEffect(() => {
    if (isOn) {
      const generated: FireflyCoord[] = Array.from({ length: 18 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 3,
        duration: Math.random() * 25 + 30,
        delay: Math.random() * 2,
        x: Array.from({ length: 5 }, () => `${Math.random() * 96}vw`),
        y: Array.from({ length: 5 }, () => `${Math.random() * 94}vh`),
      }));
      setFireflies(generated);
    } else {
      setFireflies([]);
    }
  }, [isOn]);

  // Pointer drag event handlers for string handle
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = Math.max(-35, Math.min(35, (e.clientX - startPos.current.x) * 0.3));
    const dy = Math.max(0, Math.min(180, (e.clientY - startPos.current.y) * 0.6));
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If pulled more than 30px, or a quick click, toggle the light
    const pulled = dragOffset.y > 25 || (dragOffset.y < 5 && Math.abs(dragOffset.x) < 5);
    setDragOffset({ x: 0, y: 0 });

    if (pulled) {
      setIsOn((prev) => !prev);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUser = username.trim() || email.trim() || "Student";
    const finalEmail = email.trim() || (username.includes("@") ? username.trim() : "candidate@pathfinder.ai");

    if (!finalUser) {
      setErrorMessage("Please enter your username or email address.");
      return;
    }

    onLogin({ username: finalUser, email: finalEmail });
  };

  const handleSocialLogin = (platform: "google" | "github") => {
    // If backend OAuth portal is configured, start OAuth flow, otherwise sign in directly
    const user = platform === "google" ? "Google User" : "GitHub User";
    const email = platform === "google" ? "user@gmail.com" : "developer@github.com";
    onLogin({ username: user, email });
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-700 font-['Outfit',sans-serif] ${
        isOn ? "bg-[#111111]" : "bg-[#050505]"
      }`}
    >
      {/* Ambient Room Light Glow */}
      <div
        className={`pointer-events-none absolute -top-[30%] left-0 h-[1000px] w-[1000px] rounded-full transition-all duration-700 ${
          isOn ? "scale-150 opacity-100" : "scale-50 opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255,220,100,0.15) 0%, rgba(255,214,0,0.05) 30%, transparent 70%)",
        }}
      />

      {/* Floating Fireflies */}
      {isOn && (
        <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
          {fireflies.map((f) => (
            <motion.span
              key={f.id}
              className="absolute rounded-full bg-[#FFEA00]"
              style={{
                width: f.size,
                height: f.size,
                boxShadow: "0 0 10px 3px rgba(255,234,0,0.9), 0 0 20px rgba(255,179,0,0.6)",
              }}
              animate={{
                x: f.x,
                y: f.y,
                opacity: [0.4, 0.9, 0.5, 1, 0.4],
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
        <section className="relative flex flex-1 flex-col items-center justify-center py-12 lg:py-0">
          {/* Prompt instruction when light is off */}
          {!isOn && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pointer-events-none absolute top-12 flex flex-col items-center gap-2 text-center text-slate-500 lg:top-20"
            >
              <span className="text-sm font-medium tracking-wide uppercase">Pull string or click handle to illuminate</span>
              <span className="h-6 w-0.5 animate-bounce bg-gradient-to-b from-amber-400/60 to-transparent" />
            </motion.div>
          )}

          {/* Lamp Container */}
          <div className="relative flex flex-col items-center select-none scale-100 sm:scale-110">
            {/* Lamp Head */}
            <div
              className={`relative z-30 h-[50px] w-[140px] rounded-t-[140px] rounded-b-[4px] border-b-2 border-[#050505] bg-[#151515] transition-shadow duration-500 ${
                isOn
                  ? "shadow-[inset_0_-3px_10px_rgba(255,220,150,0.4),inset_0_2px_5px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.9)]"
                  : "shadow-[inset_0_2px_5px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.9)]"
              }`}
            />

            {/* Lamp Bulb Glow */}
            <div
              className={`pointer-events-none absolute top-[40px] z-20 h-[20px] w-[90px] rounded-full bg-white transition-opacity duration-500 ${
                isOn
                  ? "opacity-100 shadow-[0_0_40px_20px_rgba(255,230,150,0.9),0_0_80px_40px_rgba(255,200,100,0.6)]"
                  : "opacity-0"
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
                  "linear-gradient(to bottom, rgba(255,230,140,0.85) 0%, rgba(255,200,80,0.2) 60%, transparent 100%)",
              }}
            />

            {/* Lamp Stem */}
            <div
              className={`relative z-20 h-[290px] w-[6px] transition-all duration-500 ${
                isOn
                  ? "bg-gradient-to-r from-[#050505] via-[#2a2010] to-[#050505] shadow-[0_0_10px_rgba(255,200,100,0.2)]"
                  : "bg-gradient-to-r from-[#050505] via-[#2a2a2a] to-[#050505]"
              }`}
            />

            {/* Lamp Base */}
            <div
              className={`relative z-20 h-[16px] w-[100px] rounded-t-[30px] rounded-b-[4px] border-b-2 border-[#050505] bg-[#151515] transition-shadow duration-500 ${
                isOn
                  ? "shadow-[inset_0_2px_6px_rgba(255,220,150,0.3),0_10px_20px_rgba(0,0,0,0.9)]"
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
                  "radial-gradient(ellipse at center, rgba(255,220,120,0.25) 0%, rgba(255,180,50,0.05) 50%, transparent 70%)",
              }}
            />

            {/* Pull String SVG */}
            <svg
              className="pointer-events-none absolute top-[45px] left-[calc(50%+55px)] z-20 h-[2px] w-[2px] overflow-visible"
              aria-hidden="true"
            >
              <path
                d={`M 0 0 L ${dragOffset.x} ${80 + dragOffset.y}`}
                stroke="#444"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Pull String Handle */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`absolute top-[125px] left-[calc(50%+49px)] z-30 h-[22px] w-[12px] rounded-[5px] shadow-[inset_0_2px_3px_rgba(255,255,255,0.5),0_3px_6px_rgba(0,0,0,0.8)] touch-none select-none cursor-grab active:cursor-grabbing transition-transform ${
                isDragging ? "transition-none" : "duration-300 ease-out"
              }`}
              style={{
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                background: "linear-gradient(to bottom, #ebd17a, #aa8529)",
              }}
              title="Drag down or click to turn on lamp"
            />
          </div>
        </section>

        {/* RIGHT: Glassmorphic Login Card */}
        <section className="relative flex flex-1 items-center justify-center px-6 pb-12 lg:px-12 lg:pb-0">
          <div
            className={`relative w-full max-w-[440px] rounded-[24px] border border-white/10 bg-white/[0.05] p-8 sm:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-700 ${
              isOn
                ? "translate-x-0 opacity-100 blur-none pointer-events-auto"
                : "translate-x-10 opacity-0 blur-md pointer-events-none"
            }`}
          >
            {/* Glossy top border line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Header */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffd600] font-bold text-slate-950 shadow-[0_10px_25px_rgba(255,214,0,0.3)]">
                AI
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
              <p className="mt-1 text-sm text-slate-400">Sign in to Pathfinder Career Intelligence</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-center text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                  className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#ffd600]/50 focus:ring-2 focus:ring-[#ffd600]/20"
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                  className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#ffd600]/50 focus:ring-2 focus:ring-[#ffd600]/20"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#ffd600]/50 focus:ring-2 focus:ring-[#ffd600]/20"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full rounded-2xl bg-[#ffd600] py-3.5 text-base font-semibold text-slate-950 transition-all hover:bg-[#ffdc64] hover:shadow-[0_0_20px_rgba(255,220,100,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign In
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-[1px] flex-1 bg-white/10" />
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Or Continue With
              </span>
              <span className="h-[1px] flex-1 bg-white/10" />
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.12] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="text-base font-bold text-[#4285F4]">G</span>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin("github")}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.12] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="text-sm">●</span>
                <span>GitHub</span>
              </button>
            </div>

            {/* Demo / Guest shortcut */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => onLogin({ username: "Guest Student", email: "guest@pathfinder.ai" })}
                className="text-xs text-slate-400 hover:text-amber-300 transition-colors underline underline-offset-4"
              >
                Continue in Guest / Demo Mode &rarr;
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
