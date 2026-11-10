import React from "react";
import { Canvas } from "@react-three/fiber";
import { WireframeFace } from "./WireframeFace";
import { PathfinderFace } from "./PathfinderFace";

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
  [key: string]: any;
}

export const Avatar3D: React.FC<Avatar3DProps> = ({
  className = "",
  style = {},
}) => {
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[1] flex items-center justify-center opacity-90 ${className}`}
      style={style}
    >
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <pointLight position={[5, 5, 5]} intensity={2.2} color="#00f0ff" />
        <pointLight position={[-5, -3, 3]} intensity={1.6} color="#38bdf8" />
        <WireframeFace />
      </Canvas>
    </div>
  );
};

export default Avatar3D;
