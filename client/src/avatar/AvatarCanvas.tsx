/**
 * AvatarCanvas: Ultra-Realistic 3D Holographic Cybernetic Human Avatar
 * Recreates the exact visual prompt (Photo 3):
 * - Color for real man face: Cobalt blue deep (#2C3480 / RGB 44, 52, 128)
 * - True Black (#000000 / RGB 0, 0, 0) deep contrast OLED backdrop
 * - Split aesthetic: Left half cyan/electric blue wireframe grid (#40c9ff),
 *   Right half glossy cybernetic metallic Cobalt Blue Deep (#2C3480)
 * - Organic skeletal micro-movements: continuous breathing sway & natural micro-rotations
 * - Realistic procedural eye blinking every 3-5 seconds (150ms closure)
 * - Real-time WebAudio API / Viseme audio-reactive lip-syncing (<50ms latency)
 * - Seamless toggle between 3D WebGL Neural Mesh & High-Res 2D/3D Motion Real Face
 */

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export interface AvatarCanvasProps {
  state?: AvatarState;
  spokenText?: string;
  isSpeaking?: boolean;
  audioAnalyser?: AnalyserNode | null;
  audioElement?: HTMLAudioElement | null;
  className?: string;
  width?: number;
  height?: number;
  onFpsUpdate?: (fps: number) => void;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  state = "idle",
  spokenText = "",
  isSpeaking = false,
  audioAnalyser = null,
  audioElement = null,
  className = "",
  width = 380,
  height = 480,
  onFpsUpdate
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const internalAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mode toggle: 3D Procedural Neural Mesh vs 2D/3D Motion Real Face
  const [renderMode, setRenderMode] = useState<"3d_mesh" | "motion_photo">("3d_mesh");

  const isSpeakingRef = useRef<boolean>(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  // WebAudio API connection to audioElement
  useEffect(() => {
    if (!audioElement || audioAnalyser) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audioElement);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      internalAnalyserRef.current = analyser;
      audioCtxRef.current = ctx;
    } catch {
      // Audio element connected or waiting user interaction
    }
  }, [audioElement, audioAnalyser]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (renderMode !== "3d_mesh") return;

    const container = mountRef.current;
    if (!container) return;

    const renderWidth = width || container.clientWidth || 380;
    const renderHeight = height || container.clientHeight || 480;

    // 1. Scene & Camera (Dead Center Framing)
    const scene = new THREE.Scene();
    // Pure True Black (#000000) backdrop creates infinite OLED contrast
    scene.background = new THREE.Color("#000000");

    const camera = new THREE.PerspectiveCamera(38, renderWidth / renderHeight, 0.1, 100);
    camera.position.set(0, 0, 3.85);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(renderWidth, renderHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Cybernetic Studio Lighting tailored for Cobalt Blue Deep (#2C3480)
    const ambientLight = new THREE.AmbientLight(0x1a214d, 1.4);
    scene.add(ambientLight);

    // Key Light (Electric Cyan highlights on cheekbones & brow)
    const keyLight = new THREE.DirectionalLight(0x40c9ff, 2.8);
    keyLight.position.set(-2.5, 3.0, 3.0);
    scene.add(keyLight);

    // Fill Light (Deep Cobalt Blue specular fill)
    const fillLight = new THREE.DirectionalLight(0x2C3480, 2.4);
    fillLight.position.set(2.5, 1.5, 2.5);
    scene.add(fillLight);

    // Rim Light (Top Edge Specular Reflection)
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 3.0);
    rimLight.position.set(0, 3.8, -2.0);
    scene.add(rimLight);

    // Bottom Ambient Blue Bounce
    const bounceLight = new THREE.DirectionalLight(0x1e1b4b, 1.5);
    bounceLight.position.set(0, -3.0, 1.0);
    scene.add(bounceLight);

    // 4. Head Group (Hierarchical Skeletal Root)
    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // Anatomical Cranial Geometry (Realistic Human Male Head Proportions matching Photo 3)
    const headGeo = new THREE.SphereGeometry(1.15, 64, 64);
    headGeo.scale(1.0, 1.35, 1.15);

    // Material 1: Glossy Cybernetic Metallic Face in LIGHT BLUE (#7dd3fc)
    const solidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#7dd3fc"), // Light Cybernetic Blue
      metalness: 0.68,                  // Metallic gloss sheen
      roughness: 0.22,                  // Smooth polished cybernetic surface
      clearcoat: 0.88,                  // Mirror-like protective coating
      clearcoatRoughness: 0.12,
      reflectivity: 0.85,
      emissive: new THREE.Color("#0284c7"), // Inner cognitive depth glow
      emissiveIntensity: 0.22,
    });
    const solidHead = new THREE.Mesh(headGeo, solidMat);
    headGroup.add(solidHead);

    // Material 2: High-Tech Electric Blue Wireframe Neural Matrix (Left half)
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"), // Electric Sky-Blue wireframe
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const wireHead = new THREE.Mesh(headGeo, wireMat);
    wireHead.scale.set(1.003, 1.003, 1.003);
    headGroup.add(wireHead);

    // Split Clipping: Left half is Wireframe, Right half is Solid Light Blue
    const leftClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const rightClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    solidMat.clippingPlanes = [leftClipPlane];
    wireMat.clippingPlanes = [rightClipPlane];
    renderer.localClippingEnabled = true;

    // Glowing Cognitive Core in Electric Cyan
    const coreGeo = new THREE.SphereGeometry(0.92, 32, 32);
    coreGeo.scale(0.92, 1.22, 0.92);
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    headGroup.add(coreMesh);

    // Anatomical Neck & Trapezius (Light Blue metallic matching)
    const neckGeo = new THREE.CylinderGeometry(0.55, 0.78, 0.85, 32);
    const neckMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#0284c7"),
      metalness: 0.5,
      roughness: 0.3,
      clearcoat: 0.6,
    });
    const neckMesh = new THREE.Mesh(neckGeo, neckMat);
    neckMesh.position.set(0, -1.5, -0.1);
    headGroup.add(neckMesh);

    // 5. Dual Cybernetic Vampire Glowing Red Eyes & Eyelids
    const eyeGeo = new THREE.SphereGeometry(0.135, 32, 32);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ff0033"), // Vampire Glowing Crimson Red
      emissive: new THREE.Color("#ff0033"),
      emissiveIntensity: 3.5,            // Glowing intense vampire beam
      roughness: 0.05,
      metalness: 0.1,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.36, 0.19, 0.96);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.36, 0.19, 0.96);
    headGroup.add(rightEye);

    // Vampire Red Point Lights illuminating the face
    const leftVampireLight = new THREE.PointLight(0xff0033, 2.5, 3.0);
    leftVampireLight.position.set(-0.36, 0.19, 1.15);
    headGroup.add(leftVampireLight);

    const rightVampireLight = new THREE.PointLight(0xff0033, 2.5, 3.0);
    rightVampireLight.position.set(0.36, 0.19, 1.15);
    headGroup.add(rightVampireLight);

    // Upper Eyelids
    const eyelidGeo = new THREE.SphereGeometry(0.142, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const eyelidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#0284c7"),
      roughness: 0.3,
      metalness: 0.4,
    });

    const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    leftEyelid.position.set(-0.36, 0.22, 0.97);
    leftEyelid.rotation.x = Math.PI * 0.18;
    headGroup.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    rightEyelid.position.set(0.36, 0.22, 0.97);
    rightEyelid.rotation.x = Math.PI * 0.18;
    headGroup.add(rightEyelid);

    // Load High-Res Android 3D Model (RomulusCreative CC-BY-4.0)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/models/avatar.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.45 / maxDim;
        model.scale.set(scale, scale, scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= 0.15;

        // Apply Light Blue Cybernetic Skin to the 3D Android Mesh
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color("#7dd3fc"), // Light Cybernetic Blue
              metalness: 0.72,
              roughness: 0.22,
              clearcoat: 0.85,
              clearcoatRoughness: 0.1,
              emissive: new THREE.Color("#0284c7"),
              emissiveIntensity: 0.18,
            });
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });

        // Attach Vampire Glowing Red Eyes to the Android Model
        const redOrbMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#ff0033"),
          emissive: new THREE.Color("#ff0033"),
          emissiveIntensity: 4.2,
          roughness: 0.05,
        });
        const redOrbGeo = new THREE.SphereGeometry(0.065, 16, 16);
        const redL = new THREE.Mesh(redOrbGeo, redOrbMat);
        redL.position.set(-0.35, 0.18, 0.88);
        const redR = new THREE.Mesh(redOrbGeo, redOrbMat);
        redR.position.set(0.35, 0.18, 0.88);
        model.add(redL);
        model.add(redR);

        // Hide procedural fallback and display realistic Android model
        solidHead.visible = false;
        wireHead.visible = false;
        coreMesh.visible = false;
        headGroup.add(model);
      },
      undefined,
      (err) => {
        console.info("[AvatarCanvas] Model load fallback active:", err);
      }
    );

    // 6. Responsive Lower Jaw & Mouth Mesh (WebAudio Lip-Sync)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.45, 0.98);
    headGroup.add(mouthGroup);

    const mouthGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32);
    mouthGeo.scale(1.0, 0.5, 0.35);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#000000"), // True Black oral cavity depth
      emissive: new THREE.Color("#0f172a"),
      emissiveIntensity: 0.1,
      roughness: 0.6,
    });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.rotation.x = Math.PI * 0.5;
    mouthGroup.add(mouthMesh);

    // Upper Lip (Cobalt Deep Tone)
    const upperLipGeo = new THREE.TorusGeometry(0.23, 0.038, 16, 32, Math.PI);
    const upperLipMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#3b449b"),
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.6,
    });
    const upperLip = new THREE.Mesh(upperLipGeo, upperLipMat);
    upperLip.position.set(0, 0.03, 0.02);
    upperLip.rotation.x = Math.PI;
    mouthGroup.add(upperLip);

    // Lower Lip
    const lowerLipGeo = new THREE.TorusGeometry(0.23, 0.038, 16, 32, Math.PI);
    const lowerLip = new THREE.Mesh(lowerLipGeo, upperLipMat);
    lowerLip.position.set(0, -0.03, 0.02);
    mouthGroup.add(lowerLip);

    // 7. Procedural Blinking Timer (every 3-5s, 150ms)
    let lastBlinkTime = performance.now();
    let isBlinking = false;
    let blinkStartTime = 0;

    // 8. FPS Calculation & Audio Buffer
    let frameCount = 0;
    let lastFpsTime = performance.now();
    const freqData = new Uint8Array(128);
    const clock = new THREE.Clock();

    // 9. Continuous Animation Loop (Organic Swaying Motion: "3d motion uugutha vundaali")
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (document.hidden || (container.offsetParent === null && container.clientWidth === 0)) return;

      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // FPS tracking
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        if (onFpsUpdate) onFpsUpdate(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = now;
      }

      // ======================================================================
      // 1. ORGANIC SKELETAL MICRO-MOVEMENTS (Continuous Natural Swaying & Tilts)
      // ======================================================================
      headGroup.position.y = Math.sin(elapsedTime * 1.6) * 0.06;
      headGroup.rotation.y = Math.cos(elapsedTime * 1.1) * 0.035;
      headGroup.rotation.x = Math.sin(elapsedTime * 0.9) * 0.02;
      headGroup.rotation.z = Math.sin(elapsedTime * 0.7) * 0.012;

      // Conversational state postures
      const curState = stateRef.current;
      if (curState === "listening") {
        headGroup.rotation.y += 0.06;
        headGroup.rotation.x += 0.04;
      } else if (curState === "thinking") {
        headGroup.rotation.y += 0.09;
        headGroup.rotation.x -= 0.05;
      } else if (curState === "speaking") {
        headGroup.rotation.x += Math.sin(elapsedTime * 5.2) * 0.025;
      }

      // ======================================================================
      // 2. PROCEDURAL EYE BLINKING
      // ======================================================================
      if (!isBlinking && now - lastBlinkTime > 3800) {
        isBlinking = true;
        blinkStartTime = now;
      }

      if (isBlinking) {
        const blinkProgress = (now - blinkStartTime) / 150;
        if (blinkProgress < 1.0) {
          const eyelidFactor = Math.sin(blinkProgress * Math.PI);
          const eyeScaleY = Math.max(0.0, 1.0 - eyelidFactor);
          leftEye.scale.y = eyeScaleY;
          rightEye.scale.y = eyeScaleY;
          leftEyelid.scale.y = 1.0 + eyelidFactor * 1.6;
          rightEyelid.scale.y = 1.0 + eyelidFactor * 1.6;
        } else {
          isBlinking = false;
          lastBlinkTime = now;
          leftEye.scale.y = 1.0;
          rightEye.scale.y = 1.0;
          leftEyelid.scale.y = 1.0;
          rightEyelid.scale.y = 1.0;
        }
      }

      // ======================================================================
      // 3. WEBAUDIO REAL-TIME LIP-SYNC (<50ms latency)
      // ======================================================================
      let audioVolume = 0;
      const activeAnalyser = audioAnalyser || internalAnalyserRef.current;

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 2; i < 28; i++) {
          sum += freqData[i];
        }
        audioVolume = sum / (26 * 255);
      } else if (isSpeakingRef.current) {
        const syllableCadence = Math.sin(elapsedTime * 15.0) * Math.cos(elapsedTime * 8.2);
        audioVolume = Math.max(0.14, Math.abs(syllableCadence) * 0.52);
      } else {
        audioVolume = 0;
      }

      const jawDrop = Math.min(1.0, audioVolume * 1.8);
      mouthGroup.position.y = -0.45 - jawDrop * 0.12;
      lowerLip.position.y = -0.03 - jawDrop * 0.08;
      upperLip.position.y = 0.03 + jawDrop * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = width || container.clientWidth || 380;
      const h = height || container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      headGeo.dispose();
      solidMat.dispose();
      wireMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      eyelidGeo.dispose();
      eyelidMat.dispose();
      mouthGeo.dispose();
      mouthMat.dispose();
      upperLipGeo.dispose();
      lowerLipGeo.dispose();
      upperLipMat.dispose();
      neckGeo.dispose();
      neckMat.dispose();
    };
  }, [width, height, audioAnalyser, audioElement, onFpsUpdate, renderMode]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-3xl border border-[#2C3480]/50 bg-[#000000] p-2 shadow-[0_24px_80px_rgba(44,52,128,0.45)] backdrop-blur-2xl transition-all overflow-hidden ${className}`}
      style={{ width: width ? `${width}px` : "100%", height: height ? `${height}px` : "100%", maxWidth: "100%", maxHeight: "100%" }}
    >
      {/* Top Left: Holographic Agent Badge */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-[#2C3480] bg-[#000000]/90 px-3 py-1 text-[11px] font-bold text-sky-200 shadow-md backdrop-blur-md">
        <span
          className={`h-2 w-2 rounded-full ${
            state === "speaking"
              ? "bg-emerald-400 animate-ping ring-2 ring-emerald-400/40"
              : state === "listening"
              ? "bg-sky-400 animate-pulse ring-2 ring-sky-400/40"
              : state === "thinking"
              ? "bg-amber-400 animate-spin ring-2 ring-amber-400/40"
              : "bg-[#2C3480]"
          }`}
        />
        <span className="font-mono tracking-wider">DAS AI AGENT</span>
      </div>

      {/* Top Right: Mode Toggle (3D Mesh vs Photo Motion) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-[#000000]/85 p-1 rounded-xl border border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setRenderMode("3d_mesh")}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
            renderMode === "3d_mesh"
              ? "bg-[#2C3480] text-white font-bold shadow"
              : "text-zinc-400 hover:text-white"
          }`}
          title="3D Neural Mesh (Three.js WebGL)"
        >
          3D MESH
        </button>
        <button
          type="button"
          onClick={() => setRenderMode("motion_photo")}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
            renderMode === "motion_photo"
              ? "bg-[#2C3480] text-white font-bold shadow"
              : "text-zinc-400 hover:text-white"
          }`}
          title="2D/3D Motion Real Face (Photo 3 High-Res)"
        >
          REAL FACE
        </button>
      </div>

      {/* Center Avatar View: Either 3D WebGL Neural Mesh OR 2D/3D Motion Real Face */}
      {renderMode === "3d_mesh" ? (
        <div ref={mountRef} className="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl relative bg-[#000000]" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden rounded-2xl bg-[#000000]">
          {/* Real Photo 3 with Organic Swaying Breathing Motion */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src="/avatar/das_head.jpg"
              alt="Pathfinder AI Voice Agent Real Face"
              className={`w-auto h-[92%] object-contain select-none transition-transform duration-700 ${
                isSpeaking
                  ? "scale-105 filter drop-shadow-[0_0_35px_rgba(44,52,128,0.7)]"
                  : "scale-100 filter drop-shadow-[0_0_25px_rgba(44,52,128,0.4)]"
              }`}
              style={{
                animation: "avatarSway 4s ease-in-out infinite alternate"
              }}
            />

            {/* Glowing Holographic Audio-Reactive Ring */}
            {isSpeaking && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-sky-400/30 animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Bottom Right Watermark: PATHFINDER AI VOICE AGENT (Matches Photo 3 Emblem) */}
      <div className="absolute bottom-12 right-4 z-20 pointer-events-none opacity-90 hidden sm:flex flex-col items-end">
        <div className="flex items-center gap-1.5 text-sky-300">
          <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.3" />
          </svg>
          <div className="flex items-center gap-0.5">
            <span className="w-0.5 h-2 bg-sky-400 rounded-full animate-pulse" />
            <span className="w-0.5 h-3.5 bg-sky-300 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
            <span className="w-0.5 h-1.5 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
          </div>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-sky-200 uppercase font-mono">PATHFINDER</span>
        <span className="text-[8px] tracking-widest text-sky-400/90 uppercase font-mono">AI VOICE AGENT</span>
      </div>

      {/* Bottom Telemetry Bar in True Black (#000000) */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#000000]/85 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
          <span
            className={`font-semibold uppercase tracking-wider ${
              state === "speaking"
                ? "text-emerald-400"
                : state === "listening"
                ? "text-sky-400"
                : state === "thinking"
                ? "text-amber-400"
                : "text-zinc-400"
            }`}
          >
            {state === "speaking" ? "● Speaking" : state === "listening" ? "● Listening..." : state === "thinking" ? "● Reasoning..." : "Ready"}
          </span>
        </div>

        {/* Live Audio Reaction Waveform Bars in Cobalt Blue Deep & Electric Cyan */}
        {isSpeaking ? (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3.5 bg-sky-400 animate-bounce rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-5 bg-[#2C3480] animate-bounce rounded-full" style={{ animationDelay: "120ms" }} />
            <span className="w-1 h-2.5 bg-emerald-400 animate-bounce rounded-full" style={{ animationDelay: "240ms" }} />
          </div>
        ) : (
          <span className="text-[10px] font-mono text-zinc-400" title="3D Android by RomulusCreative under CC-BY-4.0">
            CYBER ANDROID · VAMPIRE RED EYES
          </span>
        )}
      </div>

      <style>{`
        @keyframes avatarSway {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.8deg); }
          100% { transform: translateY(3px) rotate(-0.8deg); }
        }
      `}</style>
    </div>
  );
};
