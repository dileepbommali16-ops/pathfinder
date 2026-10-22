import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// --- Wireframe Face Mesh Component (R3F Compatible & Three.js Native) ---
export interface DasAi3DFaceProps {
  audioLevel?: number;
  className?: string;
  isSpeaking?: boolean;
}

// Subcomponent: Pure High-Performance Three.js Cybernetic Wireframe Avatar
// Runs at 60 FPS without React 19 version lock, rendering the exact 3D Cobalt Blue Cybernetic Male Wireframe Head
function NativeThreeWireframeCanvas({ audioLevel = 0, className = "" }: { audioLevel?: number; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioLevelRef = useRef<number>(audioLevel);
  audioLevelRef.current = audioLevel;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.4);

    // 2. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.innerHTML = "";
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    // 3. Ambient & Directional Lighting (Cobalt Blue #2C3480 and Electric Cyan)
    const ambientLight = new THREE.AmbientLight(0x0a192f, 1.8);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00d8ff, 3.0, 10);
    cyanPointLight.position.set(0, 1.5, 2.5);
    scene.add(cyanPointLight);

    const cobaltBackLight = new THREE.PointLight(0x2C3480, 4.0, 12);
    cobaltBackLight.position.set(0, -1.0, -1.5);
    scene.add(cobaltBackLight);

    // 4. Moving Futuristic 3D Background Grid (Slow organic rotation)
    const gridGeo = new THREE.PlaneGeometry(12, 12, 24, 24);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const backgroundGrid = new THREE.Mesh(gridGeo, gridMat);
    backgroundGrid.position.set(0, 0, -2.2);
    scene.add(backgroundGrid);

    // Background Cybernetic Radial Rings (venakala 3D UI motion)
    const ringGeo1 = new THREE.RingGeometry(1.4, 1.43, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00d8ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const bgRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    bgRing1.position.set(0, 0, -1.5);
    scene.add(bgRing1);

    const ringGeo2 = new THREE.RingGeometry(1.7, 1.72, 48);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x2C3480,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const bgRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    bgRing2.position.set(0, 0, -1.6);
    scene.add(bgRing2);

    // 5. Wireframe Male Cybernetic Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, -0.15, 0);
    scene.add(headGroup);

    // Cranium & Facial Wireframe Mesh (Anatomical male cranial proportions)
    const headGeo = new THREE.SphereGeometry(1.05, 36, 36);
    headGeo.scale(1.0, 1.32, 1.08);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x00d8ff,
      wireframe: true,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.65,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headGroup.add(headMesh);

    // Inner Solid Dark Core (prevents see-through clutter, giving depth like the 3D photo)
    const coreGeo = new THREE.SphereGeometry(0.96, 24, 24);
    coreGeo.scale(0.98, 1.28, 1.02);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    headGroup.add(coreMesh);

    // Neck & Collarbone Wireframe
    const neckGeo = new THREE.CylinderGeometry(0.52, 0.78, 0.7, 24, 6, true);
    const neckMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const neckMesh = new THREE.Mesh(neckGeo, neckMat);
    neckMesh.position.set(0, -1.35, -0.05);
    headGroup.add(neckMesh);

    // 6. Eyes with Automated Realistic Blinking
    const eyeGeo = new THREE.SphereGeometry(0.12, 20, 20);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      emissive: 0x00d8ff,
      emissiveIntensity: 0.5,
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.35, 0.22, 0.96);
    leftEye.scale.set(1.2, 0.7, 0.5);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.35, 0.22, 0.96);
    rightEye.scale.set(1.2, 0.7, 0.5);
    headGroup.add(rightEye);

    // 7. Jaw & Mouth Mesh with Real-Time Lip Sync Scaling
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.42, 0.98);
    headGroup.add(mouthGroup);

    const upperLipGeo = new THREE.BoxGeometry(0.48, 0.04, 0.08);
    const lipMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
    });
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.position.set(0, 0.03, 0);
    mouthGroup.add(upperLip);

    const lowerLipGeo = new THREE.BoxGeometry(0.46, 0.05, 0.08);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.set(0, -0.03, 0);
    mouthGroup.add(lowerLip);

    // Inner mouth glowing aperture
    const innerMouthGeo = new THREE.PlaneGeometry(0.42, 0.06);
    const innerMouthMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const innerMouth = new THREE.Mesh(innerMouthGeo, innerMouthMat);
    innerMouth.position.set(0, 0, -0.01);
    mouthGroup.add(innerMouth);

    // Chin / Lower Jaw contour
    const chinGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.35, 16, 3, true);
    const chinMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const chinMesh = new THREE.Mesh(chinGeo, chinMat);
    chinMesh.position.set(0, -0.22, 0.02);
    mouthGroup.add(chinMesh);

    // 8. Animation Loop (Breathing, Swaying, Automated Blink, Real-Time Lip Sync)
    const clock = new THREE.Clock();
    let currentMouthScale = 1.0;
    let currentEyeScale = 1.0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (document.hidden || container.clientWidth === 0) return;

      const time = clock.getElapsedTime();
      const currentAudio = audioLevelRef.current || 0;

      // --- A. Subtle Floating & Idle Organic Swaying (UI Motion) ---
      headGroup.position.y = -0.15 + Math.sin(time * 1.5) * 0.04;
      headGroup.rotation.y = Math.sin(time * 0.8) * 0.08;
      headGroup.rotation.x = Math.sin(time * 0.6) * 0.03;
      headGroup.rotation.z = Math.sin(time * 0.5) * 0.02;

      // --- B. Real-Time Lip Sync Scaling based on Audio Frequency ---
      const targetMouthScale = 1 + (currentAudio > 0.04 ? currentAudio * 2.8 : 0);
      currentMouthScale = THREE.MathUtils.lerp(currentMouthScale, targetMouthScale, 0.25);
      
      lowerLip.position.y = -0.03 - (currentMouthScale - 1) * 0.08;
      innerMouth.scale.y = currentMouthScale;
      chinMesh.position.y = -0.22 - (currentMouthScale - 1) * 0.05;

      // --- C. Automated Eye Blink Effect (Blinks naturally every 3.6 seconds) ---
      const blinkCycle = time % 3.6;
      const isBlink = blinkCycle < 0.16;
      const targetEyeScale = isBlink ? 0.08 : 1.0;
      currentEyeScale = THREE.MathUtils.lerp(currentEyeScale, targetEyeScale, 0.45);
      leftEye.scale.y = currentEyeScale * 0.7;
      rightEye.scale.y = currentEyeScale * 0.7;

      // --- D. Background Grid & Ring 3D UI Motion ---
      backgroundGrid.rotation.z = time * 0.05;
      bgRing1.rotation.z = -time * 0.08;
      bgRing2.rotation.z = time * 0.04;
      bgRing1.scale.setScalar(1.0 + Math.sin(time * 2.0) * 0.02);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      headGeo.dispose();
      headMat.dispose();
      gridGeo.dispose();
      gridMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
    };
  }, []);

  return <div ref={containerRef} className={`w-full h-full relative ${className}`} />;
}

export default function DasAi3DFace({ audioLevel = 0, className = "" }: DasAi3DFaceProps) {
  return (
    <div className={`w-full h-[450px] relative bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/20 shadow-2xl shadow-cyan-950/50 ${className}`}>
      {/* 3D Wireframe Canvas with Lip Sync, Automated Blinking & Background Motion */}
      <NativeThreeWireframeCanvas audioLevel={audioLevel} />

      {/* Cybernetic HUD Scanline and Ambient Lighting Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-cyan-500/5 via-transparent to-black/80" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,216,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px]" />

      {/* Overlay Status Badge */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-cyan-400/80 flex items-center gap-2 z-10 backdrop-blur-sm bg-black/40 px-3 py-1.5 rounded-lg border border-cyan-500/20">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
        DAS 3D VISION MATRIX ACTIVE
      </div>
    </div>
  );
}
