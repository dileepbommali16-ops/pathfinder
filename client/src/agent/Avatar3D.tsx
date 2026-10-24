import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export interface Avatar3DProps {
  getLevel?: () => number;
  url?: string;
  modelUrl?: string;
  isOwner?: boolean;
}

// 3D Cybernetic Face with VRM loading + procedural fallback hologram, eye blink & audio lip sync
export default function Avatar3D({
  getLevel = () => 0,
  url,
  modelUrl = "/avatar.vrm",
}: Avatar3DProps) {
  const targetUrl = url || modelUrl || "/avatar.vrm";
  const host = useRef<HTMLDivElement>(null);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;
  const [modelType, setModelType] = useState<"vrm" | "gltf" | "cyber">("cyber");

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 25);
    camera.position.set(0, 0.1, 2.2);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xa78bfa, 2.2);
    key.position.set(1.5, 2, 2.5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xf472b6, 1.8);
    rim.position.set(-2, 1.5, -1.5);
    scene.add(rim);

    const bottomGlow = new THREE.PointLight(0x7c3aed, 2.5, 6);
    bottomGlow.position.set(0, -1, 1);
    scene.add(bottomGlow);

    // Procedural Cyber Hologram Core (Visible always or until VRM loads)
    const cyberGroup = new THREE.Group();
    scene.add(cyberGroup);

    // 1. Holographic Head Sphere
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

    // 2. Inner Glowing Core
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

    // 3. Cybernetic Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 0.08, 0.38);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 0.08, 0.38);
    cyberGroup.add(leftEye, rightEye);

    // 4. Audio-Reactive Mouth Ring
    const mouthGeo = new THREE.RingGeometry(0.04, 0.065, 24);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.16, 0.40);
    cyberGroup.add(mouthMesh);

    // 5. Floating Orbital Hologram Rings
    const ringGeo1 = new THREE.TorusGeometry(0.65, 0.012, 16, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.7 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    cyberGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(0.72, 0.008, 16, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    cyberGroup.add(ring2);

    let vrm: VRM | null = null,
      raf = 0,
      dead = false;

    // Load VRM or Fallback GLB
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));

    const tryLoadVRM = (modelPath: string) => {
      loader.load(
        modelPath,
        (gltf) => {
          if (dead) return;
          if (gltf.userData.vrm) {
            vrm = gltf.userData.vrm as VRM;
            VRMUtils.rotateVRM0(vrm);
            scene.add(vrm.scene);
            vrm.scene.updateMatrixWorld(true);

            // Position camera on head bone
            const p = new THREE.Vector3();
            vrm.humanoid?.getNormalizedBoneNode("head")?.getWorldPosition(p);
            const headY = p.y || 1.35;
            camera.position.set(0, headY, 1.15);
            camera.lookAt(0, headY - 0.03, 0);

            // Hide cyber fallback once real VRM is in scene
            cyberGroup.visible = false;
            setModelType("vrm");
          } else if (gltf.scene) {
            // Standard GLB model fallback
            scene.add(gltf.scene);
            gltf.scene.position.set(0, -0.5, 0);
            gltf.scene.scale.set(1.2, 1.2, 1.2);
            cyberGroup.visible = false;
            setModelType("gltf");
          }
        },
        undefined,
        () => {
          // Fallback to /models/avatar.glb if /avatar.vrm is missing
          if (modelPath !== "/models/avatar.glb") {
            tryLoadVRM("/models/avatar.glb");
          } else {
            // Stay with Procedural Cyber Core
            cyberGroup.visible = true;
            setModelType("cyber");
          }
        }
      );
    };

    tryLoadVRM(targetUrl);

    const fit = () => {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    const clock = new THREE.Clock();
    let t = 0,
      nextBlink = 2.5,
      blinkT = -1,
      mouth = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      t += dt;

      const audioLevel = levelRef.current();

      // If VRM model is active
      if (vrm) {
        const em = vrm.expressionManager;
        if (em) {
          nextBlink -= dt;
          if (nextBlink <= 0 && blinkT < 0) blinkT = 0;
          if (blinkT >= 0) {
            blinkT += dt;
            em.setValue("blink", Math.sin(Math.min(blinkT / 0.18, 1) * Math.PI));
            if (blinkT >= 0.18) {
              blinkT = -1;
              nextBlink = 2.5 + Math.random() * 3;
              em.setValue("blink", 0);
            }
          }
          const target = Math.min(1, audioLevel * 3.2);
          mouth += (target - mouth) * Math.min(1, dt * 18);
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

      // If Cyber Hologram is active
      if (cyberGroup.visible) {
        // Idle floating motion
        cyberGroup.position.y = Math.sin(t * 1.5) * 0.04;
        cyberGroup.rotation.y = Math.sin(t * 0.7) * 0.15;
        ring1.rotation.z += dt * 0.4;
        ring2.rotation.z -= dt * 0.3;

        // Blinking eyes
        nextBlink -= dt;
        if (nextBlink <= 0 && blinkT < 0) blinkT = 0;
        if (blinkT >= 0) {
          blinkT += dt;
          const blinkScale = 1 - Math.sin(Math.min(blinkT / 0.18, 1) * Math.PI) * 0.85;
          leftEye.scale.y = blinkScale;
          rightEye.scale.y = blinkScale;
          if (blinkT >= 0.18) {
            blinkT = -1;
            nextBlink = 2.5 + Math.random() * 3.5;
            leftEye.scale.y = 1;
            rightEye.scale.y = 1;
          }
        }

        // Audio-driven mouth ring expansion
        const targetMouth = Math.min(2.5, 1 + audioLevel * 6);
        mouth += (targetMouth - mouth) * Math.min(1, dt * 20);
        mouthMesh.scale.set(mouth, mouth, 1);
        mouthMat.color.setHex(audioLevel > 0.05 ? 0xec4899 : 0xf43f5e);
        coreMat.emissiveIntensity = 0.8 + audioLevel * 2;
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
    <div className="relative h-full w-full min-h-[300px]">
      <div ref={host} className="h-full w-full" />
      {modelType === "cyber" && (
        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-violet-950/70 border border-violet-500/30 text-[10px] font-mono text-violet-300 backdrop-blur-md">
          Cyber Core Rig Active
        </div>
      )}
    </div>
  );
}

export { Avatar3D };
