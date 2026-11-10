import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar3D } from "./Avatar3D";
import { dasSocket, UserHonorificRole } from "./agentSocket";
import { audioEngine } from "./audioIO";
import { Mic, MicOff, Send, Sparkles, Volume2 } from "lucide-react";

export interface AgentLayoutProps {
  children?: React.ReactNode;
  onNavigateTab?: (tab: string) => void;
  [key: string]: any;
}

export const AgentLayout: React.FC<AgentLayoutProps> = ({
  children,
  onNavigateTab,
}) => {
  const routerNavigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [role, setRole] = useState<UserHonorificRole>("boss");
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState(
    "DAS 3D Co-Pilot ready. Click 'Speak to DAS' or type your instruction below."
  );

  const navigate = (path: string) => {
    if (onNavigateTab) {
      onNavigateTab(path.replace(/^\//, ""));
    }
    try {
      routerNavigate(path);
    } catch {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  useEffect(() => {
    dasSocket.connect(
      role,
      (text) => setTranscript(text),
      (status) => setConnected(status),
      (path) => navigate(path)
    );
    return () => dasSocket.disconnect();
  }, []);

  const toggleMic = async () => {
    audioEngine.initContext();
    if (!connected) {
      dasSocket.connect(role, setTranscript, setConnected, navigate);
    }
    if (!micActive) {
      try {
        await audioEngine.startMicCapture((b64) => dasSocket.sendAudioChunk(b64));
        setMicActive(true);
      } catch (micErr) {
        console.warn("[Mic Permission Notice]:", micErr);
      }
    } else {
      audioEngine.stopMicCapture();
      setMicActive(false);
    }
  };

  const handleRoleToggle = (newRole: UserHonorificRole) => {
    setRole(newRole);
    dasSocket.switchRole(newRole);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    audioEngine.initContext();
    if (!connected) {
      dasSocket.connect(role, setTranscript, setConnected, navigate);
    }
    dasSocket.sendTextCommand(inputText.trim());
    setTranscript(`You: ${inputText.trim()}`);
    setInputText("");
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* 3D DAS Holographic Face Canvas (Always active in background) */}
      <Avatar3D />

      {/* Main Content Area */}
      <main className="relative z-10 pb-36">{children}</main>

      {/* Bottom Floating Command HUD (Full Voice + Full Typing Support) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-4xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-3.5 shadow-[0_0_35px_rgba(0,240,255,0.2)] flex flex-col gap-2.5">
        {/* HUD Top Bar: Status & Role Mode */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                connected
                  ? "bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse"
                  : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                if (!connected) dasSocket.connect(role, setTranscript, setConnected, navigate);
              }}
              className="font-bold tracking-wider text-cyan-300 hover:text-cyan-100 flex items-center gap-1.5 cursor-pointer"
            >
              <span>DAS 3D CO-PILOT</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 font-mono">
                {connected ? "ONLINE" : "CONNECTING..."}
              </span>
            </button>
          </div>

          {/* Role Switcher: Boss (Dileep) vs Sir (Client/Evaluator) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => handleRoleToggle("boss")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                role === "boss"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Boss Mode</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle("sir")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                role === "sir"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Sir Mode</span>
            </button>
          </div>
        </div>

        {/* Live Subtitle / Spoken Transcript Bar */}
        <div className="text-xs sm:text-sm text-cyan-100/90 px-2 py-1 bg-slate-900/50 rounded-lg border border-cyan-500/15 flex items-center gap-2 truncate">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{transcript}</span>
        </div>

        {/* Dual Input: Voice Microphone + Direct Text Box */}
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          {/* Voice Mic Toggle */}
          <button
            type="button"
            onClick={toggleMic}
            className={`px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
              micActive
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/50 animate-pulse"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500 font-bold"
            }`}
          >
            {micActive ? (
              <>
                <MicOff className="w-4 h-4 text-white" />
                <span>Listening...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-slate-950" />
                <span>Speak</span>
              </>
            )}
          </button>

          {/* Typing Input Field (For when Boss prefers typing) */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type anything to DAS (Telugu, English, or Hindi)... e.g. 'Open resume studio', 'Show placement readiness'"
            className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition"
          />

          {/* Send Action */}
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-600/30 cursor-pointer active:scale-95"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentLayout;
