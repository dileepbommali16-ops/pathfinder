import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PredictiveArcCanvas } from "@/shaders/predictive-arc/PredictiveArcCanvas";
import SphereShieldTiled from "@/shaders/SphereShieldTiled";
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
  return "predictive";
};

const UnicornTorusBackground: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;

    const initStudio = () => {
      if (cancelled) return;
      const u = (window as any).UnicornStudio;
      if (u) {
        try {
          if (typeof u.init === "function") {
            u.init();
          }
        } catch (err) {
          console.warn("[UnicornStudio] init notice:", err);
        }
      }
    };

    if ((window as any).UnicornStudio) {
      setTimeout(initStudio, 40);
    } else {
      const existingScript = document.querySelector('script[src*="unicornStudio.umd.js"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.2/dist/unicornStudio.umd.js";
        script.async = true;
        script.onload = () => {
          setTimeout(initStudio, 40);
        };
        script.onerror = () => {
          // Graceful fallback: silently continue with native shader background
        };
        (document.head || document.body).appendChild(script);
      } else {
        existingScript.addEventListener("load", () => setTimeout(initStudio, 40));
        existingScript.addEventListener("error", () => {});
      }
    }

    return () => {
      cancelled = true;
      try {
        const u = (window as any).UnicornStudio;
        if (u && typeof u.destroy === "function") {
          u.destroy();
        }
      } catch {}
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
      <div
        ref={containerRef}
        data-us-project="nqacDzsDqT8ctMiK19aE"
        className="w-full h-full"
        style={{ width: "100%", height: "100%", minHeight: "100vh" }}
      />
    </div>
  );
};

export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "" }) => {
  const [variant, setVariantState] = useState<BackgroundVariant>(getInitialVariant);
  const [speed] = useState<number>(1.0);
  const [brightness] = useState<number>(1.0);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
      className="fixed bottom-3 right-3 z-[99999] pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#141417]/95 p-1 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 hover:border-white/30"
    >
      <div className="flex items-center gap-1 px-1.5 text-[9px] font-bold uppercase tracking-wider text-[#A1A1AA]">
        <Layers className="h-3 w-3 text-white" />
        <span className="hidden sm:inline">BG:</span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVariant("predictive-void");
        }}
        title="Hybrid Mix: 3D WebGL Void Matrix + Luminous Predictive Arc"
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
          variant === "predictive-void"
            ? "bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
            : "text-[#A1A1AA] hover:text-[#F2F2F3] hover:bg-white/[0.06]"
        }`}
      >
        <Sparkles className="h-2.5 w-2.5 text-white" />
        <span>Hybrid Mix</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVariant("predictive");
        }}
        title="3D Neural Torus Glow"
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
          variant === "predictive"
            ? "bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
            : "text-[#A1A1AA] hover:text-[#F2F2F3] hover:bg-white/[0.06]"
        }`}
      >
        <Orbit className="h-2.5 w-2.5 text-amber-400" />
        <span>Torus Glow</span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVariant("void-field");
        }}
        title="Sphere Shield WebGL2: Shield Matrix"
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
          variant === "void-field"
            ? "bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
            : "text-[#A1A1AA] hover:text-[#F2F2F3] hover:bg-white/[0.06]"
        }`}
      >
        <span className="text-[9px] font-mono text-white font-bold">042</span>
        <span>Void Field</span>
      </button>
    </aside>
  );

  return (
    <>
      <div
        className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
        style={{ contain: "strict", willChange: "transform", transform: "translateZ(0)" }}
      >
        {/* ThreeUI Shaders Canvas Layer */}
        {isVisible && (
          <div className="absolute inset-0">
            {variant === "predictive-void" && (
              <PredictiveArcCanvas
                variant="predictive"
                speed={speed}
                hue={0}
                saturation={1.0}
                brightness={brightness}
              />
            )}
            {variant === "predictive" && (
              <UnicornTorusBackground />
            )}
            {variant === "void-field" && (
              <SphereShieldTiled
                speed={speed * 50}
                background="transparent"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}
              />
            )}
          </div>
        )}

        {/* Atmospheric Radial Color Grading & Subtle Vignette */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(139, 92, 246, 0.12), rgba(56, 189, 248, 0.05) 45%, transparent 75%)",
          }}
        />

        {/* Horizon Accent Line */}
        <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent pointer-events-none blur-[0.5px]" />
      </div>

      {typeof document !== "undefined" ? createPortal(switcher, document.body) : switcher}
    </>
  );
};
