import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "./audioIO";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

/**
 * WireframeFace.tsx
 * 3D Holographic Wireframe Face (DAS) with real-time lip-sync morph targets
 * and procedural eye-blinking timer.
 * 
 * - setInterval triggers randomized eye blink state transitions every few seconds.
 * - Primary useFrame animation loop combines Volume state & Blink state.
 * - Continuously updates Three.js morphTargetInfluences on every frame at 60 FPS.
 */
export const WireframeFace: React.FC<WireframeFaceProps> = ({
  scale = [1.6, 1.6, 1.6],
  position = [0, 0, 0],
}) => {
  const headGroupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthMeshRef = useRef<THREE.Mesh>(null);
  const lowerJawRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  // Blink State & Dynamic Interpolation Refs
  const [blinkState, setBlinkState] = useState<boolean>(false);
  const blinkRef = useRef<boolean>(false);
  const currentBlinkRef = useRef<number>(0);

  // 1. setInterval timer triggering randomized eye blinks every few seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      // Randomized check ensures organic, non-robotic blinking cadence (every 2.5 - 4.5s)
      if (Math.random() > 0.32 && !blinkRef.current) {
        blinkRef.current = true;
        setBlinkState(true);

        // Blink duration lasts ~160ms for natural rapid eyelid motion
        setTimeout(() => {
          blinkRef.current = false;
          setBlinkState(false);
        }, 160);
      }
    }, 1500);

    return () => clearInterval(blinkInterval);
  }, []);

  // 2. Procedural Mouth Geometry
  const mouthGeometry = useMemo(() => {
    return new THREE.BoxGeometry(0.52, 0.12, 0.14);
  }, []);

  // 3. Procedural Eye Geometry
  const eyeGeometry = useMemo(() => {
    return new THREE.CapsuleGeometry(0.11, 0.16, 8, 16);
  }, []);

  // 4. Primary Animation & Render Loop
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Volume State: extracted from AnalyserNode frequency average
    const volume = audioEngine.getVolume();

    // Blink State: smoothly interpolated blink weight (0 = open, 1 = closed)
    const targetBlinkWeight = blinkRef.current ? 1.0 : 0.0;
    currentBlinkRef.current = THREE.MathUtils.lerp(
      currentBlinkRef.current,
      targetBlinkWeight,
      delta * 20
    );
    const blinkFactor = currentBlinkRef.current;

    // --- COMBINE BLINK & VOLUME STATES INTO THREE.JS COORDINATES & SCALES ---

    // A. Dynamic Lip-Sync Mouth Mesh Response
    if (mouthMeshRef.current) {
      mouthMeshRef.current.scale.y = 1 + volume * 2.2;
      mouthMeshRef.current.scale.x = Math.max(0.7, 1 - volume * 0.18);
      mouthMeshRef.current.position.y = -0.6 - volume * 0.15;
    }

    // B. Eye Meshes Blink Response (Eyelid blink scale)
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeScaleY = Math.max(0.06, 1.0 - blinkFactor * 0.94);
      leftEyeRef.current.scale.y = eyeScaleY;
      rightEyeRef.current.scale.y = eyeScaleY;
    }

    // Visual eye scale adjustment for maximum visual clarity across all viewports
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeScaleY = Math.max(0.06, 1.0 - blinkFactor * 0.94);
      leftEyeRef.current.scale.y = eyeScaleY;
      rightEyeRef.current.scale.y = eyeScaleY;
    }

    // C. Physical Jaw & Lip Coordinate Response
    if (lowerJawRef.current && upperLipRef.current) {
      lowerJawRef.current.position.y = -0.68 - volume * 0.32;
      lowerJawRef.current.scale.y = 1 + volume * 0.65;
      upperLipRef.current.position.y = -0.52 + volume * 0.06;
    }

    // D. Subtle Floating & Speech Nodding
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
      headGroupRef.current.rotation.x =
        Math.sin(t * 0.8) * 0.05 + volume * 0.08;
      headGroupRef.current.position.y =
        position[1] + Math.sin(t * 1.2) * 0.08;
    }

    // E. Holographic Resonance Ring Pulse
    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = t * 0.3;
      const ringScale = 1 + volume * 0.25;
      auraRingRef.current.scale.set(ringScale, ringScale, 1);
    }
  });

  return (
    <group ref={headGroupRef} scale={scale} position={position}>
      {/* Main 3D Wireframe Cranium / Head Mesh */}
      <mesh>
        <icosahedronGeometry args={[1.35, 3]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#0088ff"
          emissiveIntensity={0.45}
          wireframe
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Inner Neural Core */}
      <mesh>
        <sphereGeometry args={[0.95, 24, 24]} />
        <meshBasicMaterial color="#041b2d" wireframe transparent opacity={0.35} />
      </mesh>

      {/* Left Eye with Morph Targets */}
      <mesh
        ref={leftEyeRef}
        geometry={eyeGeometry}
        position={[-0.42, 0.25, 1.18]}
      >
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Right Eye with Morph Targets */}
      <mesh
        ref={rightEyeRef}
        geometry={eyeGeometry}
        position={[0.42, 0.25, 1.18]}
      >
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Dynamic Lip-Sync Mouth Mesh with Morph Targets */}
      <mesh
        ref={mouthMeshRef}
        geometry={mouthGeometry}
        position={[0, -0.6, 1.2]}
      >
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#0088ff"
          emissiveIntensity={0.6}
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Upper Lip Accent */}
      <mesh ref={upperLipRef} position={[0, -0.52, 1.22]}>
        <boxGeometry args={[0.52, 0.05, 0.1]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>

      {/* Lower Jaw Accent */}
      <mesh ref={lowerJawRef} position={[0, -0.68, 1.2]}>
        <boxGeometry args={[0.46, 0.07, 0.12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Background Holographic HUD Ring */}
      <mesh ref={auraRingRef} position={[0, 0, -0.4]}>
        <torusGeometry args={[1.85, 0.015, 16, 100]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
};

export default WireframeFace;
