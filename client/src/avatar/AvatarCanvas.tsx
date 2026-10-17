/**
 * AvatarCanvas: Three.js Real-Time 3D Cybernetic Head Avatar
 * Implements:
 * 1. Continuous Idle Motion (micro-sway & breathing):
 *    mesh.position.y = Math.sin(time * 1.5) * 0.05;
 *    mesh.rotation.y = Math.cos(time * 1.0) * 0.02;
 * 2. Automated Eye Blinking (triggers every 3-5 seconds, closes eyelids for 150ms):
 *    scale Y down to 0, then restore to 1.
 * 3. Audio-Reactive Lip-Sync (WebAudio API AnalyserNode / RMS):
 *    mouthMesh.scale.y / morphTarget = 1.0 + audioVolume * 2.0.
 */

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

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
  width = 280,
  height = 340,
  onFpsUpdate
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const internalAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Animation references
  const animFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  // Connect WebAudio Analyser to audioElement if provided
  useEffect(() => {
    if (!audioElement || audioAnalyser) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audioElement);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.25;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      internalAnalyserRef.current = analyser;
      audioCtxRef.current = ctx;
    } catch (e) {
      // Audio source may already be connected or user gesture needed
    }
  }, [audioElement, audioAnalyser]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderWidth = width || container.clientWidth || 280;
    const renderHeight = height || container.clientHeight || 340;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, renderWidth / renderHeight, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(renderWidth, renderHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Lighting (Cyberpunk Cyan + Deep Blue Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5); // Cyan key light
    keyLight.position.set(2.5, 3.0, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6366f1, 1.8); // Indigo fill light
    fillLight.position.set(-2.5, 1.5, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 3.0); // Electric blue rim light
    rimLight.position.set(0, -2.0, -2.5);
    scene.add(rimLight);

    // 3. Avatar Head Group & Meshes
    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // Cranial Head Geometry
    const headGeo = new THREE.SphereGeometry(1.15, 48, 48);
    headGeo.scale(1.0, 1.32, 1.12);

    // Right Side: Sleek Metallic Blue Solid Skin
    const solidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#1e3a8a"),
      metalness: 0.45,
      roughness: 0.28,
      clearcoat: 0.75,
      clearcoatRoughness: 0.2,
      reflectivity: 0.9,
      emissive: new THREE.Color("#0c2340"),
      emissiveIntensity: 0.3,
    });
    const solidHead = new THREE.Mesh(headGeo, solidMat);
    headGroup.add(solidHead);

    // Left Side: Glowing Cyan Wireframe Matrix (matches photo prompt)
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const wireHead = new THREE.Mesh(headGeo, wireMat);
    wireHead.scale.set(1.002, 1.002, 1.002);
    headGroup.add(wireHead);

    // Internal Glow Core
    const coreGeo = new THREE.SphereGeometry(0.9, 24, 24);
    coreGeo.scale(0.9, 1.2, 0.9);
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0284c7"),
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    headGroup.add(coreMesh);

    // 4. Eyes & Upper Eyelids (for automated blinking)
    const eyeGeo = new THREE.SphereGeometry(0.13, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#e0f2fe"),
      emissive: new THREE.Color("#0ea5e9"),
      emissiveIntensity: 0.4,
      roughness: 0.1,
    });

    // Left Eye & Eyelid
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.35, 0.18, 0.95);
    headGroup.add(leftEye);

    // Right Eye & Eyelid
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.35, 0.18, 0.95);
    headGroup.add(rightEye);

    // Eyelid Covers (scaled for blinking)
    const eyelidGeo = new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const eyelidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#1e3a8a"),
      roughness: 0.3,
    });

    const leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    leftEyelid.position.set(-0.35, 0.22, 0.96);
    leftEyelid.rotation.x = Math.PI * 0.15;
    headGroup.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    rightEyelid.position.set(0.35, 0.22, 0.96);
    rightEyelid.rotation.x = Math.PI * 0.15;
    headGroup.add(rightEyelid);

    // 5. Mouth Mesh (for audio-reactive lip-syncing)
    const mouthGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32);
    mouthGeo.scale(1.0, 0.5, 0.3);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0f172a"),
      emissive: new THREE.Color("#0284c7"),
      emissiveIntensity: 0.2,
      roughness: 0.5,
    });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.45, 0.98);
    mouthMesh.rotation.x = Math.PI * 0.5;
    headGroup.add(mouthMesh);

    // Subtle Upper/Lower Lips
    const lipGeo = new THREE.TorusGeometry(0.22, 0.035, 12, 32, Math.PI);
    const lipMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#1d4ed8"),
      roughness: 0.4,
      metalness: 0.2,
    });
    const upperLip = new THREE.Mesh(lipGeo, lipMat);
    upperLip.position.set(0, -0.42, 0.99);
    upperLip.rotation.x = Math.PI;
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(lipGeo, lipMat);
    lowerLip.position.set(0, -0.48, 0.99);
    headGroup.add(lowerLip);

    // 6. Blink Timer State (triggers every 3 to 5 seconds, 150ms duration)
    let lastBlinkTime = performance.now();
    let nextBlinkDelay = 3000 + Math.random() * 2000;
    let isBlinking = false;
    let blinkStartTime = 0;

    // 7. FPS Measurement
    let frameCount = 0;
    let lastFpsTime = performance.now();

    // 8. Audio FFT Buffer
    const freqData = new Uint8Array(128);

    // 9. Main Render Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // FPS updates
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        if (onFpsUpdate) {
          onFpsUpdate(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        }
        frameCount = 0;
        lastFpsTime = now;
      }

      // ======================================================================
      // 1. IDLE MOTION (Micro-movement applied continuously to face mesh)
      // ======================================================================
      headGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05;
      headGroup.rotation.y = Math.cos(elapsedTime * 1.0) * 0.02;
      headGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.015;

      // Natural subtle breathing oscillation
      const breathingScale = 1.0 + Math.sin(elapsedTime * 1.8) * 0.008;
      headGroup.scale.set(breathingScale, breathingScale, breathingScale);

      // State-specific responsive gestures
      if (stateRef.current === "listening") {
        headGroup.rotation.y += 0.06;
        headGroup.rotation.x += 0.04;
      } else if (stateRef.current === "thinking") {
        headGroup.rotation.y += 0.1;
        headGroup.rotation.x -= 0.05;
      }

      // ======================================================================
      // 2. EYE BLINKING (Automated timer triggers every 3 to 5 seconds)
      // ======================================================================
      if (!isBlinking && now - lastBlinkTime > nextBlinkDelay) {
        isBlinking = true;
        blinkStartTime = now;
      }

      if (isBlinking) {
        const blinkElapsed = now - blinkStartTime;
        if (blinkElapsed < 150) {
          // Scale upper eyelid down to 0 for 150ms, then return
          const blinkProgress = blinkElapsed / 150;
          // Parabolic closure: 1 -> 0 -> 1
          const eyeScaleY = Math.max(0.05, Math.abs(Math.sin(blinkProgress * Math.PI - Math.PI / 2)));
          leftEye.scale.y = eyeScaleY;
          rightEye.scale.y = eyeScaleY;
          leftEyelid.scale.y = 1.0 + (1.0 - eyeScaleY) * 1.2;
          rightEyelid.scale.y = 1.0 + (1.0 - eyeScaleY) * 1.2;
        } else {
          isBlinking = false;
          lastBlinkTime = now;
          nextBlinkDelay = 3000 + Math.random() * 2000;
          leftEye.scale.y = 1.0;
          rightEye.scale.y = 1.0;
          leftEyelid.scale.y = 1.0;
          rightEyelid.scale.y = 1.0;
        }
      }

      // ======================================================================
      // 3. LIP-SYNC (Audio Reactive to WebAudio AnalyserNode / Speech)
      // ======================================================================
      let audioVolume = 0;
      const activeAnalyser = audioAnalyser || internalAnalyserRef.current;

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        // Sample speech vowel formant bins
        for (let i = 2; i < 28; i++) {
          sum += freqData[i];
        }
        audioVolume = sum / (26 * 255);
      } else if (isSpeakingRef.current) {
        // High-fidelity procedural syllable synthesis when speaking
        const syllableCadence = Math.sin(elapsedTime * 14.0) * Math.cos(elapsedTime * 7.5);
        audioVolume = Math.max(0.12, Math.abs(syllableCadence) * 0.45);
      } else {
        audioVolume = 0;
      }

      // Dynamically bind audio frequency value directly to mouth mesh:
      // mouthMesh.morphTargetInfluences[mouthOpenIndex] = audioVolume * 2;
      const targetMouthScaleY = 1.0 + Math.min(2.8, audioVolume * 2.2);
      mouthMesh.scale.y += (targetMouthScaleY - mouthMesh.scale.y) * 0.35;
      mouthMesh.scale.x = 1.0 + audioVolume * 0.4;
      lowerLip.position.y = -0.48 - audioVolume * 0.07;
      upperLip.position.y = -0.42 + audioVolume * 0.02;

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
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
      mouthGeo.dispose();
      mouthMat.dispose();
    };
  }, [width, height, audioAnalyser, audioElement, onFpsUpdate]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-[#060812]/90 p-2 shadow-2xl backdrop-blur-xl transition-all ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* AI Voice Agent Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-300 shadow-md backdrop-blur-md">
        <span
          className={`h-2 w-2 rounded-full ${
            state === "speaking"
              ? "bg-emerald-400 animate-ping ring-2 ring-emerald-400/40"
              : state === "listening"
              ? "bg-cyan-400 animate-pulse ring-2 ring-cyan-400/40"
              : state === "thinking"
              ? "bg-amber-400 animate-spin ring-2 ring-amber-400/40"
              : "bg-zinc-400"
          }`}
        />
        <span>DAS Agent 3D</span>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl" />

      {/* Active State / Captions Pill */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3 py-1.5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
          <span
            className={`font-semibold uppercase tracking-wider ${
              state === "speaking"
                ? "text-emerald-400"
                : state === "listening"
                ? "text-cyan-400"
                : state === "thinking"
                ? "text-amber-400"
                : "text-zinc-400"
            }`}
          >
            {state === "speaking" ? "● Speaking" : state === "listening" ? "● Listening..." : state === "thinking" ? "● Thinking..." : "Ready"}
          </span>
        </div>

        {/* Live Audio Reaction Waveform Bars */}
        {isSpeaking && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-3 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-4 bg-emerald-400 animate-bounce rounded-full" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-2 bg-indigo-400 animate-bounce rounded-full" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
  );
};
