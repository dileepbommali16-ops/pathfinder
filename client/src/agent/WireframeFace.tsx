import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "./audioIO";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

const DEFAULT_SCALE: [number, number, number] = [0.88, 0.94, 0.88];
const DEFAULT_POSITION: [number, number, number] = [0, 0.16, 0];

const LAVA_EYE_VERT = `
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Flowing molten lava shimmer mixing #D72324 and #E31748 strictly inside both eyes
const LAVA_EYE_FRAG = `
  precision mediump float;
  varying vec3 vLocalPos;
  uniform float uTime;
  uniform float uVoice;

  void main() {
    vec2 p = vLocalPos.xy / 0.056;
    float dist = clamp(length(p), 0.0, 1.2);
    float swirl = sin(p.x * 8.0 + uTime * 3.8 + cos(p.y * 7.0 - uTime * 3.1))
                + cos(p.y * 8.5 - uTime * 3.4 + sin(p.x * 6.0 + uTime * 2.6));
    float vein = 0.5 + 0.5 * sin(swirl * 1.6 + uTime * 2.8);
    float pulse = 0.5 + 0.5 * sin(uTime * 5.8 - dist * 4.5);
    float coreHot = smoothstep(0.95, 0.05, dist);

    vec3 crimsonLava = vec3(0.843, 0.137, 0.141); // #D72324
    vec3 rubyMagma   = vec3(0.890, 0.090, 0.282); // #E31748

    vec3 col = mix(crimsonLava, rubyMagma, vein);
    float shimmer = 1.08 + 0.42 * coreHot + 0.24 * pulse + uVoice * 0.35;
    gl_FragColor = vec4(col * shimmer, 0.98);
  }
`;

/**
 * WireframeFace.tsx - Crisp Human-Proportioned 3D Holographic Avatar (DAS)
 * - Larger clean presence framed clearly behind every dashboard slide (no blur)
 * - Eyes ONLY shimmer as flowing molten lava (#D72324 + #E31748) with natural blinking
 * - Remaining head mesh, brows, nose, lips & orbital rings styled in #0E117A & #4FCDE8
 */
export const WireframeFace: React.FC<WireframeFaceProps> = React.memo((props: WireframeFaceProps) => {
  const scale: [number, number, number] = props.scale ?? DEFAULT_SCALE;
  const position: [number, number, number] = props.position ?? DEFAULT_POSITION;

  const headGroupRef = useRef<THREE.Group>(null);
  const leftEyeGroupRef = useRef<THREE.Group>(null);
  const rightEyeGroupRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  const nextBlink = useRef<number>(1.8);
  const isBlinking = useRef<boolean>(false);
  const blinkProg = useRef<number>(0);
  const smoothVol = useRef<number>(0);

  const lavaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uVoice: { value: 0 },
        },
        vertexShader: LAVA_EYE_VERT,
        fragmentShader: LAVA_EYE_FRAG,
        transparent: true,
        toneMapped: false,
      }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const rawVol = audioEngine.getVolume();
    const lerpRate = rawVol > smoothVol.current ? 0.42 : 0.24;
    smoothVol.current += (rawVol - smoothVol.current) * lerpRate;
    const v = Math.min(1, Math.max(0, smoothVol.current));

    lavaMaterial.uniforms.uTime.value = t;
    lavaMaterial.uniforms.uVoice.value = v;

    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.45) * 0.14;
      headGroupRef.current.rotation.x = Math.sin(t * 0.32) * 0.055 + v * 0.04;
      headGroupRef.current.rotation.z = Math.cos(t * 0.28) * 0.025;
      headGroupRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.045;
    }

    // Crisp, expressive audio-driven lip sync
    if (upperLipRef.current && lowerLipRef.current) {
      upperLipRef.current.position.y = -0.3 + v * 0.036;
      lowerLipRef.current.position.y = -0.348 - v * 0.115;
      upperLipRef.current.scale.set(1 + v * 0.1, 1, 1);
      lowerLipRef.current.scale.set(1 + v * 0.18, 1 + v * 0.12, 1);
    }

    // Natural human periodic blinking on both lava eyes
    nextBlink.current -= delta;
    if (nextBlink.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkProg.current = 0;
    }

    if (isBlinking.current) {
      blinkProg.current += delta * 7.2;
      const eyeScaleY = Math.max(0.06, 1.0 - Math.sin(Math.min(1, blinkProg.current) * Math.PI));
      if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
        leftEyeGroupRef.current.scale.y = eyeScaleY;
        rightEyeGroupRef.current.scale.y = eyeScaleY;
      }
      if (blinkProg.current >= 1) {
        isBlinking.current = false;
        nextBlink.current = 2.4 + Math.random() * 2.8;
        if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
          leftEyeGroupRef.current.scale.y = 1;
          rightEyeGroupRef.current.scale.y = 1;
        }
      }
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.14;
      const ringScale = 1 + v * 0.07;
      outerRingRef.current.scale.set(ringScale, ringScale, 1);
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.19;
    }
  });

  return (
    <group ref={headGroupRef} scale={scale} position={position}>
      {/* Primary cyan wireframe cranium (#4FCDE8) + deep cobalt inner lattice (#0E117A) */}
      <mesh scale={[0.84, 1.05, 0.88]}>
        <icosahedronGeometry args={[1.14, 2]} />
        <meshBasicMaterial color="#4FCDE8" wireframe transparent opacity={0.54} toneMapped={false} />
      </mesh>
      <mesh scale={[0.82, 1.03, 0.86]}>
        <icosahedronGeometry args={[1.12, 1]} />
        <meshBasicMaterial color="#0E117A" wireframe transparent opacity={0.62} toneMapped={false} />
      </mesh>

      {/* Crisp brow contours (#0E117A + #4FCDE8) */}
      <mesh position={[-0.31, 0.305, 0.91]} rotation={[0, -0.22, 0.07]}>
        <boxGeometry args={[0.21, 0.017, 0.02]} />
        <meshBasicMaterial color="#4FCDE8" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh position={[0.31, 0.305, 0.91]} rotation={[0, 0.22, -0.07]}>
        <boxGeometry args={[0.21, 0.017, 0.02]} />
        <meshBasicMaterial color="#4FCDE8" transparent opacity={0.92} toneMapped={false} />
      </mesh>

      {/* ONLY EYES: Blazing molten lava orbs & glowing rims (#D72324 + #E31748) with smooth blink */}
      <group ref={leftEyeGroupRef} position={[-0.3, 0.17, 0.93]}>
        <mesh scale={[1.34, 0.74, 0.5]} material={lavaMaterial}>
          <sphereGeometry args={[0.058, 20, 16]} />
        </mesh>
        <mesh scale={[1.44, 0.84, 1]}>
          <ringGeometry args={[0.050, 0.068, 32]} />
          <meshBasicMaterial
            color="#E31748"
            side={THREE.DoubleSide}
            transparent
            opacity={0.96}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh scale={[1.82, 1.08, 1]} position={[0, 0, -0.005]}>
          <circleGeometry args={[0.068, 28]} />
          <meshBasicMaterial
            color="#D72324"
            side={THREE.DoubleSide}
            transparent
            opacity={0.44}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group ref={rightEyeGroupRef} position={[0.3, 0.17, 0.93]}>
        <mesh scale={[1.34, 0.74, 0.5]} material={lavaMaterial}>
          <sphereGeometry args={[0.058, 20, 16]} />
        </mesh>
        <mesh scale={[1.44, 0.84, 1]}>
          <ringGeometry args={[0.050, 0.068, 32]} />
          <meshBasicMaterial
            color="#E31748"
            side={THREE.DoubleSide}
            transparent
            opacity={0.96}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh scale={[1.82, 1.08, 1]} position={[0, 0, -0.005]}>
          <circleGeometry args={[0.068, 28]} />
          <meshBasicMaterial
            color="#D72324"
            side={THREE.DoubleSide}
            transparent
            opacity={0.44}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Subtle sculpted nasal bridge + tip (#0E117A + #4FCDE8) */}
      <mesh position={[0, 0.0, 1.0]} rotation={[0.22, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.024, 0.24, 8]} />
        <meshBasicMaterial color="#4FCDE8" wireframe transparent opacity={0.78} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.11, 1.04]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshBasicMaterial color="#0E117A" wireframe transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {/* Crisp small human lips synced to speech (#4FCDE8 + #0E117A) */}
      <mesh ref={upperLipRef} position={[0, -0.3, 0.99]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.015, 0.145, 6, 12]} />
        <meshBasicMaterial color="#4FCDE8" transparent opacity={0.96} toneMapped={false} />
      </mesh>
      <mesh ref={lowerLipRef} position={[0, -0.348, 0.98]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.016, 0.135, 6, 12]} />
        <meshBasicMaterial color="#0E117A" transparent opacity={0.96} toneMapped={false} />
      </mesh>

      {/* Dual orbital rings in #4FCDE8 and #0E117A */}
      <mesh ref={outerRingRef} position={[0, 0, -0.3]}>
        <ringGeometry args={[1.44, 1.46, 72]} />
        <meshBasicMaterial color="#4FCDE8" side={THREE.DoubleSide} transparent opacity={0.44} toneMapped={false} />
      </mesh>
      <mesh ref={innerRingRef} position={[0, 0, -0.32]}>
        <ringGeometry args={[1.34, 1.36, 64]} />
        <meshBasicMaterial color="#0E117A" side={THREE.DoubleSide} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
});

export default WireframeFace;
