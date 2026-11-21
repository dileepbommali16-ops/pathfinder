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
  const speechHoldRef = useRef<number>(0);
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
    const fastLerp = 1 - Math.exp(-(volume > fastEnv.current ? 24 : 16) * delta);
    fastEnv.current += (volume - fastEnv.current) * fastLerp;
    const v = THREE.MathUtils.clamp(fastEnv.current, 0, 1);

    if (isSpeaking && volume > 0.012) {
      speechHoldRef.current = Math.min(1, speechHoldRef.current + delta * 12);
      const avgRate = 1 - Math.exp(-4.2 * delta);
      localSyllableAvg.current += (volume - localSyllableAvg.current) * avgRate;
    } else {
      speechHoldRef.current = Math.max(0, speechHoldRef.current - delta * 4.5);
      localSyllableAvg.current *= Math.exp(-8 * delta);
    }

    const speechBlend = speechHoldRef.current;
    const activeSpeech = speechBlend > 0.05;
    const energyAmp = activeSpeech ? THREE.MathUtils.clamp(fastEnv.current * 1.05, 0, 1) : 0;

    // 1. Subtle 3D Hologram Float + Head/Shoulders Counter-Rotation (100% steady during speech — zero head bob/shake)
    const floatY = Math.sin(t * 1.05) * 0.028;
    if (rootGroupRef.current) {
      rootGroupRef.current.position.y = position[1] + floatY;
    }
    if (headPivotRef.current) {
      headPivotRef.current.rotation.y = Math.sin(t * 0.42) * 0.13;
      headPivotRef.current.rotation.x = Math.sin(t * 0.30) * 0.038;
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

      // Gentle syllable valley lip closures without snapping or chattering the jaw
      const valleyClose =
        activeSpeech && localSyllableAvg.current > 0.085 && fastEnv.current < localSyllableAvg.current * 0.68
          ? THREE.MathUtils.clamp(
              (localSyllableAvg.current * 0.68 - fastEnv.current) /
                Math.max(0.065, localSyllableAvg.current * 0.50),
              0,
              0.75
            )
          : 0;

      const roundW = activeSpeech
        ? THREE.MathUtils.clamp((roundBias * 0.55 + dLow * 4.2) * (1 - isSibilant * 0.7), 0, 0.62)
        : 0;
      const spreadW = activeSpeech
        ? THREE.MathUtils.clamp((spreadBias * 0.52 + dMid * 4.0 + isSibilant * 0.28) * (1 - roundW * 0.65), 0, 0.62)
        : 0;

      // Natural sealed resting mouth pose when silent (smoothly blended via speechBlend so chin never jerks)
      const restClose = 0.22;
      const restPress = 0.12;
      const restSmile = 0.06;

      let spJaw = 0;
      let spClose = 0;
      let spPress = 0;
      let spPucker = 0;
      let spFunnel = 0;
      let spStretch = 0;
      let spUpperUp = 0;
      let spLowerDown = 0;
      let spRollLower = 0;
      let spSmile = restSmile;

      if (activeSpeech) {
        const openGate = 1.0 - valleyClose * 0.62;
        const baseAcJaw = THREE.MathUtils.clamp(
          energyAmp * 0.36 * (1 - isSibilant * 0.55) * (1 - roundW * 0.20),
          0.03,
          0.36
        );
        const acJaw = baseAcJaw * openGate;
        const acClose = valleyClose * 0.42;
        const acPress = valleyClose * 0.30;
        const acPucker = roundW * 0.46 * openGate;
        const acFunnel = (roundW * 0.28 + isSibilant * 0.18) * openGate;
        const acStretch = spreadW * 0.44 * (1 - valleyClose * 0.50);
        const acUpperUp = (0.04 + spreadW * 0.14 + isSibilant * 0.12 + energyAmp * 0.10) * openGate;
        const acLowerDown = energyAmp * 0.22 * (1 - isSibilant * 0.40) * openGate;
        const acRollLower = isSibilant > 0.55 && energyAmp < 0.36 ? 0.22 : 0;
        const acSmile = 0.05 + spreadW * 0.12;

        if (viseme) {
          const isClosure = viseme.close > 0.28;
          const ampGain = isClosure ? 1.0 : THREE.MathUtils.clamp(0.45 + fastEnv.current * 0.65, 0.35, 0.95);
          const vMix = isClosure ? 0.65 : 0.48;
          const aMix = 1.0 - vMix;
          spJaw = isClosure ? 0 : Math.min(0.38, viseme.jawOpen * ampGain) * vMix + acJaw * aMix;
          spClose = Math.min(0.55, viseme.close) * vMix + acClose * aMix;
          spPress = Math.min(0.42, viseme.press) * vMix + acPress * aMix;
          spPucker = isClosure ? 0 : Math.min(0.55, viseme.pucker * ampGain) * vMix + acPucker * aMix;
          spFunnel = isClosure ? 0 : Math.min(0.45, viseme.funnel * ampGain) * vMix + acFunnel * aMix;
          spStretch = isClosure ? 0 : Math.min(0.52, viseme.stretch * ampGain) * vMix + acStretch * aMix;
          spUpperUp = isClosure ? 0 : Math.min(0.32, viseme.upperUp * ampGain) * vMix + acUpperUp * aMix;
          spLowerDown = isClosure ? 0 : Math.min(0.34, viseme.lowerDown * ampGain) * vMix + acLowerDown * aMix;
          spRollLower = Math.min(0.32, viseme.rollLower) * vMix + acRollLower * aMix;
          spSmile = viseme.smile * vMix + acSmile * aMix;
        } else {
          spJaw = acJaw;
          spClose = acClose;
          spPress = acPress;
          spPucker = acPucker;
          spFunnel = acFunnel;
          spStretch = acStretch;
          spUpperUp = acUpperUp;
          spLowerDown = acLowerDown;
          spRollLower = acRollLower;
          spSmile = acSmile;
        }
      }

      const jawTarget = spJaw * speechBlend;
      const closeTarget = THREE.MathUtils.lerp(restClose, spClose, speechBlend);
      const pressTarget = THREE.MathUtils.lerp(restPress, spPress, speechBlend);
      const puckerTarget = spPucker * speechBlend;
      const funnelTarget = spFunnel * speechBlend;
      const stretchTarget = spStretch * speechBlend;
      const upperUpTarget = spUpperUp * speechBlend;
      const lowerDownTarget = spLowerDown * speechBlend;
      const rollLowerTarget = spRollLower * speechBlend;
      const smileTarget = THREE.MathUtils.lerp(restSmile, spSmile, speechBlend);

      setMorph("jawOpen", jawTarget, 22);
      setMorph("jawForward", 0, 20);
      setMorph("mouthClose", closeTarget, 24);
      setMorph("mouthPress_L", pressTarget, 22);
      setMorph("mouthPress_R", pressTarget, 22);
      setMorph("mouthPucker", puckerTarget, 20);
      setMorph("mouthFunnel", funnelTarget, 20);
      setMorph("mouthStretch_L", stretchTarget, 20);
      setMorph("mouthStretch_R", stretchTarget, 20);
      setMorph("mouthLowerDown_L", lowerDownTarget, 22);
      setMorph("mouthLowerDown_R", lowerDownTarget, 22);
      setMorph("mouthUpperUp_L", upperUpTarget, 22);
      setMorph("mouthUpperUp_R", upperUpTarget, 22);
      setMorph("mouthRollLower", rollLowerTarget, 20);
      setMorph("mouthRollUpper", 0, 20);
      setMorph("mouthShrugLower", 0, 20);
      setMorph("mouthShrugUpper", 0, 20);
      setMorph("mouthSmile_L", smileTarget, 12);
      setMorph("mouthSmile_R", smileTarget, 12);
      setMorph("mouthDimple_L", 0, 12);
      setMorph("mouthDimple_R", 0, 12);
      setMorph("cheekSquint_L", 0, 12);
      setMorph("cheekSquint_R", 0, 12);
      setMorph("noseSneer_L", 0, 12);
      setMorph("noseSneer_R", 0, 12);

      const jawIdx = dict["jawOpen"];
      if (jawIdx !== undefined) {
        sharedUniforms.current.uJawOpen.value = Math.max(0, inf[jawIdx]);
      }

      // Calm idle brow posture + micro gaze saccades (decoupled from voice volume so upper face never shakes)
      setMorph("browInnerUp", 0.04 + Math.sin(t * 0.9) * 0.02, 8);
      setMorph("browOuterUp_L", 0, 8);
      setMorph("browOuterUp_R", 0, 8);

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
