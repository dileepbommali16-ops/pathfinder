import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "./audioIO";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

/**
 * WireframeFace.tsx - Clean, Single-Mesh 3D Holographic Avatar (DAS)
 * - Single clean wireframe cranium (no double-mesh artifacts)
 * - Crimson Red (#DC2626) dual eyes with procedural blinking
 * - Crisp dual-lip speech sync without overlapping duplicate boxes
 * - Pure ref-based animation loop for butter-smooth 60 FPS performance
 */
export const WireframeFace: React.FC<WireframeFaceProps> = React.memo(({
  scale = [0.95, 0.95, 0.95],
  position = [0, 0.52, 0],
}) => {
  const headGroupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  // Pure Ref-based Blink State (0 React re-renders)
  const nextBlink = useRef<number>(2.0);
  const blinkProg = useRef<number>(0);
  const isBlinking = useRef<boolean>(false);

  // Eye Geometry
  const eyeGeometry = useMemo(() => {
    return new THREE.CapsuleGeometry(0.11, 0.16, 8, 16);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const volume = audioEngine.getVolume();

    // 1. Subtle Floating & Speech Nodding
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.45) * 0.1;
      headGroupRef.current.rotation.x = Math.sin(t * 0.7) * 0.04 + volume * 0.08;
      headGroupRef.current.position.y = position[1] + Math.sin(t * 1.2) * 0.06;
    }

    // 2. Crisp Dual-Lip Speech Sync (No overlapping duplicate boxes)
    if (upperLipRef.current && lowerLipRef.current) {
      upperLipRef.current.position.y = -0.48 + volume * 0.08;
      lowerLipRef.current.position.y = -0.64 - volume * 0.28;
      lowerLipRef.current.scale.y = 1 + volume * 0.55;
    }

    // 3. Procedural Blink Logic
    if (t > nextBlink.current && !isBlinking.current) {
      isBlinking.current = true;
      blinkProg.current = 0;
    }

    if (isBlinking.current) {
      blinkProg.current += delta * 12;
      const eyeScaleY = Math.max(0.06, 1.0 - Math.sin(blinkProg.current * Math.PI));
      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.scale.y = eyeScaleY;
        rightEyeRef.current.scale.y = eyeScaleY;
      }
      if (blinkProg.current >= 1.0) {
        isBlinking.current = false;
        if (leftEyeRef.current && rightEyeRef.current) {
          leftEyeRef.current.scale.y = 1.0;
          rightEyeRef.current.scale.y = 1.0;
        }
        nextBlink.current = t + 2.5 + Math.random() * 2.5;
      }
    }

    // 4. Holographic Aura Ring Pulse
    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = t * 0.25;
      const ringScale = 1 + volume * 0.15;
      auraRingRef.current.scale.set(ringScale, ringScale, 1);
    }
  });

  return (
    <group ref={headGroupRef} scale={scale} position={position}>
      {/* SINGLE Clean 3D Wireframe Cranium (Eliminates double head artifacts) */}
      <mesh>
        <icosahedronGeometry args={[1.35, 2]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#0088ff"
          emissiveIntensity={0.4}
          wireframe
          transparent
          opacity={0.42}
        />
      </mesh>

      {/* Left Eye - Crimson Red (#DC2626) */}
      <mesh
        ref={leftEyeRef}
        geometry={eyeGeometry}
        position={[-0.42, 0.25, 1.18]}
      >
        <meshBasicMaterial color="#DC2626" />
      </mesh>

      {/* Right Eye - Crimson Red (#DC2626) */}
      <mesh
        ref={rightEyeRef}
        geometry={eyeGeometry}
        position={[0.42, 0.25, 1.18]}
      >
        <meshBasicMaterial color="#DC2626" />
      </mesh>

      {/* Upper Lip Accent */}
      <mesh ref={upperLipRef} position={[0, -0.48, 1.2]}>
        <boxGeometry args={[0.5, 0.06, 0.08]} />
        <meshStandardMaterial color="#38bdf8" emissive="#00ffff" emissiveIntensity={1.2} />
      </mesh>

      {/* Lower Lip Accent */}
      <mesh ref={lowerLipRef} position={[0, -0.64, 1.2]}>
        <boxGeometry args={[0.46, 0.07, 0.08]} />
        <meshStandardMaterial color="#00f0ff" emissive="#0088ff" emissiveIntensity={1.4} />
      </mesh>

      {/* Single Background Holographic HUD Ring */}
      <mesh ref={auraRingRef} position={[0, 0, -0.3]}>
        <ringGeometry args={[1.75, 1.78, 64]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

export default WireframeFace;
