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
  const elapsedRef = useRef<number>(0);

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

        let teethMinY = -0.175;
        let teethMaxY = -0.055;
        let teethMidY = -0.115;
        let teethMaxZ = 0.44;
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            const full = `${(m.parent?.name || "").toLowerCase()}:${(m.name || "").toLowerCase()}`;
            if (full.includes("teeth") && m.geometry?.attributes?.position) {
              const tPos = m.geometry.attributes.position;
              const tBox = new THREE.Box3();
              for (let i = 0; i < tPos.count; i++) {
                worldVert.fromBufferAttribute(tPos, i).applyMatrix4(m.matrixWorld);
                tBox.expandByPoint(worldVert);
              }
              if (!tBox.isEmpty()) {
                teethMinY = tBox.min.y;
                teethMaxY = tBox.max.y;
                teethMidY = (teethMinY + teethMaxY) * 0.5;
                teethMaxZ = tBox.max.z;
              }
            }
          }
        });

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
                  lowerFlags[i] = worldVert.y < teethMidY ? 1.0 : 0.0;
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
                const lipRim = new Float32Array(posAttr.count);
                for (let i = 0; i < posAttr.count; i++) {
                  worldVert.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
                  const uNorm = uvAttr ? uvAttr.getX(i) / uvScale : 1.0;
                  const vNorm = uvAttr ? uvAttr.getY(i) / uvScale : 1.0;
                  const inInnerUvIsland = uNorm < 0.43 && vNorm < 0.65;
                  const inDeepCavity =
                    inInnerUvIsland &&
                    Math.abs(worldVert.x) < 0.14 &&
                    worldVert.y > teethMinY - 0.08 &&
                    worldVert.y < teethMaxY + 0.08 &&
                    worldVert.z < teethMaxZ + 0.01;
                  if (inDeepCavity) {
                    cavityMask[i] = THREE.MathUtils.clamp((teethMaxZ + 0.015 - worldVert.z) / 0.065, 0.3, 1.0);
                  } else if (
                    !inInnerUvIsland &&
                    Math.abs(worldVert.x) < 0.135 &&
                    worldVert.y > teethMinY - 0.06 &&
                    worldVert.y < teethMaxY + 0.06 &&
                    worldVert.z >= teethMaxZ - 0.015
                  ) {
                    lipRim[i] =
                      Math.exp(-Math.pow((worldVert.y - teethMidY) / 0.042, 2)) *
                      Math.exp(-Math.pow(worldVert.x / 0.125, 2));
                  }
                }
                mesh.geometry.setAttribute("aMouthCavity", new THREE.BufferAttribute(cavityMask, 1));
                mesh.geometry.setAttribute("aLipRim", new THREE.BufferAttribute(lipRim, 1));
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

  useFrame((_, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);
    elapsedRef.current += delta;
    const t = elapsedRef.current;

    const { volume, low, mid, high, zcr, f2Low, f2High, isSpeaking, viseme } =
      getUnifiedSpeechFormants(t);
    const fastLerp = 1 - Math.exp(-(volume > fastEnv.current ? 46 : 32) * delta);
    fastEnv.current += (volume - fastEnv.current) * fastLerp;
    const v = THREE.MathUtils.clamp(fastEnv.current, 0, 1);

    if (isSpeaking && volume > 0.015) {
      const avgRate = 1 - Math.exp(-5.0 * delta);
      localSyllableAvg.current += (volume - localSyllableAvg.current) * avgRate;
    } else {
      localSyllableAvg.current *= Math.exp(-12 * delta);
    }

    const activeSpeech = isSpeaking && (fastEnv.current > 0.015 || volume > 0.015);
    const energyAmp = activeSpeech ? THREE.MathUtils.clamp(fastEnv.current * 1.2, 0, 1) : 0;

    // 1. Subtle 3D Hologram Float + Head/Shoulders Counter-Rotation + Speaking Micro-Nod
    const floatY = Math.sin(t * 1.05) * 0.028;
    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = position[1] + floatY;
    }
    if (headPivotRef.current) {
      headPivotRef.current.rotation.y = Math.sin(t * 0.42) * 0.13;
      headPivotRef.current.rotation.x = Math.sin(t * 0.30) * 0.038 + v * 0.036 + energyAmp * 0.025;
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

    // 3. Phonetic + Formant Coarticulated 18-Morph Human Lip-Sync (with sealed resting lips)
    const mesh = headMorphMeshRef.current;
    if (mesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;

      const setMorph = (name: string, target: number, speed = 36) => {
        const idx = dict[name];
        if (idx !== undefined) {
          const factor = 1 - Math.exp(-speed * delta);
          inf[idx] += (target - inf[idx]) * factor;
        }
      };

      const bandSum = low + mid + high + 0.001;
      const wLow = low / bandSum;
      const wMid = mid / bandSum;
      const wHigh = high / bandSum;

      if (activeSpeech && volume > 0.04) {
        const baseRate = 1 - Math.exp(-1.8 * delta);
        baseLowRatio.current += (wLow - baseLowRatio.current) * baseRate;
        baseMidRatio.current += (wMid - baseMidRatio.current) * baseRate;
      }

      const dLow = Math.max(0, wLow - baseLowRatio.current);
      const dMid = Math.max(0, wMid - baseMidRatio.current);
      const f2Sum = f2Low + f2High + 0.001;
      const roundBias = f2Low / f2Sum;
      const spreadBias = f2High / f2Sum;
      const isSibilant = activeSpeech
        ? THREE.MathUtils.clamp((zcr - 0.065) * 6.8 + (wHigh - 0.10) * 3.8, 0, 1)
        : 0;

      // Stronger syllable/plosive valley lip closures so live speech snaps shut between syllables & words
      const valleyClose =
        activeSpeech && localSyllableAvg.current > 0.075 && fastEnv.current < localSyllableAvg.current * 0.74
          ? THREE.MathUtils.clamp(
              (localSyllableAvg.current * 0.74 - fastEnv.current) /
                Math.max(0.055, localSyllableAvg.current * 0.42),
              0,
              1
            )
          : 0;

      const roundW = activeSpeech
        ? THREE.MathUtils.clamp((roundBias * 0.75 + dLow * 5.2) * (1 - isSibilant * 0.75), 0, 0.84)
        : 0;
      const spreadW = activeSpeech
        ? THREE.MathUtils.clamp((spreadBias * 0.72 + dMid * 4.8 + isSibilant * 0.35) * (1 - roundW * 0.65), 0, 0.84)
        : 0;

      // Natural sealed resting mouth pose when silent (eliminates dark parted-lip void at rest)
      let jawTarget = 0;
      let closeTarget = 0.30;
      let pressTarget = 0.24;
      let puckerTarget = 0;
      let funnelTarget = 0;
      let stretchTarget = 0;
      let upperUpTarget = 0;
      let lowerDownTarget = 0;
      let rollLowerTarget = 0.06;
      let rollUpperTarget = 0.04;
      let shrugLowerTarget = 0.16;
      let shrugUpperTarget = 0.06;
      let smileTarget = 0.09;
      let dimpleTarget = 0.06;

      if (activeSpeech) {
        const openGate = 1.0 - valleyClose * 0.94;
        const baseAcJaw = THREE.MathUtils.clamp(
          energyAmp * 0.50 * (1 - isSibilant * 0.62) * (1 - roundW * 0.22),
          0.05,
          0.52
        );
        const acJaw = baseAcJaw * openGate;
        const acClose = valleyClose * 0.68;
        const acPress = valleyClose * 0.52;
        const acPucker = roundW * 0.68 * openGate;
        const acFunnel = (roundW * 0.42 + isSibilant * 0.28) * openGate;
        const acStretch = spreadW * 0.64 * (1 - valleyClose * 0.62);
        const acUpperUp = (0.08 + spreadW * 0.22 + isSibilant * 0.18 + energyAmp * 0.16) * openGate;
        const acLowerDown = energyAmp * 0.36 * (1 - isSibilant * 0.45) * openGate;
        const acRollLower = isSibilant > 0.50 && energyAmp < 0.40 ? 0.38 : valleyClose * 0.14;
        const acSmile = 0.06 + spreadW * 0.18;

        if (viseme) {
          const isClosure = viseme.close > 0.25;
          const ampGain = isClosure ? 1.0 : THREE.MathUtils.clamp(0.50 + fastEnv.current * 0.85, 0.40, 1.25);
          const vMix = isClosure ? 0.90 : 0.72;
          const aMix = 1.0 - vMix;
          jawTarget = isClosure ? 0 : Math.min(0.56, viseme.jawOpen * ampGain) * vMix + acJaw * aMix;
          closeTarget = viseme.close * vMix + acClose * aMix;
          pressTarget = viseme.press * vMix + acPress * aMix;
          puckerTarget = isClosure ? 0 : Math.min(0.85, viseme.pucker * ampGain) * vMix + acPucker * aMix;
          funnelTarget = isClosure ? 0 : Math.min(0.75, viseme.funnel * ampGain) * vMix + acFunnel * aMix;
          stretchTarget = isClosure ? 0 : Math.min(0.75, viseme.stretch * ampGain) * vMix + acStretch * aMix;
          upperUpTarget = isClosure ? 0 : Math.min(0.48, viseme.upperUp * ampGain) * vMix + acUpperUp * aMix;
          lowerDownTarget = isClosure ? 0 : Math.min(0.55, viseme.lowerDown * ampGain) * vMix + acLowerDown * aMix;
          rollLowerTarget = viseme.rollLower * vMix + acRollLower * aMix;
          rollUpperTarget = closeTarget * 0.24;
          shrugLowerTarget = closeTarget * 0.20 + puckerTarget * 0.14;
          shrugUpperTarget = closeTarget * 0.08 + funnelTarget * 0.10;
          smileTarget = viseme.smile * vMix + acSmile * aMix;
          dimpleTarget = smileTarget * 0.45;
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
          rollUpperTarget = acClose * 0.24;
          shrugLowerTarget = acClose * 0.20 + acPucker * 0.14;
          shrugUpperTarget = acClose * 0.08 + acFunnel * 0.10;
          smileTarget = acSmile;
          dimpleTarget = acSmile * 0.45;
        }
      }

      setMorph("jawOpen", jawTarget, 42);
      setMorph("jawForward", puckerTarget * 0.14, 34);
      setMorph("mouthClose", closeTarget, 44);
      setMorph("mouthPress_L", pressTarget, 42);
      setMorph("mouthPress_R", pressTarget, 42);
      setMorph("mouthPucker", puckerTarget, 36);
      setMorph("mouthFunnel", funnelTarget, 36);
      setMorph("mouthStretch_L", stretchTarget, 36);
      setMorph("mouthStretch_R", stretchTarget, 36);
      setMorph("mouthLowerDown_L", lowerDownTarget, 40);
      setMorph("mouthLowerDown_R", lowerDownTarget, 40);
      setMorph("mouthUpperUp_L", upperUpTarget, 40);
      setMorph("mouthUpperUp_R", upperUpTarget, 40);
      setMorph("mouthRollLower", rollLowerTarget, 38);
      setMorph("mouthRollUpper", rollUpperTarget, 38);
      setMorph("mouthShrugLower", shrugLowerTarget, 34);
      setMorph("mouthShrugUpper", shrugUpperTarget, 34);
      setMorph("mouthSmile_L", smileTarget, 16);
      setMorph("mouthSmile_R", smileTarget, 16);
      setMorph("mouthDimple_L", dimpleTarget, 16);
      setMorph("mouthDimple_R", dimpleTarget, 16);
      setMorph("cheekSquint_L", activeSpeech ? energyAmp * 0.14 + smileTarget * 0.22 : 0.02, 14);
      setMorph("cheekSquint_R", activeSpeech ? energyAmp * 0.14 + smileTarget * 0.22 : 0.02, 14);
      setMorph("noseSneer_L", activeSpeech ? upperUpTarget * 0.18 : 0, 18);
      setMorph("noseSneer_R", activeSpeech ? upperUpTarget * 0.18 : 0, 18);

      const jawIdx = dict["jawOpen"];
      if (jawIdx !== undefined) {
        sharedUniforms.current.uJawOpen.value = Math.max(0, inf[jawIdx]);
      }

      // Subtle brow engagement + micro gaze saccades during idle/speech
      setMorph("browInnerUp", 0.04 + (activeSpeech ? energyAmp * 0.14 : 0) + Math.sin(t * 0.9) * 0.02, 8);
      setMorph("browOuterUp_L", activeSpeech ? v * 0.12 : 0, 8);
      setMorph("browOuterUp_R", activeSpeech ? v * 0.12 : 0, 8);

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
