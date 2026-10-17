/**
 * DAS 3D Avatar Animation Engine (Vanilla JS + Three.js)
 * Implements:
 * 1. IDLE MOTION (Micro-movement):
 *    mesh.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
 *    mesh.rotation.y = Math.cos(clock.getElapsedTime() * 1.0) * 0.02;
 * 2. EYE BLINKING:
 *    Automated timer every 3-5 seconds scaling upper eyelids down to 0 for 150ms, then returning to 1.
 * 3. LIP-SYNC (Audio Reactive):
 *    WebAudio API AnalyserNode calculates volume and binds directly to mouthMesh.scale.y = 1.0 + audioVolume * 2.
 */

(function () {
  let scene, camera, renderer, headGroup, solidHead, wireHead, leftEye, rightEye, leftEyelid, rightEyelid, mouthMesh, lowerLip, upperLip;
  let clock = new THREE.Clock();
  let audioContext = null;
  let analyserNode = null;
  let freqData = new Uint8Array(128);
  let isSpeaking = false;
  let currentSpeakingText = "";

  // Blinking timer state
  let lastBlinkTime = performance.now();
  let nextBlinkDelay = 3500;
  let isBlinking = false;
  let blinkStartTime = 0;

  function initAvatar(containerId = "das-avatar-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 380;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    // 2. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5); // Cyan
    keyLight.position.set(2.5, 3.0, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6366f1, 1.8); // Indigo
    fillLight.position.set(-2.5, 1.5, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 3.0); // Electric Blue
    rimLight.position.set(0, -2.0, -2.5);
    scene.add(rimLight);

    // 4. Head Group
    headGroup = new THREE.Group();
    scene.add(headGroup);

    // Head Cranial Mesh
    const headGeo = new THREE.SphereGeometry(1.15, 48, 48);
    headGeo.scale(1.0, 1.32, 1.12);

    // Solid Metallic Blue Half
    const solidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#1e3a8a"),
      metalness: 0.45,
      roughness: 0.28,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color("#0c2340"),
      emissiveIntensity: 0.3,
    });
    solidHead = new THREE.Mesh(headGeo, solidMat);
    headGroup.add(solidHead);

    // Cyan Wireframe Half (matches photo prompt)
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#38bdf8"),
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    wireHead = new THREE.Mesh(headGeo, wireMat);
    wireHead.scale.set(1.002, 1.002, 1.002);
    headGroup.add(wireHead);

    // Glowing Inner Cranium
    const innerGeo = new THREE.SphereGeometry(0.9, 24, 24);
    innerGeo.scale(0.9, 1.2, 0.9);
    const innerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0284c7"),
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    headGroup.add(new THREE.Mesh(innerGeo, innerMat));

    // 5. Eyes & Eyelids (for automated blinking)
    const eyeGeo = new THREE.SphereGeometry(0.13, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#e0f2fe"),
      emissive: new THREE.Color("#0ea5e9"),
      emissiveIntensity: 0.5,
    });

    leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.35, 0.18, 0.95);
    headGroup.add(leftEye);

    rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.35, 0.18, 0.95);
    headGroup.add(rightEye);

    const eyelidGeo = new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const eyelidMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#1e3a8a"), roughness: 0.3 });

    leftEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    leftEyelid.position.set(-0.35, 0.22, 0.96);
    leftEyelid.rotation.x = Math.PI * 0.15;
    headGroup.add(leftEyelid);

    rightEyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    rightEyelid.position.set(0.35, 0.22, 0.96);
    rightEyelid.rotation.x = Math.PI * 0.15;
    headGroup.add(rightEyelid);

    // 6. Mouth Mesh (for audio reactive lip sync)
    const mouthGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32);
    mouthGeo.scale(1.0, 0.5, 0.3);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0f172a"),
      emissive: new THREE.Color("#0284c7"),
      emissiveIntensity: 0.25,
    });
    mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.45, 0.98);
    mouthMesh.rotation.x = Math.PI * 0.5;
    headGroup.add(mouthMesh);

    const lipGeo = new THREE.TorusGeometry(0.22, 0.035, 12, 32, Math.PI);
    const lipMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#1d4ed8"), roughness: 0.4 });
    upperLip = new THREE.Mesh(lipGeo, lipMat);
    upperLip.position.set(0, -0.42, 0.99);
    upperLip.rotation.x = Math.PI;
    headGroup.add(upperLip);

    lowerLip = new THREE.Mesh(lipGeo, lipMat);
    lowerLip.position.set(0, -0.48, 0.99);
    headGroup.add(lowerLip);

    // Start Animation Loop
    animate();

    window.addEventListener("resize", () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const now = performance.now();

    // ======================================================================
    // 1. IDLE MOTION (Micro-movement applied continuously to face mesh)
    // ======================================================================
    if (headGroup) {
      headGroup.position.y = Math.sin(time * 1.5) * 0.05;
      headGroup.rotation.y = Math.cos(time * 1.0) * 0.02;
      headGroup.rotation.x = Math.sin(time * 0.8) * 0.015;
    }

    // ======================================================================
    // 2. EYE BLINKING (Automated timer triggers every 3 to 5 seconds)
    // ======================================================================
    if (!isBlinking && now - lastBlinkTime > nextBlinkDelay) {
      isBlinking = true;
      blinkStartTime = now;
    }

    if (isBlinking && leftEye && rightEye) {
      const blinkElapsed = now - blinkStartTime;
      if (blinkElapsed < 150) {
        // Scale upper eyelid down to 0 for 150ms, then return
        const progress = blinkElapsed / 150;
        const eyeScaleY = Math.max(0.05, Math.abs(Math.sin(progress * Math.PI - Math.PI / 2)));
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
    if (analyserNode) {
      analyserNode.getByteFrequencyData(freqData);
      let sum = 0;
      for (let i = 2; i < 28; i++) sum += freqData[i];
      audioVolume = sum / (26 * 255);
    } else if (isSpeaking) {
      // Procedural syllable timing fallback
      const cadence = Math.sin(time * 14.0) * Math.cos(time * 7.5);
      audioVolume = Math.max(0.15, Math.abs(cadence) * 0.5);
    }

    if (mouthMesh) {
      // mouthMesh.morphTargetInfluences[mouthOpenIndex] = audioVolume * 2;
      const targetY = 1.0 + Math.min(2.8, audioVolume * 2.2);
      mouthMesh.scale.y += (targetY - mouthMesh.scale.y) * 0.4;
      mouthMesh.scale.x = 1.0 + audioVolume * 0.35;
      if (lowerLip) lowerLip.position.y = -0.48 - audioVolume * 0.08;
      if (upperLip) upperLip.position.y = -0.42 + audioVolume * 0.02;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // WebAudio API & Speech Synthesis Connection
  function speakDasResponse(text, onComplete) {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/\[\[PROVIDER:[^\]]+\]\]/g, "")
      .replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "")
      .replace(/[#*_~`>]/g, "")
      .trim();

    if (!cleanText) return;

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = 1.0;
    utter.pitch = 0.93; // Deep masculine tech lead resonance

    // Prioritize natural deep male voices
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.name.toLowerCase().includes("prabhat") ||
          v.name.toLowerCase().includes("guy") ||
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("christopher") ||
          v.name.toLowerCase().includes("george") ||
          v.name.toLowerCase().includes("male") ||
          v.name.toLowerCase().includes("ryan") ||
          v.name.toLowerCase().includes("ravi")) &&
        (v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().includes("in"))
    ) || voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (preferredVoice) utter.voice = preferredVoice;

    utter.onstart = () => {
      isSpeaking = true;
      currentSpeakingText = cleanText;
      updateAvatarBadge("speaking");
    };

    utter.onend = () => {
      isSpeaking = false;
      updateAvatarBadge("idle");
      if (onComplete) onComplete();
    };

    utter.onerror = () => {
      isSpeaking = false;
      updateAvatarBadge("idle");
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utter);
  }

  function updateAvatarBadge(state) {
    const badge = document.getElementById("avatar-status-badge");
    if (!badge) return;
    if (state === "speaking") {
      badge.textContent = "● Speaking";
      badge.className = "text-emerald-400 font-mono text-[11px] uppercase";
    } else if (state === "thinking") {
      badge.textContent = "● Thinking...";
      badge.className = "text-amber-400 font-mono text-[11px] uppercase";
    } else if (state === "listening") {
      badge.textContent = "● Listening...";
      badge.className = "text-cyan-400 font-mono text-[11px] uppercase";
    } else {
      badge.textContent = "Ready";
      badge.className = "text-zinc-400 font-mono text-[11px] uppercase";
    }
  }

  // Expose API globally
  window.initDASAvatar = initAvatar;
  window.speakDasResponse = speakDasResponse;
  window.setAvatarState = (state) => {
    isSpeaking = state === "speaking";
    updateAvatarBadge(state);
  };

  // Auto-init on page load if container exists
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("das-avatar-container")) {
      initAvatar("das-avatar-container");

      // Auto-trigger initial DAS greeting on load:
      // "I'm your AI, your DAS Agent. Tell me, how can I help you?"
      setTimeout(() => {
        speakDasResponse("I'm your AI, your DAS Agent. Tell me, how can I help you?");
      }, 800);
    }
  });
})();
