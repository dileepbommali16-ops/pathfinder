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
  const [isBlinking, setIsBlinking] = useState(false);

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
      const delay = 3000 + Math.random() * 2500;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        isBlinkingRef.current = true;
        restoreTimer = setTimeout(() => {
          setIsBlinking(false);
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

  // 3. High-Fidelity 3D Scene with Curved Cybernetic Head Mesh & Dynamic Lights
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
      console.warn("WebGL not supported, running on high-res backdrop:", e);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.2);

    // Pivot group for 3D head rotation and organic breathing
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    // Studio Lighting for metallic cybernetic surface
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(2.5, 3.5, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    fillLight.position.set(-2.5, -0.5, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.0);
    rimLight.position.set(0, 4.0, -2.0);
    scene.add(rimLight);

    // 3D Red Eyes (SphereGeometry)
    const eyeGeo = new THREE.SphereGeometry(0.065, 32, 32);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.460, 0.432, 0.02);
    pivotGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.462, 0.432, 0.02);
    pivotGroup.add(rightEye);

    // Point lights for crimson eye radiance casting real light onto the face
    const leftEyeLight = new THREE.PointLight(0xff0000, 3.0, 1.8);
    leftEyeLight.position.set(-0.460, 0.432, 0.12);
    pivotGroup.add(leftEyeLight);

    const rightEyeLight = new THREE.PointLight(0xff0000, 3.0, 1.8);
    rightEyeLight.position.set(0.462, 0.432, 0.12);
    pivotGroup.add(rightEyeLight);

    // Vocalizer mouth light for speech lip-sync
    const mouthLight = new THREE.PointLight(0xff2222, 0, 1.4);
    mouthLight.position.set(0.0, -0.512, 0.08);
    pivotGroup.add(mouthLight);

    // 3D Metallic Cybernetic Face Mesh (Textured with Boss's exact reference asset)
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      "/face.png",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        // Curved 3D surface geometry that gives realistic volumetric head curvature
        const geo = new THREE.PlaneGeometry(2.3, 2.3, 48, 48);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setZ(i, -Math.pow(x, 2) * 0.22 - Math.pow(y, 2) * 0.08);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
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
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || 1024;
      const h = rect.height || 1024;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    handleResize();

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // 60FPS Interactive Render Loop
    let clock = 0;
    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);
      clock += 0.024;

      // 1. Organic living breathing
      const breathe = Math.sin(clock * 1.5) * 0.030;
      pivotGroup.position.y = breathe;

      // 2. Smooth Mouse Parallax Head Tracking (Real 3D perspective rotation)
      currentMouseRef.current.x +=
        (targetMouseRef.current.x - currentMouseRef.current.x) * 0.06;
      currentMouseRef.current.y +=
        (targetMouseRef.current.y - currentMouseRef.current.y) * 0.06;

      pivotGroup.rotation.y = currentMouseRef.current.x * 0.32; // Horizontal turn
      pivotGroup.rotation.x = -currentMouseRef.current.y * 0.18; // Vertical tilt
      pivotGroup.rotation.z = -currentMouseRef.current.x * 0.04; // Natural head roll
      pivotGroup.position.x = currentMouseRef.current.x * 0.08;

      // 3. Audio & Voice Reactivity
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
      const baseIntensity = isUserSpeaking
        ? 4.0
        : isSpeaking
        ? 3.0 + lvl * 4.5
        : 2.4 + Math.sin(clock * 2.2) * 0.6;

      leftEyeLight.intensity = baseIntensity;
      rightEyeLight.intensity = baseIntensity;

      // Vocalizer Speech Lip Sync
      if (isSpeaking && lvl > 0.02) {
        mouthLight.intensity = Math.min(lvl * 7.0, 5.5);
      } else {
        mouthLight.intensity = 0;
      }

      // 4. Eye Blink Animation
      if (isBlinkingRef.current) {
        leftEye.scale.y = 0.04;
        rightEye.scale.y = 0.04;
      } else {
        leftEye.scale.y = 1.0;
        rightEye.scale.y = 1.0;
      }

      renderer.render(scene, camera);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none pointer-events-none overflow-hidden ${className}`}
      style={{
        background: "transparent",
        ...style,
      }}
      aria-label="DAS Living 3D Cybernetic Face"
    >
      {/* 1:1 Aspect Ratio Container */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: "100%",
          width: "auto",
          aspectRatio: "1 / 1",
          maxHeight: "100%",
          maxWidth: "100vw",
        }}
      >
        {/* INSTANT ZERO-FLASH POSTER (Visible initially, fades when 3D takes over) */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ${
            is3DReady ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <img
            src="/face.png"
            alt="Pathfinder Cybernetic Face"
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
            draggable={false}
            loading="eager"
          />
          {/* Glowing Red Eyes for 2D Backdrop */}
          <div
            style={{
              position: "absolute",
              left: "29.98%",
              top: "31.20%",
              width: "8.5%",
              height: "8.5%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 36%, #ffffff 0%, #ff7777 22%, #ff0000 65%, #880000 100%)",
              boxShadow: "0 0 24px #ff0000, 0 0 48px #ff0000, inset 0 0 8px #ffffff",
              transform: isBlinking
                ? "translate(-50%, -50%) scaleY(0.04)"
                : "translate(-50%, -50%) scale(1)",
              transition: "transform 0.08s ease-in-out",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "70.08%",
              top: "31.20%",
              width: "8.5%",
              height: "8.5%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 36%, #ffffff 0%, #ff7777 22%, #ff0000 65%, #880000 100%)",
              boxShadow: "0 0 24px #ff0000, 0 0 48px #ff0000, inset 0 0 8px #ffffff",
              transform: isBlinking
                ? "translate(-50%, -50%) scaleY(0.04)"
                : "translate(-50%, -50%) scale(1)",
              transition: "transform 0.08s ease-in-out",
            }}
          />
        </div>

        {/* 3D WEBGL CANVAS (Active & interactive) */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
            is3DReady ? "opacity-100" : "opacity-0"
          }`}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}

export { PathfinderFace };
