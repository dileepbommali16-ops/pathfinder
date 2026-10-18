/**
 * FaceAvatar.tsx: Ultra-Realistic 3D Holographic Cybernetic Avatar
 * Replaces abstract grid visuals with the exact split cybernetic blue face from image_aea8fd.jpg:
 * 1. Left half cyan wireframe grid, Right half solid glossy metallic blue.
 * 2. Dead-center viewport positioning.
 * 3. Continuous skeletal breathing micro-motion & rotation sway.
 * 4. Procedural eyelid blinking every 3 to 5 seconds.
 * 5. Zero-latency WebAudio AnalyserNode RMS mouth morphing & lip-sync.
 * 6. Graceful 2D fallback to static photo with reactive glow ring on low-spec/hidden tab.
 */

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { createFaceMesh, MeshParts } from "./faceMesh";
import { IdleController, AvatarState } from "./idle";
import { VisemeEngine } from "./visemes";
import { AvatarRig } from "./rig";

export interface FaceAvatarProps {
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

export const FaceAvatar: React.FC<FaceAvatarProps> = ({
  state = "idle",
  spokenText = "",
  isSpeaking = false,
  audioAnalyser = null,
  audioElement = null,
  className = "",
  width = 360,
  height = 440,
  onFpsUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [audioRMS, setAudioRMS] = useState<number>(0);

  const isSpeakingRef = useRef<boolean>(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  const spokenTextRef = useRef<string>(spokenText);
  spokenTextRef.current = spokenText;

  // Track WebAudio AnalyserNode
  const internalAnalyserRef = useRef<AnalyserNode | null>(null);
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
    } catch {}
  }, [audioElement, audioAnalyser]);

  // Main Three.js WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setUseFallback(true);
        return;
      }
    } catch {
      setUseFallback(true);
      return;
    }

    const renderWidth = width || container.clientWidth || 360;
    const renderHeight = height || container.clientHeight || 440;

    // 1. Scene & Camera (Dead Center Framing)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, renderWidth / renderHeight, 0.1, 100);
    camera.position.set(0, 0, 3.85);

    // 2. High-Performance WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(renderWidth, renderHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.localClippingEnabled = true;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);
    } catch {
      setUseFallback(true);
      return;
    }

    // 3. Cybernetic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.9);
    keyLight.position.set(-2.5, 3.0, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x1d4ed8, 2.3);
    fillLight.position.set(2.5, 1.5, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x67e8f9, 3.3);
    rimLight.position.set(0, 3.5, -2.0);
    scene.add(rimLight);

    // 4. Mesh, Texture, and Controllers
    const textureLoader = new THREE.TextureLoader();
    let meshParts: MeshParts = createFaceMesh();
    scene.add(meshParts.headGroup);

    textureLoader.load(
      "/avatar/das_head.webp",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        meshParts.solidMat.map = tex;
        meshParts.solidMat.needsUpdate = true;
      },
      undefined,
      () => {
        textureLoader.load("/avatar/das_head.jpg", (tex2) => {
          tex2.colorSpace = THREE.SRGBColorSpace;
          meshParts.solidMat.map = tex2;
          meshParts.solidMat.needsUpdate = true;
        });
      }
    );

    const idleController = new IdleController();
    const visemeEngine = new VisemeEngine();
    const rig = new AvatarRig(meshParts);

    // 5. Frame & Audio Tracking
    const clock = new THREE.Clock();
    const freqData = new Uint8Array(128);
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let lowFpsCount = 0;

    // 6. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Pause rendering if document is hidden to conserve GPU/battery
      if (document.hidden) return;

      const elapsedTime = clock.getElapsedTime();
      const deltaTime = clock.getDelta();
      const now = performance.now();

      // FPS tracking
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        if (onFpsUpdate) onFpsUpdate(measuredFps);
        if (measuredFps < 20) {
          lowFpsCount++;
          if (lowFpsCount > 3) setUseFallback(true);
        }
        frameCount = 0;
        lastFpsTime = now;
      }

      // Apply CSS gentle sine-wave translation
      if (container) {
        container.style.transform = `translateY(${Math.sin(elapsedTime * 1.5) * 5}px)`;
      }

      // Calculate audio loudness from AnalyserNode
      let currentRMS = 0;
      const activeAnalyser = audioAnalyser || internalAnalyserRef.current;
      if (activeAnalyser) {
        (activeAnalyser as any).getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 2; i < 28; i++) {
          sum += freqData[i];
        }
        currentRMS = Math.min(1.0, (sum / (26 * 255)) * 1.8);
      } else if (isSpeakingRef.current) {
        // Procedural syllable cadence when synthesized without WebAudio node
        const syllable = Math.sin(elapsedTime * 14.5) * Math.cos(elapsedTime * 7.8);
        currentRMS = Math.max(0.12, Math.abs(syllable) * 0.48);
      }
      setAudioRMS(currentRMS);

      // Extract current active character from spoken text
      const currentText = spokenTextRef.current;
      const charIndex = Math.floor((elapsedTime * 10) % (currentText.length || 1));
      const activeChar = currentText[charIndex] || "";

      // Compute idle transforms & viseme weights
      const idle = idleController.update(now, stateRef.current, elapsedTime);
      const visemes = visemeEngine.update(activeChar, currentRMS, Math.max(0.016, deltaTime));

      // Apply deformation rig
      rig.applyTransform(idle, visemes, currentRMS);

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Responsive resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || width || 380;
      const h = container.clientHeight || height || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [width, height, audioAnalyser]);

  // Fallback 2D Rendering: High-res static image with audio-reactive glow ring
  if (useFallback) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Audio Reactive Glow Ring */}
        <div
          className="absolute rounded-full transition-transform duration-75 pointer-events-none"
          style={{
            width: `${Math.min(width, 320)}px`,
            height: `${Math.min(height, 380)}px`,
            border: "2px solid rgba(56, 189, 248, 0.4)",
            boxShadow: `0 0 ${20 + audioRMS * 45}px rgba(56, 189, 248, ${0.25 + audioRMS * 0.4})`,
            transform: `scale(${1.0 + audioRMS * 0.06})`,
          }}
        />
        <img
          src="/avatar/das_head.webp"
          alt="Pathfinder DAS 3D AI Voice Agent"
          className="w-full max-w-[340px] max-h-[420px] object-contain rounded-3xl drop-shadow-2xl z-10"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/avatar/das_head.jpg";
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center overflow-hidden transition-transform duration-75 select-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
