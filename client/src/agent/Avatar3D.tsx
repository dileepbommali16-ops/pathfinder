import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export interface Avatar3DProps {
  getLevel?: () => number;
  url?: string;
  modelUrl?: string;
  isOwner?: boolean;
}

// Needs /public/avatar.vrm. Blink + lip sync (audio volume => 'aa'/'oh') + idle head motion.
export default function Avatar3D({
  getLevel = () => 0,
  url,
  modelUrl = "/avatar.vrm",
}: Avatar3DProps) {
  const targetUrl = url || modelUrl || "/avatar.vrm";
  const host = useRef<HTMLDivElement>(null);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 20);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xc4b5fd, 1.6);
    key.position.set(1, 1.5, 2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xf472b6, 1.0);
    rim.position.set(-2, 1, -1);
    scene.add(rim);

    let vrm: VRM | null = null,
      raf = 0,
      dead = false;
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    loader.load(
      targetUrl,
      (gltf) => {
        if (dead) return;
        vrm = gltf.userData.vrm as VRM;
        VRMUtils.rotateVRM0(vrm);
        scene.add(vrm.scene);
        vrm.scene.updateMatrixWorld(true);
        const p = new THREE.Vector3();
        vrm.humanoid?.getNormalizedBoneNode("head")?.getWorldPosition(p);
        const headY = p.y || 1.35;
        camera.position.set(0, headY, 1.15);
        camera.lookAt(0, headY - 0.03, 0);
      },
      undefined,
      () => console.warn("avatar.vrm load avvaledu (public/avatar.vrm pettava?)")
    );

    const fit = () => {
      const w = el.clientWidth,
        h = el.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    const clock = new THREE.Clock();
    let t = 0,
      nextBlink = 2,
      blinkT = -1,
      mouth = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      t += dt;
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
          const target = Math.min(1, levelRef.current() * 3.2);
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

  return <div ref={host} className="h-full w-full" />;
}

export { Avatar3D };
