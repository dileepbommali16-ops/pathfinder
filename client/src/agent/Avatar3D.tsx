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
  url?: string;
  modelUrl?: string;
  avatarType?: "vrm" | "gltf" | "cyber";
  isOwner?: boolean;
  paused?: boolean;
}

export default function Avatar3D({
  getLevel,
  audioLevel = 0,
  state = "idle",
}: Avatar3DProps) {
  return (
    <PathfinderFace
      getLevel={getLevel}
      audioLevel={audioLevel}
      state={state}
      className="w-full h-full"
    />
  );
}

export { Avatar3D };
