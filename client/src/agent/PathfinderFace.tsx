import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import gsap from "gsap";

export interface PathfinderFaceProps {
  audioLevel?: number;
  getLevel?: () => number;
  state?: "idle" | "listening" | "thinking" | "speaking";
  className?: string;
}

export default function PathfinderFace({
  audioLevel = 0,
  getLevel,
  state = "idle",
  className = "",
}: PathfinderFaceProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioLevelRef = useRef<number>(audioLevel);
  const getLevelRef = useRef<(() => number) | undefined>(getLevel);
  const stateRef = useRef(state);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    getLevelRef.current = getLevel;
  }, [getLevel]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 2.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    // ROOT HEAD GROUP (for ooguthu motion)
    const head = new THREE.Group();
    scene.add(head);

    // FACE - Dark metallic exact like image (#0a0a12, metalness 0.85, roughness 0.35)
    const faceGeo = new THREE.SphereGeometry(0.85, 64, 64);
    faceGeo.scale(1, 1.25, 0.8);
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      metalness: 0.85,
      roughness: 0.35,
    });
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    head.add(faceMesh);

    // SUBTLE CYBERNETIC NOSE & CHEEK RIDGES (Dark metallic, zero red)
    const noseGeo = new THREE.BoxGeometry(0.12, 0.38, 0.22);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x08080f,
      metalness: 0.9,
      roughness: 0.3,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.05, 0.68);
    nose.rotation.x = -0.12;
    head.add(nose);

    // EYES - PERFECT ROUND SOLID RED - NO BLOBS
    const eyeGeo = new THREE.SphereGeometry(0.26, 64, 64);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 6,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat.clone());
    eyeL.position.set(-0.38, 0.18, 0.52);
    eyeR.position.set(0.38, 0.18, 0.52);
    head.add(eyeL, eyeR);

    // EYELIDS for correct blink (covers eyes without squashing eyeball)
    const lidGeo = new THREE.SphereGeometry(0.29, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      metalness: 0.85,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const lidL = new THREE.Mesh(lidGeo, lidMat);
    const lidR = new THREE.Mesh(lidGeo, lidMat.clone());
    lidL.position.set(-0.38, 0.28, 0.53);
    lidR.position.set(0.38, 0.28, 0.53);
    lidL.rotation.x = Math.PI;
    lidR.rotation.x = Math.PI;
    head.add(lidL, lidR);

    // MOUTH (Proper open mouth, dark metallic lips, synced to audio volume)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.42, 0.56);
    head.add(mouthGroup);

    const lipGeo = new THREE.BoxGeometry(0.34, 0.06, 0.14);
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x08080f,
      metalness: 0.9,
      roughness: 0.3,
    });
    const upperLip = new THREE.Mesh(lipGeo, lipMat);
    upperLip.position.set(0, 0.03, 0);
    mouthGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(lipGeo, lipMat);
    lowerLip.position.set(0, -0.03, 0);
    mouthGroup.add(lowerLip);

    const mouthCavity = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    mouthCavity.position.set(0, 0, -0.02);
    mouthGroup.add(mouthCavity);

    // LIGHTS
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));
    const purpleLight = new THREE.PointLight(0x7c3aed, 1.2, 3);
    purpleLight.position.set(-1, 1, 1);
    scene.add(purpleLight);

    const softFill = new THREE.DirectionalLight(0x38bdf8, 0.25);
    softFill.position.set(1, 0.5, 1);
    scene.add(softFill);

    // BLOOM for glow
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.2, // bloom strength
      0.4, // bloom radius
      0.1  // bloom threshold
    );
    composer.addPass(bloomPass);

    // ANIMATIONS - ooguthu, blink, lip sync
    let isBlinking = false;
    const blink = () => {
      if (isBlinking) return;
      isBlinking = true;
      gsap.to([lidL.rotation, lidR.rotation], {
        x: 0,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          lidL.rotation.x = Math.PI;
          lidR.rotation.x = Math.PI;
          isBlinking = false;
        },
      });
    };
    const blinkInterval = setInterval(blink, 3500);

    // Resize handling
    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth || window.innerWidth;
      height = mount.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      bloomPass.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    let raf = 0;
    let smoothMouth = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      // Ooguthu motion (head subtle y-rotation & x-rotation)
      head.rotation.y = Math.sin(t * 0.3) * 0.15;
      head.rotation.x = Math.sin(t * 0.2) * 0.05;
      head.position.y = Math.sin(t * 1.5) * 0.015;

      // Eye pulsing
      const eyeIntensity = 5 + Math.sin(t * 2) * 1;
      if (eyeL) eyeL.material.emissiveIntensity = eyeIntensity;
      if (eyeR) (eyeR.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeIntensity;

      // Audio level sync
      let curAudio = audioLevelRef.current;
      if (getLevelRef.current) {
        try {
          curAudio = Math.max(curAudio, getLevelRef.current());
        } catch {}
      }
      if (stateRef.current === "speaking") {
        curAudio = Math.max(curAudio, 0.08);
      }

      const targetOpen = Math.min(1.0, curAudio * 3.0);
      smoothMouth += (targetOpen - smoothMouth) * 0.25;

      // Natural lip sync: lower lip drops down
      lowerLip.position.y = -0.03 - smoothMouth * 0.12;

      composer.render();
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(blinkInterval);
      window.removeEventListener("resize", handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{ background: "#000000" }}
    />
  );
}
export { PathfinderFace };
