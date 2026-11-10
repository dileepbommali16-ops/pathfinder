import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "./audioIO";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

/**
 * WireframeFace.tsx
 * 3D Holographic Wireframe Face (DAS) with real-time lip-sync morph targets.
 * Decodes 24kHz incoming audio chunks via Web Audio AnalyserNode frequency data,
 * extracts volume through a simple average, and drives mouth morph target influences at 60 FPS.
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

  // Eye Blinking State
  const nextBlinkTime = useRef<number>(2.5);
  const blinkProgress = useRef<number>(0);
  const isBlinking = useRef<boolean>(false);

  // Procedural Mouth Geometry with Morph Target 0 (Mouth Open)
  const mouthGeometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(0.52, 0.12, 0.14, 4, 4, 4);
    const pos = geom.attributes.position;
    const morphPositions: number[] = [];

    // Construct morph target 0: lower vertices stretch downward for open mouth
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Morph target pulled down on bottom vertices and widened slightly
      if (y < 0) {
        morphPositions.push(x * 1.15, y - 0.42, z);
      } else {
        morphPositions.push(x, y + 0.08, z);
      }
    }

    geom.morphAttributes.position = [
      new THREE.Float32BufferAttribute(morphPositions, 3),
    ];
    return geom;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Extract frequency-averaged audio volume from AnalyserNode
    const volume = audioEngine.getVolume();

    // 2. Adjust Mouth Morph Target Intensity with Volume
    if (mouthMeshRef.current && mouthMeshRef.current.morphTargetInfluences) {
      const currentMorph = mouthMeshRef.current.morphTargetInfluences[0] || 0;
      // Smooth linear interpolation for natural, fluid lip-sync
      mouthMeshRef.current.morphTargetInfluences[0] = THREE.MathUtils.lerp(
        currentMorph,
        volume,
        0.45
      );
    }

    // 3. Real-Time Lower Jaw & Upper Lip Movement
    if (lowerJawRef.current && upperLipRef.current) {
      lowerJawRef.current.position.y = -0.68 - volume * 0.32;
      lowerJawRef.current.scale.y = 1 + volume * 0.65;
      upperLipRef.current.position.y = -0.52 + volume * 0.06;
    }

    // 4. Subtle Autonomous Head Floating & Speech Nodding
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
      headGroupRef.current.rotation.x =
        Math.sin(t * 0.8) * 0.05 + volume * 0.08;
      headGroupRef.current.position.y =
        position[1] + Math.sin(t * 1.2) * 0.08;
    }

    // 5. Procedural Eye Blinking (Every 2.5 to 5.0 seconds)
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

    // 6. Holographic Resonance Ring Pulse
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

      {/* Left Eye (Procedural Blinking) */}
      <mesh ref={leftEyeRef} position={[-0.42, 0.25, 1.18]}>
        <capsuleGeometry args={[0.11, 0.16, 8, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Right Eye (Procedural Blinking) */}
      <mesh ref={rightEyeRef} position={[0.42, 0.25, 1.18]}>
        <capsuleGeometry args={[0.11, 0.16, 8, 16]} />
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
