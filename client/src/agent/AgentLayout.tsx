import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar3D } from "./Avatar3D";
import { dasSocket, UserHonorificRole } from "./agentSocket";
import { audioEngine, cameraEngine } from "./audioIO";

export const AgentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [role, setRole] = useState<UserHonorificRole>("boss");
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState(
    "DAS 3D Co-Pilot ready. Click 'Start Hands-Free Voice' or 'Speak' below."
  );
  const [userTranscript, setUserTranscript] = useState("");

  useEffect(() => {
    dasSocket.connect(
      role,
      (text) => setTranscript(text),
      (status) => setConnected(status),
      (path) => navigate(path),
      (userText) => setUserTranscript(userText),
      () => {
        setTranscript("[Interrupted]");
      }
    );
    return () => {
      dasSocket.disconnect();
      cameraEngine.stopCameraCapture();
    };
  }, []);

  const toggleMic = async () => {
    audioEngine.initContext();

    if (!dasSocket.isConnected) {
      dasSocket.connect(
        role,
        (text) => setTranscript(text),
        (status) => setConnected(status),
        (path) => navigate(path),
        (userText) => setUserTranscript(userText),
        () => {
          setTranscript("[Interrupted]");
        }
      );
    }

    if (!micActive) {
      try {
        await audioEngine.startMicCapture((b64) => dasSocket.sendAudioChunk(b64));
        setMicActive(true);
        setTranscript("Listening... Speak now Boss!");
      } catch {
        setTranscript("Mic Permission Denied! Browser address bar lo Mic allow cheyyandi.");
      }
    } else {
      audioEngine.stopMicCapture();
      setMicActive(false);
      setTranscript("Mic paused.");
    }
  };

  const toggleCamera = async () => {
    if (!cameraActive) {
      const started = await cameraEngine.startCameraCapture((b64Jpeg) => {
        dasSocket.sendVideoFrame(b64Jpeg);
      }, 1);
      if (started) {
        setCameraActive(true);
      } else {
        setTranscript("Camera access was denied or is unavailable.");
      }
    } else {
      cameraEngine.stopCameraCapture();
      setCameraActive(false);
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
    setUserTranscript(inputText);
    setTranscript(`Thinking...`);
    dasSocket.sendTextCommand(inputText);
    setInputText("");
  };

  return (
    /* bg-transparent pettam kabatti venakala unna Robot Face & Dashboard clear ga kanipistayi! */
    <div className="relative min-h-screen bg-transparent text-white overflow-x-hidden">
      {/* Background 3D Robot Face */}
      <Avatar3D />

      {/* Main Dashboard Content */}
      <main className="relative z-10 pb-32 bg-transparent">{children}</main>

      {/* Working Left-Side Red 'Start Hands-Free Voice' Button (From your 1st Screenshot) */}
      <button
        type="button"
        onClick={toggleMic}
        className={`fixed bottom-6 left-6 z-50 px-6 py-3.5 rounded-full font-bold text-sm shadow-2xl transition cursor-pointer flex items-center gap-2 ${micActive
            ? "bg-emerald-600 text-white shadow-emerald-500/50 animate-pulse"
            : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/50"
          }`}
      >
        <span>🎙️</span>
        <span>{micActive ? "Hands-Free Active (Listening...)" : "Start Hands-Free Voice"}</span>
      </button>

      {/* Bottom Center DAS 3D CO-PILOT HUD */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-3xl bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-cyan-300 px-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
            />
            <span className="font-bold tracking-wider">
              DAS 3D CO-PILOT
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px]">
              {connected ? "ONLINE (PUCK)" : "CONNECTING..."}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-full border border-cyan-500/30">
            <button
              type="button"
              onClick={() => handleRoleToggle("boss")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${role === "boss" ? "bg-cyan-400 text-slate-950" : "text-slate-300"
                }`}
            >
              ✨ Boss Mode
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle("sir")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${role === "sir" ? "bg-cyan-400 text-slate-950" : "text-slate-300"
                }`}
            >
              Sir Mode
            </button>
          </div>
        </div>

        {userTranscript && (
          <div className="text-xs text-emerald-300 bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3 py-1.5 truncate">
            🎤 You: {userTranscript}
          </div>
        )}

        <div className="text-sm text-cyan-100 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 truncate">
          🔊 DAS: {transcript}
        </div>

        <form onSubmit={handleSendText} className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${micActive
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-sky-500 hover:bg-sky-400 text-slate-950"
              }`}
          >
            {micActive ? "🔇 Listening..." : "🎙️ Speak"}
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            className={`px-3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
              cameraActive
                ? "bg-violet-600 text-white animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            }`}
            title="Toggle Camera (Optional Video Streaming to DAS at 1 FPS)"
          >
            {cameraActive ? "📹 Cam On" : "📷 Cam"}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type anything to DAS (Telugu, English, or Hindi)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
          />

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            Send 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentLayout;
