import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export interface Avatar3DProps {
  getLevel?: () => number;
  state?: AvatarState;
  url?: string;
  modelUrl?: string;
  isOwner?: boolean;
}

export default function Avatar3D({
  getLevel = () => 0,
  state = "idle",
  url,
  modelUrl = "/models/avatar.glb",
}: Avatar3DProps) {
  const targetUrl = url || modelUrl || "/models/avatar.glb";
  const host = useRef<HTMLDivElement>(null);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;
  const [modelType, setModelType] = useState<"vrm" | "gltf" | "cyber">("gltf");

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
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 25);
    camera.position.set(0, 0, 2.15);
    camera.lookAt(0, 0, 0);

    // Balanced studio lighting for 3D face
    scene.add(new THREE.AmbientLight(0xffffff, 1.35));

    const keyLight = new THREE.DirectionalLight(0xc4b5fd, 2.4);
    keyLight.position.set(1.5, 1.8, 2.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf472b6, 1.6);
    fillLight.position.set(-1.8, 1.0, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x9333ea, 2.8, 6);
    rimLight.position.set(0, 0.5, -1.5);
    scene.add(rimLight);

    // Procedural Cyber Hologram Core (Visible while loading or as fallback)
    const cyberGroup = new THREE.Group();
    scene.add(cyberGroup);

    const headGeo = new THREE.SphereGeometry(0.42, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    cyberGroup.add(headMesh);

    const coreGeo = new THREE.IcosahedronGeometry(0.32, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    cyberGroup.add(coreMesh);

    const cyberEyeGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const cyberEyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const cyberLeftEye = new THREE.Mesh(cyberEyeGeo, cyberEyeMat);
    cyberLeftEye.position.set(-0.14, 0.08, 0.38);
    const cyberRightEye = new THREE.Mesh(cyberEyeGeo, cyberEyeMat);
    cyberRightEye.position.set(0.14, 0.08, 0.38);
    cyberGroup.add(cyberLeftEye, cyberRightEye);

    const mouthGeo = new THREE.RingGeometry(0.04, 0.065, 24);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.16, 0.4);
    cyberGroup.add(mouthMesh);

    // Container group for loaded GLB/GLTF model (centered at 0,0,0)
    const gltfGroup = new THREE.Group();
    gltfGroup.visible = false;
    scene.add(gltfGroup);

    let vrm: VRM | null = null;
    let jawNode: THREE.Object3D | null = null;
    let initialJawRotX = 0;
    let initialJawPosY = 0;
    let leftEyeNode: THREE.Object3D | null = null;
    let rightEyeNode: THREE.Object3D | null = null;
    const eyeGlowMaterials: THREE.MeshStandardMaterial[] = [];
    const eyePointLights: THREE.PointLight[] = [];

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
            // 1. CENTER THE 3D AVATAR PROPERLY IN ITS CONTAINER
            const rootModel = gltf.scene;
            rootModel.updateMatrixWorld(true);

            const box = new THREE.Box3().setFromObject(rootModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Offset rootModel so its geometric center sits at (0, 0, 0) inside gltfGroup
            rootModel.position.set(-center.x, -center.y, -center.z);

            // Normalize scale so head fills the viewport with balanced padding around it
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const targetSize = 1.08;
            const normScale = targetSize / maxDim;
            gltfGroup.scale.set(normScale, normScale, normScale);
            gltfGroup.position.set(0, 0.02, 0);

            // 2. WIRE JAW FOR LIP-SYNC & EYES FOR GLOW + BLINKING
            rootModel.traverse((child: any) => {
              const name = child.name || "";
              const lowName = name.toLowerCase();

              // Jaw node detection (Jaw.R_19 in avatar.glb)
              if (name === "Jaw.R_19" || lowName.includes("jaw")) {
                jawNode = child;
                initialJawRotX = child.rotation.x;
                initialJawPosY = child.position.y;
              }

              // Eye parent nodes for blinking
              if (name === "Kito6_FaceMesh_Eye.L_20" || lowName.includes("eye.l")) {
                leftEyeNode = child;
              }
              if (name === "Kito6_FaceMesh_Eye.R_21" || lowName.includes("eye.r")) {
                rightEyeNode = child;
              }

              // Eye meshes for active glowing effect
              if (child.isMesh) {
                const matName = (child.material?.name || "").toLowerCase();
                const isEyeMesh =
                  lowName.includes("eye") ||
                  name === "Object_52" ||
                  name === "Object_53" ||
                  name === "Object_55" ||
                  name === "Object_56" ||
                  matName.includes("eye") ||
                  matName.includes("iris");

                if (isEyeMesh) {
                  const glowMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0xff1e56),
                    emissive: new THREE.Color(0xe11d48),
                    emissiveIntensity: 2.2,
                    roughness: 0.15,
                    metalness: 0.8,
                  });
                  child.material = glowMat;
                  eyeGlowMaterials.push(glowMat);
                }
              }
            });

            // Attach subtle glowing point lights directly to left & right eyes
            const attachEyeLight = (eyeObj: THREE.Object3D | null, fallbackX: number) => {
              const light = new THREE.PointLight(0xe11d48, 2.2, 0.45);
              if (eyeObj) {
                eyeObj.add(light);
                light.position.set(0, 0, 0.05);
              } else {
                light.position.set(fallbackX, 0.05, 0.45);
                gltfGroup.add(light);
              }
              eyePointLights.push(light);
            };

            attachEyeLight(leftEyeNode, -0.12);
            attachEyeLight(rightEyeNode, 0.12);

            gltfGroup.add(rootModel);
            gltfGroup.visible = true;
            cyberGroup.visible = false;

            // Frame camera dead-center on the head
            camera.position.set(0, 0, 2.05);
            camera.lookAt(0, 0, 0);
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
      const w = el.clientWidth || 320;
      const h = el.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Keep avatar nicely framed across narrow mobile and wide desktop panels
      if (!vrm) {
        const aspectFactor = camera.aspect < 0.85 ? 2.35 : 2.05;
        camera.position.z = aspectFactor;
      }
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    const clock = new THREE.Clock();
    let t = 0;
    let nextBlink = 2.2;
    let blinkT = -1;
    let mouth = 0;

    // 3. CONTINUOUS ANIMATION LOOP (Idle breathing, eye glow pulse, blinking & audio lip-sync)
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.1);
      t += dt;

      const audioLevel = levelRef.current();
      const curState = stateRef.current;

      // Smooth mouth/jaw opening driven by real-time audio volume
      const activeAudio = curState === "speaking" ? Math.max(audioLevel, 0.04) : audioLevel;
      const targetMouth = Math.min(1.0, activeAudio * 4.2);
      mouth += (targetMouth - mouth) * Math.min(1, dt * 22);

      // Blink timer calculation
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) blinkT = 0;
      let blinkScaleY = 1;
      if (blinkT >= 0) {
        blinkT += dt;
        const p = Math.min(blinkT / 0.16, 1);
        blinkScaleY = 1 - Math.sin(p * Math.PI) * 0.92;
        if (blinkT >= 0.16) {
          blinkT = -1;
          nextBlink = 2.4 + Math.random() * 3.2;
          blinkScaleY = 1;
        }
      }

      // A) Standard GLB 3D Face Animation (avatar.glb)
      if (gltfGroup.visible) {
        // State-dependent speeds and intensities
        const breathFreq = curState === "thinking" ? 2.8 : curState === "speaking" ? 2.2 : 1.5;
        const breathAmp = curState === "thinking" ? 0.022 : 0.016;

        // Subtle breathing vertical float & scale pulse
        const breathY = Math.sin(t * breathFreq) * breathAmp;
        const scalePulse = 1 + Math.sin(t * breathFreq) * 0.008;
        gltfGroup.position.y = 0.02 + breathY;
        gltfGroup.position.x = Math.sin(t * 0.65) * 0.008;

        const baseScale = gltfGroup.userData.baseScale || gltfGroup.scale.x;
        if (!gltfGroup.userData.baseScale) gltfGroup.userData.baseScale = baseScale;
        gltfGroup.scale.setScalar(baseScale * scalePulse);

        // Natural head micro-sway + conversational nodding when speaking
        const swayY = Math.sin(t * 0.75) * 0.055;
        const swayX = Math.cos(t * 0.95) * 0.022;
        const swayZ = Math.sin(t * 0.5) * 0.012;
        const speechNod = curState === "speaking" ? Math.sin(t * 6.5) * mouth * 0.045 : 0;
        const thinkTilt = curState === "thinking" ? -0.035 : 0;

        gltfGroup.rotation.y = swayY;
        gltfGroup.rotation.x = swayX + speechNod + thinkTilt;
        gltfGroup.rotation.z = swayZ;

        // Jaw Lip-Sync Animation
        if (jawNode) {
          jawNode.rotation.x = initialJawRotX + mouth * 0.24;
          jawNode.position.y = initialJawPosY - mouth * 0.014;
        }

        // Eye Blinking Animation
        if (leftEyeNode) leftEyeNode.scale.y = blinkScaleY * 0.057;
        if (rightEyeNode) rightEyeNode.scale.y = blinkScaleY * 0.057;

        // Eye Glow Color & Pulsing per State (Idle / Listening / Thinking / Speaking)
        let glowColor = new THREE.Color(0xe11d48); // signature crimson-rose AI glow
        let glowIntensity = 1.8 + Math.sin(t * 2.4) * 0.55;

        if (curState === "thinking") {
          const pulse = Math.sin(t * 6.5) * 0.5 + 0.5;
          glowColor = new THREE.Color().lerpColors(
            new THREE.Color(0xc084fc),
            new THREE.Color(0x38bdf8),
            pulse
          );
          glowIntensity = 2.4 + pulse * 1.6;
        } else if (curState === "speaking") {
          glowColor = new THREE.Color().lerpColors(
            new THREE.Color(0xe11d48),
            new THREE.Color(0xd946ef),
            Math.min(1, mouth * 1.4)
          );
          glowIntensity = 2.2 + mouth * 3.2;
        } else if (curState === "listening") {
          const pulse = Math.sin(t * 4.0) * 0.5 + 0.5;
          glowColor = new THREE.Color(0xf43f5e);
          glowIntensity = 2.0 + pulse * 1.1;
        }

        for (const mat of eyeGlowMaterials) {
          mat.emissive.copy(glowColor);
          mat.color.copy(glowColor);
          mat.emissiveIntensity = glowIntensity;
        }
        for (const light of eyePointLights) {
          light.color.copy(glowColor);
          light.intensity = glowIntensity * 0.9;
        }
      }

      // B) VRM Model Animation (if VRM loaded)
      if (vrm) {
        const em = vrm.expressionManager;
        if (em) {
          em.setValue("blink", 1 - blinkScaleY);
          em.setValue("aa", mouth * 0.9);
          em.setValue("oh", mouth > 0.5 ? (mouth - 0.5) * 0.6 : 0);
        }
        const head = vrm.humanoid?.getNormalizedBoneNode("head");
        if (head) {
          head.rotation.y = Math.sin(t * 0.6) * 0.06;
          head.rotation.x = Math.sin(t * 0.8) * 0.025;
        }
        vrm.update(dt);
      }

      // C) Cyber Hologram Fallback Animation
      if (cyberGroup.visible) {
        cyberGroup.position.y = Math.sin(t * 1.5) * 0.04;
        cyberGroup.rotation.y = Math.sin(t * 0.7) * 0.15;
        cyberLeftEye.scale.y = blinkScaleY;
        cyberRightEye.scale.y = blinkScaleY;
        const ringScale = 1 + mouth * 1.8;
        mouthMesh.scale.set(ringScale, ringScale, 1);
        coreMat.emissiveIntensity = 0.9 + mouth * 2.2;
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
      {/* Ambient backdrop aura */}
      <div
        className={`pointer-events-none absolute h-64 w-64 rounded-full blur-3xl transition-all duration-500 ${
          state === "speaking"
            ? "bg-rose-600/30 scale-110"
            : state === "thinking"
            ? "bg-cyan-500/25 scale-105 animate-pulse"
            : state === "listening"
            ? "bg-pink-600/25 scale-105"
            : "bg-violet-600/20 scale-100"
        }`}
      />
      <div
        ref={host}
        className="relative z-10 h-full w-full flex items-center justify-center"
        style={{
          filter:
            state === "speaking"
              ? "drop-shadow(0 0 18px rgba(225, 29, 72, 0.45))"
              : state === "thinking"
              ? "drop-shadow(0 0 16px rgba(56, 189, 248, 0.4))"
              : "drop-shadow(0 0 12px rgba(168, 85, 247, 0.3))",
        }}
      />
      {modelType === "cyber" && (
        <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-violet-950/70 border border-violet-500/30 text-[10px] font-mono text-violet-300 backdrop-blur-md">
          Cyber Core Rig Active
        </div>
      )}
    </div>
  );
}

export { Avatar3D };
