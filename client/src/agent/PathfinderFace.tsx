import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";

export interface PathfinderFaceProps {
  audioLevel?: number;
  getLevel?: () => number;
  state?: "idle" | "listening" | "thinking" | "speaking" | string;
  isListening?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function PathfinderFace({
  audioLevel = 0,
  getLevel,
  state = "idle",
  isListening = false,
  className = "",
  style = {},
}: PathfinderFaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [is3DReady, setIs3DReady] = useState(false);

  // Mouse tracking targets
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const currentMouseRef = useRef({ x: 0, y: 0 });

  // Animation and state refs
  const animFrameIdRef = useRef<number | null>(null);
  const isBlinkingRef = useRef(false);
  const stateRef = useRef(state);
  const isListeningRef = useRef(isListening);
  const getLevelRef = useRef(getLevel);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    stateRef.current = state;
    isListeningRef.current = isListening;
    getLevelRef.current = getLevel;
    audioLevelRef.current = audioLevel;
  }, [state, isListening, getLevel, audioLevel]);

  // 1. Mouse movement tracking for 3D parallax head rotation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      targetMouseRef.current = { x, y };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 2. Realistic eye blink scheduler: blinks every 3-5s for 150ms
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let restoreTimer: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const delay = 3200 + Math.random() * 2200;
      blinkTimer = setTimeout(() => {
        isBlinkingRef.current = true;
        restoreTimer = setTimeout(() => {
          isBlinkingRef.current = false;
          scheduleBlink();
        }, 150);
      }, delay);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(restoreTimer);
    };
  }, []);

  // 3. High-Fidelity 3D Scene: Seamless Vignette Mesh, Organic Breathing, Mouse Parallax
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
    } catch (e) {
      console.warn("WebGL notice, fallback active:", e);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      50
    );
    camera.position.set(0, 0, 3.2);

    // Pivot group for 3D head rotation and organic breathing
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    // Studio Lighting for metallic cybernetic surface
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.5, 3.5, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    fillLight.position.set(-2.5, -0.5, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.0);
    rimLight.position.set(0, 4.0, -2.0);
    scene.add(rimLight);

    // Point lights for crimson eye radiance casting real light onto the face
    const leftEyeLight = new THREE.PointLight(0xff0000, 3.8, 2.0);
    leftEyeLight.position.set(-0.460, 0.432, 0.15);
    pivotGroup.add(leftEyeLight);

    const rightEyeLight = new THREE.PointLight(0xff0000, 3.8, 2.0);
    rightEyeLight.position.set(0.462, 0.432, 0.15);
    pivotGroup.add(rightEyeLight);

    // 3D Eyelids for realistic blink (ONLY visible during blink)
    const eyelidGeo = new THREE.SphereGeometry(
      0.13,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.5
    );
    const eyelidMat = new THREE.MeshStandardMaterial({
      color: 0x05050a,
      metalness: 0.95,
      roughness: 0.25,
      side: THREE.DoubleSide,
    });

    const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    leftEyelid.position.set(-0.460, 0.432, 0.08);
    leftEyelid.rotation.x = Math.PI;
    leftEyelid.visible = false;
    pivotGroup.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat.clone());
    rightEyelid.position.set(0.462, 0.432, 0.08);
    rightEyelid.rotation.x = Math.PI;
    rightEyelid.visible = false;
    pivotGroup.add(rightEyelid);

    // Vocalizer mouth light for speech lip-sync
    const mouthLight = new THREE.PointLight(0xff2222, 0, 1.4);
    mouthLight.position.set(0.0, -0.512, 0.12);
    pivotGroup.add(mouthLight);

    // 100% Seamless Circular Alpha Map to ensure zero box borders anywhere
    const alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = 512;
    alphaCanvas.height = 512;
    const actx = alphaCanvas.getContext("2d")!;
    const grad = actx.createRadialGradient(256, 256, 120, 256, 256, 250);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.65, "rgba(255,255,255,1)");
    grad.addColorStop(0.92, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    actx.fillStyle = grad;
    actx.fillRect(0, 0, 512, 512);
    const alphaTex = new THREE.CanvasTexture(alphaCanvas);

    // 3D Metallic Cybernetic Face Mesh (Textured with Boss's exact reference asset)
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      "/face.png",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        // Curved 3D surface geometry that gives realistic volumetric head curvature
        const geo = new THREE.PlaneGeometry(2.4, 2.4, 48, 48);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setZ(i, -Math.pow(x, 2) * 0.20 - Math.pow(y, 2) * 0.07);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          alphaMap: alphaTex,
          transparent: true,
          roughness: 0.35,
          metalness: 0.85,
        });

        const faceMesh = new THREE.Mesh(geo, mat);
        pivotGroup.add(faceMesh);

        setIs3DReady(true);
      },
      undefined,
      (err) => {
        console.warn("Face texture load notice:", err);
      }
    );

    // Responsive Canvas Resizer
    const handleResize = () => {
      if (!canvas || !renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    handleResize();

    window.addEventListener("resize", handleResize);

    // 60FPS Interactive Render Loop
    let clock = 0;
    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);
      clock += 0.024;

      // 1. Organic living breathing ("ooguthu")
      const breathe = Math.sin(clock * 1.5) * 0.032;
      pivotGroup.position.y = breathe;
      const breatheScale = 1 + Math.sin(clock * 1.5) * 0.015;
      pivotGroup.scale.set(breatheScale, breatheScale, breatheScale);

      // 2. Smooth Mouse Parallax Head Tracking (Real 3D perspective rotation)
      currentMouseRef.current.x +=
        (targetMouseRef.current.x - currentMouseRef.current.x) * 0.06;
      currentMouseRef.current.y +=
        (targetMouseRef.current.y - currentMouseRef.current.y) * 0.06;

      pivotGroup.rotation.y = currentMouseRef.current.x * 0.30; // Horizontal turn
      pivotGroup.rotation.x = -currentMouseRef.current.y * 0.18; // Vertical tilt
      pivotGroup.rotation.z = -currentMouseRef.current.x * 0.04; // Natural head roll
      pivotGroup.position.x = currentMouseRef.current.x * 0.08;

      // 3. Audio & Voice Reactivity (Lip Sync)
      let lvl = 0;
      if (getLevelRef.current) {
        try {
          const l = getLevelRef.current();
          if (typeof l === "number" && !isNaN(l)) lvl = l;
        } catch {}
      } else if (audioLevelRef.current !== undefined) {
        lvl = audioLevelRef.current;
      }

      const isSpeaking = stateRef.current === "speaking" || lvl > 0.04;
      const isUserSpeaking =
        isListeningRef.current || stateRef.current === "listening";

      // Pulsing Eye Radiance
      const baseIntensity = isBlinkingRef.current
        ? 0.4
        : isUserSpeaking
        ? 4.5
        : isSpeaking
        ? 3.4 + lvl * 4.5
        : 2.6 + Math.sin(clock * 2.2) * 0.7;

      leftEyeLight.intensity = baseIntensity;
      rightEyeLight.intensity = baseIntensity;

      // Vocalizer Speech Lip Sync
      if (isSpeaking && lvl > 0.02) {
        mouthLight.intensity = Math.min(lvl * 7.5, 6.0);
      } else {
        mouthLight.intensity = 0;
      }

      // 4. Eye Blink Animation (Strictly visible only during blink)
      if (isBlinkingRef.current) {
        leftEyelid.visible = true;
        rightEyelid.visible = true;
      } else {
        leftEyelid.visible = false;
        rightEyelid.visible = false;
      }

      renderer.render(scene, camera);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener("resize", handleResize);
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-screen h-screen flex items-center justify-center select-none pointer-events-none overflow-hidden ${className}`}
      style={{
        background: "transparent",
        ...style,
      }}
      aria-label="DAS Living 3D Cybernetic Face"
    >
      {/* 3D WEBGL CANVAS (Edge-to-edge seamless background across full viewport) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
          is3DReady ? "opacity-100" : "opacity-0"
        }`}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export { PathfinderFace };
