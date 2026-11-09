// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import {
  PATHFINDER_TOOLS,
  executeWebsiteTool,
  tryInstantBrowserCommand,
  VoicePipelineStage
} from "./toolRunner";

export interface GeminiLiveCallbacks {
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInterrupted?: () => void;
  onTranscript?: (text: string, role: "user" | "agent") => void;
  onToken?: (fullText: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onStageChange?: (stage: VoicePipelineStage) => void;
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

function getMasterPrompt(): string {
  const { honorific, isBoss } = resolveUserHonorific();
  return `You are DAS, a friendly, fast, real-time voice co-pilot created by Boss Dileep Bommali.
- Always address the user as "${honorific}" (${isBoss ? "Boss Dileep Bommali" : "Sir"}).
- Speak naturally like a close friend in the exact language the user speaks (Telugu, English, or Tenglish).
- Keep every answer short, clear, and conversational (1 to 3 sentences).`;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private isConnecting = false;
  private ai: GoogleGenAI;
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private handsFreeActive = false;
  private recognition: any = null;
  private isAgentSpeaking = false;
  private speakingResetTimer: any = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });

    if (typeof window !== "undefined") {
      // Permanently mute browser's built-in female SpeechSynthesis so ONLY Puck speaks!
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak = () => { };
      }
      // Remove any old right-side overlay if present
      document.getElementById("das-google-live-overlay")?.remove();
      setTimeout(() => this.mountHandsFreeMicButton(), 600);
    }
  }

  // Left-side bottom Hands-Free Voice button (Keep as requested!)
  private mountHandsFreeMicButton() {
    if (typeof document === "undefined") return;
    if (document.getElementById("das-handsfree-voice-btn")) return;

    const btn = document.createElement("button");
    btn.id = "das-handsfree-voice-btn";
    btn.type = "button";
    btn.innerHTML = `🎙️ Start Hands-Free Voice`;
    btn.style.cssText =
      "position:fixed;bottom:24px;left:24px;z-index:99999;display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:700;color:#ffffff;background:linear-gradient(135deg,#dc2626,#991b1b);border:1px solid rgba(255,255,255,0.25);box-shadow:0 8px 30px rgba(220,38,38,0.5);cursor:pointer;transition:all 0.25s ease;font-family:sans-serif;";

    btn.onclick = () => {
      if (this.handsFreeActive) {
        this.stopHandsFreeVoice();
      } else {
        this.startHandsFreeVoice();
      }
    };

    document.body.appendChild(btn);
  }

  private updateMicButtonUI(state: "off" | "listening" | "speaking" | "thinking") {
    const btn = document.getElementById("das-handsfree-voice-btn");
    if (!btn) return;

    if (state === "off") {
      btn.innerHTML = `🎙️ Start Hands-Free Voice`;
      btn.style.background = "linear-gradient(135deg,#dc2626,#991b1b)";
    } else if (state === "listening") {
      btn.innerHTML = `🟢 Listening... (Speak to DAS)`;
      btn.style.background = "linear-gradient(135deg,#059669,#047857)";
    } else if (state === "thinking") {
      btn.innerHTML = `⚡ DAS Thinking...`;
      btn.style.background = "linear-gradient(135deg,#d97706,#b45309)";
    } else if (state === "speaking") {
      btn.innerHTML = `🔊 DAS (Puck) Speaking...`;
      btn.style.background = "linear-gradient(135deg,#2563eb,#1d4ed8)";
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

  // Plays ONLY Gemini Live 24kHz 'Puck' Male Voice!
  private playPuckAudioChunk(base64Pcm: string) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      this.isAgentSpeaking = true;
      this.updateMicButtonUI("speaking");
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch { }
      }

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

      // Resume mic after Puck finishes speaking
      const remainingMs = Math.max(300, (this.nextStartTime - this.audioCtx.currentTime) * 1000 + 250);
      clearTimeout(this.speakingResetTimer);
      this.speakingResetTimer = setTimeout(() => {
        this.isAgentSpeaking = false;
        if (this.handsFreeActive) {
          this.updateMicButtonUI("listening");
          try {
            this.recognition?.start();
          } catch { }
        } else {
          this.updateMicButtonUI("off");
        }
      }, remainingMs);
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
    this.isAgentSpeaking = false;
  }

  public async startHandsFreeVoice() {
    if (typeof window === "undefined") return;
    this.initAudioContext();
    await this.connect();

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    this.handsFreeActive = true;
    this.updateMicButtonUI("listening");

    if (!this.recognition) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-IN";

      rec.onresult = async (event: any) => {
        if (this.isAgentSpeaking) return;
        const lastIdx = event.results.length - 1;
        const transcript = event.results[lastIdx][0]?.transcript?.trim();
        if (!transcript) return;

        this.updateMicButtonUI("thinking");
        await this.sendTurn(transcript, { speakAudio: true });
      };

      rec.onend = () => {
        if (this.handsFreeActive && !this.isAgentSpeaking) {
          try {
            rec.start();
            this.updateMicButtonUI("listening");
          } catch { }
        }
      };

      this.recognition = rec;
    }

    try {
      this.recognition.start();
    } catch { }
  }

  public stopHandsFreeVoice() {
    this.handsFreeActive = false;
    this.stopAudioPlayback();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch { }
    }
    this.updateMicButtonUI("off");
  }

  // Connects to Gemini Live WebSocket with STRICTLY "Puck" male voice
  async connect(callbacks?: GeminiLiveCallbacks) {
    if (this.session) return this.session;
    if (this.isConnecting) return null;

    try {
      this.isConnecting = true;
      this.initAudioContext();

      this.session = await this.ai.live.connect({
        model: import.meta.env.VITE_GEMINI_LIVE_MODEL || "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: import.meta.env.VITE_GEMINI_VOICE_NAME || "Puck"
              }
            }
          },
          systemInstruction: {
            parts: [{ text: getMasterPrompt() }]
          },
          tools: PATHFINDER_TOOLS
        },
        callbacks: {
          onopen: () => {
            this.isConnecting = false;
            callbacks?.onStatusChange?.("connected");
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
              }
            }

            if (message.toolCall?.functionCalls) {
              const functionResponses = [];
              for (const call of message.toolCall.functionCalls) {
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
          onerror: () => {
            this.isConnecting = false;
            callbacks?.onStatusChange?.("error");
          },
          onclose: () => {
            this.isConnecting = false;
            this.session = null;
            callbacks?.onStatusChange?.("disconnected");
          }
        }
      });

      return this.session;
    } catch {
      this.isConnecting = false;
      return null;
    }
  }

  // Speaks any text using ONLY Gemini Live Puck voice over WebSocket
  async speakText(text: string): Promise<boolean> {
    if (!text?.trim()) return false;
    try {
      const ws = await this.connect();
      if (ws) {
        ws.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: `Say this exact sentence naturally: "${text}"` }]
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
      onStageChange?: (stage: VoicePipelineStage) => void;
    }
  ): Promise<string> {
    const { honorific } = resolveUserHonorific();
    const trimmed = userText.trim();
    this.stopAudioPlayback();

    // 1. Instant Browser Command (Open Google / Search / Return Back)
    const instant = tryInstantBrowserCommand(trimmed);

    // 2. Generate text reply for the existing chat box
    let replyText = "";
    if (instant.handled && !instant.isSearchQuery) {
      replyText = `Okay ${honorific}! I've ${instant.actionSummary}.`;
    } else {
      try {
        const prompt = instant.isSearchQuery
          ? `The user ${honorific} searched Google for "${instant.searchQuery}". Give a natural, friendly 2-sentence overview about "${instant.searchQuery}".`
          : trimmed;

        let response: any = null;
        const configuredModel = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash";
        const modelsToTry = [configuredModel, "gemini-3.8-live", "gemini-3.1-flash-lite", "gemini-flash-latest"];
        for (const m of modelsToTry) {
          try {
            response = await this.ai.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                systemInstruction: getMasterPrompt(),
                tools: instant.isSearchQuery ? [{ googleSearch: {} }] : PATHFINDER_TOOLS,
                temperature: 0.4,
                maxOutputTokens: 160
              }
            });
            if (response?.text) break;
          } catch { }
        }

        if (!instant.isSearchQuery && response?.functionCalls?.length) {
          for (const call of response.functionCalls) {
            await executeWebsiteTool(call.name || "", (call.args as Record<string, any>) || {});
          }
        }

        replyText = response?.text?.trim() || `Done ${honorific}!`;
      } catch {
        replyText = `Done ${honorific}!`;
      }
    }

    options?.onToken?.(replyText);
    options?.callbacks?.onToken?.(replyText);

    // 3. Speak the reply aloud using ONLY Gemini Live Puck Voice!
    if (options?.speakAudio !== false && !options?.muteAudio) {
      await this.speakText(replyText);
    }

    return replyText;
  }

  sendMicAudio(base64Pcm16k: string) {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      media: { data: base64Pcm16k, mimeType: "audio/pcm;rate=16000" }
    });
  }

  disconnect() {
    this.stopHandsFreeVoice();
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}

export const geminiLive = new PathfinderGeminiLive();
