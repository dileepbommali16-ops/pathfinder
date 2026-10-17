import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  FaceMeshRig
} from "./FaceMeshRig";
import {
  VisemeParams,
  AvatarState,
  DEFAULT_VISEME_PARAMS,
  smoothParam,
  getVisemeForCharacter,
  clampParam
} from "./visemeMapper";

interface AvatarCanvasProps {
  state?: AvatarState;
  spokenText?: string;
  isSpeaking?: boolean;
  audioAnalyser?: AnalyserNode | null;
  className?: string;
  width?: number;
  height?: number;
  onFpsUpdate?: (fps: number) => void;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  state = "idle",
  spokenText = "",
  isSpeaking = false,
  audioAnalyser = null,
  className = "",
  width = 160,
  height = 192,
  onFpsUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rigRef = useRef<FaceMeshRig | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Parameter state tracking (critically damped)
  const currentParamsRef = useRef<VisemeParams>({ ...DEFAULT_VISEME_PARAMS });
  const targetParamsRef = useRef<VisemeParams>({ ...DEFAULT_VISEME_PARAMS });

  // Idle animation timers
  const lastBlinkTimeRef = useRef<number>(Date.now());
  const nextBlinkIntervalRef = useRef<number>(3500);
  const blinkProgressRef = useRef<number>(0);
  const isBlinkingRef = useRef<boolean>(false);

  // Performance and fallback tracking
  const [isLowPerformance, setIsLowPerformance] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsCheckRef = useRef<number>(performance.now());
  const isTabHiddenRef = useRef<boolean>(false);

  // Spoken text character cursor for viseme timing
  const textCharIndexRef = useRef<number>(0);
  const lastCharAdvancetimeRef = useRef<number>(0);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Initialize Rig and Texture
  useEffect(() => {
    const rig = new FaceMeshRig();
    rigRef.current = rig;

    rig
      .loadTexture("/avatar/mentor.webp")
      .then(() => {
        setImageLoaded(true);
      })
      .catch((err) => {
        console.warn("[Avatar] Fallback to mentor.png:", err);
        rig.loadTexture("/avatar/mentor.png").then(() => setImageLoaded(true)).catch(() => {});
      });

    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Reset mouth instantly on stop/idle
  useEffect(() => {
    if (state === "idle" || !isSpeaking) {
      targetParamsRef.current.jawOpen = 0.0;
      targetParamsRef.current.mouthWide = 0.2;
      targetParamsRef.current.mouthRound = 0.0;
      targetParamsRef.current.upperLipRaise = 0.0;
      textCharIndexRef.current = 0;
    }
  }, [state, isSpeaking]);

  // Main Render Loop
  useEffect(() => {
    if (!imageLoaded || prefersReducedMotion) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      animFrameRef.current = requestAnimationFrame(loop);

      if (isTabHiddenRef.current) return;

      const deltaSec = Math.max(0.001, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // FPS Monitoring
      frameCountRef.current++;
      if (currentTime - lastFpsCheckRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (currentTime - lastFpsCheckRef.current));
        frameCountRef.current = 0;
        lastFpsCheckRef.current = currentTime;
        if (onFpsUpdate) onFpsUpdate(fps);

        if (fps < 24 && !isLowPerformance) {
          setIsLowPerformance(true);
        }
      }

      const canvas = canvasRef.current;
      const rig = rigRef.current;
      if (!canvas || !rig) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const timeSec = currentTime / 1000;

      // 1. Natural Blinking Logic (every 3-6s, 120ms closure)
      const now = Date.now();
      if (!isBlinkingRef.current && now - lastBlinkTimeRef.current > nextBlinkIntervalRef.current) {
        isBlinkingRef.current = true;
        blinkProgressRef.current = 0;
      }
      if (isBlinkingRef.current) {
        blinkProgressRef.current += deltaSec * 8.5; // ~120ms total blink
        if (blinkProgressRef.current >= 1.0) {
          isBlinkingRef.current = false;
          blinkProgressRef.current = 0;
          lastBlinkTimeRef.current = now;
          nextBlinkIntervalRef.current = 3000 + Math.random() * 3000;
          targetParamsRef.current.eyeBlink = 0.0;
        } else {
          // Parabolic blink curve: 0 -> 1 -> 0
          targetParamsRef.current.eyeBlink = Math.sin(blinkProgressRef.current * Math.PI);
        }
      } else {
        targetParamsRef.current.eyeBlink = 0.0;
      }

      // 2. Idle Life Motions (Breathing & Micro-sway)
      const breathing = Math.sin(timeSec * 1.8) * 0.03;
      const headSway = Math.sin(timeSec * 0.9) * 0.035;

      // 3. State Machine Adjustments
      if (state === "idle") {
        targetParamsRef.current.headYaw = headSway;
        targetParamsRef.current.headPitch = breathing;
        targetParamsRef.current.headRoll = headSway * 0.4;
        targetParamsRef.current.browRaise = 0.0;
        targetParamsRef.current.mouthSmile = 0.06;
      } else if (state === "listening") {
        // Attentive head tilt towards user
        targetParamsRef.current.headYaw = 0.04;
        targetParamsRef.current.headPitch = -0.06;
        targetParamsRef.current.headRoll = 0.08;
        targetParamsRef.current.browRaise = 0.15;
        targetParamsRef.current.mouthSmile = 0.10;
        targetParamsRef.current.jawOpen = 0.0;
      } else if (state === "thinking") {
        // Eyes drift up/aside, thoughtful small nod
        targetParamsRef.current.headYaw = 0.12;
        targetParamsRef.current.headPitch = -0.10;
        targetParamsRef.current.headRoll = -0.05;
        targetParamsRef.current.browRaise = 0.08;
        targetParamsRef.current.mouthSmile = 0.0;
        targetParamsRef.current.jawOpen = 0.0;
      } else if (state === "speaking") {
        // Subtle speaking emphasis head nods
        targetParamsRef.current.headPitch = breathing + Math.sin(timeSec * 4.2) * 0.045;
        targetParamsRef.current.headYaw = headSway * 0.5;
        targetParamsRef.current.headRoll = Math.sin(timeSec * 2.1) * 0.03;

        // Lip Sync Processing
        // Option A: Real Audio Analyser RMS
        if (audioAnalyser) {
          const buffer = new Uint8Array(audioAnalyser.frequencyBinCount);
          audioAnalyser.getByteTimeDomainData(buffer);
          let sumSquares = 0;
          for (let i = 0; i < buffer.length; i++) {
            const norm = (buffer[i] - 128) / 128;
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / buffer.length);
          targetParamsRef.current.jawOpen = clampParam("jawOpen", rms * 3.5);
          targetParamsRef.current.mouthWide = 0.35 + rms * 0.3;
        } else if (spokenText && isSpeaking) {
          // Option B: Text-to-viseme timing based on syllables
          const nowMs = performance.now();
          if (nowMs - lastCharAdvancetimeRef.current > 75) { // ~13 chars per sec average cadence
            lastCharAdvancetimeRef.current = nowMs;
            textCharIndexRef.current = (textCharIndexRef.current + 1) % Math.max(1, spokenText.length);
          }

          const curChar = spokenText[textCharIndexRef.current] || "a";
          const viseme = getVisemeForCharacter(curChar);

          targetParamsRef.current.jawOpen = viseme.jawOpen ?? 0.3;
          targetParamsRef.current.mouthWide = viseme.mouthWide ?? 0.25;
          targetParamsRef.current.mouthRound = viseme.mouthRound ?? 0.0;
          targetParamsRef.current.upperLipRaise = viseme.upperLipRaise ?? 0.0;

          // Raise brows on question mark
          if (spokenText.includes("?")) {
            targetParamsRef.current.browRaise = 0.25;
          }
        }
      }

      // 4. Critically Damped Smoothing of all parameters
      const smoothingSpeed = state === "speaking" ? 22.0 : 12.0;
      const current = currentParamsRef.current;
      const target = targetParamsRef.current;

      const keys = Object.keys(DEFAULT_VISEME_PARAMS) as (keyof VisemeParams)[];
      keys.forEach((key) => {
        current[key] = smoothParam(current[key], target[key], deltaSec, smoothingSpeed);
      });

      // 5. Deform Mesh and Render Frame
      rig.updateParameters(current, timeSec);
      rig.renderCanvas2D(ctx, canvas.width, canvas.height, current, timeSec);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [imageLoaded, isSpeaking, spokenText, state, audioAnalyser, prefersReducedMotion, onFpsUpdate, isLowPerformance]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#07080d]/80 p-2 shadow-xl backdrop-blur-md transition-all ${className}`}
      style={{ width: `${width + 16}px` }}
    >
      {/* AI Mentor Indicator Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-950/70 px-2 py-0.5 text-[10px] font-bold text-violet-300 shadow-sm backdrop-blur-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            state === "speaking"
              ? "bg-violet-400 animate-ping"
              : state === "listening"
              ? "bg-emerald-400 animate-pulse"
              : state === "thinking"
              ? "bg-amber-400 animate-spin"
              : "bg-zinc-400"
          }`}
        />
        AI Mentor
      </div>

      {/* Reduced Motion or Low-Performance Fallback */}
      {isLowPerformance || prefersReducedMotion ? (
        <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-black/40" style={{ width, height }}>
          <img
            src="/avatar/mentor.webp"
            alt="AI Mentor Avatar"
            className="h-full w-full object-cover rounded-xl"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/avatar/mentor.png";
            }}
          />
          {/* Audio Pulsing Halo */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-xl border-2 border-violet-500/60 animate-pulse pointer-events-none" />
          )}
        </div>
      ) : (
        /* Real-time 2D Mesh Animated Canvas */
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-xl object-contain shadow-inner transition-opacity duration-300"
        />
      )}

      {/* Subtitle / State Indicator pill */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
        {state === "speaking" && <span className="text-violet-400 animate-pulse">● Speaking</span>}
        {state === "listening" && <span className="text-emerald-400 animate-pulse">● Listening...</span>}
        {state === "thinking" && <span className="text-amber-400 animate-pulse">● Thinking...</span>}
        {state === "idle" && <span className="text-zinc-500">Ready</span>}
      </div>
    </div>
  );
};
