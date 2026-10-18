"""
Pathfinder DAS Agent: Standalone Web Interface & Studio Controller (ui.py)
Implements:
1. Dead-Center Viewport: 3D Holographic Cybernetic Avatar (Three.js WebGL / Mesh Morphing Canvas)
2. Right-Side Glassmorphic Chat HUD: Typing input & live microphone input
3. Zero OS Automation tools: Strictly isolated to Pathfinder placement platform context
4. Direct WebSocket binding to Gemini Live API with Puck (Male) voice profile
5. Synchronous audio playback, WebAudio AnalyserNode volume, and mouth lip-sync
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse

from core.avatar import avatar_controller
from core.viseme import viseme_engine

ui_router = APIRouter()

ROOT_DIR = Path(__file__).resolve().parent

# Pathfinder System Knowledge Context
PATHFINDER_KNOWLEDGE_SUMMARY = """
You are DAS, the senior AI Career & Placement Coach for Pathfinder 2.0.
Your knowledge is STRICTLY isolated to the Pathfinder platform:
- Core Platform: Placement probability prediction, skill gap analysis, and eligibility checks.
- Departments: CSE, CSM, AIML (44.6 LPA highest, 9.1 LPA avg, 86.5% rate), ECE (32 LPA), EEE (24.5 LPA), MECH (18 LPA). Total 972 cohort placement records.
- 6-Week DSA Roadmap: Week 1 Arrays & Hashing, Week 2 Two Pointers & Slid Window, Week 3 Linked Lists & Stacks, Week 4 Trees & BSTs, Week 5 Graphs (BFS/DFS), Week 6 DP & Mock Interviews.
- Tech Stack: FastAPI backend (Python 3.11), React 19 / Vite client, SQLite WAL mode, Gemini 2.0 Flash engine.
- No OS automation: You have no laptop or OS access. Politely refuse any OS automation or local file requests.
"""


def get_ui_html() -> str:
    """Returns the complete, responsive Cybernetic 3D DAS Studio HTML application."""
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pathfinder · DAS AI Voice Agent (Live 3D Studio)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    body {{
      font-family: 'Outfit', sans-serif;
      background-color: #030712;
      color: #f1f5f9;
      margin: 0;
      padding: 0;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
    }}
    .glow-cyan {{
      box-shadow: 0 0 35px rgba(56, 189, 248, 0.25);
    }}
    .glow-blue {{
      box-shadow: 0 0 50px rgba(30, 58, 138, 0.35);
    }}
    /* Custom scrollbar */
    ::-webkit-scrollbar {{
      width: 5px;
    }}
    ::-webkit-scrollbar-track {{
      background: transparent;
    }}
    ::-webkit-scrollbar-thumb {{
      background: rgba(56, 189, 248, 0.2);
      border-radius: 9999px;
    }}
  </style>
</head>
<body class="flex h-screen w-screen bg-[#030712] relative select-none">

  <!-- Background Cybernetic Grid -->
  <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0e1a2f15_1px,transparent_1px),linear-gradient(to_bottom,#0e1a2f15_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
  <div class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-[120px]"></div>

  <!-- Top Navigation Header -->
  <header class="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
    <div class="flex items-center gap-3">
      <div class="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 font-mono font-bold text-slate-950 text-sm">
        P
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-wide text-white flex items-center gap-2">
          PATHFINDER <span class="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">DAS AGENT v2.0</span>
        </h1>
        <p class="text-[11px] text-slate-400 font-medium">Autonomous 3D Placement & Career Intelligence Coach</p>
      </div>
    </div>

    <!-- Telemetry & Status Badges -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/50 text-[11px] font-mono text-cyan-200">
        <span id="das-status-indicator" class="h-2 w-2 rounded-full bg-emerald-400"></span>
        <span id="das-status-label" class="uppercase">READY</span>
      </div>
      <div class="text-[11px] font-mono text-slate-400 hidden sm:block">
        Voice: <span class="text-white font-semibold">Puck (Male)</span>
      </div>
      <div class="text-[11px] font-mono text-slate-400 hidden sm:block">
        Scope: <span class="text-emerald-400 font-semibold">Pathfinder Dedicated</span>
      </div>
    </div>
  </header>

  <!-- MAIN DUAL-PANE WORKSPACE -->
  <main class="relative z-10 flex h-full w-full pt-16">

    <!-- 1. CENTER STAGE: 3D CYBERNETIC AVATAR VIEWPORT -->
    <section class="relative flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
      
      <!-- Ambient Lighting Ring -->
      <div id="avatar-glow-ring" class="pointer-events-none absolute h-[460px] w-[460px] rounded-full border border-cyan-500/20 bg-cyan-500/5 blur-2xl transition-all duration-500"></div>

      <!-- 3D Canvas Container (Dead-Center Framing) -->
      <div id="canvas-wrapper" class="relative z-10 flex flex-col items-center justify-center transition-transform duration-75">
        <div id="das-3d-viewport" class="w-[380px] h-[480px] sm:w-[440px] sm:h-[540px] flex items-center justify-center rounded-3xl border border-cyan-500/20 bg-[#060a14]/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          <!-- Live Telemetry Tag -->
          <div class="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/60 px-3 py-1 text-[10px] font-mono text-cyan-300">
            <span class="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>CYBERNETIC RIG ACTIVE</span>
          </div>

          <div class="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-mono text-slate-400">
            <span>FPS: </span><span id="val-fps" class="text-emerald-400 font-bold">60</span>
          </div>

          <!-- Bottom Live Subtitle Banner -->
          <div id="das-live-caption-box" class="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md text-center transition-all opacity-95">
            <p id="das-live-caption-text" class="text-xs text-cyan-100 font-medium tracking-wide">
              "I'm your AI, your DAS Agent. Tell me, how can I help you?"
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. RIGHT-SIDE FLOATING GLASSMORPHIC CHAT HUD -->
    <aside class="relative z-20 flex flex-col w-[380px] sm:w-[420px] h-full border-l border-white/10 bg-slate-950/70 backdrop-blur-2xl">
      
      <!-- Panel Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-cyan-400"></span>
          <h2 class="text-xs font-bold tracking-wider uppercase text-slate-200">Interactive Career Coach</h2>
        </div>
        <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          Dual Audio & Chat
        </span>
      </div>

      <!-- Chat History Log -->
      <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <div class="flex gap-2.5 items-start">
          <div class="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 text-slate-950 text-xs font-bold">
            D
          </div>
          <div class="rounded-2xl rounded-tl-sm border border-cyan-500/20 bg-cyan-950/30 p-3 text-xs leading-relaxed text-slate-200 shadow-md">
            I'm your AI, your DAS Agent. Tell me, how can I help you?
          </div>
        </div>
      </div>

      <!-- Clean Dedicated Conversational Input Panel -->
      <div class="p-4 border-t border-white/10 bg-slate-950/90 flex flex-col gap-2.5">
        
        <!-- Voice Toggle Controls & Session Status -->
        <div class="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span id="das-voice-status">Voice Ready (Puck)</span>
          </div>
          <button
            type="button"
            id="btn-voice-toggle"
            onclick="toggleAutoVoice()"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all text-[11px] font-semibold cursor-pointer"
          >
            <span id="voice-toggle-label">Voice Output ON</span>
          </button>
        </div>

        <form id="das-chat-form" onsubmit="handleChatSubmit(event)" class="flex items-center gap-2">
          
          <!-- Microphone Button -->
          <button type="button" id="btn-mic" onclick="toggleMicrophone()" class="h-11 w-11 rounded-2xl border border-cyan-500/30 bg-cyan-950/60 flex items-center justify-center text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all shadow-md group shrink-0" title="Click to speak">
            <svg id="mic-icon" class="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 02-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <!-- Text Input Field -->
          <input
            type="text"
            id="chat-input"
            placeholder="Type your question for DAS..."
            class="flex-1 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
            autocomplete="off"
          />

          <!-- Send Button -->
          <button type="submit" id="btn-send" class="h-11 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center transition-all shadow-lg shadow-cyan-500/20 shrink-0">
            <span>Send</span>
          </button>
        </form>
      </div>
    </aside>
  </main>

  <!-- ================= THREE.JS & GEMINI LIVE PIPELINE SCRIPT ================= -->
  <script>
    const INITIAL_GREETING = "I'm your AI, your DAS Agent. Tell me, how can I help you?";
    let geminiApiKey = "{gemini_key}";

    // 1. WebAudio API & Analyser Initialization
    let audioContext = null;
    let analyserNode = null;
    let nextAudioPlayTime = 0;
    const freqData = new Uint8Array(128);
    let isSpeaking = false;
    let geminiWs = null;

    function initWebAudio() {{
      if (audioContext) return;
      try {{
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx({{ sampleRate: 24000 }});
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.2;
        analyserNode.connect(audioContext.destination);
      }} catch (err) {{
        console.warn("[WebAudio] Init error:", err);
      }}
    }}

    // 2. Three.js 3D Viewport Scene
    let scene, camera, renderer, headGroup, solidHead, wireHead, leftEye, rightEye, mouthMesh;
    let clock = new THREE.Clock();
    let lastBlinkTime = performance.now();
    let isBlinking = false;
    let blinkStartTime = 0;
    let frameCount = 0;
    let lastFpsCalc = performance.now();

    function init3DAvatar() {{
      const container = document.getElementById("das-3d-viewport");
      if (!container) return;

      const width = container.clientWidth || 400;
      const height = container.clientHeight || 500;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0, 3.8);

      renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: true }});
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);

      // Studio Lighting
      const ambient = new THREE.AmbientLight(0xdbeafe, 0.85);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.8); // Cyan
      keyLight.position.set(-2.5, 3.0, 3.0);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x1d4ed8, 2.2); // Metallic Deep Blue
      fillLight.position.set(2.5, 1.5, 2.5);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x67e8f9, 3.2); // Top rim
      rimLight.position.set(0, 3.5, -2.0);
      scene.add(rimLight);

      // Hierarchical Head Group
      headGroup = new THREE.Group();
      scene.add(headGroup);

      // Head Cranium Geometry
      const headGeo = new THREE.SphereGeometry(1.15, 64, 64);
      headGeo.scale(1.0, 1.34, 1.14);

      // Right Side: Solid Glossy Metallic Blue
      const solidMat = new THREE.MeshPhysicalMaterial({{
        color: new THREE.Color("#185a9d"),
        metalness: 0.5,
        roughness: 0.22,
        clearcoat: 0.85,
        clearcoatRoughness: 0.15,
        emissive: new THREE.Color("#0c2340"),
        emissiveIntensity: 0.25,
      }});
      solidHead = new THREE.Mesh(headGeo, solidMat);
      headGroup.add(solidHead);

      // Left Side: Cyan Holographic Wireframe Matrix
      const wireMat = new THREE.MeshBasicMaterial({{
        color: new THREE.Color("#38bdf8"),
        wireframe: true,
        transparent: true,
        opacity: 0.75,
      }});
      wireHead = new THREE.Mesh(headGeo, wireMat);
      wireHead.scale.set(1.003, 1.003, 1.003);
      headGroup.add(wireHead);

      // Split Clipping Plane
      const leftClip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
      const rightClip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
      solidMat.clippingPlanes = [leftClip];
      wireMat.clippingPlanes = [rightClip];
      renderer.localClippingEnabled = true;

      // Load Blue Cybernetic Face Texture onto Solid Side
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load("/avatar/das_head.jpg", (tex) => {{
        tex.colorSpace = THREE.SRGBColorSpace;
        solidMat.map = tex;
        solidMat.needsUpdate = true;
      }}, undefined, () => {{}});

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.13, 24, 24);
      const eyeMat = new THREE.MeshStandardMaterial({{
        color: new THREE.Color("#f0f9ff"),
        emissive: new THREE.Color("#0284c7"),
        emissiveIntensity: 0.35
      }});
      leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.35, 0.20, 0.98);
      headGroup.add(leftEye);

      rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.35, 0.20, 0.98);
      headGroup.add(rightEye);

      // Mouth Mesh
      const mouthGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 32);
      mouthGeo.scale(1.0, 0.5, 0.35);
      const mouthMat = new THREE.MeshStandardMaterial({{
        color: new THREE.Color("#060a14"),
        emissive: new THREE.Color("#0284c7"),
        emissiveIntensity: 0.2,
      }});
      mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
      mouthMesh.position.set(0, -0.46, 0.98);
      mouthMesh.rotation.x = Math.PI * 0.5;
      headGroup.add(mouthMesh);

      // Start render loop
      animateAvatar();
    }}

    function animateAvatar() {{
      requestAnimationFrame(animateAvatar);

      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // FPS tracking
      frameCount++;
      if (now - lastFpsCalc >= 1000) {{
        const fpsElem = document.getElementById("val-fps");
        if (fpsElem) fpsElem.textContent = String(Math.round((frameCount * 1000) / (now - lastFpsCalc)));
        frameCount = 0;
        lastFpsCalc = now;
      }}

      // 1. Idle Breathing Micro-Motion & Continuous Sine Translation
      headGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05;
      headGroup.rotation.y = Math.cos(elapsedTime * 1.0) * 0.025;
      headGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.015;

      const wrapper = document.getElementById("canvas-wrapper");
      if (wrapper) {{
        wrapper.style.transform = `translateY(${{Math.sin(elapsedTime * 1.5) * 5}}px)`;
      }}

      // 2. Procedural Eye Blinking (Every 3-5 seconds, 150ms duration)
      if (!isBlinking && now - lastBlinkTime > 3800) {{
        isBlinking = true;
        blinkStartTime = now;
      }}

      if (isBlinking) {{
        const elapsed = now - blinkStartTime;
        if (elapsed < 150) {{
          const factor = Math.sin((elapsed / 150) * Math.PI);
          const eyeScaleY = Math.max(0.05, 1.0 - factor * 0.95);
          leftEye.scale.y = eyeScaleY;
          rightEye.scale.y = eyeScaleY;
        }} else {{
          isBlinking = false;
          lastBlinkTime = now;
          leftEye.scale.y = 1.0;
          rightEye.scale.y = 1.0;
        }}
      }}

      // 3. Audio Viseme Mouth Morphing bound to AnalyserNode
      let audioVolume = 0;
      if (analyserNode && isSpeaking) {{
        analyserNode.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 2; i < 28; i++) sum += freqData[i];
        audioVolume = sum / (26 * 255);
      }} else if (isSpeaking) {{
        audioVolume = Math.abs(Math.sin(elapsedTime * 14.0) * 0.45);
      }}

      if (mouthMesh) {{
        const targetScaleY = 1.0 + Math.min(2.8, audioVolume * 2.4);
        mouthMesh.scale.y += (targetScaleY - mouthMesh.scale.y) * 0.45;
        mouthMesh.scale.x = 1.0 + audioVolume * 0.35;
      }}

      renderer.render(scene, camera);
    }}

    // 3. Gemini Live WebSocket Connection
    async function connectGeminiLive() {{
      initWebAudio();

      // Retrieve key if not inlined
      if (!geminiApiKey) {{
        try {{
          const res = await fetch("/api/gemini-live-key");
          if (res.ok) {{
            const data = await res.json();
            geminiApiKey = data.apiKey || data.key || "";
          }}
        }} catch {{}}
      }}

      if (!geminiApiKey) {{
        console.warn("[Gemini Live] Missing API Key. Fallback to server assistant.");
        speakGreetingAloud();
        return;
      }}

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${{geminiApiKey}}`;

      try {{
        geminiWs = new WebSocket(wsUrl);

        geminiWs.onopen = () => {{
          console.log("[Gemini Live] Connected to Gemini Live API.");
          updateStatus("ready", "READY");

          // Send Setup Payload: model gemini-2.0-flash-exp, voice Puck, DAS persona
          const setupPayload = {{
            setup: {{
              model: "models/gemini-2.0-flash-exp",
              generationConfig: {{
                responseModalities: ["AUDIO"],
                speechConfig: {{
                  voiceConfig: {{
                    prebuiltVoiceConfig: {{ voiceName: "Puck" }}
                  }}
                }}
              }},
              systemInstruction: {{
                parts: [{{ text: "{PATHFINDER_KNOWLEDGE_SUMMARY.strip().replace(chr(10), ' ')}" }}]
              }}
            }}
          }};
          geminiWs.send(JSON.stringify(setupPayload));

          // Trigger initial greeting: "I'm your AI, your DAS Agent. Tell me, how can I help you?"
          setTimeout(() => {{
            speakGreetingAloud();
          }}, 600);
        }};

        geminiWs.onmessage = async (event) => {{
          try {{
            let data;
            if (event.data instanceof Blob) {{
              data = JSON.parse(await event.data.text());
            }} else {{
              data = JSON.parse(event.data);
            }}

            const parts = data.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {{
              if (part.text) {{
                appendChatMessage("das", part.text);
                updateCaption(part.text);
              }}
              if (part.inlineData?.data) {{
                playPcmChunk(part.inlineData.data);
              }}
            }}

            if (data.serverContent?.turnComplete) {{
              updateStatus("ready", "READY");
            }}
          }} catch (e) {{
            console.error("[Gemini Live] Message parse error:", e);
          }}
        }};

        geminiWs.onerror = () => {{
          console.warn("[Gemini Live] WebSocket error. Using fallback TTS.");
          speakGreetingAloud();
        }};
      }} catch (e) {{
        console.warn("[Gemini Live] Connection failed:", e);
        speakGreetingAloud();
      }}
    }}

    // Playback 24kHz PCM Audio from Gemini Live
    function playPcmChunk(base64Data) {{
      if (!audioContext) initWebAudio();
      if (audioContext.state === "suspended") audioContext.resume();

      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

      const buffer = audioContext.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(analyserNode);

      const now = audioContext.currentTime;
      const startTime = Math.max(now, nextAudioPlayTime);
      source.start(startTime);
      nextAudioPlayTime = startTime + buffer.duration;

      isSpeaking = true;
      updateStatus("speaking", "SPEAKING");

      source.onended = () => {{
        if (audioContext.currentTime >= nextAudioPlayTime - 0.05) {{
          isSpeaking = false;
          updateStatus("ready", "READY");
        }}
      }};
    }}

    let autoVoiceEnabled = true;

    function toggleAutoVoice() {{
      autoVoiceEnabled = !autoVoiceEnabled;
      const lbl = document.getElementById("voice-toggle-label");
      const st = document.getElementById("das-voice-status");
      if (lbl) lbl.textContent = autoVoiceEnabled ? "Voice Output ON" : "Voice Output MUTED";
      if (st) st.textContent = autoVoiceEnabled ? "Voice Ready (Puck)" : "Muted";
      if (!autoVoiceEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {{
        window.speechSynthesis.cancel();
      }}
    }}

    // Spoken Greeting Aloud with Browser SpeechSynthesis Fallback
    function speakGreetingAloud(text = INITIAL_GREETING) {{
      if (!autoVoiceEnabled) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 0.95; // Deep male resonance

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => (v.name.includes("Guy") || v.name.includes("David") || v.name.includes("Male") || v.name.includes("Prabhat")) && v.lang.startsWith("en")) || voices.find(v => v.lang.startsWith("en"));
      if (preferred) utter.voice = preferred;

      utter.onstart = () => {{
        isSpeaking = true;
        updateStatus("speaking", "SPEAKING");
        updateCaption(text);
      }};
      utter.onend = () => {{
        isSpeaking = false;
        updateStatus("ready", "READY");
      }};
      window.speechSynthesis.speak(utter);
    }}

    // Chat UI Helpers
    function appendChatMessage(sender, text) {{
      const container = document.getElementById("chat-messages");
      if (!container) return;

      const msgDiv = document.createElement("div");
      msgDiv.className = `flex gap-2.5 items-start ${{sender === 'user' ? 'justify-end' : ''}}`;

      if (sender === "user") {{
        msgDiv.innerHTML = `
          <div class="rounded-2xl rounded-tr-sm bg-cyan-600 px-4 py-2.5 text-xs text-slate-950 font-medium shadow-md max-w-[80%]">
            ${{text}}
          </div>
        `;
      }} else {{
        msgDiv.innerHTML = `
          <div class="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 text-slate-950 text-xs font-bold">
            D
          </div>
          <div class="rounded-2xl rounded-tl-sm border border-cyan-500/20 bg-cyan-950/30 p-3 text-xs leading-relaxed text-slate-200 shadow-md max-w-[80%]">
            ${{text}}
          </div>
        `;
      }}
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;
    }}

    function updateCaption(text) {{
      const elem = document.getElementById("das-live-caption-text");
      if (elem) elem.textContent = `"${{text}}"`;
    }}

    function updateStatus(state, label) {{
      const ind = document.getElementById("das-status-indicator");
      const lbl = document.getElementById("das-status-label");
      if (lbl) lbl.textContent = label;
      if (ind) {{
        ind.className = `h-2 w-2 rounded-full ${{
          state === 'speaking' ? 'bg-emerald-400 animate-ping' :
          state === 'thinking' ? 'bg-amber-400 animate-spin' :
          state === 'listening' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-400'
        }}`;
      }}
    }}

    // Handle User Input Submission
    async function handleChatSubmit(e) {{
      e.preventDefault();
      const input = document.getElementById("chat-input");
      const text = input.value.trim();
      if (!text) return;

      input.value = "";
      appendChatMessage("user", text);
      updateStatus("thinking", "THINKING");

      // 1. Send via Gemini Live WebSocket if connected
      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {{
        const clientContent = {{
          clientContent: {{
            turns: [{{ role: "user", parts: [{{ text }}] }}],
            turnComplete: true
          }}
        }};
        geminiWs.send(JSON.stringify(clientContent));
        return;
      }}

      // 2. Fallback to Local Pathfinder REST endpoint
      try {{
        const resp = await fetch("/api/chat", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify({{ message: text }})
        }});
        if (resp.ok) {{
          const res = await resp.json();
          const reply = res.reply || "I am connected to your Pathfinder candidate profile.";
          appendChatMessage("das", reply);
          speakGreetingAloud(reply);
        }} else {{
          const errMsg = "I am focusing purely on your Pathfinder placement preparation. How can I help with your roadmap?";
          appendChatMessage("das", errMsg);
          speakGreetingAloud(errMsg);
        }}
      }} catch {{
        const errMsg = "I am your Pathfinder Career Coach. Ask me about cutoffs, DSA roadmaps, or resumes!";
        appendChatMessage("das", errMsg);
        speakGreetingAloud(errMsg);
      }}
    }}

    function sendQuickPrompt(text) {{
      const input = document.getElementById("chat-input");
      if (input) {{
        input.value = text;
        document.getElementById("das-chat-form").dispatchEvent(new Event("submit"));
      }}
    }}

    // Microphone Input via Web SpeechRecognition
    let recognition = null;
    let isMicActive = false;

    function toggleMicrophone() {{
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {{
        alert("Microphone recognition is not supported in this browser. Please type in the chat.");
        return;
      }}

      const micBtn = document.getElementById("btn-mic");

      if (isMicActive) {{
        if (recognition) recognition.stop();
        isMicActive = false;
        micBtn.classList.remove("bg-rose-500", "text-white", "animate-pulse");
        updateStatus("ready", "READY");
        return;
      }}

      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {{
        isMicActive = true;
        micBtn.classList.add("bg-rose-500", "text-white", "animate-pulse");
        updateStatus("listening", "LISTENING...");
      }};

      recognition.onresult = (event) => {{
        const transcript = event.results[0][0].transcript;
        if (transcript) {{
          const input = document.getElementById("chat-input");
          input.value = transcript;
          document.getElementById("das-chat-form").dispatchEvent(new Event("submit"));
        }}
      }};

      recognition.onend = () => {{
        isMicActive = false;
        micBtn.classList.remove("bg-rose-500", "text-white", "animate-pulse");
        updateStatus("ready", "READY");
      }};

      recognition.onerror = () => {{
        isMicActive = false;
        micBtn.classList.remove("bg-rose-500", "text-white", "animate-pulse");
        updateStatus("ready", "READY");
      }};

      recognition.start();
    }}

    // Auto-init on page load
    window.addEventListener("DOMContentLoaded", () => {{
      init3DAvatar();
      connectGeminiLive();
    }});
  </script>
</body>
</html>
"""


@ui_router.get("/", response_class=HTMLResponse)
@ui_router.get("/das-agent", response_class=HTMLResponse)
def get_das_agent_ui():
    """Serves the standalone website-dedicated DAS Voice Agent Studio."""
    return HTMLResponse(content=get_ui_html())


@ui_router.get("/api/das-mesh")
def get_das_mesh():
    """Returns the 3D Cybernetic Face Mesh definition and landmarks."""
    return avatar_controller.mesh.get_mesh_definition()


@ui_router.get("/api/gemini-live-key")
def get_gemini_live_key():
    """Safely passes the Gemini API Key to client for Gemini Live WebSocket connection."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return {"apiKey": key, "key": key}


@ui_router.websocket("/ws/das-live")
async def das_live_websocket(websocket: WebSocket):
    """
    Bidirectional WebSocket stream between the frontend 3D viewport and Python backend.
    Streams 3D viseme telemetry, speech, and chat frames.
    """
    await websocket.accept()
    try:
        # Initial greeting frame
        await websocket.send_json({
            "type": "greeting",
            "text": "I'm your AI, your DAS Agent. Tell me, how can I help you?",
            "state": "ready"
        })

        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            msg_type = data.get("type")

            if msg_type == "audio_pcm":
                # Raw PCM chunk received
                import base64
                pcm_bytes = base64.b64decode(data.get("pcm_base64", ""))
                visemes = avatar_controller.on_audio_pcm_received(pcm_bytes)
                await websocket.send_json({
                    "type": "viseme_frame",
                    "visemes": visemes.to_dict(),
                    "frame": avatar_controller.get_current_frame()
                })
            elif msg_type == "audio_complete":
                avatar_controller.on_audio_stream_complete()
                await websocket.send_json({
                    "type": "state_change",
                    "state": "idle"
                })
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
