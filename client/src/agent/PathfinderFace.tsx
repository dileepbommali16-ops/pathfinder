import React, { useState, useEffect, useRef } from "react";

export interface PathfinderFaceProps {
  audioLevel?: number;
  getLevel?: () => number;
  state?: "idle" | "listening" | "thinking" | "speaking" | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PathfinderFace({
  audioLevel = 0,
  getLevel,
  state = "idle",
  className = "",
  style = {},
}: PathfinderFaceProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Monitor audio levels for reactive speech pulsation
  useEffect(() => {
    const pollAudio = () => {
      if (getLevel) {
        try {
          const lvl = getLevel();
          if (typeof lvl === "number" && !isNaN(lvl)) {
            setCurrentLevel(Math.min(Math.max(lvl, 0), 1));
          }
        } catch {}
      } else if (audioLevel !== undefined) {
        setCurrentLevel(Math.min(Math.max(audioLevel, 0), 1));
      }
      animFrameRef.current = requestAnimationFrame(pollAudio);
    };

    animFrameRef.current = requestAnimationFrame(pollAudio);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [getLevel, audioLevel]);

  // Natural cybernetic eye blink cycle (every 3.2 - 5.5 seconds)
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    let cancelBlinkTimer: NodeJS.Timeout;

    const scheduleNextBlink = () => {
      const delay = 3200 + Math.random() * 2400;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        cancelBlinkTimer = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 130);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(cancelBlinkTimer);
    };
  }, []);

  const isSpeaking = state === "speaking" || currentLevel > 0.08;
  const audioGlowBoost = isSpeaking ? Math.min(currentLevel * 1.4, 0.8) : 0;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none pointer-events-none overflow-hidden ${className}`}
      style={{
        background: "transparent",
        ...style,
      }}
      aria-label="DAS 3D AI Cybernetic Face"
    >
      {/* 1:1 Aspect ratio wrapper matching the 1024x1024 cybernetic face asset */}
      <div
        className="relative max-w-full max-h-full aspect-square flex items-center justify-center"
        style={{
          width: "100%",
          height: "100%",
          animation: "dasBreathing 6s ease-in-out infinite",
        }}
      >
        {/* Exact Dark Metallic Cyborg Head Reference Asset */}
        <img
          src="/face.png"
          alt="Pathfinder AI Face"
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_15px_45px_rgba(0,0,0,0.95)]"
          draggable={false}
          loading="eager"
        />

        {/* PERFECT ROUND SOLID RED GLOWING LEFT EYE */}
        <div
          data-testid="eye-left"
          style={{
            position: "absolute",
            left: "29.94%",
            top: "31.28%",
            width: "8.5%",
            height: "8.5%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 45% 45%, #ff5555 0%, #ff0000 62%, #c40000 100%)",
            boxShadow: isSpeaking
              ? `0 0 24px #ff0000, 0 0 ${50 + audioGlowBoost * 30}px #ff0000, 0 0 ${85 + audioGlowBoost * 45}px #ff2200, inset 0 0 10px #ffe5e5`
              : "0 0 18px #ff0000, 0 0 38px #ff0000, 0 0 65px #ff1a1a, inset 0 0 8px #ffe5e5",
            transform: isBlinking
              ? "translate(-50%, -50%) scaleY(0.06)"
              : `translate(-50%, -50%) scale(${1 + audioGlowBoost * 0.15})`,
            transition: "transform 0.08s ease-in-out, box-shadow 0.15s ease",
            animation: "dasEyePulse 2.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* PERFECT ROUND SOLID RED GLOWING RIGHT EYE */}
        <div
          data-testid="eye-right"
          style={{
            position: "absolute",
            left: "70.09%",
            top: "31.28%",
            width: "8.5%",
            height: "8.5%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 45% 45%, #ff5555 0%, #ff0000 62%, #c40000 100%)",
            boxShadow: isSpeaking
              ? `0 0 24px #ff0000, 0 0 ${50 + audioGlowBoost * 30}px #ff0000, 0 0 ${85 + audioGlowBoost * 45}px #ff2200, inset 0 0 10px #ffe5e5`
              : "0 0 18px #ff0000, 0 0 38px #ff0000, 0 0 65px #ff1a1a, inset 0 0 8px #ffe5e5",
            transform: isBlinking
              ? "translate(-50%, -50%) scaleY(0.06)"
              : `translate(-50%, -50%) scale(${1 + audioGlowBoost * 0.15})`,
            transition: "transform 0.08s ease-in-out, box-shadow 0.15s ease",
            animation: "dasEyePulse 2.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* SUBTLE AUDIO-REACTIVE MOUTH GLOW (Active ONLY during speech, syncs to audio level) */}
        {isSpeaking && (
          <div
            data-testid="mouth-glow"
            style={{
              position: "absolute",
              left: "49.3%",
              top: "71.5%",
              width: "12%",
              height: "2.4%",
              transform: `translate(-50%, -50%) scaleX(${1 + audioGlowBoost * 0.4}) scaleY(${1 + audioGlowBoost * 0.9})`,
              background: "radial-gradient(ellipse at center, rgba(255, 30, 30, 0.9) 0%, rgba(220, 20, 20, 0.4) 60%, transparent 100%)",
              filter: "blur(2px)",
              opacity: Math.min(0.35 + audioGlowBoost * 0.65, 0.95),
              transition: "transform 0.06s ease, opacity 0.1s ease",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes dasBreathing {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.008);
          }
        }
        @keyframes dasEyePulse {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 10px rgba(255,0,0,0.6));
          }
          50% {
            filter: brightness(1.22) drop-shadow(0 0 22px rgba(255,0,0,0.9));
          }
        }
      `}</style>
    </div>
  );
}

export { PathfinderFace };
