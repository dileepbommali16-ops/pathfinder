import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { getAudioVolumeFromAnalyser } from "./audioStreamer";

/**
 * Avatar.jsx — Real-time 60 FPS Lip-Sync Morph Target Controller for 3D Avatar
 */
export function useAvatarLipSync(avatarMeshRef, mouthOpenIndex = 0) {
  useEffect(() => {
    let rafId = 0;
    const animate = () => {
      const volume = getAudioVolumeFromAnalyser(); // 0.0 to 1.0
      const avatarMesh = avatarMeshRef?.current;
      if (avatarMesh && Array.isArray(avatarMesh.morphTargetInfluences)) {
        const current = avatarMesh.morphTargetInfluences[mouthOpenIndex] || 0;
        avatarMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(
          current,
          volume,
          0.4
        );
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [avatarMeshRef, mouthOpenIndex]);
}

export default function Avatar({ avatarMeshRef, mouthOpenIndex = 0 }) {
  const internalRef = useRef(null);
  useAvatarLipSync(avatarMeshRef || internalRef, mouthOpenIndex);
  return null;
}

