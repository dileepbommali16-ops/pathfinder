// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import {
  PATHFINDER_TOOLS,
  executeWebsiteTool,
  tryInstantBrowserCommand
} from "./toolRunner";

export interface GeminiLiveCallbacks {
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInterrupted?: () => void;
  onTranscript?: (text: string, role: "user" | "agent") => void;
  onToken?: (fullText: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onStageChange?: (stage: string) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

// HARD-BLOCK Browser Female TTS (window.speechSynthesis) globally so ONLY Gemini Live "Puck" ever speaks!
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak = () => {
      // Blocked: Never allow robotic browser female voice to play or interrupt Puck!
    };
  } catch { }
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

function getPuckSystemInstruction(): string {
  const { honorific, isBoss } = resolveUserHonorific();
  return `You are DAS, a fast, natural, friendly AI co-pilot with the Puck male voice, created by Boss Dileep Bommali.
- Always address the user as "${honorific}" (${isBoss ? "your creator Boss Dileep Bommali" : "Sir"}).
- Speak naturally like a real friend in Telugu, English, or Hinglish/Tanglish/Telugish depending on how ${honorific} talks to you.
- When ${honorific} says "Hi DAS", reply: "Hi ${honorific}! Cheppandi, em cheddham?" or "Hi ${honorific}! Tell me what we should do."
- When ${honorific} asks to search something on Google (like a college or company), briefly tell them the key highlights in 2 crisp sentences.
- When ${honorific} says "return back to your page", say: "Okay ${honorific}, back on your Pathfinder page!"
- Keep every response short (1 to 3 sentences) for instant speed.`;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private connectPromise: Promise<any> | null = null;
  private ai: GoogleGenAI;
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private lastPuckTurnTimestamp = 0;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });

    if (typeof document !== "undefined") {
      // Remove any old overlapping bottom-left button or right-side overlay
      document.getElementById("das-handsfree-voice-btn")?.remove();
      document.getElementById("das-google-live-overlay")?.remove();
    }
  }

  private initAudioContext() {
    if (typeof window === "undefined") return;
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => { });
    }
  }

  // Plays 24kHz PCM Audio from Gemini Live ("Puck" Male Voice)
  private playPuckAudioChunk(base64Pcm: string) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const buffer = this.audioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);

      if (this.nextStartTime < this.audioCtx.currentTime) {
        this.nextStartTime = this.audioCtx.currentTime;
      }
      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
      this.activeSources.push(source);
    } catch (err) {
      console.warn("[Puck Audio Error]:", err);
    }
  }

  public stopAudioPlayback() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch { }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
  }

  // Connects to Gemini Live WebSocket using ONLY the "Puck" Male Voice
  async connect(callbacks?: GeminiLiveCallbacks) {
    if (this.session) return this.session;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = (async () => {
      try {
        callbacks?.onStatusChange?.("connecting");
        this.initAudioContext();

        this.session = await this.ai.live.connect({
          model: "gemini-2.0-flash-exp",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck" // 100% LOCKED TO PUCK MALE VOICE
                }
              }
            },
            systemInstruction: {
              parts: [{ text: getPuckSystemInstruction() }]
            },
            tools: PATHFINDER_TOOLS
          },
          callbacks: {
            onopen: () => {
              callbacks?.onStatusChange?.("connected");
              callbacks?.onStageChange?.("listening");
            },
            onmessage: async (message: any) => {
              if (message.serverContent?.interrupted) {
                this.stopAudioPlayback();
                callbacks?.onInterrupted?.();
              }

              const parts = message.serverContent?.modelTurn?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  this.playPuckAudioChunk(part.inlineData.data);
                  callbacks?.onAudioChunk?.(part.inlineData.data);
                  callbacks?.onStageChange?.("speaking");
                }
                if (part.text) {
                  callbacks?.onTranscript?.(part.text, "agent");
                }
              }

              if (message.toolCall?.functionCalls) {
                const functionResponses = [];
                for (const call of message.toolCall.functionCalls) {
                  callbacks?.onToolCall?.(call.name, call.args || {});
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
              console.error("[GeminiLive Puck Error]:", err);
              callbacks?.onStatusChange?.("error");
            },
            onclose: () => {
              this.session = null;
              this.connectPromise = null;
              callbacks?.onStatusChange?.("disconnected");
            }
          }
        });

        return this.session;
      } catch (error) {
        this.connectPromise = null;
        console.error("Failed to connect Gemini Live (Puck):", error);
        callbacks?.onStatusChange?.("error");
        return null;
      }
    })();

    return this.connectPromise;
  }

  // Prevents AgentLayout/audioIO from cutting off Puck when sendTurn is already speaking!
  async speakText(text: string): Promise<boolean> {
    if (!text?.trim()) return false;

    // If sendTurn already triggered Puck voice in the last 6 seconds, DO NOT interrupt or double-speak!
    if (Date.now() - this.lastPuckTurnTimestamp < 6000) {
      return true;
    }

    try {
      this.lastPuckTurnTimestamp = Date.now();
      const ws = await this.connect();
      if (ws) {
        ws.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: `Read this exact reply aloud naturally in your Puck voice without adding extra words: "${text}"`
                }
              ]
            }
          ],
          turnComplete: true
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async sendTurn(
    userText: string,
    options?: {
      systemPrompt?: string;
      speakAudio?: boolean;
      history?: Array<{ role: string; content: string }>;
      signal?: AbortSignal;
      muteAudio?: boolean;
      callbacks?: GeminiLiveCallbacks;
      onToken?: (fullText: string) => void;
      onToolCall?: (name: string, args: Record<string, any>) => void;
      onStageChange?: (stage: string) => void;
    }
  ): Promise<string> {
    const { honorific } = resolveUserHonorific();
    const trimmed = userText.trim();

    // Stop any previous turn's audio cleanly before starting the new turn
    this.stopAudioPlayback();
    this.lastPuckTurnTimestamp = Date.now();

    // 1. 0ms Synchronous Action (Open Google / Search College / Return Back to Page)
    const instant = tryInstantBrowserCommand(trimmed);

    // 2. Get fast, accurate text reply
    options?.onStageChange?.("thinking");
    options?.callbacks?.onStageChange?.("thinking");

    let replyText = "";

    if (/^(hi|hello|hey)\s*(das|pathfinder)?[!?.]*$/i.test(trimmed)) {
      replyText = `Hi ${honorific}! I'm ready. Tell me what to open or search!`;
    } else if (instant.handled && !instant.isSearchQuery) {
      replyText = `Okay ${honorific}! I have ${instant.actionSummary}.`;
    } else {
      try {
        const queryPrompt = instant.isSearchQuery
          ? `The user ${honorific} asked you to open Google and search for "${instant.searchQuery}". Confirm that you opened Google search for "${instant.searchQuery}" and give a crisp 2-sentence overview about "${instant.searchQuery}". Address them as ${honorific}.`
          : trimmed;

        const response = await this.ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: queryPrompt,
          config: {
            systemInstruction: getPuckSystemInstruction(),
            tools: instant.isSearchQuery ? [{ googleSearch: {} }] : PATHFINDER_TOOLS,
            temperature: 0.45,
            maxOutputTokens: 160
          }
        });

        if (!instant.isSearchQuery && response.functionCalls?.length) {
          for (const call of response.functionCalls) {
            const toolName = call.name || "";
            const toolArgs = (call.args as Record<string, any>) || {};
            options?.onToolCall?.(toolName, toolArgs);
            await executeWebsiteTool(toolName, toolArgs);
          }
        }

        replyText =
          response.text?.trim() ||
          `Done ${honorific}! Executed right away.`;
      } catch {
        replyText = instant.handled
          ? `Done ${honorific}! I have ${instant.actionSummary}.`
          : `Okay ${honorific}, done!`;
      }
    }

    // 3. Show text in chat immediately
    options?.onToken?.(replyText);
    options?.callbacks?.onToken?.(replyText);
    options?.onStageChange?.("speaking");
    options?.callbacks?.onStageChange?.("speaking");

    // 4. Speak the exact reply using ONLY Gemini Live WebSocket "Puck" Male Voice!
    const shouldSpeak = options?.speakAudio !== false && !options?.muteAudio;
    if (shouldSpeak) {
      this.lastPuckTurnTimestamp = Date.now();
      this.connect(options?.callbacks)
        .then((ws) => {
          if (ws) {
            ws.sendClientContent({
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Speak this exact message aloud with natural emotion (do not change or add words): "${replyText}"`
                    }
                  ]
                }
              ],
              turnComplete: true
            });
          }
        })
        .catch(() => { });
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
    this.stopAudioPlayback();
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.connectPromise = null;
  }
}

export const geminiLive = new PathfinderGeminiLive();
