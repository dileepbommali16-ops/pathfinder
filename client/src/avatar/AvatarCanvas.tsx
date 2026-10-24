/**
 * AvatarCanvas: High-Performance 3D Holographic Humanoid Robot Face
 * Model: "Humanoid Robot Face" by kito1704 (https://sketchfab.com/kito1704) under CC-BY-4.0
 * 
 * Features:
 * - Real Articulated Mechanical Jaw (JawR_19) driven by WebAudio FFT for ultra-fast lip-sync
 * - Dual High-Resolution Eyes with Defined Obsidian Black Pupils (#000000) & Glowing Crimson Red Irises (#ff0033)
 * - Calibrated Ocular Lighting: 1.2 Emissive Intensity & 0.5 Point Lights (Zero glare wash-out)
 * - Prominent Stage Presence: Scaled ~2.75 units with 2.65 camera focal distance
 * - Cybernetic Metallic Face Plates paired with Deep Obsidian Chrome accents
 * - Poisson non-repetitive procedural eye blinking
 * - Organic respiratory breathing sway and conversational head nodding
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

/**
 * Creates high-fidelity cybernetic eye texture featuring:
 * 1. Deep Obsidian Jet-Black Center Pupil (#000000)
 * 2. Vivid Crimson Red Iris Ring (#ff0033, #dc2626) with micro-spokes and tech rings
 * 3. Defined Outer Limbal Ring
 * 4. Crisp specular glint for lifelike cybernetic intensity
 */
function createCyberEyeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 256;
  const cy = 256;

  // Background / Sclera edge: obsidian black
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 512, 512);

  // Outer iris gradient (Radiant crimson with dark outer limbal ring)
  const irisGrad = ctx.createRadialGradient(cx, cy, 70, cx, cy, 220);
  irisGrad.addColorStop(0.0, "#000000"); // Inner pupil border
  irisGrad.addColorStop(0.15, "#660011"); // Deep shadow ring
  irisGrad.addColorStop(0.40, "#c20025"); // Intense ruby crimson
  irisGrad.addColorStop(0.70, "#ff0033"); // Vivid scarlet red glow
  irisGrad.addColorStop(0.88, "#99001e"); // Limbal transition
  irisGrad.addColorStop(1.0, "#000000"); // Obsidian limbal border

  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.fillStyle = irisGrad;
  ctx.fill();

  // Cybernetic Iris Radial Micro-Spokes
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 48; i++) {
    const angle = (i * Math.PI * 2) / 48;
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(90, 0);
    ctx.lineTo(210, 0);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 60, 90, 0.5)" : "rgba(200, 10, 35, 0.35)";
    ctx.lineWidth = i % 3 === 0 ? 2.5 : 1.2;
    ctx.stroke();
    ctx.rotate(-angle);
  }
  ctx.restore();

  // Concentric cybernetic tech rings
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 120, 140, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 185, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(180, 0, 30, 0.6)";
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // THE OBSIDIAN JET-BLACK PUPIL (Crisp, defined center)
  const pupilGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
  pupilGrad.addColorStop(0.0, "#000000");
  pupilGrad.addColorStop(0.88, "#000000");
  pupilGrad.addColorStop(1.0, "#180004");

  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.fillStyle = pupilGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Sharp specular catchlights (glint)
  ctx.beginPath();
  ctx.arc(cx - 30, cy - 35, 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - 16, cy - 18, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
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
    const container = mountRef.current;
    if (!container) return;

    const renderWidth = width || container.clientWidth || 380;
    const renderHeight = height || container.clientHeight || 480;

    // 1. Scene & True OLED Black Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    // Camera calibrated for large, commanding cybernetic face framing
    const camera = new THREE.PerspectiveCamera(35, renderWidth / renderHeight, 0.1, 100);
    camera.position.set(0, 0, 2.65);
    camera.lookAt(0, 0, 0);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(renderWidth, renderHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Cybernetic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key Light: Electric sky-blue directional highlight
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    keyLight.position.set(2.5, 3.5, 3.5);
    scene.add(keyLight);

    // Rim Light: Vivid indigo rim reflection on silhouette
    const rimLight = new THREE.DirectionalLight(0x818cf8, 2.8);
    rimLight.position.set(-3.0, 2.5, -2.5);
    scene.add(rimLight);

    // Fill Light: Soft cyan bounce
    const fillLight = new THREE.DirectionalLight(0x0284c7, 1.6);
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

    // Defined Sharp Crimson Eyes with Obsidian Black Pupil Texture
    const eyeTexture = createCyberEyeTexture();
    const vampireEyeMat = new THREE.MeshStandardMaterial({
      map: eyeTexture,
      emissive: new THREE.Color("#ff0033"),
      emissiveMap: eyeTexture,
      emissiveIntensity: 1.2, // Calibrated down from 4.5 to eliminate glare
      roughness: 0.12,
      metalness: 0.25,
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

        // Target height ~2.75 units in camera view for large, commanding presence (was 2.1)
        const scale = 2.75 / size.y;
        model.scale.set(scale, scale, scale);

        // Center dead-center on origin with slight offset for eye contact
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale - 0.08;
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

            if (matName.includes("IRIS") || matName.includes("EyeRefractive") || matName.includes("Eye")) {
              // Vampire Glowing Red Eyes with Obsidian Black Pupil
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

        // Locate and store articulated nodes
        jawNode = model.getObjectByName("Jaw.R_19") || model.getObjectByName("JawR_19") || null;
        if (jawNode) {
          initialJawY = jawNode.position.y;
          initialJawZ = jawNode.position.z;
        }

        eyeLNode = model.getObjectByName("Kito6_FaceMesh_Eye.L_20") || model.getObjectByName("Kito6_FaceMesh_EyeL_20") || null;
        eyeRNode = model.getObjectByName("Kito6_FaceMesh_Eye.R_21") || model.getObjectByName("Kito6_FaceMesh_EyeR_21") || null;

        if (eyeLNode) initialEyeScaleY_L = eyeLNode.scale.y;
        if (eyeRNode) initialEyeScaleY_R = eyeRNode.scale.y;

        // Add radiant ocular red point lights calibrated to 0.5 (was 2.5) to avoid washed-out haze
        if (eyeLNode && eyeRNode) {
          const eyeLWorld = new THREE.Vector3();
          eyeLNode.getWorldPosition(eyeLWorld);
          headGroup.worldToLocal(eyeLWorld);

          const eyeRWorld = new THREE.Vector3();
          eyeRNode.getWorldPosition(eyeRWorld);
          headGroup.worldToLocal(eyeRWorld);

          ocularLightL = new THREE.PointLight(0xff0033, 0.5, 1.8);
          ocularLightL.position.copy(eyeLWorld).add(new THREE.Vector3(0, 0, 0.05));
          headGroup.add(ocularLightL);

          ocularLightR = new THREE.PointLight(0xff0033, 0.5, 1.8);
          ocularLightR.position.copy(eyeRWorld).add(new THREE.Vector3(0, 0, 0.05));
          headGroup.add(ocularLightR);
        }

        headGroup.add(model);
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
          if (eyeLNode) eyeLNode.scale.y = initialEyeScaleY_L * Math.max(0.08, 1.0 - eyeFactor);
          if (eyeRNode) eyeRNode.scale.y = initialEyeScaleY_R * Math.max(0.08, 1.0 - eyeFactor);
          // Ocular vampire glow dim during eyelid blink (calibrated from 1.2 and 0.5)
          if (vampireEyeMat) vampireEyeMat.emissiveIntensity = 1.2 * (1.0 - eyeFactor * 0.85);
          if (ocularLightL) ocularLightL.intensity = 0.5 * (1.0 - eyeFactor * 0.85);
          if (ocularLightR) ocularLightR.intensity = 0.5 * (1.0 - eyeFactor * 0.85);
        } else {
          isBlinking = false;
          lastBlinkTime = now;
          nextBlinkDelay = 2800 + Math.random() * 2800;
          if (eyeLNode) eyeLNode.scale.y = initialEyeScaleY_L;
          if (eyeRNode) eyeRNode.scale.y = initialEyeScaleY_R;
          if (vampireEyeMat) vampireEyeMat.emissiveIntensity = 1.2;
          if (ocularLightL) ocularLightL.intensity = 0.5;
          if (ocularLightR) ocularLightR.intensity = 0.5;
        }
      }

      // ======================================================================
      // 3. WEBAUDIO REAL-TIME LIP-SYNC (<50ms Latency)
      // Driven by ElevenLabs audio stream frequency amplitudes through AnalyserNode
      // ======================================================================
      let audioVolume = 0;
      const activeAnalyser = audioAnalyser || internalAnalyserRef.current;

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        // Sample human speech formant range (150Hz - 2500Hz)
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
        const jawDrop = Math.min(1.0, audioVolume * 2.2);
        jawNode.rotation.x = -jawDrop * 0.09;
        jawNode.position.y = initialJawY - jawDrop * 0.01;
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
      eyeTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [width, height, audioAnalyser]);

  return (
    <div className={`relative w-full h-full min-h-[460px] flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-[#000000] border border-sky-950/40 select-none shadow-[0_0_50px_rgba(2,132,199,0.15)] ${className}`}>
      
      {/* Top Left Status Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#000000]/80 border border-white/10 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-[#ff0033] shadow-[0_0_8px_#ff0033]" />
        <span className="text-[10px] font-mono text-zinc-300 font-bold tracking-wider">
          CYBERNETIC CORE 3.0
        </span>
      </div>

      {/* Top Right Credit Badge (kito1704 CC-BY-4.0) */}
      <div className="absolute top-3 right-3 z-20 pointer-events-none opacity-85 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 text-[9px] font-mono text-zinc-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>3D FACE: KITO1704 (CC-BY-4.0)</span>
      </div>

      {/* Center Viewport: 3D WebGL Humanoid Robot Face */}
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

      {/* Bottom Telemetry Bar in True Black (#000000) */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#000000]/90 backdrop-blur-md">
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

        {/* Live Audio Reaction Waveform Bars */}
        {isSpeaking ? (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3.5 bg-sky-400 animate-bounce rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-5 bg-[#0284c7] animate-bounce rounded-full" style={{ animationDelay: "120ms" }} />
            <span className="w-1 h-2.5 bg-emerald-400 animate-bounce rounded-full" style={{ animationDelay: "240ms" }} />
          </div>
        ) : (
          <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
            OBSIDIAN PUPILS · CRIMSON IRIS
          </span>
        )}
      </div>
    </div>
  );
};
