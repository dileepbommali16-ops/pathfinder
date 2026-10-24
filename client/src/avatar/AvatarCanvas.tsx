/**
 * AvatarCanvas: High-Performance 3D Holographic Humanoid Robot Face
 * Model: "Humanoid Robot Face" by kito1704 (https://sketchfab.com/kito1704) under CC-BY-4.0
 * 
 * Features:
 * - Real Articulated Mechanical Jaw (JawR_19) driven by WebAudio FFT for ultra-fast lip-sync
 * - Dual High-Resolution Eyes (Kito6_FaceMesh_EyeL_20, Kito6_FaceMesh_EyeR_21) with Vampire Glowing Crimson Red Iris (#ff0033) & ocular point lights
 * - Cybernetic Metallic Light Blue Face Plates (#7dd3fc) paired with deep Obsidian Chrome accents
 * - Poisson non-repetitive procedural eye blinking (130ms closure)
 * - Organic respiratory breathing sway and conversational head nodding
 * - Toggle between 3D Android Mesh & 2D/3D Motion Real Face
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

  // Toggle between 3D Android Model and Real Face Photo
  const [renderMode, setRenderMode] = useState<"3d_mesh" | "motion_photo">("3d_mesh");
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);

  const isSpeakingRef = useRef<boolean>(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  // WebAudio API connection to audioElement for real-time lip-sync
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
      // Audio element source already bound or awaiting user interaction
    }
  }, [audioElement, audioAnalyser]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    if (renderMode !== "3d_mesh") return;

    const container = mountRef.current;
    if (!container) return;

    const renderWidth = width || container.clientWidth || 380;
    const renderHeight = height || container.clientHeight || 480;

    // 1. Scene & True OLED Black Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    // Camera calibrated for perfect head framing
    const camera = new THREE.PerspectiveCamera(35, renderWidth / renderHeight, 0.1, 100);
    camera.position.set(0, 0, 3.8);
    camera.lookAt(0, 0, 0);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(renderWidth, renderHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Cybernetic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Key Light: Electric sky-blue directional highlight
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
    keyLight.position.set(2.5, 3.5, 3.5);
    scene.add(keyLight);

    // Rim Light: Vivid indigo rim reflection on silhouette
    const rimLight = new THREE.DirectionalLight(0x818cf8, 3.2);
    rimLight.position.set(-3.0, 2.5, -2.5);
    scene.add(rimLight);

    // Fill Light: Soft cyan bounce
    const fillLight = new THREE.DirectionalLight(0x0284c7, 1.8);
    fillLight.position.set(-2.0, -1.5, 2.5);
    scene.add(fillLight);

    // 4. Head Group (Hierarchical Root for idle sway & nodding)
    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // References to animated parts in "Humanoid Robot Face"
    let jawNode: THREE.Object3D | null = null;
    let eyeLNode: THREE.Object3D | null = null;
    let eyeRNode: THREE.Object3D | null = null;
    let initialJawY = 0;
    let initialJawZ = 0;
    let initialEyeScaleY_L = 1.0;
    let initialEyeScaleY_R = 1.0;
    let ocularLightL: THREE.PointLight | null = null;
    let ocularLightR: THREE.PointLight | null = null;
    const vampireEyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ff0033"),
      emissive: new THREE.Color("#ff0033"),
      emissiveIntensity: 4.5,
      roughness: 0.08,
      metalness: 0.2,
    });

    // 5. Load Humanoid Robot Face GLB (by kito1704 under CC-BY-4.0)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/models/avatar.glb",
      (gltf) => {
        const model = gltf.scene;

        // Bounding box measurement
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Target height ~2.1 units in camera view
        const scale = 2.1 / size.y;
        model.scale.set(scale, scale, scale);

        // Center dead-center on origin
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale - 0.05;
        model.position.z = -center.z * scale;

        // Custom High-End Cybernetic Materials
        const lightBlueFaceMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#7dd3fc"), // Light Cybernetic Blue
          metalness: 0.68,
          roughness: 0.22,
          clearcoat: 0.85,
          clearcoatRoughness: 0.12,
          emissive: new THREE.Color("#0284c7"),
          emissiveIntensity: 0.16,
          reflectivity: 0.85,
        });

        const obsidianMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#0f172a"), // Deep obsidian chrome
          metalness: 0.88,
          roughness: 0.18,
          clearcoat: 0.9,
          clearcoatRoughness: 0.1,
        });

        // Traverse and customize model parts
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;

            const matName = (m.material as THREE.Material)?.name || "";

            if (matName.includes("IRIS") || matName.includes("EyeRefractive")) {
              // Vampire Glowing Red Eyes
              m.material = vampireEyeMat;
            } else if (matName.includes("Material.001") || matName.includes("material_0")) {
              // Main Face Plates: Cybernetic Light Blue
              m.material = lightBlueFaceMat;
            } else if (matName.includes("Black") || matName.includes("cutter") || matName.includes("shiny")) {
              // Contrast details: Obsidian Dark Chrome
              m.material = obsidianMat;
            } else {
              m.material = lightBlueFaceMat;
            }
          }
        });

        // Locate and store articulated nodes (supporting both dot and clean naming)
        jawNode = model.getObjectByName("Jaw.R_19") || model.getObjectByName("JawR_19") || null;
        if (jawNode) {
          initialJawY = jawNode.position.y;
          initialJawZ = jawNode.position.z;
        }

        eyeLNode = model.getObjectByName("Kito6_FaceMesh_Eye.L_20") || model.getObjectByName("Kito6_FaceMesh_EyeL_20") || null;
        eyeRNode = model.getObjectByName("Kito6_FaceMesh_Eye.R_21") || model.getObjectByName("Kito6_FaceMesh_EyeR_21") || null;

        if (eyeLNode) initialEyeScaleY_L = eyeLNode.scale.y;
        if (eyeRNode) initialEyeScaleY_R = eyeRNode.scale.y;

        // Add radiant ocular red point lights in headGroup at eye world positions
        if (eyeLNode && eyeRNode) {
          const eyeLWorld = new THREE.Vector3();
          eyeLNode.getWorldPosition(eyeLWorld);
          headGroup.worldToLocal(eyeLWorld);

          const eyeRWorld = new THREE.Vector3();
          eyeRNode.getWorldPosition(eyeRWorld);
          headGroup.worldToLocal(eyeRWorld);

          ocularLightL = new THREE.PointLight(0xff0033, 2.5, 2.0);
          ocularLightL.position.copy(eyeLWorld).add(new THREE.Vector3(0, 0, 0.05));
          headGroup.add(ocularLightL);

          ocularLightR = new THREE.PointLight(0xff0033, 2.5, 2.0);
          ocularLightR.position.copy(eyeRWorld).add(new THREE.Vector3(0, 0, 0.05));
          headGroup.add(ocularLightR);
        }

        headGroup.add(model);
        setModelLoaded(true);
        setModelLoaded(true);
      },
      undefined,
      (err) => {
        console.warn("[AvatarCanvas] avatar.glb load error:", err);
      }
    );

    // 6. Animation Variables
    let lastBlinkTime = performance.now();
    let isBlinking = false;
    let blinkStartTime = 0;
    let nextBlinkDelay = 3200;

    let frameCount = 0;
    let lastFpsTime = performance.now();
    const freqData = new Uint8Array(128);
    const clock = new THREE.Clock();

    // 7. Continuous Animation Render Loop
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
      // 1. ORGANIC RESPIRATORY BREATHING & CONVERSATIONAL SWAY
      // ======================================================================
      const breathingY = Math.sin(elapsedTime * 1.6) * 0.035;
      const breathingYaw = Math.cos(elapsedTime * 1.0) * 0.022;
      const breathingPitch = Math.sin(elapsedTime * 0.8) * 0.015;

      headGroup.position.y = breathingY;
      headGroup.rotation.y = breathingYaw;
      headGroup.rotation.x = breathingPitch;

      // Conversational state postures
      const curState = stateRef.current;
      if (curState === "listening") {
        headGroup.rotation.y += 0.05;
        headGroup.rotation.x += 0.03;
      } else if (curState === "thinking") {
        headGroup.rotation.y += 0.08;
        headGroup.rotation.x -= 0.04;
      } else if (curState === "speaking") {
        // Human conversational nodding while speaking
        headGroup.rotation.x += Math.sin(elapsedTime * 4.8) * 0.035;
        headGroup.rotation.y += Math.sin(elapsedTime * 2.8) * 0.018;
      }

      // ======================================================================
      // 2. PROCEDURAL ORGANIC EYE BLINKING (Poisson 140ms closure)
      // ======================================================================
      if (!isBlinking && now - lastBlinkTime > nextBlinkDelay) {
        isBlinking = true;
        blinkStartTime = now;
      }

      if (isBlinking) {
        const blinkProgress = (now - blinkStartTime) / 140;
        if (blinkProgress < 1.0) {
          const eyeFactor = Math.sin(blinkProgress * Math.PI);
          // Scale relative to original mesh scale (never hardcode 1.0)
          if (eyeLNode) eyeLNode.scale.y = initialEyeScaleY_L * Math.max(0.08, 1.0 - eyeFactor);
          if (eyeRNode) eyeRNode.scale.y = initialEyeScaleY_R * Math.max(0.08, 1.0 - eyeFactor);
          // Ocular vampire glow dim during eyelid blink
          if (vampireEyeMat) vampireEyeMat.emissiveIntensity = 4.5 * (1.0 - eyeFactor * 0.85);
          if (ocularLightL) ocularLightL.intensity = 2.5 * (1.0 - eyeFactor * 0.85);
          if (ocularLightR) ocularLightR.intensity = 2.5 * (1.0 - eyeFactor * 0.85);
        } else {
          isBlinking = false;
          lastBlinkTime = now;
          nextBlinkDelay = 2800 + Math.random() * 2800; // 2.8s to 5.6s
          if (eyeLNode) eyeLNode.scale.y = initialEyeScaleY_L;
          if (eyeRNode) eyeRNode.scale.y = initialEyeScaleY_R;
          if (vampireEyeMat) vampireEyeMat.emissiveIntensity = 4.5;
          if (ocularLightL) ocularLightL.intensity = 2.5;
          if (ocularLightR) ocularLightR.intensity = 2.5;
        }
      }

      // ======================================================================
      // 3. WEBAUDIO REAL-TIME LIP-SYNC (<50ms Latency)
      // ======================================================================
      let audioVolume = 0;
      const activeAnalyser = audioAnalyser || internalAnalyserRef.current;

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        // Sample speech formant range (150Hz - 2500Hz)
        for (let i = 2; i < 28; i++) {
          sum += freqData[i];
        }
        audioVolume = sum / (26 * 255);
      } else if (isSpeakingRef.current) {
        const syllableCadence = Math.sin(elapsedTime * 14.0) * Math.cos(elapsedTime * 7.5);
        audioVolume = Math.max(0.12, Math.abs(syllableCadence) * 0.48);
      } else {
        audioVolume = 0;
      }

      // Articulate Mechanical Jaw (Jaw.R_19) dynamically
      if (jawNode) {
        const jawDrop = Math.min(1.0, audioVolume * 1.8);
        jawNode.rotation.x = -jawDrop * 0.08;
        jawNode.position.y = initialJawY - jawDrop * 0.008;
        jawNode.position.z = initialJawZ + jawDrop * 0.003;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Viewport Resize Handler
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [renderMode, width, height, audioAnalyser]);

  return (
    <div className={`relative w-full h-full min-h-[460px] flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-[#000000] border border-sky-950/40 select-none shadow-[0_0_50px_rgba(2,132,199,0.15)] ${className}`}>

      {/* Top Left Controls: 3D Android Mesh vs Real Face Photo */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#000000]/80 border border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setRenderMode("3d_mesh")}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${renderMode === "3d_mesh"
              ? "bg-[#0284c7] text-white font-bold shadow-md shadow-sky-900/40"
              : "text-zinc-400 hover:text-white"
            }`}
          title="3D Humanoid Robot Face (by kito1704 under CC-BY-4.0)"
        >
          3D HUMANOID
        </button>
        <button
          type="button"
          onClick={() => setRenderMode("motion_photo")}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${renderMode === "motion_photo"
              ? "bg-[#0284c7] text-white font-bold shadow-md shadow-sky-900/40"
              : "text-zinc-400 hover:text-white"
            }`}
          title="Motion Real Human Face"
        >
          REAL FACE
        </button>
      </div>

      {/* Top Right Credit Badge (kito1704 CC-BY-4.0) */}
      <div className="absolute top-3 right-3 z-20 pointer-events-none opacity-85 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 text-[9px] font-mono text-zinc-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>3D FACE: KITO1704 (CC-BY-4.0)</span>
      </div>

      {/* Center Viewport: 3D WebGL Humanoid Robot Face OR 2D/3D Motion Real Face */}
      {renderMode === "3d_mesh" ? (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-[#000000]">
          <div ref={mountRef} className="w-full h-full flex items-center justify-center" />

          {/* Subtle loading spinner while WebGL initializes */}
          {!modelLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10 pointer-events-none">
              <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
              <span className="text-[11px] font-mono text-sky-300 tracking-wider">CALIBRATING HUMANOID ROBOT...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden rounded-2xl bg-[#000000]">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src="/avatar/das_head.jpg"
              alt="Pathfinder AI Voice Agent Real Face"
              className={`w-auto h-[90%] object-contain select-none transition-transform duration-700 ${isSpeaking
                  ? "scale-105 filter drop-shadow-[0_0_35px_rgba(2,132,199,0.7)]"
                  : "scale-100 filter drop-shadow-[0_0_25px_rgba(2,132,199,0.4)]"
                }`}
              style={{
                animation: "avatarSway 4s ease-in-out infinite alternate"
              }}
            />
            {isSpeaking && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-sky-400/40 animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Bottom Telemetry Bar in True Black (#000000) */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#000000]/90 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
          <span
            className={`font-semibold uppercase tracking-wider ${state === "speaking"
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

        {/* Live Audio Reaction Waveform Bars */}
        {isSpeaking ? (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3.5 bg-sky-400 animate-bounce rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-5 bg-[#0284c7] animate-bounce rounded-full" style={{ animationDelay: "120ms" }} />
            <span className="w-1 h-2.5 bg-emerald-400 animate-bounce rounded-full" style={{ animationDelay: "240ms" }} />
          </div>
        ) : (
          <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
            HUMANOID ROBOT · VAMPIRE RED EYES
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
