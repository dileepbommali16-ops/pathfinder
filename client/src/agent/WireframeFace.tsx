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
    uJawOpen: { value: 0 },
  });

  const fastEnv = useRef<number>(0);
  const localSyllableAvg = useRef<number>(0);
  const baseLowRatio = useRef<number>(0.48);
  const baseMidRatio = useRef<number>(0.34);
  const nextBlink = useRef<number>(0.7);
  const isBlinking = useRef<boolean>(false);
  const blinkProg = useRef<number>(0);
  const pendingDoubleBlink = useRef<boolean>(false);

  const materials = useMemo(() => {
    const headMat = createHologramScanMaterial(sharedUniforms.current, { isHead: true });
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
        scene.updateMatrixWorld(true);

        const worldVert = new THREE.Vector3();

        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const nodeName = (mesh.name || "").toLowerCase();
            const parentName = (mesh.parent?.name || "").toLowerCase();
            const fullName = `${parentName}:${nodeName}`;
            const posAttr = mesh.geometry?.attributes?.position;

            if (fullName.includes("eye")) {
              mesh.material = materials.redEyeMat;
            } else if (fullName.includes("teeth")) {
              if (posAttr) {
                const lowerFlags = new Float32Array(posAttr.count);
                for (let i = 0; i < posAttr.count; i++) {
                  worldVert.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
                  lowerFlags[i] = worldVert.y < -0.105 ? 1.0 : 0.0;
                }
                mesh.geometry.setAttribute("aLowerTooth", new THREE.BufferAttribute(lowerFlags, 1));
              }
              mesh.material = materials.teethMat;
            } else {
              if (posAttr) {
                const uvAttr = mesh.geometry?.attributes?.uv;
                let uvMax = 1.0;
                if (uvAttr) {
                  for (let i = 0; i < uvAttr.count; i++) {
                    const ux = uvAttr.getX(i);
                    const vy = uvAttr.getY(i);
                    if (ux > uvMax) uvMax = ux;
                    if (vy > uvMax) uvMax = vy;
                  }
                }
                const uvScale = uvMax > 2.0 ? 4096.0 : 1.0;
                const cavityMask = new Float32Array(posAttr.count);
                for (let i = 0; i < posAttr.count; i++) {
                  worldVert.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
                  const uNorm = uvAttr ? uvAttr.getX(i) / uvScale : 1.0;
                  const vNorm = uvAttr ? uvAttr.getY(i) / uvScale : 1.0;
                  const inInnerUvIsland = uNorm < 0.43 && vNorm < 0.65;
                  const inMouthCone =
                    Math.abs(worldVert.x) < 0.16 &&
                    worldVert.y > -0.24 &&
                    worldVert.y < -0.01 &&
                    worldVert.z > 0.08;
                  if (inInnerUvIsland && inMouthCone) {
                    cavityMask[i] = THREE.MathUtils.clamp((0.445 - worldVert.z) / 0.075, 0.35, 1.0);
                  }
                }
                mesh.geometry.setAttribute("aMouthCavity", new THREE.BufferAttribute(cavityMask, 1));
              }
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

  useEffect(() => {
    return () => {
      if (!loadedModel) return;
      loadedModel.traverse((child: any) => {
        if (child?.isMesh) {
          child.geometry?.dispose?.();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
    };
  }, [loadedModel]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);
    const t = state.clock.getElapsedTime();

    const { volume, low, mid, high, zcr, isSpeaking, viseme } = getUnifiedSpeechFormants(t);
    const fastLerp = 1 - Math.exp(-(volume > fastEnv.current ? 42 : 30) * delta);
    fastEnv.current += (volume - fastEnv.current) * fastLerp;
    const v = THREE.MathUtils.clamp(fastEnv.current, 0, 1);

    if (isSpeaking && volume > 0.015) {
      const avgRate = 1 - Math.exp(-4.5 * delta);
      localSyllableAvg.current += (volume - localSyllableAvg.current) * avgRate;
    } else {
      localSyllableAvg.current *= Math.exp(-10 * delta);
    }

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

    // 2. Smooth Natural Eyelid Blink (~375ms close-hold-open with occasional quick double blink)
    nextBlink.current -= delta;
    if (nextBlink.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkProg.current = 0;
      if (!pendingDoubleBlink.current && Math.random() < 0.24) {
        pendingDoubleBlink.current = true;
      }
    }

    let blinkVal = 0;
    if (isBlinking.current) {
      blinkProg.current += delta * 2.65;
      const p = Math.min(1, blinkProg.current);
      if (p < 0.28) {
        blinkVal = Math.sin((p / 0.28) * (Math.PI * 0.5));
      } else if (p < 0.52) {
        blinkVal = 1.0;
      } else {
        blinkVal = 0.5 * (1 + Math.cos(((p - 0.52) / 0.48) * Math.PI));
      }
      if (blinkProg.current >= 1) {
        isBlinking.current = false;
        blinkVal = 0;
        if (pendingDoubleBlink.current) {
          pendingDoubleBlink.current = false;
          nextBlink.current = 0.15;
        } else {
          nextBlink.current = 1.9 + Math.random() * 1.9;
        }
      }
    }

    sharedUniforms.current.uTime.value = t;
    sharedUniforms.current.uVoice.value = v;
    sharedUniforms.current.uBlink.value = blinkVal;

    // 3. Phonetic + Acoustic Coarticulated Conversational Lip-Sync
    const mesh = headMorphMeshRef.current;
    if (mesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;

      const setMorph = (name: string, target: number, speed = 34) => {
        const idx = dict[name];
        if (idx !== undefined) {
          const factor = 1 - Math.exp(-speed * delta);
          inf[idx] += (target - inf[idx]) * factor;
        }
      };

      const active = isSpeaking && (fastEnv.current > 0.015 || volume > 0.015);
      const bandSum = low + mid + high + 0.001;
      const wLow = low / bandSum;
      const wMid = mid / bandSum;
      const wHigh = high / bandSum;

      if (active && volume > 0.04) {
        const baseRate = 1 - Math.exp(-1.6 * delta);
        baseLowRatio.current += (wLow - baseLowRatio.current) * baseRate;
        baseMidRatio.current += (wMid - baseMidRatio.current) * baseRate;
      }

      const dLow = Math.max(0, wLow - baseLowRatio.current);
      const dMid = Math.max(0, wMid - baseMidRatio.current);
      const isSibilant = active
        ? THREE.MathUtils.clamp((zcr - 0.065) * 6.5 + (wHigh - 0.10) * 3.5, 0, 1)
        : 0;

      // Crisp syllable valley lip closures so live speech snaps shut smoothly between syllables/words
      const valleyClose =
        active && localSyllableAvg.current > 0.08 && fastEnv.current < localSyllableAvg.current * 0.72
          ? THREE.MathUtils.clamp(
              (localSyllableAvg.current * 0.72 - fastEnv.current) /
                Math.max(0.06, localSyllableAvg.current * 0.45),
              0,
              1
            )
          : 0;

      const roundW = active ? THREE.MathUtils.clamp(dLow * 7.5 * (1 - isSibilant * 0.8), 0, 0.72) : 0;
      const spreadW = active
        ? THREE.MathUtils.clamp((dMid * 7.2 + isSibilant * 0.38) * (1 - roundW * 0.7), 0, 0.72)
        : 0;
      const energyAmp = active ? THREE.MathUtils.clamp(fastEnv.current * 1.15, 0, 1) : 0;

      let jawTarget = 0;
      let closeTarget = 0;
      let pressTarget = 0;
      let puckerTarget = 0;
      let funnelTarget = 0;
      let stretchTarget = 0;
      let upperUpTarget = 0;
      let lowerDownTarget = 0;
      let rollLowerTarget = 0;
      let smileTarget = 0.05;

      if (active) {
        const openGate = 1.0 - valleyClose * 0.92;
        const baseAcJaw = THREE.MathUtils.clamp(
          energyAmp * 0.42 * (1 - isSibilant * 0.65) * (1 - roundW * 0.25),
          0.04,
          0.44
        );
        const acJaw = baseAcJaw * openGate;
        const acClose = valleyClose * 0.56;
        const acPress = valleyClose * 0.42;
        const acPucker = roundW * 0.56 * openGate;
        const acFunnel = (roundW * 0.34 + isSibilant * 0.22) * openGate;
        const acStretch = spreadW * 0.56 * (1 - valleyClose * 0.65);
        const acUpperUp = (0.06 + spreadW * 0.18 + isSibilant * 0.16 + energyAmp * 0.12) * openGate;
        const acLowerDown = energyAmp * 0.28 * (1 - isSibilant * 0.5) * openGate;
        const acRollLower = isSibilant > 0.52 && energyAmp < 0.38 ? 0.30 : 0;
        const acSmile = 0.05 + spreadW * 0.14;

        if (viseme) {
          // Phonetic viseme timeline locked to live acoustic loudness & closure stops
          const isClosure = viseme.close > 0.25;
          const ampGain = isClosure ? 1.0 : THREE.MathUtils.clamp(0.45 + fastEnv.current * 0.85, 0.35, 1.08);
          const vMix = isClosure ? 0.92 : 0.78;
          const aMix = 1.0 - vMix;
          jawTarget = isClosure ? 0 : (viseme.jawOpen * ampGain) * vMix + acJaw * aMix;
          closeTarget = viseme.close * vMix + acClose * aMix;
          pressTarget = viseme.press * vMix + acPress * aMix;
          puckerTarget = isClosure ? 0 : (viseme.pucker * ampGain) * vMix + acPucker * aMix;
          funnelTarget = isClosure ? 0 : (viseme.funnel * ampGain) * vMix + acFunnel * aMix;
          stretchTarget = isClosure ? 0 : (viseme.stretch * ampGain) * vMix + acStretch * aMix;
          upperUpTarget = isClosure ? 0 : (viseme.upperUp * ampGain) * vMix + acUpperUp * aMix;
          lowerDownTarget = isClosure ? 0 : (viseme.lowerDown * ampGain) * vMix + acLowerDown * aMix;
          rollLowerTarget = viseme.rollLower * vMix + acRollLower * aMix;
          smileTarget = viseme.smile * vMix + acSmile * aMix;
        } else {
          jawTarget = acJaw;
          closeTarget = acClose;
          pressTarget = acPress;
          puckerTarget = acPucker;
          funnelTarget = acFunnel;
          stretchTarget = acStretch;
          upperUpTarget = acUpperUp;
          lowerDownTarget = acLowerDown;
          rollLowerTarget = acRollLower;
          smileTarget = acSmile;
        }
      }

      setMorph("jawOpen", jawTarget, 40);
      setMorph("mouthClose", closeTarget, 42);
      setMorph("mouthPress_L", pressTarget, 40);
      setMorph("mouthPress_R", pressTarget, 40);
      setMorph("mouthPucker", puckerTarget, 34);
      setMorph("mouthFunnel", funnelTarget, 34);
      setMorph("mouthStretch_L", stretchTarget, 34);
      setMorph("mouthStretch_R", stretchTarget, 34);
      setMorph("mouthLowerDown_L", lowerDownTarget, 38);
      setMorph("mouthLowerDown_R", lowerDownTarget, 38);
      setMorph("mouthUpperUp_L", upperUpTarget, 38);
      setMorph("mouthUpperUp_R", upperUpTarget, 38);
      setMorph("mouthRollLower", rollLowerTarget, 36);
      setMorph("mouthSmile_L", smileTarget, 14);
      setMorph("mouthSmile_R", smileTarget, 14);

      const jawIdx = dict["jawOpen"];
      if (jawIdx !== undefined) {
        sharedUniforms.current.uJawOpen.value = Math.max(0, inf[jawIdx]);
      }

      // Subtle brow engagement + micro gaze saccades during idle/speech
      setMorph("browInnerUp", 0.04 + (active ? energyAmp * 0.14 : 0) + Math.sin(t * 0.9) * 0.02, 8);
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

      // Bilateral blinks closing upper & lower eyelids cleanly over molten crimson eyes
      setMorph("eyeBlink_L", blinkVal, 110);
      setMorph("eyeBlink_R", blinkVal, 110);
      setMorph("eyeSquint_L", blinkVal * 0.30, 85);
      setMorph("eyeSquint_R", blinkVal * 0.30, 85);
      const blinkLIdx = dict["eyeBlink_L"];
      if (blinkLIdx !== undefined) {
        sharedUniforms.current.uBlink.value = Math.max(blinkVal, inf[blinkLIdx]);
      }
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
