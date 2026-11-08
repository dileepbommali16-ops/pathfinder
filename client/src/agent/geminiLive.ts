// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { PATHFINDER_TOOLS, executeWebsiteTool } from "./toolRunner";

export interface GeminiLiveCallbacks {
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInterrupted?: () => void;
  onTranscript?: (text: string, role: "user" | "agent") => void;
  onToken?: (fullText: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onStageChange?: (stage: string) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

function resolveUserHonorific(): { honorific: "Boss" | "Sir"; isBoss: boolean } {
  if (typeof window === "undefined") return { honorific: "Sir", isBoss: false };
  try {
    const mode = localStorage.getItem("das_mode") || "";
    const role = localStorage.getItem("userRole") || "";
    const isOwner = localStorage.getItem("isOwner") === "true";
    const savedUser = localStorage.getItem("pathfinder_user") || "";

    if (
      isOwner ||
      mode.toUpperCase() === "BOSS" ||
      role.toLowerCase() === "boss" ||
      savedUser.toLowerCase().includes("dileep") ||
      savedUser.toLowerCase().includes("bommali")
    ) {
      return { honorific: "Boss", isBoss: true };
    }
  } catch { }
  return { honorific: "Sir", isBoss: false };
}

function buildSmartSystemInstruction(): string {
  const { honorific, isBoss } = resolveUserHonorific();
  return `You are DAS (Pathfinder 2.0), a super-intelligent, warm, and natural 3D AI Career & Placement Co-Pilot created by Boss Dileep Bommali.

CRITICAL IDENTITY:
- Speaking to: ${isBoss ? "Your creator, Boss Dileep Bommali" : "A stakeholder or candidate"}. Address them as "${honorific}" naturally.
- Speak like a brilliant, friendly human mentor. Keep answers punchy, natural, and lag-free.
- Control the website, schedule Google Calendar/Gmail/Sheets, and explain Google hiring rules instantly via your tools.`;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });
  }

  // DIRECT WEBSOCKET MULTIMODAL LIVE SESSION (ORION / FRIEND STYLE)
  async connect(callbacks: GeminiLiveCallbacks) {
    try {
      callbacks.onStatusChange?.("connecting");

      // Opens direct duplex WebSocket stream with Google Gemini Live API
      this.session = await this.ai.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Fenrir" // Real-time natural voice
              }
            }
          },
          systemInstruction: {
            parts: [{ text: buildSmartSystemInstruction() }]
          },
          tools: PATHFINDER_TOOLS
        },
        callbacks: {
          onopen: () => {
            callbacks.onStatusChange?.("connected");
            callbacks.onStageChange?.("listening");
          },
          onmessage: async (message: any) => {
            // 1. Handle user barge-in (interruption)
            if (message.serverContent?.interrupted) {
              callbacks.onInterrupted?.();
            }

            // 2. Stream audio chunks & transcripts directly with zero lag
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                callbacks.onAudioChunk?.(part.inlineData.data);
                callbacks.onStageChange?.("speaking");
              }
              if (part.text) {
                callbacks.onTranscript?.(part.text, "agent");
                callbacks.onToken?.(part.text);
              }
            }

            // 3. Execute tools instantly (Website navigation, Google Calendar, Sheets, Gmail)
            if (message.toolCall?.functionCalls) {
              const functionResponses = [];
              for (const call of message.toolCall.functionCalls) {
                callbacks.onToolCall?.(call.name, call.args || {});
                const result = await executeWebsiteTool(call.name, call.args || {});
                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: result
                });
              }
              await this.session.sendToolResponse({ functionResponses });
            }
          },
          onerror: (err: any) => {
            console.error("[GeminiLive WebSocket Error]:", err);
            callbacks.onStatusChange?.("error");
          },
          onclose: () => {
            callbacks.onStatusChange?.("disconnected");
            callbacks.onStageChange?.("idle");
          }
        }
      });

      return this.session;
    } catch (error) {
      console.error("Failed to connect Gemini Live WebSocket:", error);
      callbacks.onStatusChange?.("error");
      throw error;
    }
  }

  // Fallback text/chat turn method for standard text inputs
  async sendTurn(
    userText: string,
    options?: {
      systemPrompt?: string;
      callbacks?: GeminiLiveCallbacks;
      onToken?: (fullText: string) => void;
      onToolCall?: (name: string, args: Record<string, any>) => void;
      onStageChange?: (stage: string) => void;
    }
  ): Promise<string> {
    options?.onStageChange?.("thinking");
    const response = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userText,
      config: {
        systemInstruction: buildSmartSystemInstruction(options?.systemPrompt),
        tools: PATHFINDER_TOOLS
      }
    });

    const calls = response.functionCalls;
    if (calls && calls.length > 0) {
      for (const call of calls) {
        options?.onToolCall?.(call.name || "", (call.args as Record<string, any>) || {});
        await executeWebsiteTool(call.name || "", (call.args as Record<string, any>) || {});
      }
    }

    const replyText = response.text || "Done Boss! Executed instantly.";
    options?.onToken?.(replyText);
    options?.onStageChange?.("speaking");
    return replyText;
  }

  // Push mic audio bytes directly into WebSocket stream
  sendMicAudio(base64Pcm16k: string) {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      media: {
        data: base64Pcm16k,
        mimeType: "audio/pcm;rate=16000"
      }
    });
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}

export const geminiLive = new PathfinderGeminiLive();
