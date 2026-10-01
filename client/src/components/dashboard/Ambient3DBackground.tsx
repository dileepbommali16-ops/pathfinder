import React, { useState } from "react";
import { createPortal } from "react-dom";
import { PredictiveArcCanvas } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import { Sparkles, Orbit, Layers } from "lucide-react";

export type BackgroundVariant = "predictive-void" | "predictive" | "void-field";

interface Ambient3DBackgroundProps {
  className?: string;
}

const getInitialVariant = (): BackgroundVariant => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pathfinder_bg_variant");
      if (stored === "predictive-void" || stored === "predictive" || stored === "void-field") {
        return stored;
      }
    } catch {
      // ignore
    }
  }
  return "predictive-void";
};

export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "" }) => {
  const [variant, setVariantState] = useState<BackgroundVariant>(getInitialVariant);
  const [speed] = useState<number>(1.0);
  const [brightness] = useState<number>(1.0);

  const setVariant = (next: BackgroundVariant) => {
    setVariantState(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pathfinder_bg_variant", next);
      } catch {
        // ignore
      }
    }
  };

  const switcher = (
    <aside
      aria-label="3D Background Mode Controls"
      className="fixed bottom-4 right-4 z-[99999] pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-300 hover:border-purple-500/50"
    >
      <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Layers className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
        <span className="hidden sm:inline">Background:</span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVariant("predictive-void");
        }}
        title="Hybrid Mix: 3D WebGL Void Matrix + Luminous Predictive Arc"
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
          variant === "predictive-void"
            ? "bg-gradient-to-r from-purple-500/30 to-emerald-500/30 text-white border border-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.4)]"
            : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
        }`}
      >
        <Sparkles className="h-3 w-3 text-emerald-400" />
        <span>Hybrid Mix</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVariant("predictive");
        }}
        title="Predictive Neural Arc: Luminous 3D AI Trajectory"
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
          variant === "predictive"
            ? "bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.4)]"
            : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
        }`}
      >
        <Orbit className="h-3 w-3 text-purple-400" />
        <span>Predictive Arc</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVariant("void-field");
        }}
        title="042 Void Protocol: Cyberpunk Telemetry Field"
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
          variant === "void-field"
            ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.4)]"
            : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
        }`}
      >
        <span className="text-[10px] font-mono text-emerald-400 font-bold">042</span>
        <span>Void Field</span>
      </button>
    </aside>
  );

  return (
    <>
      <div className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}>
        {/* ThreeUI Shaders Canvas Layer */}
        <div className="absolute inset-0">
          {variant === "predictive-void" && (
            <PredictiveArcCanvas
              variant="predictive-void"
              speed={speed}
              hue={0}
              saturation={1.0}
              brightness={brightness}
            />
          )}
          {variant === "predictive" && (
            <PredictiveArcCanvas
              variant="predictive"
              mode="dark"
              speed={speed}
              hue={0}
              saturation={1.0}
              brightness={brightness}
            />
          )}
          {variant === "void-field" && (
            <PredictiveArcCanvas
              variant="void-field"
              hue={0}
              saturation={1.0}
              brightness={brightness}
            />
          )}
        </div>

        {/* Atmospheric Radial Color Grading & Subtle Vignette */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(139, 92, 246, 0.15), rgba(16, 185, 129, 0.08) 45%, transparent 75%)",
          }}
        />

        {/* Horizon Accent Line */}
        <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/25 to-transparent pointer-events-none blur-[0.5px]" />
      </div>

      {typeof document !== "undefined" ? createPortal(switcher, document.body) : switcher}
    </>
  );
};
