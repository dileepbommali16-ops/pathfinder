import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { getUnifiedSpeechFormants } from "./audioIO";
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

const DEFAULT_SCALE: [number, number, number] = [1.22, 1.22, 1.22];
const DEFAULT_POSITION: [number, number, number] = [0, 0.08, 0];

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
 * - Drives natural eyelid blinking (eyeBlink_L/R) and formant-based coarticulated conversational lip-sync
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
    uBlink: { value: 0 },
  });

  const fastEnv = useRef<number>(0);
  const slowEnv = useRef<number>(0);
  const syllableGate = useRef<number>(0);
  const nextBlink = useRef<number>(1.8);
  const isBlinking = useRef<boolean>(false);
  const blinkProg = useRef<number>(0);
  const pendingDoubleBlink = useRef<boolean>(false);

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

  useFrame((state, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);
    const t = state.clock.getElapsedTime();

    const { volume, low, mid, high, isSpeaking } = getUnifiedSpeechFormants(t);
    const fastLerp = 1 - Math.exp(-(volume > fastEnv.current ? 34 : 20) * delta);
    const slowLerp = 1 - Math.exp(-3.4 * delta);
    fastEnv.current += (volume - fastEnv.current) * fastLerp;
    slowEnv.current += (volume - slowEnv.current) * slowLerp;

    const v = THREE.MathUtils.clamp(fastEnv.current, 0, 1);
    const relativeBurst = THREE.MathUtils.clamp(
      (fastEnv.current - slowEnv.current * 0.62) / (slowEnv.current * 0.52 + 0.048),
      0,
      1.3
    );

    // Subtle natural speech cadence contrast only while actively speaking so sustained vowels still articulate
    const cadenceWave = isSpeaking && v > 0.03 ? 0.64 + 0.36 * Math.sin(t * 20.5 + Math.sin(t * 8.2) * 1.35) : 1.0;
    const targetGate = isSpeaking && v > 0.025 ? THREE.MathUtils.clamp(relativeBurst * cadenceWave, 0, 1.2) : 0;
    syllableGate.current += (targetGate - syllableGate.current) * (1 - Math.exp(-28 * delta));
    const gate = syllableGate.current;

    // 1. Subtle 3D Hologram Float + Head/Shoulders Counter-Rotation
    const floatY = Math.sin(t * 1.05) * 0.028;
    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = position[1] + floatY;
    }
    if (headPivotRef.current) {
      headPivotRef.current.rotation.y = Math.sin(t * 0.42) * 0.13;
      headPivotRef.current.rotation.x = Math.sin(t * 0.30) * 0.038 + v * 0.036;
      headPivotRef.current.rotation.z = Math.cos(t * 0.26) * 0.02;
    }
    if (shouldersRef.current) {
      shouldersRef.current.rotation.y = Math.sin(t * 0.42) * 0.048;
      shouldersRef.current.rotation.z = Math.cos(t * 0.26) * 0.008;
    }

    // 2. Smooth Natural Eyelid Blink (~310ms close-hold-open with occasional quick double blink)
    nextBlink.current -= delta;
    if (nextBlink.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkProg.current = 0;
      if (!pendingDoubleBlink.current && Math.random() < 0.22) {
        pendingDoubleBlink.current = true;
      }
    }

    let blinkVal = 0;
    if (isBlinking.current) {
      blinkProg.current += delta * 3.25;
      const p = Math.min(1, blinkProg.current);
      if (p < 0.30) {
        blinkVal = Math.sin((p / 0.30) * (Math.PI * 0.5));
      } else if (p < 0.50) {
        blinkVal = 1.0;
      } else {
        blinkVal = 0.5 * (1 + Math.cos(((p - 0.50) / 0.50) * Math.PI));
      }
      if (blinkProg.current >= 1) {
        isBlinking.current = false;
        blinkVal = 0;
        if (pendingDoubleBlink.current) {
          pendingDoubleBlink.current = false;
          nextBlink.current = 0.16;
        } else {
          nextBlink.current = 2.3 + Math.random() * 2.2;
        }
      }
    }

    sharedUniforms.current.uTime.value = t;
    sharedUniforms.current.uVoice.value = v;
    sharedUniforms.current.uBlink.value = blinkVal;

    // 3. Coarticulated Conversational Lip-Sync (clear syllable motion without wide jaw yawns)
    const mesh = headMorphMeshRef.current;
    if (mesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;

      const setMorph = (name: string, target: number, speed = 26) => {
        const idx = dict[name];
        if (idx !== undefined) {
          const factor = 1 - Math.exp(-speed * delta);
          inf[idx] += (target - inf[idx]) * factor;
        }
      };

      const active = isSpeaking && v > 0.025;
      const bandSum = low + mid + high + 0.001;
      const wLow = low / bandSum;
      const wMid = mid / bandSum;
      const wHigh = high / bandSum;

      // Vowel posture weights driven by live acoustic formants
      const roundVowel = active ? THREE.MathUtils.clamp((wLow - wMid * 0.72) * 2.5, 0, 1) : 0;
      const spreadVowel = active ? THREE.MathUtils.clamp((wMid - wLow * 0.42) * 2.4 + wHigh * 0.48, 0, 1) : 0;
      const bilabialSnap = active && gate < 0.24 ? THREE.MathUtils.clamp((0.24 - gate) / 0.24, 0, 1) : 0;

      // Conversational jaw range: readable (~0.18-0.44) with hard cap at 0.50 — zero feeding-rice yawning
      const rawJawTarget = active
        ? Math.min(0.50, (0.16 + 0.30 * gate) * (0.50 + 0.50 * v) * (1.0 - 0.30 * roundVowel) * (1.0 - 0.32 * wHigh))
        : 0;

      // Only engage mouthClose when jaw isn't actively opening, so consonant closures never fight vowels
      const closeTarget = active && rawJawTarget < 0.14 ? bilabialSnap * 0.42 : 0;
      const pressTarget = active && rawJawTarget < 0.14 ? bilabialSnap * 0.30 : 0;
      const puckerTarget = active ? roundVowel * (0.30 + 0.34 * gate) : 0;
      const funnelTarget = active ? (roundVowel * 0.28 + wHigh * 0.18) * (0.4 + 0.6 * gate) : 0;
      const stretchTarget = active ? spreadVowel * (0.26 + 0.28 * v) : 0;
      const upperUpTarget = active ? (spreadVowel * 0.18 + wHigh * 0.22 + gate * 0.12) * Math.min(1, v * 1.15) : 0;
      const lowerDownTarget = active ? (gate * 0.22 + wLow * 0.12) * Math.min(1, v * 1.15) : 0;

      setMorph("jawOpen", rawJawTarget, 30);
      setMorph("mouthClose", closeTarget, 34);
      setMorph("mouthPress_L", pressTarget, 32);
      setMorph("mouthPress_R", pressTarget, 32);
      setMorph("mouthPucker", puckerTarget, 26);
      setMorph("mouthFunnel", funnelTarget, 26);
      setMorph("mouthStretch_L", stretchTarget, 26);
      setMorph("mouthStretch_R", stretchTarget, 26);
      setMorph("mouthLowerDown_L", lowerDownTarget, 28);
      setMorph("mouthLowerDown_R", lowerDownTarget, 28);
      setMorph("mouthUpperUp_L", upperUpTarget, 28);
      setMorph("mouthUpperUp_R", upperUpTarget, 28);
      setMorph("mouthSmile_L", 0.06 + (active ? spreadVowel * 0.08 : 0), 10);
      setMorph("mouthSmile_R", 0.06 + (active ? spreadVowel * 0.08 : 0), 10);

      // Subtle brow engagement + micro gaze saccades during idle/speech
      setMorph("browInnerUp", 0.04 + (active ? gate * 0.16 : 0) + Math.sin(t * 0.9) * 0.02, 8);
      setMorph("browOuterUp_L", active ? v * 0.12 : 0, 8);
      setMorph("browOuterUp_R", active ? v * 0.12 : 0, 8);

      const lookX = Math.sin(t * 0.55) * 0.08;
      const lookY = Math.sin(t * 0.37) * 0.05;
      setMorph("eyeLookOut_L", Math.max(0, lookX), 10);
      setMorph("eyeLookIn_L", Math.max(0, -lookX), 10);
      setMorph("eyeLookIn_R", Math.max(0, lookX), 10);
      setMorph("eyeLookOut_R", Math.max(0, -lookX), 10);
      setMorph("eyeLookUp_L", Math.max(0, lookY), 10);
      setMorph("eyeLookUp_R", Math.max(0, lookY), 10);
      setMorph("eyeLookDown_L", Math.max(0, -lookY), 10);
      setMorph("eyeLookDown_R", Math.max(0, -lookY), 10);

      // Bilateral blinks closing sculpted eyelids cleanly over molten crimson eyes
      setMorph("eyeBlink_L", blinkVal, 55);
      setMorph("eyeBlink_R", blinkVal, 55);
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
