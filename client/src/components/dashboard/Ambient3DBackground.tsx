import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { createPortal } from "react-dom";
import { PredictiveArcCanvas } from "@/shaders/predictive-arc/PredictiveArcCanvas";
import SphereShieldTiled from "@/shaders/SphereShieldTiled";
import { Sparkles, Orbit, Layers, Zap } from "lucide-react";

export type BackgroundVariant = "smooth-speed" | "predictive" | "predictive-void" | "void-field";

interface Ambient3DBackgroundProps {
  className?: string;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ShaderErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Graceful silent fallback to high-speed hardware-accelerated ambient mode
    console.debug("[Ambient3DBackground] Handled shader fallback:", error.message);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const getInitialVariant = (): BackgroundVariant => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pathfinder_bg_variant");
      if (
        stored === "smooth-speed" ||
        stored === "predictive-void" ||
        stored === "predictive" ||
        stored === "void-field"
      ) {
        return stored as BackgroundVariant;
      }
    } catch {
      // ignore
    }
  }
  // Default to Ultra-Smooth Speed mode for 60fps locked transitions across all devices
  return "smooth-speed";
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
          console.debug("[UnicornStudio] init handled:", err);
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

export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = React.memo(({ className = "" }) => {
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

  // Pure CSS Hardware-Accelerated 60fps Speed Background (Zero CPU / Zero WebGL overhead)
  const renderSmoothSpeedBackground = () => (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(circle 800px at 50% -10%, rgba(124, 58, 237, 0.12), transparent 70%),
          radial-gradient(circle 600px at 15% 40%, rgba(159, 18, 57, 0.08), transparent 60%),
          radial-gradient(circle 700px at 85% 65%, rgba(56, 189, 248, 0.06), transparent 65%),
          radial-gradient(circle 900px at 50% 110%, rgba(17, 24, 39, 0.9), transparent 80%)
        `,
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    >
      {/* Precision Micro-Lattice Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.8) 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );

  // Switcher positioned safely on the BOTTOM-LEFT to eliminate any collision with the right-side AI button
  const switcher = (
    <aside
      aria-label="3D Background Mode Controls"
      className="fixed bottom-3 left-3 sm:left-6 z-40 pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#11131c]/95 p-1 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 hover:border-white/30"
    >
      <div className="flex items-center gap-1 px-1.5 text-[9px] font-bold uppercase tracking-wider text-[#A1A1AA]">
        <Layers className="h-3 w-3 text-[#7c3aed]" />
        <span className="hidden sm:inline">Engine:</span>
      </div>

      <button
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setVariant("smooth-speed");
        }}
        title="Ultra Smooth 60 FPS Mode (Zero lag, instant slide transitions)"
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
          variant === "smooth-speed"
            ? "bg-[#7c3aed]/20 text-[#f8fafc] border border-[#7c3aed]/50 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
            : "text-[#A1A1AA] hover:text-[#F2F2F3] hover:bg-white/[0.06]"
        }`}
      >
        <Zap className="h-2.5 w-2.5 text-emerald-400" />
        <span>Smooth 60fps</span>
      </button>

      <button
        type="button"
        onClick={(e: React.MouseEvent) => {
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
        <span className="hidden xs:inline">Torus 3D</span>
      </button>

      <button
        type="button"
        onClick={(e: React.MouseEvent) => {
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
        <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
        <span className="hidden sm:inline">Hybrid</span>
      </button>

      <button
        type="button"
        onClick={(e: React.MouseEvent) => {
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
        <span className="text-[9px] font-mono text-purple-400 font-bold">042</span>
        <span className="hidden sm:inline">Void</span>
      </button>
    </aside>
  );

  return (
    <>
      <div
        className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
        style={{ contain: "strict", willChange: "transform", transform: "translateZ(0)" }}
      >
        {/* Active Ambient Engine Layer */}
        {isVisible && (
          <ShaderErrorBoundary fallback={renderSmoothSpeedBackground()}>
            <div className="absolute inset-0">
              {variant === "smooth-speed" && renderSmoothSpeedBackground()}
              {variant === "predictive-void" && (
                <PredictiveArcCanvas
                  variant="predictive"
                  speed={speed}
                  hue={0}
                  saturation={1.0}
                  brightness={brightness}
                />
              )}
              {variant === "predictive" && <UnicornTorusBackground />}
              {variant === "void-field" && (
                <SphereShieldTiled
                  speed={speed * 50}
                  background="transparent"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}
                />
              )}
            </div>
          </ShaderErrorBoundary>
        )}

        {/* Atmospheric Radial Color Grading & Subtle Vignette */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-25"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(139, 92, 246, 0.10), rgba(56, 189, 248, 0.04) 45%, transparent 75%)",
          }}
        />

        {/* Horizon Accent Line */}
        <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/15 to-transparent pointer-events-none blur-[0.5px]" />
      </div>

      {typeof document !== "undefined" ? createPortal(switcher, document.body) : switcher}
    </>
  );
});
Ambient3DBackground.displayName = "Ambient3DBackground";
