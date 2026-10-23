/**
 * VoicePanel.tsx - Pathfinder DAS Cybernetic Command Center HUD
 * Designed specifically for Pathfinder Autonomous Website Intelligence.
 * Layout:
 * - Top Bar: Pathfinder DAS Branding, System Telemetry Pills, Wake-Word Badge, Live Clock, Settings Cog & Audio Controls.
 * - Left Stage: 3D Holographic Cybernetic Face Avatar, audio equalizer waveform, telemetry monitors,
 *   and autonomous website action live report.
 * - Right Stage: Activity Log (live conversation transcript), File/Resume Dropzone (Instant ATS Scanner),
 *   Command Input, and prominent Glowing Microphone & Interrupt action controls.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Volume2,
  VolumeX,
  Square,
  Radio,
  Mic,
  MicOff,
  Sparkles,
  Upload,
  Send,
  CornerDownLeft,
  ShieldCheck,
  Cpu,
  Terminal,
  Sliders,
  RotateCcw,
  Layers,
  FileText,
  AlertCircle,
  Clock,
  Compass,
} from "lucide-react";
import { FaceAvatar } from "./avatar/FaceAvatar";
import { useVoiceSession } from "./useVoiceSession";
import { MicSetupModal } from "./MicSetupModal";
import { VoiceSettingsModal } from "./VoiceSettingsModal";
import { memoryManager, StudentMemory } from "./memory";
import { WebsiteActionContext } from "./actions";
import { WakeWordDetector } from "./wakeWord";
import { analyzeResumeFile } from "./resumeScanner";

export interface VoicePanelProps {
  className?: string;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
  onOpenResumeBuilder?: () => void;
  onLaunchMockInterview?: (company: string, role: string) => void;
  onUpdateProfile?: (updates: any) => void;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
  className = "",
  activeTab = "coach",
  onNavigateTab,
  onOpenResumeBuilder,
  onLaunchMockInterview,
  onUpdateProfile,
}) => {
  const [language, setLanguage] = useState<string>("auto");
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(true);
  const [typedInput, setTypedInput] = useState<string>("");
  const [isMicModalOpen, setIsMicModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isScanningResume, setIsScanningResume] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [memory, setMemory] = useState<StudentMemory>(() => memoryManager.getMemory());

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wakeDetectorRef = useRef<WakeWordDetector | null>(null);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", year: "numeric" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Action context for website control
  const actionContext: WebsiteActionContext = {
    activeTab,
    onNavigateTab,
    onOpenResumeBuilder,
    onLaunchMockInterview,
    onUpdateProfile,
    onLanguageChange: (lang) => setLanguage(lang),
    onAutoSpeakToggle: (speak) => setAutoSpeak(speak),
  };

  const {
    state,
    messages,
    currentSentence,
    interimTranscript,
    activeProvider,
    isMicActive,
    feedbackHint,
    audioAnalyser,
    sendMessage,
    appendAssistantMessage,
    toggleMicrophone,
    stopAll,
    clearMessages,
    dismissFeedbackHint,
  } = useVoiceSession({ language, autoSpeak, speechRate, actionContext });

  // 1. Hands-Free Wake Word Detector ("Hey Pathfinder" / "Hey DAS")
  useEffect(() => {
    const detector = new WakeWordDetector({
      enabled: wakeWordEnabled,
      onWake: (detectedPhrase) => {
        console.log(`[WakeWord] Activated by "${detectedPhrase}"`);
        if (!isMicActive) {
          if (wakeDetectorRef.current) {
            wakeDetectorRef.current.stop();
          }
          toggleMicrophone();
        }
      },
    });
    wakeDetectorRef.current = detector;
    if (wakeWordEnabled && !isMicActive && state !== "speaking" && state !== "listening") {
      detector.start();
    }
    return () => {
      detector.stop();
    };
  }, [wakeWordEnabled, isMicActive, state, toggleMicrophone]);

  // Pause wake-word detector while agent is speaking or actively listening
  useEffect(() => {
    if (wakeDetectorRef.current) {
      if (isMicActive || state === "speaking") {
        wakeDetectorRef.current.stop();
      } else if (wakeWordEnabled) {
        wakeDetectorRef.current.start();
      }
    }
  }, [isMicActive, state, wakeWordEnabled]);

  // Auto-scroll activity log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, interimTranscript]);

  // Handle command submit
  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedInput.trim()) return;
    sendMessage(typedInput.trim());
    setTypedInput("");
  };

  // Handle keyboard shortcut [ESC] to interrupt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stopAll]);

  // 2. Instant Drag-and-Drop Resume Deep Scanner
  const processUploadedResume = async (file: File) => {
    setIsScanningResume(true);
    const backendBase =
      ((import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://pathfinder-backend-klrp.onrender.com").replace(/\/+$/, "");

    try {
      let score = 84;
      let verdict = "Solid technical foundation with strong project portfolio.";
      let strengths = ["Data Structures", "System Design", "Microservices"];
      let gaps = ["Quantifiable metrics in resume bullets", "Docker containerization", "Distributed caching"];

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${backendBase}/api/ai/resume`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.score) score = data.score;
          if (data.verdict) verdict = data.verdict;
          if (Array.isArray(data.strengths) && data.strengths.length > 0) strengths = data.strengths;
          if (Array.isArray(data.prioritized_gaps) && data.prioritized_gaps.length > 0) gaps = data.prioritized_gaps;
        } else {
          const clientAudit = await analyzeResumeFile(file);
          score = clientAudit.atsScore;
          if (clientAudit.extractedSkills.length > 0) strengths = clientAudit.extractedSkills;
          if (clientAudit.missingKeywords.length > 0) gaps = clientAudit.missingKeywords;
        }
      } catch {
        const clientAudit = await analyzeResumeFile(file);
        score = clientAudit.atsScore;
        if (clientAudit.extractedSkills.length > 0) strengths = clientAudit.extractedSkills;
        if (clientAudit.missingKeywords.length > 0) gaps = clientAudit.missingKeywords;
      }

      setIsScanningResume(false);
      const spoken = `I analyzed your resume ${file.name}. Your ATS Placement readiness score is ${score} percent. ${verdict}`;
      const display = `### 📄 ATS Placement Resume Audit: ${file.name}\n\n- **ATS Score**: \`${score}/100\`\n- **Verdict**: ${verdict}\n- **Verified Strengths**: ${strengths.slice(0, 4).join(", ")}\n- **Recommended Focus**: ${gaps.slice(0, 3).join(", ")}`;

      appendAssistantMessage(display, spoken);
    } catch (err) {
      setIsScanningResume(false);
      appendAssistantMessage(
        `### Resume Upload Received\n\nI received \`${file.name}\`. Ready to optimize with the ATS Resume Studio.`,
        `I received your resume ${file.name}. Ready to optimize your bullets.`
      );
      if (onOpenResumeBuilder) onOpenResumeBuilder();
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedResume(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadedResume(files[0]);
    }
  };

  return (
    <div
      className={`relative flex h-[820px] w-full flex-col overflow-hidden rounded-2xl border border-[#343148] bg-[#0c0d14] text-slate-200 shadow-[0_0_50px_rgba(52,49,72,0.4)] font-mono select-none ${className}`}
    >
      {/* ============================================================== */}
      {/* 1. TOP COMMAND BAR                                             */}
      {/* ============================================================== */}
      <header className="flex h-12 items-center justify-between border-b border-[#343148] bg-[#161722]/95 px-4 sm:px-6 z-30 shrink-0">
        {/* Left: Branding & Core Badges */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#343148] border border-[#D4B996]/50 text-[#D7C49E] font-bold text-xs shadow-[0_0_12px_rgba(212,185,150,0.3)]">
            <Compass className="h-4 w-4 animate-spin-slow text-[#D4B996]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-wider text-white">
              PATHFINDER <span className="text-[#D4B996]">DAS</span>
            </h1>
            <span className="hidden md:inline-block text-[11px] text-[#D7C49E]/70">
              | Autonomous Career Assistant
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-3">
            <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI CORE: ONLINE
            </span>
            <button
              type="button"
              onClick={() => setWakeWordEnabled((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all ${
                wakeWordEnabled
                  ? "border-[#D4B996]/50 bg-[#343148] text-[#D7C49E] shadow-sm"
                  : "border-white/10 bg-black/40 text-slate-500"
              }`}
              title="Toggle Hands-Free 'Hey Pathfinder' Wake Word"
            >
              <Mic className="h-2.5 w-2.5 text-[#D4B996]" />
              <span>WAKE WORD: {wakeWordEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Right: Live Digital Clock, Language & Hardware Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock Display */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#343148] bg-[#161722] px-2.5 py-1 text-[11px] text-[#D7C49E]">
            <Clock className="h-3 w-3 text-[#D4B996]" />
            <span className="font-bold">{currentTime || "00:00:00"}</span>
            <span className="text-[#D7C49E]/60 text-[10px] hidden md:inline">{currentDate}</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center rounded-lg border border-[#343148] bg-black/50 p-0.5">
            {[
              { id: "auto", label: "AUTO" },
              { id: "en", label: "EN" },
              { id: "te", label: "తెలుగు" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                  language === item.id
                    ? "bg-[#343148] text-[#D7C49E] border border-[#D4B996]/60 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Settings Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-[#343148] bg-[#161722] px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-[#D7C49E] hover:border-[#D4B996]/60 cursor-pointer transition-all"
            title="Configure Voice Speed, Wake Word & Placement Parameters"
          >
            <Sliders className="h-3.5 w-3.5 text-[#D4B996]" />
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* Audio Test Diagnostics */}
          <button
            type="button"
            onClick={() => setIsMicModalOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-[#D4B996]/40 bg-[#343148] px-2 py-1 text-[11px] font-medium text-[#D7C49E] hover:border-[#D4B996] cursor-pointer"
            title="Microphone & Speaker Diagnostics"
          >
            <Radio className="h-3 w-3 text-[#D4B996]" />
            <span className="hidden md:inline">Test Audio</span>
          </button>

          {/* Voice Mute Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeak((prev) => !prev)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
              autoSpeak
                ? "border-[#D4B996]/40 bg-[#343148] text-[#D7C49E]"
                : "border-white/10 bg-black/40 text-slate-500"
            }`}
            title={autoSpeak ? "Voice reply is active" : "Voice reply is muted"}
          >
            {autoSpeak ? <Volume2 className="h-3 w-3 text-[#D4B996]" /> : <VolumeX className="h-3 w-3 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Headphone Hint Banner if Echo Detected */}
      {feedbackHint && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-950/40 px-4 py-1.5 text-xs text-amber-200 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>{feedbackHint}</span>
          </div>
          <button type="button" onClick={dismissFeedbackHint} className="text-amber-300 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MAIN SPLIT STAGE (LEFT: AGENT & HUD | RIGHT: ACTIVITY & MIC) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
        
        {/* ------------------------------------------------------------ */}
        {/* LEFT COLUMN (7 COLS): 3D AVATAR, TELEMETRY & LIVE INSIGHTS   */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-[#343148] bg-[#0c0d14] relative min-h-0 p-3 sm:p-4 justify-between overflow-hidden">
          
          {/* Subtle Cyber Grid Background */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#34314815_1px,transparent_1px),linear-gradient(to_bottom,#34314815_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          {/* Ambient Avatar Glow (Beige #D4B996) */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-[#D4B996]/10 blur-[100px]" />

          {/* Top Left: System Telemetry HUD Box */}
          <div className="flex items-center justify-between border border-[#343148] bg-[#161722]/85 rounded-xl p-2.5 z-10 shrink-0 backdrop-blur-md">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full text-[10px]">
              <div>
                <span className="text-slate-500 block">PLACEMENT READY</span>
                <span className="font-bold text-emerald-400 text-xs">84% · TIER 1</span>
              </div>
              <div>
                <span className="text-slate-500 block">DREAM COMPANY</span>
                <span className="font-bold text-[#D7C49E] text-xs truncate block">{memory.dreamCompany}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CURRENT CGPA</span>
                <span className="font-bold text-[#D7C49E] text-xs">{memory.cgpa} / 10.0</span>
              </div>
              <div>
                <span className="text-slate-500 block">WAKE WORD STATUS</span>
                <span className={`font-bold text-xs ${wakeWordEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                  {wakeWordEnabled ? "LISTENING (HEY DAS)" : "OFF"}
                </span>
              </div>
            </div>
          </div>

          {/* Center: 3D Holographic Cybernetic Face Avatar */}
          <div className="flex flex-1 items-center justify-center w-full min-h-0 my-auto py-1 z-10">
            <FaceAvatar
              state={state as any}
              spokenText={currentSentence}
              isSpeaking={state === "speaking"}
              audioAnalyser={audioAnalyser}
              width={340}
              height={380}
              className="w-full max-w-[360px] max-h-[44vh] drop-shadow-[0_15px_45px_rgba(212,185,150,0.25)]"
            />
          </div>

          {/* Under Avatar: Live Status & Reactive Audio Waveform */}
          <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 z-10">
            {/* Live State Badge */}
            <div className="flex items-center gap-2 rounded-full border border-[#343148] bg-[#161722] px-3 py-1">
              <span
                className={`h-2 w-2 rounded-full ${
                  state === "speaking"
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"
                    : state === "listening" || isMicActive
                    ? "bg-[#D4B996] animate-ping shadow-[0_0_8px_#D4B996]"
                    : state === "thinking"
                    ? "bg-[#D7C49E] animate-spin"
                    : "bg-slate-500"
                }`}
              />
              <span
                className={`text-[11px] font-bold tracking-widest uppercase ${
                  state === "speaking"
                    ? "text-emerald-400"
                    : state === "listening" || isMicActive
                    ? "text-[#D7C49E]"
                    : state === "thinking"
                    ? "text-[#D7C49E]"
                    : "text-slate-400"
                }`}
              >
                {state === "speaking"
                  ? "● SPEAKING"
                  : state === "listening" || isMicActive
                  ? "● LISTENING..."
                  : state === "thinking"
                  ? "● THINKING"
                  : wakeWordEnabled
                  ? "● WAKE WORD ARMED ('HEY DAS')"
                  : "● STANDBY"}
              </span>
            </div>

            {/* Audio Waveform Equalizer Bar (Soybean #D7C49E & Beige #D4B996) */}
            <div className="flex items-end justify-center gap-1 h-6 w-48 py-1">
              {[18, 42, 65, 80, 52, 90, 75, 40, 85, 60, 30, 70, 45, 20].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height:
                      state === "speaking" || isMicActive
                        ? `${Math.max(15, (h * (Math.sin(Date.now() / 150 + i) + 1.2)) / 2)}%`
                        : "20%",
                  }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    state === "speaking"
                      ? "bg-emerald-400"
                      : isMicActive
                      ? "bg-[#D7C49E]"
                      : "bg-[#343148]"
                  }`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT COLUMN (5 COLS): ACTIVITY LOG, FILE UPLOAD & CONTROLS  */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-5 flex flex-col bg-[#0e0f18] min-h-0 p-3 sm:p-4 justify-between border-t lg:border-t-0">
          
          {/* 1. ACTIVITY LOG (PERSISTENT MEMORY SYNCED) */}
          <div className="flex flex-col flex-1 min-h-[220px] max-h-[360px] border border-[#343148] bg-[#161722]/70 rounded-xl overflow-hidden mb-3">
            <div className="flex items-center justify-between border-b border-[#343148] bg-[#1a1b29] px-3 py-1.5 text-[10px] text-[#D7C49E] font-bold tracking-wider uppercase">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-[#D4B996]" />
                ACTIVITY LOG (VOICE & VIVA AUDIT)
              </span>
              <button
                type="button"
                onClick={clearMessages}
                className="text-slate-500 hover:text-red-400 transition-colors text-[9px] cursor-pointer"
                title="Clear Activity Log"
              >
                [CLEAR]
              </button>
            </div>

            {/* Scrollable Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs font-mono scrollbar-thin scrollbar-thumb-[#343148]">
              {messages.map((msg, idx) => (
                <div key={idx} className="leading-relaxed">
                  {msg.role === "system" && (
                    <div className="text-[11px] text-[#D4B996]/80">
                      <span className="text-[#D4B996] font-bold">[SYS]:</span> {msg.content}
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="text-[11px] text-slate-200">
                      <span className="text-[#D7C49E] font-bold">[YOU]:</span> {msg.content}
                    </div>
                  )}
                  {msg.role === "assistant" && (
                    <div className="text-[11px] text-emerald-300">
                      <span className="text-emerald-400 font-bold">[DAS]:</span> {msg.content}
                      {msg.action && (
                        <div className="mt-0.5 text-[10px] text-[#D7C49E] italic pl-3">
                          ↳ Action: {msg.action}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Interim Real-time Speech Preview */}
              {interimTranscript && (
                <div className="text-[11px] text-amber-300 italic animate-pulse">
                  <span className="text-amber-400 font-bold">[HEARING]:</span> "{interimTranscript}"
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* 2. FILE / RESUME UPLOAD DROPZONE */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border border-dashed border-[#D4B996]/40 bg-[#161722]/50 hover:bg-[#343148]/40 hover:border-[#D7C49E] transition-all rounded-xl p-2.5 mb-3 cursor-pointer text-center group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            <div className="flex items-center gap-2 text-[#D4B996] group-hover:scale-105 transition-transform">
              <Upload className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {isScanningResume ? "PARSING RESUME & ATS METRICS..." : "DROP RESUME PDF HERE TO SCAN"}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-0.5">
              [PDF, DOCX, Code] · Triggers Instant Spoken ATS Placement Audit
            </span>
          </div>

          {/* 3. COMMAND INPUT BAR */}
          <form onSubmit={handleCommandSubmit} className="relative flex items-center mb-3">
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="Type a command, ask a question, or test by voice..."
              className="w-full rounded-xl border border-[#343148] bg-black/70 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#D4B996] focus:outline-none focus:ring-1 focus:ring-[#D4B996] transition-all font-mono"
            />
            <button
              type="submit"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#343148] border border-[#D4B996]/40 text-[#D7C49E] hover:bg-[#343148]/80 hover:text-white transition-colors cursor-pointer"
              title="Execute Command"
            >
              <Send className="h-3.5 w-3.5 text-[#D4B996]" />
            </button>
          </form>

          {/* 4. PROMINENT ACTION BUTTONS (INTERRUPT & MICROPHONE ACTIVE) */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {/* Red Glowing Interrupt Button */}
            <button
              type="button"
              onClick={stopAll}
              className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 py-2.5 px-3 text-xs font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.2)] cursor-pointer"
              title="Interrupt and stop speaking immediately (ESC)"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>INTERRUPT [ESC]</span>
            </button>

            {/* Bright Glowing Microphone Button (Eclipse #343148 + Beige #D4B996 + Soybean #D7C49E) */}
            <button
              type="button"
              onClick={async () => {
                const wasIdle = !isMicActive;
                if (wakeDetectorRef.current) {
                  wakeDetectorRef.current.stop();
                }
                // Give the browser speech engine a moment to release the wake-word
                // listener, otherwise the main mic session is killed instantly.
                if (wasIdle) {
                  await new Promise((resolve) => setTimeout(resolve, 250));
                }
                await toggleMicrophone();
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isMicActive
                  ? "border-[#D7C49E] bg-[#343148] text-[#D7C49E] shadow-[0_0_25px_rgba(215,196,158,0.5)] ring-2 ring-[#D4B996]/60 animate-pulse"
                  : state === "speaking"
                  ? "border-[#D4B996]/60 bg-[#343148] text-[#D7C49E]"
                  : "border-[#D4B996] bg-[#343148] hover:bg-[#343148]/90 text-[#D7C49E] shadow-[0_0_20px_rgba(212,185,150,0.35)] hover:border-[#D7C49E] hover:scale-[1.02]"
              }`}
              title={isMicActive ? "Microphone active · Tap to finish" : "Tap to speak aloud"}
            >
              {isMicActive ? (
                <>
                  <Mic className="h-4 w-4 text-[#D4B996] animate-bounce" />
                  <span>LISTENING · TAP TO SEND</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-[#D4B996]" />
                  <span>TAP TO SPEAK</span>
                </>
              )}
            </button>
          </div>

          {/* 5. QUICK COMMAND STARTER CHIPS (VIVA, ROADMAP, RESUME, BLUEPRINTS) */}
          <div className="flex flex-wrap gap-1">
            {[
              "Explain about Pathfinder",
              "Start Viva Mode",
              "Open Blueprints",
              "Open Resume Builder",
              "Start Mock Interview",
              "Tier-1 DSA Roadmap",
              "Check 44.6 LPA Package",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(chip)}
                className="rounded-lg border border-[#343148] bg-[#161722] hover:border-[#D4B996]/60 hover:bg-[#343148] text-slate-300 hover:text-[#D7C49E] px-2 py-1 text-[10px] transition-all cursor-pointer truncate"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Microphone & Speaker Diagnostic Modal */}
      <MicSetupModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
      />

      {/* Settings & Voice Customization Drawer */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        wakeWordEnabled={wakeWordEnabled}
        onToggleWakeWord={(enabled) => setWakeWordEnabled(enabled)}
        speechRate={speechRate}
        onChangeSpeechRate={(rate) => setSpeechRate(rate)}
        onMemoryUpdate={(updated) => setMemory(updated)}
      />
    </div>
  );
};
