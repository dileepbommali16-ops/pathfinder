import React from "react";
import PathfinderFace from "./PathfinderFace";

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

export default function Avatar3D({
  getLevel,
  audioLevel = 0,
  state = "idle",
  isListening = false,
  className = "w-full h-full",
  style = {},
}: Avatar3DProps) {
  return (
    <PathfinderFace
      getLevel={getLevel}
      audioLevel={audioLevel}
      state={state}
      isListening={isListening || state === "listening"}
      className={className}
      style={style}
    />
  );
}

export { Avatar3D };
