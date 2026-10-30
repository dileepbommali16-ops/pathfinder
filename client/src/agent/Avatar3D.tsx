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
}

export default function Avatar3D({
  getLevel = () => 0,
  state = "idle",
  url,
  modelUrl = "/models/avatar.glb",
  avatarType,
}: Avatar3DProps) {
  const targetUrl = url || modelUrl || "/models/avatar.glb";
  const host = useRef<HTMLDivElement>(null);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;
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
    let plateInitY = 0;
    let leftEyeNode: THREE.Object3D | null = null;
    let rightEyeNode: THREE.Object3D | null = null;
    let upperLipMesh: THREE.Mesh | null = null;
    let lowerLipMesh: THREE.Mesh | null = null;
    let mouthApertureMesh: THREE.Mesh | null = null;
    const eyeGlowMaterials: THREE.MeshStandardMaterial[] = [];
    const eyeRingMaterials: THREE.MeshStandardMaterial[] = [];
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
            const rootModel = gltf.scene;
            rootModel.updateMatrixWorld(true);

            // Center the 3D face so eyes & mouth sit dead-center
            rootModel.position.set(0, -0.19, -0.08);

            const faceScale = 1.72;
            gltfGroup.scale.set(faceScale, faceScale, faceScale);
            gltfGroup.position.set(0, 0.02, 0);

            // 1. DEEP DARK-BLUE CYBER ARMOR MATERIALS FOR FACE & HEAD
            const darkBlueFaceMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x0b2258),
              emissive: new THREE.Color(0x051130),
              emissiveIntensity: 0.55,
              metalness: 0.72,
              roughness: 0.26,
            });

            const cobaltTrimMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x163888),
              emissive: new THREE.Color(0x091b48),
              emissiveIntensity: 0.45,
              metalness: 0.84,
              roughness: 0.2,
            });

            // 2. INTENSE GLOWING DARK-RED EYES MATERIAL (meravaali bhaga full ga)
            const darkRedEyeMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xdc0000),
              emissive: new THREE.Color(0xff0000),
              emissiveIntensity: 5.8,
              roughness: 0.08,
              metalness: 0.9,
              toneMapped: false,
            });
            eyeGlowMaterials.push(darkRedEyeMat);

            const darkRedRingMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x880000),
              emissive: new THREE.Color(0xdc0000),
              emissiveIntensity: 3.4,
              roughness: 0.15,
              metalness: 0.88,
              toneMapped: false,
            });
            eyeRingMaterials.push(darkRedRingMat);

            rootModel.traverse((child: any) => {
              const name = child.name || "";
              const lowName = name.toLowerCase();

              // IMPORTANT: Keep Object_5 (the lower neck/collar) 100% locked so the neck NEVER bobs!
              // Only capture Object_60 (the small front mouth plate) for subtle mouth articulation.
              if (name === "Object_60") {
                chinPlateMesh = child;
                plateInitY = child.position.y;
              }

              if (name.includes("JawR") || name.includes("Jaw.R")) {
                child.rotation.set(0, 0, 0);
              }

              // Eye parent nodes for natural eye blinking
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
                const isEyeballOrIris =
                  name === "Object_52" ||
                  name === "Object_53" ||
                  name === "Object_55" ||
                  name === "Object_56" ||
                  lowName.includes("iris") ||
                  (lowName.includes("eye") && !lowName.includes("circle"));

                if (isEyeballOrIris && name !== "Object_58") {
                  child.material = darkRedEyeMat;
                } else if (name === "Object_58") {
                  // Outer eye socket rings glow deep crimson-red around the eyes
                  child.material = darkRedRingMat;
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
                  // Main face, cranium, cheeks, and neck -> Deep Dark Blue
                  child.material = darkBlueFaceMat;
                } else {
                  // Cybernetic bolts and structural trim -> Cobalt Dark Blue
                  child.material = cobaltTrimMat;
                }
              }
            });

            // 3. REALISTIC ARTICULATED MOUTH LIPS (Opens & closes naturally at the mouth while neck stays still!)
            const mouthGroup = new THREE.Group();
            // Exact mouth position in gltfGroup space
            mouthGroup.position.set(0, 0.011, 0.156);
            gltfGroup.add(mouthGroup);

            const lipMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x1e40af),
              emissive: new THREE.Color(0x1d4ed8),
              emissiveIntensity: 0.9,
              metalness: 0.85,
              roughness: 0.2,
            });

            const apertureMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(0xff0022),
              transparent: true,
              opacity: 0.85,
            });

            const lipGeo = new THREE.CapsuleGeometry(0.0028, 0.046, 8, 16);
            lipGeo.rotateZ(Math.PI / 2);

            upperLipMesh = new THREE.Mesh(lipGeo, lipMat);
            upperLipMesh.position.set(0, 0.002, 0);
            mouthGroup.add(upperLipMesh);

            lowerLipMesh = new THREE.Mesh(lipGeo, lipMat);
            lowerLipMesh.position.set(0, -0.002, 0);
            mouthGroup.add(lowerLipMesh);

            const apertureGeo = new THREE.PlaneGeometry(0.044, 0.014);
            mouthApertureMesh = new THREE.Mesh(apertureGeo, apertureMat);
            mouthApertureMesh.position.set(0, 0, -0.001);
            mouthApertureMesh.scale.set(1, 0.05, 1);
            mouthGroup.add(mouthApertureMesh);

            // 4. HIGH-INTENSITY DARK-RED EYE POINT LIGHTS (Vivid crimson eye shine on dark-blue face)
            const leftLight = new THREE.PointLight(0xff0000, 4.2, 0.85);
            leftLight.position.set(0.042, 0.092, 0.16);
            gltfGroup.add(leftLight);
            eyePointLights.push(leftLight);

            const rightLight = new THREE.PointLight(0xff0000, 4.2, 0.85);
            rightLight.position.set(-0.042, 0.092, 0.16);
            gltfGroup.add(rightLight);
            eyePointLights.push(rightLight);

            gltfGroup.add(rootModel);
            gltfGroup.visible = true;
            cyberGroup.visible = false;

            camera.position.set(0, 0, 2.02);
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
      const w = el.clientWidth || 340;
      const h = el.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      if (!vrm) {
        const aspectFactor = camera.aspect < 0.85 ? 2.25 : 1.96;
        camera.position.z = aspectFactor;
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

    // 5. CONTINUOUS ANIMATION LOOP (Steady head, zero neck bobbing, realistic lip-sync, bright red eye blink)
    const tick = () => {
      raf = requestAnimationFrame(tick);
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

      // Natural synchronous eye blink every 2–4 seconds
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) {
        blinkT = 0;
      }
      let eyeOpenRatio = 1;
      if (blinkT >= 0) {
        blinkT += dt;
        const p = Math.min(blinkT / 0.15, 1);
        eyeOpenRatio = Math.max(0.06, 1 - Math.sin(p * Math.PI) * 0.95);
        if (blinkT >= 0.15) {
          blinkT = -1;
          nextBlink = 2.0 + Math.random() * 2.8;
          eyeOpenRatio = 1;
        }
      }

      if (gltfGroup.visible) {
        // Keep head & neck steady and composed (NO neck bobbing!)
        gltfGroup.position.y = 0.02 + Math.sin(t * 1.1) * 0.003;
        gltfGroup.position.x = 0;
        gltfGroup.rotation.y = Math.sin(t * 0.4) * 0.022;
        gltfGroup.rotation.x = 0;
        gltfGroup.rotation.z = 0;

        // Subtle mouth plate + realistic upper/lower lip separation (neck Object_5 never moves!)
        if (chinPlateMesh) {
          chinPlateMesh.position.y = plateInitY - mouth * 0.0045;
        }
        if (upperLipMesh && lowerLipMesh && mouthApertureMesh) {
          const openOffset = mouth * 0.0085;
          upperLipMesh.position.y = 0.0018 + openOffset * 0.45;
          lowerLipMesh.position.y = -0.0018 - openOffset * 0.85;
          mouthApertureMesh.scale.y = Math.max(0.05, mouth * 1.35);
          (mouthApertureMesh.material as THREE.MeshBasicMaterial).opacity =
            mouth > 0.04 ? Math.min(0.95, 0.35 + mouth * 0.7) : 0.15;
        }

        // Eye Blinking Animation (maintaining exact 0.057 base scale on eye parent nodes)
        if (leftEyeNode) leftEyeNode.scale.y = eyeOpenRatio * 0.057;
        if (rightEyeNode) rightEyeNode.scale.y = eyeOpenRatio * 0.057;

        // Bright Glowing Dark-Red Eyes (meravaali bhaga full ga)
        const pulse = Math.sin(t * 3.2) * 0.5 + 0.5;
        const baseGlow =
          curState === "speaking"
            ? 6.2 + mouth * 3.5
            : curState === "listening"
            ? 5.8 + pulse * 2.2
            : curState === "thinking"
            ? 5.5 + Math.sin(t * 7.0) * 2.0
            : 5.2 + pulse * 1.4;

        for (const mat of eyeGlowMaterials) {
          mat.emissiveIntensity = baseGlow;
        }
        for (const rMat of eyeRingMaterials) {
          rMat.emissiveIntensity = baseGlow * 0.65;
        }
        for (const light of eyePointLights) {
          light.intensity = baseGlow * 0.85;
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
