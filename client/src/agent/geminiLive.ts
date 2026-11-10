// File: client/src/agent/geminiLive.ts
import { PATHFINDER_TOOLS, executeToolCall } from "./toolRunner";

const DAS_SYSTEM_PROMPT = `
You are DAS, the cybernetic 3D AI Voice Co-Pilot for Pathfinder v2.0 (Campus Placement & Engineering Intelligence).
- Always address Dileep as "Boss" and external evaluators as "Sir".
- You have full hands-free control over the 7 website tabs: Dashboard, AI Mock Interview, Readiness Command, 8-Week Roadmap, Project Blueprints, Cohort Analytics, and ATS Resume Studio.
- When Boss asks to open any tab, click a button, read screen metrics, or search Google, immediately call the matching function tool first and then reply in a crisp, confident voice.
`;

export class GeminiLiveEngine {
  private ws: WebSocket | null = null;
  private screenInterval: number | null = null;
  private isReady = false;
  private onAudioOutput: (base64Pcm24k: string) => void;
  private onStatusChange?: (status: "connecting" | "connected" | "disconnected") => void;
  private onTranscript?: (sender: "DAS" | "Boss", text: string) => void;

  constructor(
    onAudioOutput: (base64Pcm24k: string) => void,
    onStatusChange?: (status: "connecting" | "connected" | "disconnected") => void,
    onTranscript?: (sender: "DAS" | "Boss", text: string) => void
  ) {
    this.onAudioOutput = onAudioOutput;
    this.onStatusChange = onStatusChange;
    this.onTranscript = onTranscript;
  }

  private async resolveApiKey(): Promise<string> {
    let key = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    if (key) return key;

    try {
      const res = await fetch("/api/agent/session-token");
      if (res.ok) {
        const data = await res.json();
        if (data?.apiKey) return data.apiKey;
      }
    } catch {
      // Ignore backend fetch error if VITE_GEMINI_API_KEY is used
    }
    throw new Error("API Key dorakaledu! .env file lo VITE_GEMINI_API_KEY pettandi.");
  }

  // 1. Start Hands-Free Voice WebSocket Connection
  async connect() {
    this.onStatusChange?.("connecting");
    const apiKey = await this.resolveApiKey();

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      const setupFrame = {
        setup: {
          // Multimodal Live API supported real-time model
          model: "models/gemini-2.0-flash-exp",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck"
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: DAS_SYSTEM_PROMPT }]
          },
          tools: PATHFINDER_TOOLS
        }
      };
      this.ws?.send(JSON.stringify(setupFrame));
    };

    this.ws.onmessage = async (event) => {
      const raw = event.data instanceof Blob ? await event.data.text() : event.data;
      const msg = JSON.parse(raw);

      if (msg.setupComplete) {
        this.isReady = true;
        this.onStatusChange?.("connected");
      }

      // A. 24kHz PCM Audio Output -> Sends to audioIO.ts & 3D Avatar Lip-Sync
      const parts = msg?.serverContent?.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
          this.onAudioOutput(part.inlineData.data);
        }
        if (part.text) {
          this.onTranscript?.("DAS", part.text);
        }
      }

      // B. Automatic Tool Execution (Tabs, Clicking, Google Search)
      if (msg.toolCall?.functionCalls) {
        const functionResponses = [];
        for (const call of msg.toolCall.functionCalls) {
          const result = await executeToolCall(call.name, call.args);
          functionResponses.push({
            id: call.id,
            name: call.name,
            response: { result }
          });
        }

        this.ws?.send(
          JSON.stringify({
            toolResponse: { functionResponses }
          })
        );
      }
    };

    this.ws.onerror = (err) => {
      console.error("Gemini Live WebSocket Error:", err);
      this.onStatusChange?.("disconnected");
    };

    this.ws.onclose = () => {
      this.isReady = false;
      this.onStatusChange?.("disconnected");
    };
  }

  // 2. Send 16kHz Mic PCM Chunks
  sendMicPcm16k(base64Audio: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.isReady) {
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio
              }
            ]
          }
        })
      );
    }
  }

  // 3. Send Text Command from "DAS BOSS MODE" input box directly into Live Session
  sendTextCommand(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.isReady) {
      this.ws.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [{ text }]
              }
            ],
            turnComplete: true
          }
        })
      );
    }
  }

  // 4. Share Screen Vision with Gemini
  async startScreenShare() {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    this.streamVideoFrames(stream);
  }

  private streamVideoFrames(stream: MediaStream) {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (this.screenInterval) window.clearInterval(this.screenInterval);

    this.screenInterval = window.setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN || !this.isReady || !ctx || video.videoWidth === 0) return;
      canvas.width = 640;
      canvas.height = 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Jpeg = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: "image/jpeg", data: base64Jpeg }]
          }
        })
      );
    }, 1000);
  }

  disconnect() {
    this.isReady = false;
    if (this.screenInterval) window.clearInterval(this.screenInterval);
    this.ws?.close();
    this.onStatusChange?.("disconnected");
  }
}