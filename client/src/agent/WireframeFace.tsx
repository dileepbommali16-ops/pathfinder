import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { audioEngine } from "./audioIO";
import {
  createHologramScanMaterial,
  createMoltenRedEyeMaterial,
  HologramShouldersBust,
  HologramUniforms,
} from "./FaceEffects";

export interface WireframeFaceProps {
  scale?: [number, number, number];
  position?: [number, number, number];
}

const DEFAULT_SCALE: [number, number, number] = [0.98, 0.98, 0.98];
const DEFAULT_POSITION: [number, number, number] = [0, 0.08, 0];

/**
 * WireframeFace.tsx - Holographic 3D Male Head & Shoulders Bust (DAS)
 * - Loads self-hosted facecap.glb with Meshopt + KTX2 decoders
 * - Shades sculpted male head, ears, lips & matching shoulders bust with crisp cyan horizontal scanlines
 * - Renders eyeLeft & eyeRight in blazing molten crimson-ruby red (#F23456 + #A80139)
 * - Drives natural eyelid blinking (eyeBlink_L/R) and Puck-voice lip-sync (jawOpen, mouthFunnel, etc.) via audioEngine.getVolume()
 */
export const WireframeFace: React.FC<WireframeFaceProps> = React.memo((props: WireframeFaceProps) => {
  const scale: [number, number, number] = props.scale ?? DEFAULT_SCALE;
  const position: [number, number, number] = props.position ?? DEFAULT_POSITION;

  const { gl } = useThree();
  const rootGroupRef = useRef<THREE.Group>(null);
  const headPivotRef = useRef<THREE.Group>(null);
  const shouldersRef = useRef<THREE.Group>(null);
  const headMorphMeshRef = useRef<THREE.Mesh | null>(null);
  const [loadedModel, setLoadedModel] = useState<THREE.Group | null>(null);

  const sharedUniforms = useRef<HologramUniforms>({
    uTime: { value: 0 },
    uVoice: { value: 0 },
  });

  const smoothVol = useRef<number>(0);
  const nextBlink = useRef<number>(2.0);
  const isBlinking = useRef<boolean>(false);
  const blinkProg = useRef<number>(0);

  const materials = useMemo(() => {
    const headMat = createHologramScanMaterial(sharedUniforms.current);
    const teethMat = createHologramScanMaterial(sharedUniforms.current, { isTeeth: true });
    const redEyeMat = createMoltenRedEyeMaterial(sharedUniforms.current);
    return { headMat, teethMat, redEyeMat };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/basis/");
    ktx2Loader.detectSupport(gl);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.setKTX2Loader(ktx2Loader);

    loader.load(
      "/models/facecap.glb",
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;

        // Measure loaded head bounds cleanly and normalize height to 1.24 world units
        scene.updateMatrixWorld(true);
        const rawBox = new THREE.Box3().setFromObject(scene);
        const rawSize = rawBox.getSize(new THREE.Vector3());
        const targetHeight = 1.24;
        const normScale = rawSize.y > 0.001 ? targetHeight / rawSize.y : 1;
        scene.scale.multiplyScalar(normScale);

        scene.updateMatrixWorld(true);
        const normBox = new THREE.Box3().setFromObject(scene);
        const normCenter = normBox.getCenter(new THREE.Vector3());

        // Position centered horizontally and cleanly seated atop neck/shoulders bust (chin/jaw bottom ~ -0.44)
        scene.position.x -= normCenter.x;
        scene.position.z -= normCenter.z;
        scene.position.y += 0.16 - normCenter.y;

        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const nodeName = (mesh.name || "").toLowerCase();
            const parentName = (mesh.parent?.name || "").toLowerCase();
            const fullName = `${parentName}:${nodeName}`;

            // Strip any source map textures so clean scanline / molten eye shaders render purely
            if (fullName.includes("eye")) {
              mesh.material = materials.redEyeMat;
            } else if (fullName.includes("teeth")) {
              mesh.material = materials.teethMat;
            } else {
              mesh.material = materials.headMat;
              if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                headMorphMeshRef.current = mesh;
              }
            }
            mesh.frustumCulled = false;
          }
        });

        setLoadedModel(scene);
      },
      undefined,
      (err) => {
        console.error("[WireframeFace] Failed to load /models/facecap.glb:", err);
      }
    );

    return () => {
      cancelled = true;
      ktx2Loader.dispose();
    };
  }, [gl, materials]);

  useEffect(() => {
    return () => {
      materials.headMat.dispose();
      materials.teethMat.dispose();
      materials.redEyeMat.dispose();
    };
  }, [materials]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const rawVol = audioEngine.getVolume();
    const lerpRate = rawVol > smoothVol.current ? 0.46 : 0.25;
    smoothVol.current += (rawVol - smoothVol.current) * lerpRate;
    const v = Math.min(1, Math.max(0, smoothVol.current));

    sharedUniforms.current.uTime.value = t;
    sharedUniforms.current.uVoice.value = v;

    // 1. Natural 3D Hologram Float + Subtle Head/Shoulders Motion
    const floatY = Math.sin(t * 1.05) * 0.036;
    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = position[1] + floatY;
    }
    if (headPivotRef.current) {
      headPivotRef.current.rotation.y = Math.sin(t * 0.42) * 0.14;
      headPivotRef.current.rotation.x = Math.sin(t * 0.30) * 0.045 + v * 0.045;
      headPivotRef.current.rotation.z = Math.cos(t * 0.26) * 0.022;
    }
    if (shouldersRef.current) {
      // Shoulders counter-follow at ~35% of head rotation for authentic anatomical neck pivot
      shouldersRef.current.rotation.y = Math.sin(t * 0.42) * 0.05;
      shouldersRef.current.rotation.z = Math.cos(t * 0.26) * 0.008;
    }

    // 2. Eyelid Blinking Timing
    nextBlink.current -= delta;
    if (nextBlink.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkProg.current = 0;
    }

    let blinkVal = 0;
    if (isBlinking.current) {
      blinkProg.current += delta * 6.8;
      blinkVal = Math.sin(Math.min(1, blinkProg.current) * Math.PI);
      if (blinkProg.current >= 1) {
        isBlinking.current = false;
        blinkVal = 0;
        nextBlink.current = 2.5 + Math.random() * 2.8;
      }
    }

    // 3. Real-Time ARKit Morph Targets (Puck Voice Lip-Sync + Natural Blinking + Micro-Expressions)
    const mesh = headMorphMeshRef.current;
    if (mesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;

      const setMorph = (name: string, target: number, smoothing = 0.45) => {
        const idx = dict[name];
        if (idx !== undefined) {
          inf[idx] += (target - inf[idx]) * smoothing;
        }
      };

      // Lip-sync driven live by audioEngine.getVolume()
      const jawTarget = Math.min(0.82, v * 0.74);
      const syllableWave = 0.5 + 0.5 * Math.sin(t * 11.5);
      const funnelTarget = v > 0.04 ? v * 0.32 * syllableWave : 0;
      const puckerTarget = v > 0.04 ? v * 0.16 * (1 - syllableWave) : 0;

      setMorph("jawOpen", jawTarget, 0.55);
      setMorph("mouthFunnel", funnelTarget, 0.45);
      setMorph("mouthPucker", puckerTarget, 0.45);
      setMorph("mouthLowerDown_L", v * 0.28, 0.5);
      setMorph("mouthLowerDown_R", v * 0.28, 0.5);
      setMorph("mouthUpperUp_L", v * 0.14, 0.5);
      setMorph("mouthUpperUp_R", v * 0.14, 0.5);
      setMorph("mouthSmile_L", 0.09 + v * 0.08, 0.2);
      setMorph("mouthSmile_R", 0.09 + v * 0.08, 0.2);
      setMorph("browInnerUp", 0.05 + v * 0.18 + Math.sin(t * 0.9) * 0.03, 0.25);
      setMorph("browOuterUp_L", v * 0.14, 0.25);
      setMorph("browOuterUp_R", v * 0.14, 0.25);

      // Authentic bilateral eye blinks closing lids cleanly over molten red eyes
      setMorph("eyeBlink_L", blinkVal, 0.85);
      setMorph("eyeBlink_R", blinkVal, 0.85);
    }
  });

  return (
    <group ref={rootGroupRef} scale={scale} position={position}>
      {/* Realistic 3D Male Head (head + teeth in cyan scanline, eyeLeft & eyeRight in blazing red lava) */}
      <group ref={headPivotRef}>{loadedModel && <primitive object={loadedModel} />}</group>

      {/* Subtle crimson optical glow cast gently into the eye sockets */}
      <pointLight position={[0, 0.18, 0.65]} intensity={0.9} distance={1.6} color="#F23456" />

      {/* Seamless Cyan Horizontal-Scanline Neck & Clavicle/Shoulders Bust */}
      <group ref={shouldersRef}>
        <HologramShouldersBust sharedUniforms={sharedUniforms.current} />
      </group>
    </group>
  );
});

export default WireframeFace;
