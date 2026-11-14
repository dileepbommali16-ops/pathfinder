import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "./audioIO";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

const DEFAULT_SCALE: [number, number, number] = [0.68, 0.74, 0.7];
const DEFAULT_POSITION: [number, number, number] = [0, 0.22, 0];

/**
 * WireframeFace.tsx - Sleek, Human-Proportioned 3D Holographic Avatar (DAS)
 * - Compact scale framed cleanly behind every dashboard slide
 * - Smooth 3D idle & speech motion, delicate eyes with natural blink,
 *   subtle sculpted nose, and small rounded lips synced tightly to voice amplitude
 */
export const WireframeFace: React.FC<WireframeFaceProps> = React.memo((props: WireframeFaceProps) => {
  const scale: [number, number, number] = props.scale ?? DEFAULT_SCALE;
  const position: [number, number, number] = props.position ?? DEFAULT_POSITION;

  const headGroupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  const nextBlink = useRef<number>(2.0);
  const isBlinking = useRef<boolean>(false);
  const blinkProg = useRef<number>(0);
  const smoothVol = useRef<number>(0);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const rawVol = audioEngine.getVolume();
    // Smooth voice envelope so mouth motion looks fluid, never twitchy
    const lerpRate = rawVol > smoothVol.current ? 0.38 : 0.22;
    smoothVol.current += (rawVol - smoothVol.current) * lerpRate;
    const v = Math.min(1, Math.max(0, smoothVol.current));

    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.42) * 0.14;
      headGroupRef.current.rotation.x = Math.sin(t * 0.31) * 0.055 + v * 0.04;
      headGroupRef.current.rotation.z = Math.cos(t * 0.27) * 0.025;
      headGroupRef.current.position.y = position[1] + Math.sin(t * 1.05) * 0.045;
    }

    // Small, expressive human lip synchronization
    if (upperLipRef.current && lowerLipRef.current) {
      upperLipRef.current.position.y = -0.3 + v * 0.032;
      lowerLipRef.current.position.y = -0.345 - v * 0.105;
      lowerLipRef.current.scale.set(1 + v * 0.16, 1 + v * 0.12, 1);
      upperLipRef.current.scale.set(1 + v * 0.1, 1, 1);
    }

    // Natural human periodic blinking
    nextBlink.current -= delta;
    if (nextBlink.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkProg.current = 0;
    }

    if (isBlinking.current) {
      blinkProg.current += delta * 7.0;
      const eyeScaleY = Math.max(0.08, (1.0 - Math.sin(blinkProg.current * Math.PI)) * 0.72);
      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.scale.y = eyeScaleY;
        rightEyeRef.current.scale.y = eyeScaleY;
      }
      if (blinkProg.current >= 1) {
        isBlinking.current = false;
        nextBlink.current = 2.6 + Math.random() * 3.2;
        if (leftEyeRef.current && rightEyeRef.current) {
          leftEyeRef.current.scale.y = 0.72;
          rightEyeRef.current.scale.y = 0.72;
        }
      }
    }

    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = t * 0.12;
      const ringScale = 1 + v * 0.08;
      auraRingRef.current.scale.set(ringScale, ringScale, 1);
    }
  });

  return (
    <group ref={headGroupRef} scale={scale} position={position}>
      {/* Refined human-proportioned holographic wireframe cranium */}
      <mesh scale={[0.84, 1.05, 0.88]}>
        <icosahedronGeometry args={[1.12, 2]} />
        <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.26} />
      </mesh>

      {/* Delicate brow contours */}
      <mesh position={[-0.31, 0.3, 0.89]} rotation={[0, -0.22, 0.07]}>
        <boxGeometry args={[0.2, 0.015, 0.02]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0.31, 0.3, 0.89]} rotation={[0, 0.22, -0.07]}>
        <boxGeometry args={[0.2, 0.015, 0.02]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.45} />
      </mesh>

      {/* Small gentle glowing human eyes */}
      <mesh ref={leftEyeRef} position={[-0.3, 0.17, 0.91]} scale={[1.25, 0.72, 0.5]}>
        <sphereGeometry args={[0.048, 14, 10]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.85} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.3, 0.17, 0.91]} scale={[1.25, 0.72, 0.5]}>
        <sphereGeometry args={[0.048, 14, 10]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.85} />
      </mesh>

      {/* Small subtle nasal bridge + tip */}
      <mesh position={[0, 0.0, 0.98]} rotation={[0.22, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.024, 0.24, 8]} />
        <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={0.48} />
      </mesh>
      <mesh position={[0, -0.11, 1.02]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshBasicMaterial color="#bae6fd" wireframe transparent opacity={0.45} />
      </mesh>

      {/* Small rounded lips synced smoothly to voice playback */}
      <mesh ref={upperLipRef} position={[0, -0.3, 0.97]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.014, 0.14, 6, 12]} />
        <meshBasicMaterial color="#a5f3fc" transparent opacity={0.82} />
      </mesh>
      <mesh ref={lowerLipRef} position={[0, -0.345, 0.96]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.015, 0.13, 6, 12]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
      </mesh>

      {/* Subtle ambient outer halo ring */}
      <mesh ref={auraRingRef} position={[0, 0, -0.3]}>
        <ringGeometry args={[1.42, 1.44, 72]} />
        <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.18} />
      </mesh>
    </group>
  );
});

export default WireframeFace;
