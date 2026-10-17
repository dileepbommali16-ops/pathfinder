/**
 * DASStudioLayout: Master Full-Screen Viewport
 * Positions:
 * 1. Center Stage: 3D Cybernetic Head Avatar
 * 2. Right Side: Floating Chat HUD
 * 3. End-to-end WebSocket, Web Speech Recognition & WebAudio synchronization
 */

import React, { useState, useEffect, useRef } from "react";
import { ThreeAvatarCanvas } from "./ThreeAvatarCanvas";
import { DASRightChatPanel, ChatMessage } from "./DASRightChatPanel";
import { MorphTargetWeights } from "./DASAvatarMesh";
import { Radio } from "lucide-react";

export const DASStudioLayout: React.FC = () => {
  const [agentState, setAgentState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [visemeTarget, setVisemeTarget] = useState<Partial<MorphTargetWeights>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize Audio Element for playback
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.onended = () => {
      playNextAudioChunk();
    };
  }, []);

  // Playback queue processing for audio chunks
  const playNextAudioChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setAgentState("idle");
      setVisemeTarget({ jawOpen: 0 });
      return;
    }

    isPlayingRef.current = true;
    setAgentState("speaking");
    const base64Audio = audioQueueRef.current.shift()!;
    if (audioElementRef.current) {
      audioElementRef.current.src = `data:audio/mp3;base64,${base64Audio}`;
      audioElementRef.current.play().catch((err) => console.warn("[Audio] Autoplay note:", err));
    }
  };

  // Connect WebSocket & Lifecycle Initialization
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/das-agent`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[DAS] Connected to real-time voice gateway.");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Rule: Immediate greeting on initialization
      if (data.type === "agent_greeting") {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: "das",
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        if (data.audio_base64) {
          audioQueueRef.current.push(data.audio_base64);
          if (!isPlayingRef.current) playNextAudioChunk();
        }
      }

      if (data.type === "state_change") {
        setAgentState(data.state);
      }

      if (data.type === "text_delta") {
        setStreamingText((prev) => prev + data.delta);
      }

      if (data.type === "audio_chunk") {
        if (data.audio_base64) {
          audioQueueRef.current.push(data.audio_base64);
          if (!isPlayingRef.current) playNextAudioChunk();
        }
      }

      if (data.type === "turn_complete") {
        setMessages((prev) => {
          if (!streamingText) return prev;
          return [
            ...prev,
            {
              id: String(Date.now()),
              sender: "das",
              text: streamingText,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ];
        });
        setStreamingText("");
      }
    };

    ws.onerror = (err) => {
      console.warn("[DAS WS] Connection note:", err);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Web Speech API for Client-Side STT
  const handleMicToggle = (active: boolean) => {
    setIsMicActive(active);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not enabled in this browser. Please use the text input box.");
      setIsMicActive(false);
      return;
    }

    if (active) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-IN";

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
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "user",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "user_query",
          text,
        })
      );
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060810] flex flex-col lg:flex-row">
      {/* Background Cyber Ambient Glow & Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_50%,rgba(14,165,233,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Telemetry Overlay */}
      <header className="absolute top-4 left-6 z-30 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold tracking-wider text-zinc-200">PATHFINDER DAS</span>
          <span className="text-[10px] text-zinc-500 font-mono">| LATENCY: &lt;45MS</span>
        </div>
      </header>

      {/* Center Stage: 3D Face Avatar */}
      <main className="flex-1 h-full flex flex-col items-center justify-center relative p-6">
        <div className="w-full max-w-2xl h-[70vh] flex items-center justify-center relative">
          <ThreeAvatarCanvas
            state={agentState}
            audioElement={audioElementRef.current}
            visemeTarget={visemeTarget}
          />
        </div>

        {/* Status Callout Pill under Avatar */}
        <div className="mt-2 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              agentState === "speaking"
                ? "bg-emerald-400 animate-ping"
                : agentState === "thinking"
                ? "bg-amber-400 animate-spin"
                : agentState === "listening"
                ? "bg-cyan-400 animate-pulse"
                : "bg-zinc-500"
            }`}
          />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300">
            {agentState === "speaking"
              ? "Synthesizing Architecture Explanation"
              : agentState === "thinking"
              ? "Reasoning with Cognee Graph & Ollama"
              : agentState === "listening"
              ? "Listening to your question..."
              : "DAS Ready for Questions"}
          </span>
        </div>
      </main>

      {/* Right-Side Sleek Floating Chat Interface */}
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
