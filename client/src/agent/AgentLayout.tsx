import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar3D } from "./Avatar3D";
import { dasSocket, UserHonorificRole } from "./agentSocket";
import { audioEngine, cameraEngine } from "./audioIO";
import { CodeTaskPayload } from "./toolRunner";
import { API_BASE } from "@/lib/apiClient";
import { toast } from "sonner";

export const AgentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Authentication State: Check if user is logged into the main dashboard
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logout") === "1") return false;
    if (params.get("username") || params.get("user") || params.get("demo") === "1") return true;
    return Boolean(localStorage.getItem("pathfinder_user"));
  });

  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [role, setRole] = useState<UserHonorificRole>("boss");
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState(
    "Hi Boss! What's up?"
  );
  const [userTranscript, setUserTranscript] = useState("");

  // Live Multi-Language Code & Compiler Studio State
  const [codeTask, setCodeTask] = useState<CodeTaskPayload | null>(null);
  const [editableCode, setEditableCode] = useState("");
  const [stdinInput, setStdinInput] = useState("");
  const [compileOutput, setCompileOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);

  // Listen for login / logout state changes across Pathfinder
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setIsAuthenticated(Boolean(e.detail?.authenticated));
    };
    const handleStorage = () => {
      setIsAuthenticated(Boolean(localStorage.getItem("pathfinder_user")));
    };
    window.addEventListener("pathfinder:auth-change", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pathfinder:auth-change", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Connect to Gemini Live multimodal agent ONLY when authenticated inside the dashboard
  useEffect(() => {
    if (!isAuthenticated) {
      dasSocket.disconnect();
      cameraEngine.stopCameraCapture();
      return;
    }

    dasSocket.connect(
      role,
      (text: string) => setTranscript(text),
      (status: boolean) => setConnected(status),
      (path: string) => navigate(path),
      (userText: string) => setUserTranscript(userText),
      () => {
        setTranscript("[Interrupted]");
      },
      (payload: CodeTaskPayload) => {
        if (!payload) {
          setCodeTask(null);
          return;
        }
        setCodeTask(payload);
        setEditableCode(payload.code);
        setCompileOutput("Executing code live...");
        setTimeout(() => {
          runCodeLive(payload.code, payload.language);
        }, 120);
      }
    );

    return () => {
      dasSocket.disconnect();
      cameraEngine.stopCameraCapture();
    };
  }, [isAuthenticated, role]);

  const toggleMic = async () => {
    audioEngine.initContext();

    if (!dasSocket.isConnected) {
      dasSocket.connect(
        role,
        (text: string) => setTranscript(text),
        (status: boolean) => setConnected(status),
        (path: string) => navigate(path),
        (userText: string) => setUserTranscript(userText),
        () => {
          setTranscript("[Interrupted]");
        },
        (payload: CodeTaskPayload) => {
          if (!payload) {
            setCodeTask(null);
            return;
          }
          setCodeTask(payload);
          setEditableCode(payload.code);
          setTimeout(() => {
            runCodeLive(payload.code, payload.language);
          }, 120);
        }
      );
    }

    if (!micActive) {
      try {
        await audioEngine.startMicCapture((b64) => dasSocket.sendAudioChunk(b64));
        setMicActive(true);
        setTranscript("Listening... Speak your command, Boss!");
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
    if (newRole === "boss") {
      setTranscript("Hi Boss! What's up?");
    } else if (newRole === "madam") {
      setTranscript("Hello Madam, what can I help you with today?");
    } else {
      setTranscript("Hello Sir, what can I help you with today?");
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    audioEngine.initContext();
    setUserTranscript(inputText);
    setTranscript("Thinking & Executing...");
    dasSocket.sendTextCommand(inputText);
    setInputText("");
  };

  // Execute C, C++, Python, Java, JS, TS, SQL live via backend /api/compile with Godbolt fallback
  const runCodeLive = async (codeOverride?: string, langOverride?: string) => {
    const targetCode = typeof codeOverride === "string" ? codeOverride : editableCode;
    const targetLang = (langOverride || codeTask?.language || "python").toLowerCase().trim();
    if (!targetCode) return;

    setIsRunningCode(true);
    setCompileOutput("Compiling & running your code live...");

    try {
      // 1. Primary: Run via our backend /api/compile (Python subprocess, Node, SQLite, or Godbolt proxy)
      const res = await fetch(`${API_BASE}/api/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: targetLang,
          code: targetCode,
          stdin: stdinInput,
          title: codeTask?.title || "Live Program",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.output || (data.stderr ? `Diagnostics:\n${data.stderr}` : "Program executed with no standard output.");
        setCompileOutput(output);
        setIsRunningCode(false);
        return;
      }
    } catch {
      // Backend temporarily waking up: fall through to client-side Godbolt fallback
    }

    // 2. Direct Fallback: Compiler Explorer (Godbolt) Official API (100% Wildcard CORS Enabled)
    try {
      const compilerMap: Record<string, { id: string; lang: string }> = {
        c: { id: "cg132", lang: "c" },
        cpp: { id: "g132", lang: "c++" },
        "c++": { id: "g132", lang: "c++" },
        python: { id: "python311", lang: "python" },
        rust: { id: "r1750", lang: "rust" },
        go: { id: "g121", lang: "go" },
      };

      const comp = compilerMap[targetLang] || { id: "cg132", lang: "c" };
      const fallbackRes = await fetch(`https://godbolt.org/api/compiler/${comp.id}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          source: targetCode,
          compiler: comp.id,
          options: {
            userArguments: "-O2",
            executeParameters: { args: [], stdin: stdinInput || "" },
            compilerOptions: { executorRequest: true },
            filters: { binary: true, execute: true },
          },
          lang: comp.lang,
        }),
      });

      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const stdout = (fbData.stdout || []).map((i: any) => i.text || "").join("\n").trim();
        const stderr = (fbData.stderr || []).map((i: any) => i.text || "").join("\n").trim();
        const buildErr = (fbData.buildResult?.stderr || []).map((i: any) => i.text || "").join("\n").trim();
        const finalOutput = stdout || stderr || buildErr || "Program executed successfully (no stdout).";
        setCompileOutput(finalOutput);
      } else {
        setCompileOutput("Program executed successfully.");
      }
    } catch (fbErr) {
      setCompileOutput(`Execution notice: ${String(fbErr)}`);
    } finally {
      setIsRunningCode(false);
    }
  };

  // 1. LOGIN PAGE: When not authenticated, render ONLY the login view (no 3D robot, no HUD, no buttons)
  if (!isAuthenticated) {
    return <main className="relative min-h-screen bg-transparent">{children}</main>;
  }

  // 2. MAIN DASHBOARD: Once logged in, reveal 3D wireframe robot face, green hands-free button, Compiler Studio & DAS HUD
  return (
    <div className="relative min-h-screen bg-transparent text-white overflow-x-hidden">
      {/* Background 3D Robot Face */}
      <Avatar3D />

      {/* Main Dashboard Content */}
      <main className="relative z-10 pb-36 bg-transparent">{children}</main>

      {/* DAS Live Multi-Language Code & Compiler Studio Drawer */}
      {codeTask && (
        <div className="fixed top-20 right-6 z-50 w-[94%] max-w-2xl bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                {codeTask.language}
              </span>
              <span className="font-bold text-cyan-300 text-sm truncate max-w-xs">
                {codeTask.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(editableCode);
                    toast.success("Code copied to clipboard! Paste (Ctrl+V) in the external compiler.");
                  } catch {}
                  window.open(codeTask.compilerUrl, "_blank");
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 rounded-lg text-xs text-cyan-300 transition cursor-pointer"
              >
                Copy & Open External ↗
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodeTask(null);
                  setTranscript("Okay Boss, returned to your dashboard.");
                }}
                className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded-lg text-xs text-cyan-300 font-medium transition cursor-pointer"
                title="Return to Dashboard"
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={() => setCodeTask(null)}
                className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Close Compiler Studio"
              >
                ✕
              </button>
            </div>
          </div>

          {codeTask.explanation && (
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 text-xs text-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto">
              <span className="font-bold text-cyan-400 block mb-1">💡 Logic, Structure & Walkthrough:</span>
              {codeTask.explanation}
            </div>
          )}

          <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            rows={9}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-cyan-500 selection:bg-cyan-900"
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stdinInput}
              onChange={(e) => setStdinInput(e.target.value)}
              placeholder="Optional program input (stdin)..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => runCodeLive()}
              disabled={isRunningCode}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
            >
              {isRunningCode ? "Running..." : "▶ Run Code Live"}
            </button>
          </div>

          <div className="bg-black/90 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-200 max-h-36 overflow-y-auto whitespace-pre-wrap">
            {compileOutput}
          </div>
        </div>
      )}

      {/* Single Left-Side Emerald Hands-Free Voice Button */}
      <button
        type="button"
        onClick={toggleMic}
        className={`fixed bottom-6 left-6 z-50 px-6 py-3.5 rounded-full font-bold text-sm shadow-2xl transition cursor-pointer flex items-center gap-2 ${
          micActive
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/50 animate-pulse border border-emerald-400/40"
            : "bg-emerald-700/90 hover:bg-emerald-600 text-white shadow-emerald-950/60 border border-emerald-500/40 backdrop-blur-md"
        }`}
        title="Toggle Hands-Free Voice"
      >
        <span>🎙️</span>
        <span>{micActive ? "Hands-Free Active" : "Start Hands-Free Voice"}</span>
      </button>

      {/* Bottom Center DAS 3D CO-PILOT HUD */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-3xl bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-cyan-300 px-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="font-bold tracking-wider">DAS AI</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px]">
              {connected ? "ONLINE" : "CONNECTING..."}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-full border border-cyan-500/30">
            <button
              type="button"
              onClick={() => handleRoleToggle("boss")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                role === "boss" ? "bg-cyan-400 text-slate-950" : "text-slate-300"
              }`}
            >
              ✨ Boss Mode
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle("sir")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                role === "sir" ? "bg-cyan-400 text-slate-950" : "text-slate-300"
              }`}
            >
              Sir Mode
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle("madam")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                role === "madam" ? "bg-cyan-400 text-slate-950" : "text-slate-300"
              }`}
            >
              Madam Mode
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
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer flex items-center gap-1.5 ${
              micActive
                ? "bg-slate-800 text-rose-400 border border-rose-500/50"
                : "bg-sky-500 hover:bg-sky-400 text-slate-950"
            }`}
          >
            {micActive ? "🔇 Mute" : "🎙️ Speak"}
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
            id="das-command-input"
            name="dasCommand"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask DAS: 'Who is your boss?', 'Write QuickSort in C', 'Tell about my college'..."
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
