import React, { useState } from "react";
import { PredictiveArcCanvas } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import { Sparkles, Orbit, Layers } from "lucide-react";

export type BackgroundVariant = "predictive-void" | "predictive" | "void-field";

interface Ambient3DBackgroundProps {
  className?: string;
}

export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "" }) => {
  const [variant, setVariant] = useState<BackgroundVariant>("predictive-void");
  const [speed, setSpeed] = useState<number>(1.0);
  const [brightness, setBrightness] = useState<number>(1.0);

  return (
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

      {/* Mode Switcher Widget in Bottom-Right Corner (pointer-events-auto) */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-opacity duration-300 hover:border-purple-500/40">
        <div className="flex items-center gap-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Layers className="h-3 w-3 text-purple-400" />
          <span className="hidden sm:inline">Background:</span>
        </div>

        <button
          onClick={() => setVariant("predictive-void")}
          title="Mixed: Void Field + Predictive Arc"
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
            variant === "predictive-void"
              ? "bg-gradient-to-r from-purple-500/20 to-emerald-500/20 text-white border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>Hybrid Mix</span>
        </button>

        <button
          onClick={() => setVariant("predictive")}
          title="Prompt 2: Predictive Arc"
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
            variant === "predictive"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Orbit className="h-3 w-3 text-purple-400" />
          <span>Predictive Arc</span>
        </button>

        <button
          onClick={() => setVariant("void-field")}
          title="Prompt 1: Void Field"
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
            variant === "void-field"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span className="text-[10px] font-mono text-emerald-400">042</span>
          <span>Void Field</span>
        </button>
      </div>
    </div>
  );
};
