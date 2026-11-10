import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Avatar3D } from "./Avatar3D";
import { dasSocket, UserHonorificRole } from "./agentSocket";
import { audioEngine } from "./audioIO";

export interface AgentLayoutProps {
  children?: React.ReactNode;
  onNavigateTab?: (tab: string) => void;
  [key: string]: any;
}

export const AgentLayout: React.FC<AgentLayoutProps> = ({
  children,
  onNavigateTab,
}) => {
  const [, setLocation] = useLocation();
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [role, setRole] = useState<UserHonorificRole>("boss");
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState(
    "DAS Co-Pilot Ready. Click Connect or Mic to begin."
  );

  const navigate = (path: string) => {
    if (onNavigateTab) {
      onNavigateTab(path.replace(/^\//, ""));
    }
    try {
      setLocation(path);
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
    if (!connected) {
      dasSocket.connect(role, setTranscript, setConnected, navigate);
    }
    if (!micActive) {
      await audioEngine.startMicCapture((b64) => dasSocket.sendAudioChunk(b64));
      setMicActive(true);
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
    dasSocket.sendTextCommand(inputText);
    setInputText("");
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Large Background 3D DAS Wireframe Face with Lip-Sync & Eye Blinking */}
      <Avatar3D />

      {/* Foreground Dashboard Views */}
      {children && <main className="relative z-10 pb-28">{children}</main>}

      {/* Bottom JARVIS / DAS Command HUD */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-slate-900/85 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-cyan-300 px-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="font-semibold tracking-wider">
              DAS LIVE CO-PILOT ({connected ? "ONLINE" : "CONNECTING..."})
            </span>
          </div>

          {/* Boss vs Evaluator Sir Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-cyan-500/30">
            <button
              type="button"
              onClick={() => handleRoleToggle("boss")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                role === "boss"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Boss Mode (Dileep)
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle("sir")}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                role === "sir"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Client/Evaluator (Sir)
            </button>
          </div>
        </div>

        {/* Live Subtitles / Transcript */}
        <div className="text-sm text-cyan-100/90 px-2 truncate">
          {transcript}
        </div>

        {/* Voice Mic & Text Input Bar */}
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer ${
              micActive
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse"
                : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            }`}
          >
            {micActive ? "Listening (Stop)" : "Speak to DAS"}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Telugu, English, leda Hindi lo adagandi (e.g. 'Open Resume Studio', 'Schedule interview')..."
            className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
          />

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentLayout;
