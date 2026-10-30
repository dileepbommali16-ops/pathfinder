# Pathfinder 2.0 — Autonomous Agent Engineering Guide (CLAUDE.md)

Welcome, Lead AI Engineer. You have full autonomous execution access over the Pathfinder 2.0 repository.
Always address the user respectfully as **Boss** and respond in clear, direct English.

---

## 1. Project Overview & Architecture

Pathfinder 2.0 is an AI-powered Career Guidance and Technical Interview Preparation Platform featuring an **Omnipresent 3D Cyber Co-Pilot (DAS)**.

### Tech Stack:
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide React
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Audio Engine**: Web Audio API singleton (`audioIO.ts`), AnalyserNode for syllable-driven lip-sync
- **Backend**: FastAPI, Python 3.11, Google Gemini API (`backend/.env`)

---

## 2. Core 3D Cyborg & Ambient Co-Pilot Specs

### A. 3D Avatar (`client/src/agent/Avatar3D.tsx`):
- **Model**: `avatar.glb` (Cybernetic face mesh).
- **Ruby-Red Glowing Eyes**:
  - Meshes: `Object_52`, `Object_53`, `Object_55`, `Object_56`.
  - Material: `MeshStandardMaterial` with emissive `#ff0033`, intensity `3.5`, toneMapped `false`.
  - Outer ceramic ring `Object_58` must stay clean ceramic white (never tint outer ring red).
  - Target bone names stripped of dots (`Kito6_FaceMesh_EyeL_20` / `EyeR_21`).
- **Jaw Lip-Sync**:
  - Driven by real-time audio FFT volume from Web Audio AnalyserNode.
  - Controls: Lower jaw bone (`Object_5`) and chin plate (`Object_60`).
  - Right cheek bone `JawR_19` is frozen to prevent face distortion.
  - Comical bobbing (`speechNod`) is disabled for realistic natural speech.

### B. Dual-Mode Ambient Co-Pilot (`client/src/agent/AgentLayout.tsx`):
- **Full Coach Mode** (`activeTab === 'coach'`):
  - Large centered 3D viewport, full chat transcript, mic toggle, and waveform.
- **Omnipresent Ambient HUD** (`activeTab !== 'coach'`):
  - Floating holographic glass pill pinned at `fixed bottom-6 right-6 z-50`.
  - Live 3D cyborg face that tracks the cursor and naturally lip-syncs whenever DAS speaks.
  - Floating speech subtitle bubble with live transcription.
  - 1-tap mic button (`[Space]` or click) to talk from any screen.
  - Quick navigation chips: `🚀 Roadmap`, `🎯 Interview`, `📁 Blueprints`, `📄 ATS Resume`.
- **Root Elevation (`client/src/pages/Home.tsx`)**:
  - Mounted persistently with `isAmbient={activeTab !== "coach"}` so the 3D agent follows the student across every tab (`overview`, `roadmap`, `interview`, `projects`, `analytics`).

---

## 3. Essential Commands & Verification

- **Build Client**: `npm run build` (Must always pass with 0 errors).
- **Dev Server**: `npm run dev` (Runs Vite on `http://localhost:5173`).
- **Backend Server**: `python -m uvicorn backend.main:app --port 8000`
- **Git Status**: `git status`

---

## 4. Autonomous Agent Directives

1. **Be Autonomous (No Questions Allowed)**: You have pre-approved permissions to inspect files, edit code, and run terminal commands. Execute tasks end-to-end. NEVER stop to ask clarifying questions or ask "what would you like to work on?". Directly make the edits and write the code.
2. **Preserve Integrity**: Never break the 3D eye glow, jaw lip-sync, or audio continuity when making changes.
3. **Verify Everything**: After modifying code, always run `npm run build` to confirm zero compilation errors before reporting done to Boss.

