import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "./audioIO";
import { AnatomicalHumanHeadDNA, AnatomicalMouthSync } from "./FaceEffects";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

const DEFAULT_SCALE: [number, number, number] = [0.86, 0.86, 0.86];
const DEFAULT_POSITION: [number, number, number] = [0, -0.06, 0];

interface MoltenEyeProps {
  groupRef: React.RefObject<THREE.Group | null>;
  position: [number, number, number];
  rotation: [number, number, number];
  lavaMaterial: THREE.ShaderMaterial;
}

const MoltenEye: React.FC<MoltenEyeProps> = ({ groupRef, position, rotation, lavaMaterial }) => (
  <group ref={groupRef} position={position} rotation={rotation}>
    <mesh scale={[1.30, 0.72, 0.5]} material={lavaMaterial}>
      <sphereGeometry args={[0.055, 20, 16]} />
    </mesh>
    <mesh scale={[1.40, 0.82, 1]}>
      <ringGeometry args={[0.047, 0.065, 32]} />
      <meshBasicMaterial
        color="#F23456"
        side={THREE.DoubleSide}
        transparent
        opacity={0.96}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
    <mesh scale={[1.78, 1.05, 1]} position={[0, 0, -0.005]}>
      <circleGeometry args={[0.065, 28]} />
      <meshBasicMaterial
        color="#A80139"
        side={THREE.DoubleSide}
        transparent
        opacity={0.68}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  </group>
);

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

    vec3 crimsonLava = vec3(0.949, 0.204, 0.337); // #F23456
    vec3 rubyMagma   = vec3(0.659, 0.004, 0.224); // #A80139

    float radialCore = exp(-length(vLocalPos.xy) * 2.2);
    float flareRay = pow(max(0.0, sin(atan(vLocalPos.y, vLocalPos.x) * 10.0 - uTime * 3.8)), 4.0) * (1.0 - radialCore * 0.4);
    vec3 col = mix(rubyMagma, crimsonLava, clamp(vein * 0.72 + radialCore * 0.55 + flareRay * 0.35, 0.0, 1.0));
    float shimmer = 1.38 + 0.68 * coreHot + 0.32 * pulse + 0.48 * radialCore + 0.42 * flareRay + uVoice * 0.42;
    gl_FragColor = vec4(col * shimmer, 1.0);
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
    // Lips articulate cleanly inside SculptedHumanLips via smoothVol

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
  });

  return (
    <group ref={headGroupRef} scale={scale} position={position}>
      {/* Sculpted 3D Anatomical Human Head + Internal Human DNA Double-Helix in luminous #5BC0DE blue */}
      <AnatomicalHumanHeadDNA voiceRef={smoothVol} />

      {/* ONLY EYES: Blazing molten lava orbs & glowing rims (#F23456 + #A80139) seated inside sculpted sockets */}
      <MoltenEye
        groupRef={leftEyeGroupRef}
        position={[-0.228, 0.16, 0.688]}
        rotation={[0, -0.22, 0]}
        lavaMaterial={lavaMaterial}
      />
      <MoltenEye
        groupRef={rightEyeGroupRef}
        position={[0.228, 0.16, 0.688]}
        rotation={[0, 0.22, 0]}
        lavaMaterial={lavaMaterial}
      />

      {/* Anatomically contoured 3D human lips synced to real-time voice (#5BC0DE) */}
      <AnatomicalMouthSync voiceRef={smoothVol} />
    </group>
  );
});

export default WireframeFace;
