/**
 * AvatarCanvas: High-Performance 3D Holographic Humanoid Robot Face
 * Model: "Humanoid Robot Face" by kito1704 (https://sketchfab.com/kito1704) under CC-BY-4.0
 * 
 * Features:
 * - Real Articulated Mechanical Jaw (JawR_19) driven by WebAudio FFT for ultra-fast lip-sync
 * - Intense Glowing Fiery Red Irises (#ff0033 / #ff0022) with Sharp Obsidian Black Pupils (#000000)
 * - Transparent Cornea Bypass: Iris mesh rendered directly with 3.5 Emissive Glow & Ocular Point Lights
 * - Full-Face Framing: Scaled ~2.45 units with camera z=2.5 (chin to crown fully visible)
 * - Organic Continuous Life Motion: 4-axis floating respiratory sway, gaze drift, conversational nodding
 * - Clean Viewport: Zero overlay text, badges, or bars - ONLY the pure cybernetic face.
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
 * Creates ultra-sharp high-intensity cybernetic eye texture:
 * - Jet-black obsidian pupil in the exact center (#000000, 75px radius)
 * - Radiant crimson-ruby fiery iris ring (#ff0033 / #ff0022) with micro-spokes
 * - Specular highlight glints for lifelike cybernetic intensity
 */
function createCyberEyeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 256;
  const cy = 256;

  // Dark obsidian background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 512, 512);

  // Intense glowing ruby-crimson iris
  const irisGrad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 220);
  irisGrad.addColorStop(0.0, "#000000"); // Inner pupil border
  irisGrad.addColorStop(0.12, "#55000d"); // Transition shadow
  irisGrad.addColorStop(0.35, "#dc2626"); // Vivid ruby flame
  irisGrad.addColorStop(0.65, "#ff0033"); // Radiant glowing scarlet
  irisGrad.addColorStop(0.85, "#ff2244"); // Glowing ring
  irisGrad.addColorStop(0.96, "#880015"); // Limbal transition
  irisGrad.addColorStop(1.0, "#000000"); // Jet black limbal border

  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.fillStyle = irisGrad;
  ctx.fill();

  // Cybernetic Iris Radial Spokes
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 64; i++) {
    const angle = (i * Math.PI * 2) / 64;
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(215, 0);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 90, 110, 0.6)" : "rgba(220, 20, 45, 0.4)";
    ctx.lineWidth = i % 4 === 0 ? 3.0 : 1.5;
    ctx.stroke();
    ctx.rotate(-angle);
  }
  ctx.restore();

  // Concentric cybernetic tech rings
  ctx.beginPath();
  ctx.arc(cx, cy, 130, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 150, 170, 0.55)";
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 175, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 50, 75, 0.7)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // THE OBSIDIAN JET-BLACK PUPIL (Crisp, defined center)
  const pupilGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75);
  pupilGrad.addColorStop(0.0, "#000000");
  pupilGrad.addColorStop(0.92, "#000000");
  pupilGrad.addColorStop(1.0, "#150003");

  ctx.beginPath();
  ctx.arc(cx, cy, 75, 0, Math.PI * 2);
  ctx.fillStyle = pupilGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.98)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Sharp specular catchlights (glint)
  ctx.beginPath();
  ctx.arc(cx - 28, cy - 32, 14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - 14, cy - 16, 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
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

    // Camera calibrated for complete face framing (chin to forehead with zero clipping)
    const camera = new THREE.PerspectiveCamera(34, renderWidth / renderHeight, 0.1, 100);
    camera.position.set(0, 0, 2.5);
    camera.lookAt(0, -0.02, 0);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(renderWidth, renderHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Cybernetic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Key Light: Electric sky-blue directional highlight
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.6);
    keyLight.position.set(2.5, 3.5, 3.5);
    scene.add(keyLight);

    // Rim Light: Vivid indigo rim reflection on silhouette
    const rimLight = new THREE.DirectionalLight(0x818cf8, 3.0);
    rimLight.position.set(-3.0, 2.5, -2.5);
    scene.add(rimLight);

    // Fill Light: Soft cyan bounce
    const fillLight = new THREE.DirectionalLight(0x0284c7, 1.8);
    fillLight.position.set(-2.0, -1.5, 2.5);
    scene.add(fillLight);

    // 4. Head Group (Hierarchical Root for continuous floating sway & nodding)
    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // References to animated parts in "Humanoid Robot Face"
    let jawNode: THREE.Object3D | null = null;
    let eyeLNode: THREE.Object3D | null = null;
    let eyeRNode: THREE.Object3D | null = null;
    let initialJawY = 0;
    let initialJawZ = 0;
    let ocularLightL: THREE.PointLight | null = null;
    let ocularLightR: THREE.PointLight | null = null;

    // Defined Vivid Glowing Crimson Eyes with Obsidian Black Pupil Texture
    const eyeTexture = createCyberEyeTexture();
    const vampireEyeMat = new THREE.MeshStandardMaterial({
      map: eyeTexture,
      color: new THREE.Color("#ff0033"),
      emissive: new THREE.Color("#ff0022"),
      emissiveMap: eyeTexture,
      emissiveIntensity: 3.5, // Intense radiant glowing red!
      roughness: 0.1,
      metalness: 0.15,
    });

    // 5. Load Humanoid Robot Face GLB
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/models/avatar.glb",
      (gltf) => {
        const model = gltf.scene;

        // Bounding box measurement
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Target scale: 2.45 units perfectly frames full head (chin to crown)
        const scale = 2.45 / size.y;
        model.scale.set(scale, scale, scale);

        // Center dead-center on origin with subtle vertical offset
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale - 0.04;
        model.position.z = -center.z * scale;

        // Custom High-End Cybernetic Materials
        const lightBlueFaceMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#7dd3fc"),
          metalness: 0.65,
          roughness: 0.2,
          clearcoat: 0.9,
          clearcoatRoughness: 0.1,
          emissive: new THREE.Color("#0284c7"),
          emissiveIntensity: 0.15,
          reflectivity: 0.85,
        });

        const obsidianMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#0b0f19"),
          metalness: 0.9,
          roughness: 0.15,
          clearcoat: 0.95,
          clearcoatRoughness: 0.08,
        });

        // Traverse and customize model parts
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;

            const matName = (m.material as THREE.Material)?.name || "";

            if (matName.includes("IRIS")) {
              // The TRUE IRIS MESH (Object_52, Object_55) -> Fiery glowing crimson red!
              m.material = vampireEyeMat;
              m.renderOrder = 2;
            } else if (matName.includes("EyeRefractive")) {
              // The outer cornea shell (Object_53, Object_56): hide it so it does not block the red glow!
              m.visible = false;
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

        // Radiant ocular red point lights right in front of the eyes
        if (eyeLNode && eyeRNode) {
          const eyeLWorld = new THREE.Vector3();
          eyeLNode.getWorldPosition(eyeLWorld);
          headGroup.worldToLocal(eyeLWorld);

          const eyeRWorld = new THREE.Vector3();
          eyeRNode.getWorldPosition(eyeRWorld);
          headGroup.worldToLocal(eyeRWorld);

          ocularLightL = new THREE.PointLight(0xff0033, 1.8, 1.8);
          ocularLightL.position.copy(eyeLWorld).add(new THREE.Vector3(0, 0, 0.08));
          headGroup.add(ocularLightL);

          ocularLightR = new THREE.PointLight(0xff0033, 1.8, 1.8);
          ocularLightR.position.copy(eyeRWorld).add(new THREE.Vector3(0, 0, 0.08));
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

    // 7. Continuous Animation Render Loop (Alive floating & swaying motion)
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
      // 1. ORGANIC CONTINUOUS LIFE-MOTION & FLOATING SWAY
      // ======================================================================
      const breathingY = Math.sin(elapsedTime * 1.5) * 0.045;
      const breathingX = Math.cos(elapsedTime * 1.1) * 0.02;
      const breathingYaw = Math.cos(elapsedTime * 0.95) * 0.04;
      const breathingPitch = Math.sin(elapsedTime * 0.75) * 0.03;
      const breathingRoll = Math.sin(elapsedTime * 1.2) * 0.018;

      headGroup.position.y = breathingY;
      headGroup.position.x = breathingX;
      headGroup.rotation.y = breathingYaw;
      headGroup.rotation.x = breathingPitch;
      headGroup.rotation.z = breathingRoll;

      // Conversational state postures
      const curState = stateRef.current;
      if (curState === "listening") {
        headGroup.rotation.y += 0.06;
        headGroup.rotation.x += 0.04;
      } else if (curState === "thinking") {
        headGroup.rotation.y += 0.09;
        headGroup.rotation.x -= 0.05;
      } else if (curState === "speaking") {
        headGroup.rotation.x += Math.sin(elapsedTime * 5.2) * 0.04;
        headGroup.rotation.y += Math.sin(elapsedTime * 3.1) * 0.022;
      }

      // ======================================================================
      // 2. CYBERNETIC INTENSE EYE PULSE & BLINK (No eyeball squashing)
      // ======================================================================
      if (!isBlinking && now - lastBlinkTime > nextBlinkDelay) {
        isBlinking = true;
        blinkStartTime = now;
      }

      if (isBlinking) {
        const blinkProgress = (now - blinkStartTime) / 130;
        if (blinkProgress < 1.0) {
          const eyeFactor = Math.sin(blinkProgress * Math.PI);
          // Pulse the emissive glow smoothly during blink without distorting 3D eyeball geometry
          if (vampireEyeMat) vampireEyeMat.emissiveIntensity = 3.5 * Math.max(0.1, 1.0 - eyeFactor * 0.92);
          if (ocularLightL) ocularLightL.intensity = 1.8 * Math.max(0.1, 1.0 - eyeFactor * 0.92);
          if (ocularLightR) ocularLightR.intensity = 1.8 * Math.max(0.1, 1.0 - eyeFactor * 0.92);
        } else {
          isBlinking = false;
          lastBlinkTime = now;
          nextBlinkDelay = 2500 + Math.random() * 3000;
          if (vampireEyeMat) vampireEyeMat.emissiveIntensity = 3.5;
          if (ocularLightL) ocularLightL.intensity = 1.8;
          if (ocularLightR) ocularLightR.intensity = 1.8;
        }
      }

      // ======================================================================
      // 3. WEBAUDIO REAL-TIME MECHANICAL JAW LIP-SYNC
      // Driven by ElevenLabs audio stream frequency amplitudes through AnalyserNode
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
        audioVolume = Math.max(0.15, Math.abs(syllableCadence) * 0.52);
      } else {
        audioVolume = 0;
      }

      // Articulate Mechanical Jaw (Jaw.R_19) with natural elasticity
      if (jawNode) {
        const jawDrop = Math.min(1.0, audioVolume * 2.4);
        jawNode.rotation.x = -jawDrop * 0.11;
        jawNode.position.y = initialJawY - jawDrop * 0.012;
        jawNode.position.z = initialJawZ + jawDrop * 0.004;
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
    <div className={`relative w-full h-full min-h-[460px] flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-[#000000] border border-sky-950/30 select-none shadow-[0_0_50px_rgba(2,132,199,0.15)] ${className}`}>
      
      {/* Clean Viewport: Pure 3D WebGL Humanoid Robot Face (Zero overlay badges / text) */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-[#000000]">
        <div ref={mountRef} className="w-full h-full flex items-center justify-center" />

        {/* Loading spinner while WebGL initializes */}
        {!modelLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10 pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            <span className="text-[11px] font-mono text-sky-300 tracking-wider">CALIBRATING 3D AVATAR...</span>
          </div>
        )}
      </div>
    </div>
  );
};
