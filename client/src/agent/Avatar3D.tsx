import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { WireframeFace } from "./WireframeFace";
import { SafeWebGLGuard } from "../components/SafeWebGLGuard";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export interface Avatar3DProps {
  activeTab?: string;
  globalContext?: string;
  textResponse?: string;
  onMicClick?: (micOn: boolean) => void;
  getLevel?: () => number;
  audioLevel?: number;
  state?: AvatarState;
  isListening?: boolean;
  url?: string;
  modelUrl?: string;
  avatarType?: "vrm" | "gltf" | "cyber";
  isOwner?: boolean;
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Global Singleton Guard: Prevents duplicate Three.js Canvases from mounting
let activeAvatarCount = 0;

if (typeof window !== "undefined" && !(window as any).__THREE_CLOCK_WARN_FILTERED__) {
  (window as any).__THREE_CLOCK_WARN_FILTERED__ = true;
  const origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("THREE.Clock: This module has been deprecated")
    ) {
      return;
    }
    origWarn(...args);
  };
}

export const Avatar3D: React.FC<Avatar3DProps> = React.memo(({
  className = "",
  style = {},
}) => {
  const [isPrimary, setIsPrimary] = useState(false);
  const isCompactDevice =
    typeof window !== "undefined" &&
    (window.innerWidth < 1024 ||
      Boolean(window.matchMedia?.("(pointer: coarse)").matches));

  useEffect(() => {
    if (activeAvatarCount === 0) {
      activeAvatarCount = 1;
      setIsPrimary(true);
      return () => {
        activeAvatarCount = 0;
      };
    }
    return undefined;
  }, []);

  // If another instance is already mounted, suppress duplicate render
  if (!isPrimary) return null;

  return (
    <div
      id="das-singleton-avatar"
      className={`fixed inset-0 pointer-events-none z-[1] flex items-center justify-center opacity-100 select-none ${className}`}
      style={style}
    >
      <SafeWebGLGuard
        fallback={
          <div
            aria-label="AI Avatar"
            className="flex h-full w-full items-center justify-center rounded-full border border-[#5BC0DE]/30 bg-gradient-to-br from-[#5BC0DE]/15 to-slate-950"
          >
            <span className="h-3 w-3 animate-pulse rounded-full bg-[#5BC0DE]" />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0.04, 4.15], fov: 42 }}
          dpr={isCompactDevice ? [1, 1.25] : [1, 1.5]}
          gl={{
            alpha: true,
            antialias: !isCompactDevice,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            const dom = gl?.domElement;
            if (!dom) return;
            const handleLost = (e: Event) => {
              e.preventDefault();
            };
            dom.addEventListener("webglcontextlost", handleLost, false);
          }}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <ambientLight intensity={1.8} />
          <pointLight position={[4, 4, 5]} intensity={3.2} color="#5BC0DE" />
          <pointLight position={[-4, -2, 4]} intensity={2.4} color="#5BC0DE" />
          <React.Suspense fallback={null}>
            <WireframeFace />
          </React.Suspense>
        </Canvas>
      </SafeWebGLGuard>
    </div>
  );
});

export default Avatar3D;
