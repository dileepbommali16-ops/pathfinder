import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { WireframeFace } from "./WireframeFace";

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

export const Avatar3D: React.FC<Avatar3DProps> = React.memo(({
  className = "",
  style = {},
}) => {
  const [isPrimary, setIsPrimary] = useState(false);

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
      <Canvas
        camera={{ position: [0, 0.04, 4.15], fov: 42 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <ambientLight intensity={1.8} />
        <pointLight position={[4, 4, 5]} intensity={3.2} color="#5BC0DE" />
        <pointLight position={[-4, -2, 4]} intensity={2.4} color="#5BC0DE" />
        <pointLight position={[0, 1.5, 4]} intensity={1.6} color="#ffffff" />
        <React.Suspense fallback={null}>
          <WireframeFace />
        </React.Suspense>
      </Canvas>
    </div>
  );
});

export default Avatar3D;
