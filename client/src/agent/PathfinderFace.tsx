import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAudioAnalyser } from "./useAudioAnalyser";

/**
 * PathfinderFace
 * 3D Wireframe Face (DAS) with real-time lip-sync, procedural eye blinking,
 * and holographic voice-reactive pulse ring.
 */
export const PathfinderFace: React.FC = () => {
  const headGroupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerJawRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  const { mouthOpenRef, energyRef } = useAudioAnalyser();

  // Eye Blinking State
  const nextBlinkTime = useRef<number>(2.5);
  const blinkProgress = useRef<number>(0);
  const isBlinking = useRef<boolean>(false);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const mouthOpen = mouthOpenRef.current;
    const energy = energyRef.current;

    // 1. Subtle Autonomous Head Floating & Speaking Nod
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
      headGroupRef.current.rotation.x = Math.sin(t * 0.8) * 0.05 + mouthOpen * 0.08;
      headGroupRef.current.position.y = Math.sin(t * 1.2) * 0.08;
    }

    // 2. Real-Time Gemini Voice Lip-Sync
    if (lowerJawRef.current && upperLipRef.current) {
      lowerJawRef.current.position.y = -0.68 - mouthOpen * 0.34;
      lowerJawRef.current.scale.y = 1 + mouthOpen * 0.6;
      upperLipRef.current.position.y = -0.52 + mouthOpen * 0.08;
    }

    // 3. Natural Procedural Eye Blinking (Every 2.5 to 4.5 seconds)
    if (t > nextBlinkTime.current && !isBlinking.current) {
      isBlinking.current = true;
      blinkProgress.current = 0;
    }

    if (isBlinking.current) {
      blinkProgress.current += delta * 14;
      const blinkCurve = Math.sin(blinkProgress.current * Math.PI);
      const eyeScaleY = Math.max(0.05, 1 - blinkCurve);

      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.scale.y = eyeScaleY;
        rightEyeRef.current.scale.y = eyeScaleY;
      }

      if (blinkProgress.current >= 1) {
        isBlinking.current = false;
        if (leftEyeRef.current && rightEyeRef.current) {
          leftEyeRef.current.scale.y = 1;
          rightEyeRef.current.scale.y = 1;
        }
        nextBlinkTime.current = t + 2.2 + Math.random() * 2.5;
      }
    }

    // 4. Holographic Pulse Ring around DAS Face
    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = t * 0.3;
      const ringScale = 1 + energy * 0.22;
      auraRingRef.current.scale.set(ringScale, ringScale, 1);
    }
  });

  return (
    <group ref={headGroupRef} scale={[1.6, 1.6, 1.6]}>
      {/* Main 3D Wireframe Cranium / Face Mesh */}
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

      {/* Left Eye (Blinks automatically) */}
      <mesh ref={leftEyeRef} position={[-0.42, 0.25, 1.18]}>
        <capsuleGeometry args={[0.11, 0.16, 8, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Right Eye (Blinks automatically) */}
      <mesh ref={rightEyeRef} position={[0.42, 0.25, 1.18]}>
        <capsuleGeometry args={[0.11, 0.16, 8, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Upper Lip Wireframe */}
      <mesh ref={upperLipRef} position={[0, -0.52, 1.22]}>
        <boxGeometry args={[0.52, 0.06, 0.12]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>

      {/* Lower Jaw / Lip (Moves with Gemini Live Voice FFT) */}
      <mesh ref={lowerJawRef} position={[0, -0.68, 1.2]}>
        <boxGeometry args={[0.46, 0.08, 0.14]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Background Jarvis HUD Ring */}
      <mesh ref={auraRingRef} position={[0, 0, -0.4]}>
        <torusGeometry args={[1.85, 0.015, 16, 100]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
};

export { WireframeFace } from "./WireframeFace";
export default PathfinderFace;
