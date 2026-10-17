/**
 * DASStudioLayout: Production Studio Viewport for DAS AI Voice Agent
 * Positions:
 * 1. Dead-Center Viewport: 3D Holographic Cybernetic Avatar (Three.js)
 * 2. Right-Side: Floating Glassmorphic Chat HUD (Text & Live Mic Dual Input)
 * 3. Exact Initial Greeting on Load:
 *    "I'm your AI, your DAS Agent. Tell me, how can I help you?"
 * 4. Deep Male Voice Profile (Senior Tech Lead cadence)
 * 5. Full Ollama + Cognee Graph RAG integration
 */

import React, { useState, useEffect, useRef } from "react";
import { AvatarCanvas } from "./AvatarCanvas";
import { DASRightChatPanel, ChatMessage } from "./DASRightChatPanel";
import { Radio, Sparkles, Volume2, Shield } from "lucide-react";

const INITIAL_GREETING = "I'm your AI, your DAS Agent. Tell me, how can I help you?";

export const DASStudioLayout: React.FC = () => {
  const [agentState, setAgentState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const fullReplyRef = useRef<string>("");
  const isPlayingRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);

  // Initialize Audio Player & WebAudio Analyser
  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    audio.onended = () => {
      playNextAudioChunk();
    };

    audio.onerror = () => {
      isPlayingRef.current = false;
      setAgentState("idle");
      playNextAudioChunk();
    };

    // Attach WebAudio AnalyserNode to the audio player
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;

      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioAnalyserRef.current = analyser;
    } catch {
      // AudioContext will resume on first user click
    }
  }, []);

  const playNextAudioChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setAgentState("idle");
      setCurrentSpokenText("");
      return;
    }

    isPlayingRef.current = true;
    setAgentState("speaking");
    const base64Audio = audioQueueRef.current.shift()!;
    if (audioElementRef.current) {
      audioElementRef.current.src = `data:audio/mp3;base64,${base64Audio}`;
      audioElementRef.current.play().catch(() => {
        // Fallback to browser SpeechSynthesis with deep male voice
        speakWithBrowserSpeech(currentSpokenText || INITIAL_GREETING);
      });
    }
  };

  // Browser SpeechSynthesis with Deep Male Voice Fallback
  const speakWithBrowserSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 0.95; // Confident, deep masculine pitch

    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural deep male voices
    const maleVoice = voices.find(
      (v) =>
        (v.name.includes("Guy") ||
          v.name.includes("David") ||
          v.name.includes("Prabhat") ||
          v.name.includes("Christopher") ||
          v.name.includes("Male") ||
          v.name.includes("George")) &&
        (v.lang.startsWith("en") || v.lang.includes("IN"))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (maleVoice) utter.voice = maleVoice;

    utter.onstart = () => {
      setAgentState("speaking");
      setCurrentSpokenText(text);
    };

    utter.onend = () => {
      setAgentState("idle");
      setCurrentSpokenText("");
    };

    utter.onerror = () => {
      setAgentState("idle");
      setCurrentSpokenText("");
    };

    window.speechSynthesis.speak(utter);
  };

  // Connect WebSocket & Trigger Initialization Greeting
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/das-agent`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[DAS Voice Agent] Real-time gateway active.");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Immediate Greeting from Server
        if (data.type === "agent_greeting") {
          const greeting = data.text || INITIAL_GREETING;
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              sender: "das",
              text: greeting,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
          setCurrentSpokenText(greeting);

          if (data.audio_base64) {
            audioQueueRef.current.push(data.audio_base64);
            if (!isPlayingRef.current) playNextAudioChunk();
          } else {
            speakWithBrowserSpeech(greeting);
          }
        }

        if (data.type === "state_change") {
          setAgentState(data.state);
        }

        if (data.type === "text_delta") {
          fullReplyRef.current += data.delta;
          setStreamingText((prev) => prev + data.delta);
        }

        if (data.type === "audio_chunk") {
          if (data.text) {
            setCurrentSpokenText(data.text);
          }
          if (data.audio_base64) {
            audioQueueRef.current.push(data.audio_base64);
            if (!isPlayingRef.current) playNextAudioChunk();
          }
        }

        if (data.type === "turn_complete") {
          const finishedText = fullReplyRef.current;
          fullReplyRef.current = "";
          setStreamingText("");
          if (finishedText.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                id: String(Date.now()),
                sender: "das",
                text: finishedText.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
          }
        }
      };

      ws.onerror = () => {
        // Fallback greeting if WebSocket is connecting in demo/offline mode
        setTimeout(() => {
          if (messages.length === 0) {
            setMessages([
              {
                id: "initial-greeting",
                sender: "das",
                text: INITIAL_GREETING,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
            speakWithBrowserSpeech(INITIAL_GREETING);
          }
        }, 600);
      };
    } catch {
      speakWithBrowserSpeech(INITIAL_GREETING);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech API for Client-Side Mic Input
  const handleMicToggle = (active: boolean) => {
    setIsMicActive(active);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not enabled in this browser. Please use text chat.");
      setIsMicActive(false);
      return;
    }

    if (active) {
      // Pause TTS before listening to prevent microphone echo loop
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }

      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-US";

      recog.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
        setIsMicActive(false);
      };

      recog.onerror = () => setIsMicActive(false);
      recog.onend = () => setIsMicActive(false);

      speechRecognitionRef.current = recog;
      recog.start();
      setAgentState("listening");
    } else {
      speechRecognitionRef.current?.stop();
      setAgentState("idle");
    }
  };

  const handleSendMessage = (text: string) => {
    // Stop any in-progress audio
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "user",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setAgentState("thinking");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "user_query",
          text,
        })
      );
    } else {
      // HTTP Fallback to /api/chat with streaming text & audio speech
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const reply = data.reply || "I've analyzed your placement roadmap. What would you like to explore next?";
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              sender: "das",
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
          speakWithBrowserSpeech(reply);
        })
        .catch(() => {
          const fallback = "I'm right here with you. How can I assist with your architecture or placements?";
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              sender: "das",
              text: fallback,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
          speakWithBrowserSpeech(fallback);
        });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04060d] flex flex-col lg:flex-row">
      {/* Background Cybernetic Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_50%,rgba(14,165,233,0.14),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf808_1px,transparent_1px),linear-gradient(to_bottom,#38bdf808_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Left Header Telemetry */}
      <header className="absolute top-5 left-6 z-30 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/[0.04] border border-cyan-500/25 backdrop-blur-md shadow-lg shadow-cyan-500/5">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-100">PATHFINDER · DAS 3D</span>
          <span className="text-[10px] text-cyan-400/80 font-mono">| OLLAMA + COGNEE</span>
        </div>
      </header>

      {/* CENTER STAGE: Dead-Center 3D Holographic Wireframe/Solid Avatar */}
      <main className="flex-1 h-full flex flex-col items-center justify-center relative p-6">
        <div className="w-full max-w-xl h-[72vh] flex items-center justify-center relative">
          <AvatarCanvas
            state={agentState}
            spokenText={currentSpokenText}
            isSpeaking={agentState === "speaking"}
            audioElement={audioElementRef.current}
            audioAnalyser={audioAnalyserRef.current}
            width={400}
            height={500}
            className="w-full h-full max-w-[420px] max-h-[520px]"
          />
        </div>

        {/* Status Callout Pill under Avatar */}
        <div className="mt-3 flex items-center gap-2.5 px-5 py-2 rounded-full bg-black/60 border border-cyan-500/20 backdrop-blur-xl shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              agentState === "speaking"
                ? "bg-emerald-400 animate-ping"
                : agentState === "thinking"
                ? "bg-amber-400 animate-spin"
                : agentState === "listening"
                ? "bg-cyan-400 animate-pulse"
                : "bg-zinc-400"
            }`}
          />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-200">
            {agentState === "speaking"
              ? "Synthesizing Architecture Explanation"
              : agentState === "thinking"
              ? "Reasoning with Cognee Graph & Ollama"
              : agentState === "listening"
              ? "Listening to your voice..."
              : "DAS Ready · Senior Tech Lead"}
          </span>
        </div>
      </main>

      {/* RIGHT SIDE: Floating Glassmorphic Chat HUD */}
      <DASRightChatPanel
        messages={messages}
        streamingText={streamingText}
        agentState={agentState}
        onSendMessage={handleSendMessage}
        onMicToggle={handleMicToggle}
        isMicActive={isMicActive}
      />
    </div>
  );
};
