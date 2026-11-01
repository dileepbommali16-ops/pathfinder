import React, { useState, useEffect, useRef } from "react";

export interface PathfinderFaceProps {
  audioLevel?: number;
  getLevel?: () => number;
  state?: "idle" | "listening" | "thinking" | "speaking" | string;
  isListening?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function PathfinderFace({
  audioLevel = 0,
  getLevel,
  state = "idle",
  isListening = false,
  className = "",
  style = {},
}: PathfinderFaceProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const currentMouseRef = useRef({ x: 0, y: 0 });

  // 1. Mouse movement tracking for 3D parallax head tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to +1 from screen center
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      targetMouseRef.current = { x, y };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 2. Continuous 60fps render loop: Audio analysis, Mouse Tilt lerp, and Canvas particle/HUD rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    // Micro-particles floating from metallic collar
    const particles = Array.from({ length: 24 }, () => ({
      x: Math.random() * 1024,
      y: 700 + Math.random() * 324,
      vy: -0.4 - Math.random() * 0.7,
      size: 1 + Math.random() * 2.5,
      alpha: 0.1 + Math.random() * 0.5,
    }));

    let radarAngle = 0;
    let time = 0;

    const renderLoop = () => {
      time += 0.03;

      // Sample live audio volume
      let lvl = 0;
      if (getLevel) {
        try {
          const l = getLevel();
          if (typeof l === "number" && !isNaN(l)) lvl = l;
        } catch {}
      } else if (audioLevel !== undefined) {
        lvl = audioLevel;
      }
      setCurrentLevel(Math.min(Math.max(lvl, 0), 1));

      // Smooth lerp mouse parallax tilt
      currentMouseRef.current.x += (targetMouseRef.current.x - currentMouseRef.current.x) * 0.06;
      currentMouseRef.current.y += (targetMouseRef.current.y - currentMouseRef.current.y) * 0.06;
      setTilt({
        x: currentMouseRef.current.x,
        y: currentMouseRef.current.y,
      });

      // Canvas dynamic HUD & telemetry rendering
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        radarAngle += 0.02;
        const speakingNow = state === "speaking" || lvl > 0.06;
        const listeningNow = isListening || state === "listening";

        // A. Floating embers/particles around metallic neck
        particles.forEach((p) => {
          p.y += p.vy;
          if (p.y < 500) {
            p.y = 1000 + Math.random() * 40;
            p.x = 260 + Math.random() * 500;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 60, 60, ${p.alpha * (speakingNow ? 0.9 : 0.4)})`;
          ctx.fill();
        });

        // B. Speaking monitor: When user speaks (isListening), render animated radar arcs around eyes
        if (listeningNow) {
          const eyeCoords = [
            { x: 306.6, y: 320.2 },
            { x: 717.7, y: 320.4 },
          ];
          eyeCoords.forEach((eye) => {
            const pulseRadius = 55 + Math.sin(time * 6) * 12;
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 30, 30, ${0.4 + Math.sin(time * 6) * 0.3})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 8]);
            ctx.stroke();

            // Concentric outer ring
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, pulseRadius + 18, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 50, 50, 0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        // C. Live vocalizer frequency wave around the mouth area when DAS speaks
        if (speakingNow && lvl > 0.03) {
          const mouthX = 504;
          const mouthY = 732;
          const barCount = 16;
          const barSpacing = 6;
          const startX = mouthX - (barCount * barSpacing) / 2;

          for (let i = 0; i < barCount; i++) {
            const wave = Math.sin(time * 12 + i * 0.6) * 0.5 + 0.5;
            const barH = 4 + wave * lvl * 28;
            const bx = startX + i * barSpacing;
            ctx.beginPath();
            ctx.rect(bx, mouthY - barH / 2, 2.5, barH);
            ctx.fillStyle = `rgba(255, ${Math.floor(40 + wave * 60)}, 40, ${0.6 + wave * 0.35})`;
            ctx.fill();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [getLevel, audioLevel, state, isListening]);

  // 3. Natural eye blink: random blink every 3 to 5 seconds, closed for exactly 150ms
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    let restoreTimer: NodeJS.Timeout;

    const scheduleBlink = () => {
      const interval = 3000 + Math.random() * 2000; // 3-5 sec
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        restoreTimer = setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150); // Exact 150ms blink as requested
      }, interval);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(restoreTimer);
    };
  }, []);

  const isSpeaking = state === "speaking" || currentLevel > 0.05;
  const isUserSpeaking = isListening || state === "listening";

  // Dynamic speaking boost and jaw displacement
  const audioBoost = isSpeaking ? Math.min(currentLevel * 1.5, 1) : 0;
  const jawDropPx = isSpeaking ? Math.min(currentLevel * 12, 10) : 0;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none pointer-events-none overflow-hidden ${className}`}
      style={{
        background: "transparent",
        ...style,
      }}
      aria-label="DAS Living 3D Cybernetic Face"
    >
      {/* 3D PARALLAX CONTAINER: Tilts subtly with mouse movement */}
      <div
        className="relative max-w-full max-h-full aspect-square flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
          width: "100%",
          height: "100%",
          transform: `perspective(1000px) rotateY(${tilt.x * 6.5}deg) rotateX(${-tilt.y * 6.5}deg) translate3d(${tilt.x * 10}px, ${tilt.y * 10}px, 0)`,
          animation: "dasLivingBreathing 6s ease-in-out infinite",
        }}
      >
        {/* Living Robot Face Asset (Dark metallic cyborg) */}
        <img
          src="/face.png"
          alt="Pathfinder Living Face"
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          draggable={false}
          loading="eager"
        />

        {/* 60FPS LIVE ANIMATED CANVAS OVERLAY (Telemetry, Embers, Audio Waveform) */}
        <canvas
          ref={canvasRef}
          width={1024}
          height={1024}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* PERFECT ROUND RED SPHERICAL LEFT EYE */}
        <div
          data-testid="das-left-eye"
          style={{
            position: "absolute",
            left: "29.94%",
            top: "31.28%",
            width: "8.5%",
            height: "8.5%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 36%, #ffffff 0%, #ff7777 22%, #ff0000 65%, #880000 100%)",
            boxShadow: isUserSpeaking
              ? "0 0 25px #ff0000, 0 0 55px #ff0000, 0 0 95px #ff2200, inset 0 0 10px #ffffff"
              : isSpeaking
              ? `0 0 24px #ff0000, 0 0 ${45 + audioBoost * 35}px #ff0000, 0 0 ${80 + audioBoost * 50}px #ff2200, inset 0 0 10px #ffffff`
              : "0 0 20px #ff0000, 0 0 42px #ff0000, 0 0 70px #ff1a1a, inset 0 0 8px #ffffff",
            transform: isBlinking
              ? "translate(-50%, -50%) scaleY(0.04)"
              : isUserSpeaking
              ? "translate(-50%, -50%) scale(1.08)"
              : `translate(-50%, -50%) scale(${1 + audioBoost * 0.12})`,
            transition: "transform 0.08s ease-in-out, box-shadow 0.15s ease",
            animation: isUserSpeaking
              ? "dasEyePulseRapid 1s ease-in-out infinite"
              : "dasEyePulseSmooth 2.5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* PERFECT ROUND RED SPHERICAL RIGHT EYE */}
        <div
          data-testid="das-right-eye"
          style={{
            position: "absolute",
            left: "70.09%",
            top: "31.28%",
            width: "8.5%",
            height: "8.5%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 36%, #ffffff 0%, #ff7777 22%, #ff0000 65%, #880000 100%)",
            boxShadow: isUserSpeaking
              ? "0 0 25px #ff0000, 0 0 55px #ff0000, 0 0 95px #ff2200, inset 0 0 10px #ffffff"
              : isSpeaking
              ? `0 0 24px #ff0000, 0 0 ${45 + audioBoost * 35}px #ff0000, 0 0 ${80 + audioBoost * 50}px #ff2200, inset 0 0 10px #ffffff`
              : "0 0 20px #ff0000, 0 0 42px #ff0000, 0 0 70px #ff1a1a, inset 0 0 8px #ffffff",
            transform: isBlinking
              ? "translate(-50%, -50%) scaleY(0.04)"
              : isUserSpeaking
              ? "translate(-50%, -50%) scale(1.08)"
              : `translate(-50%, -50%) scale(${1 + audioBoost * 0.12})`,
            transition: "transform 0.08s ease-in-out, box-shadow 0.15s ease",
            animation: isUserSpeaking
              ? "dasEyePulseRapid 1s ease-in-out infinite"
              : "dasEyePulseSmooth 2.5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* ARTICULATED LIP SYNC & JAW EMISSION (Syncs directly to ElevenLabs voice frequency) */}
        {isSpeaking && (
          <div
            data-testid="das-mouth-articulator"
            style={{
              position: "absolute",
              left: "49.3%",
              top: "71.5%",
              width: "12%",
              height: `${4 + jawDropPx * 1.2}px`,
              transform: `translate(-50%, -50%) scaleX(${1 + audioBoost * 0.35})`,
              background: "radial-gradient(ellipse at center, #ff2222 0%, #cc0000 60%, rgba(100,0,0,0) 100%)",
              boxShadow: `0 0 ${12 + audioBoost * 20}px #ff0000, 0 0 ${25 + audioBoost * 35}px #ff2200`,
              borderRadius: "4px",
              opacity: Math.min(0.4 + audioBoost * 0.6, 0.95),
              transition: "height 0.06s ease, transform 0.06s ease, opacity 0.08s ease",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes dasLivingBreathing {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        @keyframes dasEyePulseSmooth {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 10px rgba(255,0,0,0.6));
          }
          50% {
            filter: brightness(1.2) drop-shadow(0 0 25px rgba(255,0,0,0.9));
          }
        }
        @keyframes dasEyePulseRapid {
          0%, 100% {
            filter: brightness(1.1) drop-shadow(0 0 16px rgba(255,0,0,0.7));
          }
          50% {
            filter: brightness(1.4) drop-shadow(0 0 32px rgba(255,30,30,1));
          }
        }
      `}</style>
    </div>
  );
}

export { PathfinderFace };
