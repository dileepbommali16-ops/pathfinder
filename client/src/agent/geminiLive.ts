// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { PATHFINDER_TOOLS, executeWebsiteTool } from "./toolRunner";

export interface GeminiLiveCallbacks {
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInterrupted?: () => void;
  onTranscript?: (text: string, role: "user" | "agent") => void;
  onToken?: (fullText: string) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: GeminiLiveCallbacks) {
    try {
      callbacks.onStatusChange?.("connecting");

      this.session = await this.ai.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Fenrir",
              },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: `You are Pathfinder, an elite 3D AI Career Placement Coach created by Boss Dileep Bommali.
You control the Pathfinder website directly using your tools:
1. When the user asks to see projects, blueprints, mock interviews, resume studio, skill gaps, roadmap, cohort analytics, or what-if simulator, immediately call 'navigate_dashboard_tab'.
2. When discussing any of the 23 capstone blueprints, call 'open_blueprint' and 'scroll_and_highlight' so the screen moves automatically while you speak.
3. During a project viva or mock interview, interrupt rambling answers, ask sharp architecture questions, and call 'update_readiness_score' based on their response.`,
              },
            ],
          },
          tools: PATHFINDER_TOOLS,
        },
        callbacks: {
          onopen: () => {
            callbacks.onStatusChange?.("connected");
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.interrupted) {
              callbacks.onInterrupted?.();
            }

            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                callbacks.onAudioChunk?.(part.inlineData.data);
              }
              if (part.text) {
                callbacks.onTranscript?.(part.text, "agent");
              }
            }

            if (message.toolCall?.functionCalls) {
              const functionResponses = [];
              for (const call of message.toolCall.functionCalls) {
                const result = await executeWebsiteTool(
                  call.name || "",
                  (call.args as Record<string, any>) || {}
                );
                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: result,
                });
              }
              await this.session.sendToolResponse({ functionResponses });
            }
          },
          onerror: (err: any) => {
            console.error("[GeminiLive Error]:", err);
            callbacks.onStatusChange?.("error");
          },
          onclose: () => {
            callbacks.onStatusChange?.("disconnected");
          },
        },
      });

      return this.session;
    } catch (error) {
      console.error("Failed to connect Gemini Live:", error);
      callbacks.onStatusChange?.("error");
      throw error;
    }
  }

  // Home.tsx lo line 456 daggara geminiLive.sendTurn(...) kosam ee method:
  async sendTurn(
    userText: string,
    options?: {
      systemPrompt?: string;
      history?: Array<{ role: string; content: string }>;
      signal?: AbortSignal;
      muteAudio?: boolean;
      speakAudio?: boolean;
      callbacks?: {
        onToken?: (fullText: string, delta?: string) => void;
        onToolCall?: (name: string, args: Record<string, any>) => any;
        onStageChange?: (stage: "idle" | "listening" | "thinking" | "speaking") => void;
      };
    }
  ): Promise<string> {
    options?.callbacks?.onStageChange?.("thinking");
    const response = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userText,
      config: {
        systemInstruction: options?.systemPrompt,
        tools: PATHFINDER_TOOLS,
      },
    });

    // Okavela chat lo tool call vasthe automatic ga website action run chesthundhi
    const calls = response.functionCalls;
    if (calls && calls.length > 0) {
      for (const call of calls) {
        const toolName = call.name || "";
        const toolArgs = (call.args as Record<string, any>) || {};
        await executeWebsiteTool(toolName, toolArgs);
        options?.callbacks?.onToolCall?.(toolName, toolArgs);
      }
    }

    const replyText = response.text || "Action executed on your dashboard, Boss!";
    options?.callbacks?.onToken?.(replyText, replyText);
    return replyText;
  }

  async speakText(_text: string): Promise<boolean> {
    return false;
  }

  sendMicAudio(base64Pcm16k: string) {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      media: {
        data: base64Pcm16k,
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}

// Home.tsx lo `import { geminiLive } from "@/agent/geminiLive"` kosam singleton export:
export const geminiLive = new PathfinderGeminiLive();