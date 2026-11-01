import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export interface Avatar3DProps {
  activeTab?: string;
  globalContext?: string;
  textResponse?: string;
  onMicClick?: (micOn: boolean) => void;
  getLevel?: () => number;
  state?: AvatarState;
  url?: string;
  modelUrl?: string;
  avatarType?: "vrm" | "gltf" | "cyber";
  isOwner?: boolean;
  paused?: boolean;
}

export default function Avatar3D({
  getLevel = () => 0,
  state = "idle",
  url,
  modelUrl = "/models/avatar.glb",
  avatarType,
  paused = false,
}: Avatar3DProps) {
  const targetUrl = url || modelUrl || "/models/avatar.glb";
  const host = useRef<HTMLDivElement>(null);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;
  const pausedRef = useRef<boolean>(paused);
  pausedRef.current = paused;
  const [modelType, setModelType] = useState<"vrm" | "gltf" | "cyber">(avatarType || "gltf");

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 25);
    camera.position.set(0, 0, 2.05);
    camera.lookAt(0, 0, 0);

    // Deep Dark-Blue Cybernetic Studio Lighting (keeps face rich dark blue, never washed-out white)
    scene.add(new THREE.AmbientLight(0x1e3a8a, 1.4));

    const keyLight = new THREE.DirectionalLight(0x3b82f6, 2.5);
    keyLight.position.set(1.4, 1.6, 2.4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x1d4ed8, 1.8);
    fillLight.position.set(-1.6, 0.8, 1.6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x2563eb, 3.2, 6);
    rimLight.position.set(0, 0.6, -1.5);
    scene.add(rimLight);

    // Procedural Dark-Blue Cyber Hologram Core (Visible while loading or as fallback)
    const cyberGroup = new THREE.Group();
    scene.add(cyberGroup);

    const headGeo = new THREE.SphereGeometry(0.42, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x0a1e4a,
      emissive: 0x061230,
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    cyberGroup.add(headMesh);

    const coreGeo = new THREE.IcosahedronGeometry(0.32, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0f2b66,
      emissive: 0x0a1e4a,
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.82,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    cyberGroup.add(coreMesh);

    const cyberEyeGeo = new THREE.SphereGeometry(0.048, 16, 16);
    const cyberEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cyberLeftEye = new THREE.Mesh(cyberEyeGeo, cyberEyeMat);
    cyberLeftEye.position.set(-0.14, 0.08, 0.38);
    const cyberRightEye = new THREE.Mesh(cyberEyeGeo, cyberEyeMat);
    cyberRightEye.position.set(0.14, 0.08, 0.38);
    cyberGroup.add(cyberLeftEye, cyberRightEye);

    const mouthGeo = new THREE.RingGeometry(0.04, 0.065, 24);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xdc0000, side: THREE.DoubleSide });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.16, 0.4);
    cyberGroup.add(mouthMesh);

    // Container group for loaded GLB/GLTF model (centered at 0,0,0)
    const gltfGroup = new THREE.Group();
    gltfGroup.visible = false;
    scene.add(gltfGroup);

    let vrm: VRM | null = null;
    let chinPlateMesh: THREE.Object3D | null = null;
    let jawNode: THREE.Object3D | null = null;
    let plateInitY = 0;
    let leftEyeNode: THREE.Object3D | null = null;
    let rightEyeNode: THREE.Object3D | null = null;
    let eyeMat: THREE.MeshStandardMaterial | null = null;
    let pupilMat: THREE.MeshBasicMaterial | null = null;

    let raf = 0;
    let dead = false;

    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));

    const tryLoadModel = (modelPath: string) => {
      loader.load(
        modelPath,
        (gltf) => {
          if (dead) return;
          if (gltf.userData.vrm) {
            vrm = gltf.userData.vrm as VRM;
            VRMUtils.rotateVRM0(vrm);
            scene.add(vrm.scene);
            vrm.scene.updateMatrixWorld(true);

            const p = new THREE.Vector3();
            vrm.humanoid?.getNormalizedBoneNode("head")?.getWorldPosition(p);
            const headY = p.y || 1.35;
            camera.position.set(0, headY, 1.15);
            camera.lookAt(0, headY, 0);

            cyberGroup.visible = false;
            setModelType("vrm");
          } else if (gltf.scene) {
            const rootModel = gltf.scene;
            rootModel.updateMatrixWorld(true);

            // Center the 3D face so eyes & mouth sit dead-center
            rootModel.position.set(0, -0.19, -0.08);

            const faceScale = 1.72;
            gltfGroup.scale.set(faceScale, faceScale, faceScale);
            gltfGroup.position.set(0, 0.02, 0);

            // 1. UNIFORM DARK METALLIC / PURPLE TINT (ZERO RED ON FACE, NOSE, OR CHEEKS)
            const faceMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x1a1a2e), // Dark metallic with subtle purple tint
              metalness: 0.7,
              roughness: 0.4,
              emissive: new THREE.Color(0x000000), // NO RED HERE
            });

            const trimMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x121324),
              metalness: 0.8,
              roughness: 0.3,
              emissive: new THREE.Color(0x000000), // NO RED HERE
            });

            // 2. EYES ONLY RED GLOW (Lava red, full red inside)
            eyeMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xff0000),
              emissive: new THREE.Color(0xff0a0a),
              emissiveIntensity: 2.8,
              roughness: 0.2,
            });

            rootModel.traverse((child: any) => {
              const name = child.name || "";
              const lowName = name.toLowerCase();

              // Capture chin plate and jaw for realistic mouth opening
              if (name === "Object_60") {
                chinPlateMesh = child;
                plateInitY = child.position.y;
              }

              if (name.includes("JawR") || name.includes("Jaw.R") || lowName.includes("jaw")) {
                jawNode = child;
              }

              // Eye parent nodes for natural eye blinking & inner pupil attachment
              if (
                name.includes("EyeL") ||
                name.includes("Eye.L") ||
                lowName.includes("eyel") ||
                lowName.includes("eye.l")
              ) {
                leftEyeNode = child;
              }
              if (
                name.includes("EyeR") ||
                name.includes("Eye.R") ||
                lowName.includes("eyer") ||
                lowName.includes("eye.r")
              ) {
                rightEyeNode = child;
              }

              if (child.isMesh) {
                const isEye =
                  name === "Object_52" ||
                  name === "Object_53" ||
                  name === "Object_55" ||
                  name === "Object_56" ||
                  name === "Object_58" ||
                  lowName.includes("eye") ||
                  lowName.includes("iris");

                if (isEye) {
                  child.material = eyeMat;
                } else if (
                  name === "Object_4" ||
                  name === "Object_5" ||
                  name === "Object_6" ||
                  name === "Object_7" ||
                  name === "Object_9" ||
                  name === "Object_10" ||
                  name === "Object_11" ||
                  name === "Object_25" ||
                  name === "Object_26" ||
                  name === "Object_60"
                ) {
                  // Face, nose, cheeks, cranium, neck -> Uniform Dark Metallic (ZERO RED)
                  child.material = faceMat;
                } else {
                  // Structural trim and bolts -> Dark Trim
                  child.material = trimMat;
                }
              }
            });

            // 3. ADD INNER EYE GLOW (PUPIL) - FULL SOLID RED INSIDE
            pupilMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(0xff0000),
            });
            const pupilGeo = new THREE.SphereGeometry(0.35, 24, 24);

            if (leftEyeNode) {
              const leftGlow = new THREE.Mesh(pupilGeo, pupilMat);
              leftGlow.position.set(0, 0, 0.05);
              leftEyeNode.add(leftGlow);
            }
            if (rightEyeNode) {
              const rightGlow = new THREE.Mesh(pupilGeo, pupilMat);
              rightGlow.position.set(0, 0, 0.05);
              rightEyeNode.add(rightGlow);
            }

            gltfGroup.add(rootModel);
            gltfGroup.visible = true;
            cyberGroup.visible = false;

            camera.position.set(0, 0.04, 1.58);
            camera.lookAt(0, 0.04, 0);
            setModelType("gltf");
          }
        },
        undefined,
        () => {
          if (modelPath !== "/models/avatar.glb") {
            tryLoadModel("/models/avatar.glb");
          } else {
            cyberGroup.visible = true;
            setModelType("cyber");
          }
        }
      );
    };

    tryLoadModel(targetUrl);

    const fit = () => {
      const w = el.clientWidth || 340;
      const h = el.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      if (!vrm) {
        // Position camera closer so 3D Face is large, prominent, and cinematic
        const aspectFactor = camera.aspect < 0.85 ? 1.72 : 1.52;
        camera.position.z = aspectFactor;
        camera.position.y = 0.04;
      }
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    let lastFrameTime = performance.now();
    let t = 0;
    let nextBlink = 1.6 + Math.random() * 2.2;
    let blinkT = -1;
    let mouth = 0;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 5. CONTINUOUS ANIMATION LOOP (Steady head, zero neck bobbing, realistic lip-sync, bright red eye blink)
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || pausedRef.current) return;
      const nowFrame = performance.now();
      const dt = Math.min((nowFrame - lastFrameTime) / 1000, 0.1);
      lastFrameTime = nowFrame;
      t += dt;

      const audioLevel = levelRef.current();
      const curState = stateRef.current;

      // Smooth syllable mouth articulation driven by real-time ElevenLabs audio volume
      const activeAudio = curState === "speaking" ? Math.max(audioLevel, 0.05) : audioLevel;
      const targetMouth = Math.min(1.0, activeAudio * 4.0);
      mouth += (targetMouth - mouth) * Math.min(1, dt * 24);

      // Eye blink: open normally, blinks every 3-5 sec
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) {
        blinkT = 0;
      }
      let eyeOpenRatio = 1;
      if (blinkT >= 0) {
        blinkT += dt;
        const p = Math.min(blinkT / 0.16, 1);
        eyeOpenRatio = Math.max(0.05, 1 - Math.sin(p * Math.PI) * 0.95);
        if (blinkT >= 0.16) {
          blinkT = -1;
          nextBlink = 3.0 + Math.random() * 2.0; // Blink every 3-5 sec
          eyeOpenRatio = 1;
        }
      }

      if (gltfGroup.visible) {
        // Natural idle breathing animation (gentle chest/face rise, expansion & subtle micro-sway)
        if (!prefersReducedMotion) {
          const breath = Math.sin(t * 1.6);
          gltfGroup.position.y = 0.02 + breath * 0.007; // gentle breathing rise & fall
          gltfGroup.position.z = breath * 0.003; // chest expansion depth
          gltfGroup.rotation.x = breath * 0.005; // subtle natural breathing tilt
          gltfGroup.rotation.y = Math.sin(t * 0.45) * 0.02; // slow living presence
        } else {
          gltfGroup.position.y = 0.02;
          gltfGroup.position.z = 0;
          gltfGroup.rotation.x = 0;
          gltfGroup.rotation.y = 0;
        }
        gltfGroup.position.x = 0;
        gltfGroup.rotation.z = 0;

        // Proper open mouth: lower jaw & chin plate drop naturally to audio volume (zero blue box)
        if (jawNode) {
          jawNode.rotation.x = mouth * 0.16; // drops lower jaw to open mouth
          jawNode.position.y = -mouth * 0.008;
        }
        if (chinPlateMesh) {
          chinPlateMesh.position.y = plateInitY - mouth * 0.01;
        }

        // Eye Blinking Animation: Open always, blinks only
        if (leftEyeNode) leftEyeNode.scale.y = eyeOpenRatio * 0.0577;
        if (rightEyeNode) rightEyeNode.scale.y = eyeOpenRatio * 0.0577;

        // Pulsing fire effect - ONLY FOR EYES (Lava red pupil & emissive intensity)
        const timeMs = performance.now();
        if (pupilMat) {
          pupilMat.color.setHSL(0, 1, 0.5 + Math.sin(timeMs * 0.003) * 0.1);
        }
        if (eyeMat) {
          eyeMat.emissiveIntensity = 2.5 + Math.sin(timeMs * 0.005) * 0.7;
        }
      }

      if (vrm) {
        const em = vrm.expressionManager;
        if (em) {
          em.setValue("blink", 1 - eyeOpenRatio);
          em.setValue("aa", mouth * 0.9);
        }
        vrm.update(dt);
      }

      if (cyberGroup.visible) {
        cyberGroup.rotation.y = Math.sin(t * 0.5) * 0.08;
        cyberLeftEye.scale.y = eyeOpenRatio;
        cyberRightEye.scale.y = eyeOpenRatio;
        const ringScale = 1 + mouth * 1.4;
        mouthMesh.scale.set(ringScale, ringScale, 1);
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [targetUrl]);

  return (
    <div className="relative flex h-full w-full min-h-[360px] items-center justify-center p-4">
      {/* Deep Dark-Blue & Crimson Eye Glow Backdrop Aura */}
      <div
        className={`pointer-events-none absolute h-72 w-72 rounded-full blur-3xl transition-all duration-500 ${
          state === "speaking"
            ? "bg-red-600/35 scale-110"
            : state === "listening"
            ? "bg-red-500/30 scale-105"
            : "bg-blue-700/30 scale-100"
        }`}
      />
      <div
        ref={host}
        className="relative z-10 h-full w-full flex items-center justify-center"
        style={{
          filter:
            state === "speaking"
              ? "drop-shadow(0 0 24px rgba(220, 0, 0, 0.55))"
              : "drop-shadow(0 0 18px rgba(29, 78, 216, 0.45))",
        }}
      />
      {modelType === "cyber" && (
        <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-[10px] font-mono text-blue-300 backdrop-blur-md">
          Cyber Core Rig Active
        </div>
      )}
    </div>
  );
}

export { Avatar3D };
