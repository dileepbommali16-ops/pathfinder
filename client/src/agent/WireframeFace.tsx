import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
const DEFAULT_POSITION: [number, number, number] = [0, 0.14, 0];

/**
 * Computes true neutral rest-pose world bounds from mesh vertex buffers (ignoring morph target inflation)
 * so facecap.glb scales accurately to sit flush on the anatomical hologram neck & shoulders bust.
 */
function computeRestPoseBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const vertex = new THREE.Vector3();

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const posAttr = mesh.geometry?.attributes?.position;
      if (!posAttr) return;
      for (let i = 0; i < posAttr.count; i++) {
        vertex.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
        box.expandByPoint(vertex);
      }
    }
  });

  return box;
}

/**
 * WireframeFace.tsx - Holographic 3D Male Head & Shoulders Bust (DAS)
 * - Loads KTX2-free self-hosted facecap.glb via MeshoptDecoder (zero blob CSP fetches)
 * - Renders sculpted male head, ears, sculpted lips & matching bust with fine cyan horizontal scanlines
 * - Renders eyeLeft & eyeRight in blazing molten crimson-ruby red (#F23456 + #A80139)
 * - Drives natural eyelid blinking (eyeBlink_L/R) and Puck-voice lip-sync (jawOpen, mouthFunnel, etc.) via audioEngine.getVolume()
 */
export const WireframeFace: React.FC<WireframeFaceProps> = React.memo((props: WireframeFaceProps) => {
  const scale: [number, number, number] = props.scale ?? DEFAULT_SCALE;
  const position: [number, number, number] = props.position ?? DEFAULT_POSITION;

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

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      "/models/facecap.glb",
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;

        // Normalize rest-pose head height cleanly to 1.12 world units seated flush on anatomical neck (+0.18 center -> -0.38 chin)
        const rawBox = computeRestPoseBox(scene);
        const rawSize = rawBox.getSize(new THREE.Vector3());
        const targetHeight = 1.12;
        const normScale = rawSize.y > 0.001 ? targetHeight / rawSize.y : 1;
        scene.scale.multiplyScalar(normScale);

        const normBox = computeRestPoseBox(scene);
        const normCenter = normBox.getCenter(new THREE.Vector3());
        scene.position.x -= normCenter.x;
        scene.position.z -= normCenter.z;
        scene.position.y += 0.18 - normCenter.y;

        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const nodeName = (mesh.name || "").toLowerCase();
            const parentName = (mesh.parent?.name || "").toLowerCase();
            const fullName = `${parentName}:${nodeName}`;

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
    };
  }, [materials]);

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
    const lerpRate = rawVol > smoothVol.current ? 0.48 : 0.26;
    smoothVol.current += (rawVol - smoothVol.current) * lerpRate;
    const v = Math.min(1, Math.max(0, smoothVol.current));

    sharedUniforms.current.uTime.value = t;
    sharedUniforms.current.uVoice.value = v;

    // 1. Subtle 3D Hologram Float + Head/Shoulders Counter-Rotation
    const floatY = Math.sin(t * 1.05) * 0.032;
    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = position[1] + floatY;
    }
    if (headPivotRef.current) {
      headPivotRef.current.rotation.y = Math.sin(t * 0.42) * 0.13;
      headPivotRef.current.rotation.x = Math.sin(t * 0.30) * 0.04 + v * 0.045;
      headPivotRef.current.rotation.z = Math.cos(t * 0.26) * 0.02;
    }
    if (shouldersRef.current) {
      shouldersRef.current.rotation.y = Math.sin(t * 0.42) * 0.048;
      shouldersRef.current.rotation.z = Math.cos(t * 0.26) * 0.008;
    }

    // 2. Natural Eyelid Blink Timing
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

      const jawTarget = Math.min(0.84, v * 0.76);
      const syllableWave = 0.5 + 0.5 * Math.sin(t * 11.5);
      const funnelTarget = v > 0.04 ? v * 0.34 * syllableWave : 0;
      const puckerTarget = v > 0.04 ? v * 0.17 * (1 - syllableWave) : 0;

      setMorph("jawOpen", jawTarget, 0.56);
      setMorph("mouthFunnel", funnelTarget, 0.46);
      setMorph("mouthPucker", puckerTarget, 0.46);
      setMorph("mouthLowerDown_L", v * 0.28, 0.5);
      setMorph("mouthLowerDown_R", v * 0.28, 0.5);
      setMorph("mouthUpperUp_L", v * 0.14, 0.5);
      setMorph("mouthUpperUp_R", v * 0.14, 0.5);
      setMorph("mouthSmile_L", 0.08 + v * 0.07, 0.2);
      setMorph("mouthSmile_R", 0.08 + v * 0.07, 0.2);
      setMorph("browInnerUp", 0.05 + v * 0.16 + Math.sin(t * 0.9) * 0.025, 0.25);
      setMorph("browOuterUp_L", v * 0.13, 0.25);
      setMorph("browOuterUp_R", v * 0.13, 0.25);

      // Bilateral blinks closing sculpted eyelids cleanly over molten crimson eyes
      setMorph("eyeBlink_L", blinkVal, 0.85);
      setMorph("eyeBlink_R", blinkVal, 0.85);
    }
  });

  return (
    <group ref={rootGroupRef} scale={scale} position={position}>
      {/* Realistic 3D Male Head (head + teeth in cyan scanline, eyeLeft & eyeRight in molten ruby-crimson) */}
      <group ref={headPivotRef}>{loadedModel && <primitive object={loadedModel} />}</group>

      {/* Seamless Cyan Horizontal-Scanline Neck & Clavicle/Shoulders Bust */}
      <group ref={shouldersRef}>
        <HologramShouldersBust sharedUniforms={sharedUniforms.current} />
      </group>
    </group>
  );
});

export default WireframeFace;
