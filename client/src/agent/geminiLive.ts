// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { PATHFINDER_TOOLS, executeWebsiteTool, VoicePipelineStage } from "./toolRunner";
import { speaker } from "./audioIO";

export interface GeminiLiveCallbacks {
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInterrupted?: () => void;
  onTranscript?: (text: string, role: "user" | "agent") => void;
  onToken?: (fullText: string, delta?: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => any;
  onStageChange?: (stage: VoicePipelineStage) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
  }

  async connect(callbacks: GeminiLiveCallbacks) {
    try {
      callbacks.onStatusChange?.("connecting");

      this.session = await this.ai.live.connect({
        model:
          import.meta.env.VITE_GEMINI_LIVE_MODEL ||
          "gemini-2.5-flash-native-audio-latest",
        config: {
          responseModalities: [Modality.AUDIO], // Fixed: Using Modality enum
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Fenrir"
              }
            }
          },
          systemInstruction: {
            parts: [
              {
                text: `You are Pathfinder, an elite 3D AI Career Placement Coach created by Boss Dileep Bommali.
You control the Pathfinder website directly using your tools:
1. When the user asks to see projects, blueprints, mock interviews, resume studio, skill gaps, roadmap, or analytics, call 'navigate_dashboard_tab'.
2. When discussing any of the 23 capstone blueprints, call 'open_blueprint' and 'scroll_and_highlight'.
3. During viva or mock interviews, ask sharp architecture questions and call 'update_readiness_score'.`
              }
            ]
          },
          tools: PATHFINDER_TOOLS
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
                const toolName = call.name || "";
                const toolArgs = (call.args as Record<string, any>) || {};
                callbacks.onToolCall?.(toolName, toolArgs);
                const result = await executeWebsiteTool(toolName, toolArgs);
                functionResponses.push({
                  id: call.id,
                  name: toolName,
                  response: result
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
          }
        }
      });

      return this.session;
    } catch (error) {
      console.error("Failed to connect Gemini Live:", error);
      callbacks.onStatusChange?.("error");
      throw error;
    }
  }

  // High-clarity voice articulation
  async speakText(text: string): Promise<boolean> {
    try {
      speaker.say(text);
      return true;
    } catch (err) {
      console.error("speakText error:", err);
      return false;
    }
  }

  // Live multi-turn reasoning and instant voice execution
  async sendTurn(
    userText: string,
    options?: {
      systemPrompt?: string;
      speakAudio?: boolean;
      history?: Array<{ role: string; content: string }>;
      signal?: AbortSignal;
      muteAudio?: boolean;
      callbacks?: GeminiLiveCallbacks;
      onToken?: (fullText: string, delta?: string) => void;
      onToolCall?: (name: string, args: Record<string, any>) => any;
      onStageChange?: (stage: VoicePipelineStage) => void;
    }
  ): Promise<string> {
    options?.callbacks?.onStageChange?.("thinking");
    options?.onStageChange?.("thinking");

    let response: any = null;
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];

    for (const model of modelsToTry) {
      try {
        response = await this.ai.models.generateContent({
          model,
          contents: userText,
          config: {
            systemInstruction: options?.systemPrompt,
            tools: PATHFINDER_TOOLS
          }
        });
        if (response?.text) break;
      } catch (e) {
        console.warn(`[GeminiLive] Model ${model} notice, trying next:`, e);
      }
    }

    if (!response) {
      throw new Error("Gemini live reasoning failed across all candidates");
    }

    const calls = response.functionCalls;
    if (calls && calls.length > 0) {
      for (const call of calls) {
        const toolName = call.name || "";
        const toolArgs = (call.args as Record<string, any>) || {};
        options?.onToolCall?.(toolName, toolArgs);
        options?.callbacks?.onToolCall?.(toolName, toolArgs);
        await executeWebsiteTool(toolName, toolArgs);
      }
    }

    const replyText = response.text || "Action executed on your dashboard, Boss!";
    options?.callbacks?.onToken?.(replyText, replyText);
    options?.onToken?.(replyText, replyText);

    options?.callbacks?.onStageChange?.("speaking");
    options?.onStageChange?.("speaking");

    // Speak reply naturally aloud unless user muted audio
    if (!options?.muteAudio) {
      speaker.say(replyText);
    }

    return replyText;
  }

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
