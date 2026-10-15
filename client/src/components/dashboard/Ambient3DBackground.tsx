import React, { useState, useEffect } from "react";
import { PredictiveArcCanvas, SphereShieldTiled } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

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
        (document.head || document.body).appendChild(script);
      } else {
        existingScript.addEventListener("load", () => setTimeout(initStudio, 40));
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
  const [variant] = useState<BackgroundVariant>(getInitialVariant);
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

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      style={{ contain: "strict", willChange: "transform", transform: "translateZ(0)" }}
    >
      {/* ThreeUI Shaders Canvas Layer */}
      {isVisible && (
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

      {/* Atmospheric Neutral Slate Radial Color Grading & Subtle Vignette */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(255, 255, 255, 0.08), rgba(148, 163, 184, 0.04) 45%, transparent 75%)",
        }}
      />

      {/* Horizon Accent Line - Clean Silver / Slate */}
      <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none blur-[0.5px]" />
    </div>
  );
};
