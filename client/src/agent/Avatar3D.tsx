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
  avatarType?: "vrm" | "gltf" | "cyber"; // optional explicit type
  isOwner?: boolean;
}

export default function Avatar3D({
  activeTab,
  globalContext,
  textResponse,
  getLevel = () => 0,
  state = "idle",
  url,
  modelUrl = "/models/avatar.glb",
  avatarType,
  isOwner,
  onMicClick,
}: Avatar3DProps) {
  const targetUrl = url || modelUrl || "/models/avatar.glb";
  const host = useRef<HTMLDivElement>(null);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;
  const [modelType, setModelType] = useState<"vrm" | "gltf" | "cyber">(avatarType || "gltf");
  const [animFeatures, setAnimFeatures] = useState({ blink: false, lipSync: false, eyeGlow: false });

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
    let lowerJawMesh: THREE.Object3D | null = null;
    let chinPlateMesh: THREE.Object3D | null = null;
    let jawInitY = 0;
    let jawInitZ = 0;
    let jawInitRotX = 0;
    let plateInitY = 0;
    let plateInitZ = 0;
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
            // 1. CENTER THE 3D CYBORG FACE PROPERLY IN ITS CONTAINER
            const rootModel = gltf.scene;
            rootModel.updateMatrixWorld(true);

            // Offset rootModel so the geometric center of the face (eyes & mouth) sits at (0, 0, 0)
            // (Ignoring bottom decorative cylinder bolts that extend down to y = -0.71)
            rootModel.position.set(0, -0.19, -0.08);

            const faceScale = 1.68;
            gltfGroup.scale.set(faceScale, faceScale, faceScale);
            gltfGroup.position.set(0, 0.02, 0);

            // Rich ruby-red glowing eye material (applied ONLY to eyeballs/pupils, never outer face rings)
            const rubyGlowMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xff1e56),
              emissive: new THREE.Color(0xff0025),
              emissiveIntensity: 3.8,
              roughness: 0.12,
              metalness: 0.85,
              toneMapped: false,
            });
            eyeGlowMaterials.push(rubyGlowMat);

            // 2. WIRE SYMMETRIC LOWER JAW FOR LIP-SYNC & EYES FOR GLOW + BLINKING
            rootModel.traverse((child: any) => {
              const name = child.name || "";
              const lowName = name.toLowerCase();

              // Symmetric lower jaw mesh (Object_5)
              if (name === "Object_5") {
                lowerJawMesh = child;
                jawInitY = child.position.y;
                jawInitZ = child.position.z;
                jawInitRotX = child.rotation.x;
                setAnimFeatures(prev => ({ ...prev, lipSync: true }));
              }

              // Central chin / mouth plate (Object_60)
              if (name === "Object_60") {
                chinPlateMesh = child;
                plateInitY = child.position.y;
                plateInitZ = child.position.z;
                setAnimFeatures(prev => ({ ...prev, lipSync: true }));
              }

              // Freeze right cheek bone (JawR_19 / Jaw.R_19) so side cheek never wobbles
              if (name.includes("JawR") || name.includes("Jaw.R")) {
                child.rotation.set(0, 0, 0);
              }

              // Eye parent nodes for blinking (Three.js GLTFLoader strips dots: Kito6_FaceMesh_EyeL_20)
              if (name.includes("EyeL") || name.includes("Eye.L") || lowName.includes("eyel") || lowName.includes("eye.l")) {
                leftEyeNode = child;
                setAnimFeatures(prev => ({ ...prev, blink: true }));
              }
              if (name.includes("EyeR") || name.includes("Eye.R") || lowName.includes("eyer") || lowName.includes("eye.r")) {
                rightEyeNode = child;
                setAnimFeatures(prev => ({ ...prev, blink: true }));
              }

              // Eye meshes for active ruby glowing effect (exclude Object_58 outer face circles!)
              if (child.isMesh) {
                const isEyeMesh =
                  name === "Object_52" ||
                  name === "Object_53" ||
                  name === "Object_55" ||
                  name === "Object_56" ||
                  lowName.includes("iris") ||
                  (lowName.includes("eye") && !lowName.includes("circle"));

                if (isEyeMesh && name !== "Object_58") {
                  child.material = rubyGlowMat;
                  setAnimFeatures(prev => ({ ...prev, eyeGlow: true }));
                }
              }
            });

            // Symmetric ruby point lights positioned right at the left and right eye sockets
            const leftLight = new THREE.PointLight(0xff0025, 1.8, 0.6);
            leftLight.position.set(0.065, 0.065, 0.18);
            gltfGroup.add(leftLight);
            eyePointLights.push(leftLight);

            const rightLight = new THREE.PointLight(0xff0025, 1.8, 0.6);
            rightLight.position.set(-0.065, 0.065, 0.18);
            gltfGroup.add(rightLight);
            eyePointLights.push(rightLight);

            gltfGroup.add(rootModel);
            gltfGroup.visible = true;
            cyberGroup.visible = false;

            // Frame camera dead-center on the head
            camera.position.set(0, 0, 2.15);
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

    let lastFrameTime = performance.now();
    let t = 0;
    let nextBlink = 1.8 + Math.random() * 2.5; // random first blink
    let blinkT = -1;
    let leftBlinkT = -1; // asymmetric blink support
    let rightBlinkT = -1;
    let mouth = 0;

    // 3. CONTINUOUS ANIMATION LOOP (Idle breathing, eye glow pulse, blinking & audio lip-sync)
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const nowFrame = performance.now();
      const dt = Math.min((nowFrame - lastFrameTime) / 1000, 0.1);
      lastFrameTime = nowFrame;
      t += dt;

      const audioLevel = levelRef.current();
      const curState = stateRef.current;

      // Smooth mouth/jaw opening driven by real-time audio volume
      const activeAudio = curState === "speaking" ? Math.max(audioLevel, 0.04) : audioLevel;
      const targetMouth = Math.min(1.0, activeAudio * 4.2);
      mouth += (targetMouth - mouth) * Math.min(1, dt * 22);

      // Blink timer calculation (random intervals, asymmetric left/right possible)
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0 && leftBlinkT < 0 && rightBlinkT < 0) {
        // 80% chance both eyes blink together, 20% chance single eye wink
        if (Math.random() < 0.8) {
          blinkT = 0;
        } else {
          leftBlinkT = Math.random() < 0.5 ? 0 : -1;
          rightBlinkT = leftBlinkT < 0 ? 0 : -1;
        }
      }
      const computeBlink = (bt: number): number => {
        if (bt < 0) return 1;
        bt += dt;
        const p = Math.min(bt / 0.16, 1);
        const s = 1 - Math.sin(p * Math.PI) * 0.92;
        if (bt >= 0.16) return -1;
        return s;
      };
      let leftScaleY = computeBlink(leftBlinkT >= 0 ? leftBlinkT : blinkT);
      let rightScaleY = computeBlink(rightBlinkT >= 0 ? rightBlinkT : blinkT);
      if (leftBlinkT >= 0) leftBlinkT = leftBlinkT < 0 ? -1 : leftBlinkT + (leftBlinkT >= 0 ? dt : 0);
      if (rightBlinkT >= 0) rightBlinkT = rightBlinkT < 0 ? -1 : rightBlinkT + (rightBlinkT >= 0 ? dt : 0);
      // reset completed blinks
      if (leftBlinkT !== -1 && leftScaleY === -1) {
        leftBlinkT = -1;
        nextBlink = 2.0 + Math.random() * 3.5;
        leftScaleY = 1;
      }
      if (rightBlinkT !== -1 && rightScaleY === -1) {
        rightBlinkT = -1;
        nextBlink = 2.0 + Math.random() * 3.5;
        rightScaleY = 1;
      }
      if (blinkT !== -1) {
        blinkT += dt;
        if (blinkT >= 0.16) {
          blinkT = -1;
          nextBlink = 2.0 + Math.random() * 3.5;
          leftScaleY = 1;
          rightScaleY = 1;
        }
      }

      // A) Standard GLB 3D Face Animation (avatar.glb)
      if (gltfGroup.visible) {
        // State-dependent speeds and intensities
        const breathFreq = curState === "thinking" ? 2.4 : curState === "speaking" ? 1.8 : 1.3;
        const breathAmp = curState === "thinking" ? 0.012 : 0.008;

        // Subtle breathing vertical float
        const breathY = Math.sin(t * breathFreq) * breathAmp;
        gltfGroup.position.y = 0.02 + breathY;
        gltfGroup.position.x = Math.sin(t * 0.5) * 0.005;

        // Keep head steady (NO comical neck bobbing when speaking!)
        const swayY = Math.sin(t * 0.45) * 0.032;
        const swayZ = Math.sin(t * 0.35) * 0.01;
        gltfGroup.rotation.y = swayY;
        gltfGroup.rotation.x = 0;
        gltfGroup.rotation.z = swayZ;

        // Symmetric Jaw & Chin Lip-Sync Animation (natural human mouth articulation)
        if (lowerJawMesh) {
          lowerJawMesh.position.y = jawInitY - mouth * 0.018;
          lowerJawMesh.position.z = jawInitZ - mouth * 0.006;
          lowerJawMesh.rotation.x = jawInitRotX + mouth * 0.085;
        }
        if (chinPlateMesh) {
          chinPlateMesh.position.y = plateInitY - mouth * 0.015;
          chinPlateMesh.position.z = plateInitZ - mouth * 0.005;
        }

        // Eye Blinking Animation (maintaining exact 0.057 base scale on eye parent nodes)
        const blinkAmount = Math.min(leftScaleY, rightScaleY);
        if (leftEyeNode) leftEyeNode.scale.y = blinkAmount * 0.057;
        if (rightEyeNode) rightEyeNode.scale.y = blinkAmount * 0.057;

        // Ruby Red Eye Glow Color & Pulsing per State
        let glowColor = new THREE.Color(0xff0025);
        let glowIntensity = 3.5 + Math.sin(t * 2.4) * 0.8;

        if (curState === "thinking") {
          const pulse = Math.sin(t * 6.0) * 0.5 + 0.5;
          glowColor = new THREE.Color().lerpColors(
            new THREE.Color(0xff0025),
            new THREE.Color(0xff2a6d),
            pulse
          );
          glowIntensity = 4.2 + pulse * 1.5;
        } else if (curState === "speaking") {
          glowColor = new THREE.Color(0xff0025);
          glowIntensity = 4.5 + mouth * 3.0;
        } else if (curState === "listening") {
          const pulse = Math.sin(t * 4.0) * 0.5 + 0.5;
          glowColor = new THREE.Color(0xff1e56);
          glowIntensity = 3.8 + pulse * 1.2;
        }

        for (const mat of eyeGlowMaterials) {
          mat.emissive.copy(glowColor);
          mat.color.copy(glowColor);
          mat.emissiveIntensity = glowIntensity;
        }
        for (const light of eyePointLights) {
          light.color.copy(glowColor);
          light.intensity = glowIntensity * 0.55;
        }
      }

      // B) VRM Model Animation (if VRM loaded)
      if (vrm) {
        const em = vrm.expressionManager;
        if (em) {
          const vrmBlink = 1 - Math.min(leftScaleY, rightScaleY);
          em.setValue("blink", vrmBlink);
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
        const cyberBlink = Math.min(leftScaleY, rightScaleY);
        cyberLeftEye.scale.y = cyberBlink;
        cyberRightEye.scale.y = cyberBlink;
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
