// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import {
  PATHFINDER_TOOLS,
  executeWebsiteTool,
  tryInstantBrowserCommand,
  showGoogleSearchOverlay,
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
- Address the user as "${honorific}" (${isBoss ? "Boss Dileep Bommali" : "Sir"}).
- When the user says "Hi DAS" or greets you, reply warmly and briefly like: "Hi ${honorific}! Tell me what we should explore or search today."
- When the user asks to search anything on Google (like "NRI Institute of Technology" or any company/topic), give a clear, natural 2-3 sentence spoken summary about it right away.
- When the user says "return back to your page", confirm warmly: "Okay ${honorific}, we are back on your Pathfinder page!"
- Keep every answer natural, conversational, and concise (1 to 3 sentences) so voice conversation feels instant.`;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private ai: GoogleGenAI;
  private handsFreeActive = false;
  private recognition: any = null;
  private isAgentSpeaking = false;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });

    if (typeof window !== "undefined") {
      setTimeout(() => this.mountHandsFreeMicButton(), 800);
    }
  }

  // Mounts a floating Hands-Free Voice Mic button directly on the screen so the user never has to type!
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
      btn.style.boxShadow = "0 8px 30px rgba(220,38,38,0.5)";
    } else if (state === "listening") {
      btn.innerHTML = `🟢 Listening... (Speak to DAS)`;
      btn.style.background = "linear-gradient(135deg,#059669,#047857)";
      btn.style.boxShadow = "0 0 28px rgba(16,185,129,0.75)";
    } else if (state === "thinking") {
      btn.innerHTML = `⚡ DAS Thinking...`;
      btn.style.background = "linear-gradient(135deg,#d97706,#b45309)";
    } else if (state === "speaking") {
      btn.innerHTML = `🔊 DAS Speaking... (Click to Stop)`;
      btn.style.background = "linear-gradient(135deg,#2563eb,#1d4ed8)";
      btn.style.boxShadow = "0 0 28px rgba(59,130,246,0.75)";
    }
  }

  // Starts continuous Hands-Free Voice Conversation (No typing needed!)
  public startHandsFreeVoice() {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("Please use Google Chrome or Microsoft Edge for Hands-Free Voice.");
      return;
    }

    this.handsFreeActive = true;
    this.updateMicButtonUI("listening");

    if (!this.recognition) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-IN"; // Understands Indian English, College names (NRIIT), and conversational Telugu/English

      rec.onresult = async (event: any) => {
        if (this.isAgentSpeaking) return;
        const lastIdx = event.results.length - 1;
        const transcript = event.results[lastIdx][0]?.transcript?.trim();
        if (!transcript) return;

        console.log("[Hands-Free User]:", transcript);
        this.updateMicButtonUI("thinking");

        await this.sendTurn(transcript, {
          speakAudio: true
        });
      };

      rec.onend = () => {
        // Automatically restart listening as long as Hands-Free mode is ON
        if (this.handsFreeActive && !this.isAgentSpeaking) {
          try {
            rec.start();
            this.updateMicButtonUI("listening");
          } catch { }
        }
      };

      rec.onerror = () => {
        if (this.handsFreeActive && !this.isAgentSpeaking) {
          setTimeout(() => {
            try {
              rec.start();
            } catch { }
          }, 400);
        }
      };

      this.recognition = rec;
    }

    try {
      this.recognition.start();
    } catch { }

    // Greet the user immediately when Hands-Free starts
    const { honorific } = resolveUserHonorific();
    this.speakAloudNaturally(`Hi ${honorific}! Hands-free voice is on. Tell me what you want to do.`);
  }

  public stopHandsFreeVoice() {
    this.handsFreeActive = false;
    this.isAgentSpeaking = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch { }
    }
    this.updateMicButtonUI("off");
  }

  // Natural Voice Output that pauses mic while speaking and resumes mic immediately after!
  private speakAloudNaturally(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !text?.trim()) {
        resolve();
        return;
      }

      this.isAgentSpeaking = true;
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch { }
      }
      this.updateMicButtonUI("speaking");

      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`~]/g, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Select the most natural Google/Microsoft voice available in browser
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.name.includes("Google") && v.lang.includes("en")) ||
        voices.find((v) => v.name.includes("Natural") && v.lang.includes("en")) ||
        voices.find((v) => v.lang.includes("en-IN")) ||
        voices[0];

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const finishSpeaking = () => {
        this.isAgentSpeaking = false;
        if (this.handsFreeActive) {
          this.updateMicButtonUI("listening");
          try {
            this.recognition?.start();
          } catch { }
        } else {
          this.updateMicButtonUI("off");
        }
        resolve();
      };

      utterance.onend = finishSpeaking;
      utterance.onerror = finishSpeaking;
      window.speechSynthesis.speak(utterance);
    });
  }

  private async resolveSessionKey(): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/api/agent/session-token`);
      if (res.ok) {
        const data = await res.json();
        if (data?.token || data?.apiKey) {
          return data.token || data.apiKey;
        }
      }
    } catch { }
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  }

  async connect(callbacks?: GeminiLiveCallbacks) {
    try {
      callbacks?.onStatusChange?.("connecting");
      const key = await this.resolveSessionKey();
      if (key) {
        this.ai = new GoogleGenAI({ apiKey: key });
      }

      const liveModel = import.meta.env.VITE_GEMINI_LIVE_MODEL || "gemini-3.8-live";
      const voiceName = import.meta.env.VITE_GEMINI_VOICE_NAME || "Puck";

      this.session = await this.ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          },
          systemInstruction: { parts: [{ text: getMasterPrompt() }] },
          tools: PATHFINDER_TOOLS
        },
        callbacks: {
          onopen: () => callbacks?.onStatusChange?.("connected"),
          onmessage: async (msg: any) => {
            if (msg.toolCall?.functionCalls) {
              for (const call of msg.toolCall.functionCalls) {
                await executeWebsiteTool(call.name, call.args || {});
              }
            }
          },
          onerror: () => callbacks?.onStatusChange?.("error"),
          onclose: () => callbacks?.onStatusChange?.("disconnected")
        }
      });
      return this.session;
    } catch {
      return null;
    }
  }

  async speakText(text: string): Promise<boolean> {
    await this.speakAloudNaturally(text);
    return true;
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

    // 1. Check Instant Greeting ("hi das", "hello das", "hey das")
    if (/^(hi|hello|hey)\s*(das|pathfinder)?[!?.]*$/i.test(trimmed)) {
      const greeting = `Hi ${honorific}! I'm listening. Tell me what to search on Google or which page to open!`;
      options?.onToken?.(greeting);
      options?.callbacks?.onToken?.(greeting);
      if (options?.speakAudio !== false && !options?.muteAudio) {
        await this.speakAloudNaturally(greeting);
      }
      return greeting;
    }

    // 2. Check 0ms Instant Browser Command (Open Google / Search College / Return Back to Page)
    const instant = tryInstantBrowserCommand(trimmed);

    // If user said "return back to your page" -> immediate response!
    if (instant.handled && !instant.isSearchQuery) {
      const returnReply = `Okay ${honorific}! I've ${instant.actionSummary}. What should we do next?`;
      options?.onToken?.(returnReply);
      options?.callbacks?.onToken?.(returnReply);
      if (options?.speakAudio !== false && !options?.muteAudio) {
        await this.speakAloudNaturally(returnReply);
      }
      return returnReply;
    }

    // 3. Generate Smart Explanation (With Google Search Grounding for Colleges/Companies!)
    options?.onStageChange?.("thinking");
    let replyText = "";

    try {
      const queryPrompt = instant.isSearchQuery
        ? `The user ${honorific} asked you to search Google for: "${instant.searchQuery}". Give a clear, accurate, friendly 2 to 3 sentence summary about "${instant.searchQuery}" (for example, if it's a college like NRI Institute of Technology, mention its location in Agiripalli/Vijayawada, autonomous B.Tech programs, and placements). Address them as ${honorific}.`
        : trimmed;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: queryPrompt,
        config: {
          systemInstruction: getMasterPrompt(),
          tools: instant.isSearchQuery ? [{ googleSearch: {} }] : PATHFINDER_TOOLS,
          temperature: 0.4,
          maxOutputTokens: 180
        }
      });

      if (!instant.isSearchQuery && response.functionCalls?.length) {
        for (const call of response.functionCalls) {
          await executeWebsiteTool(call.name || "", (call.args as Record<string, any>) || {});
        }
      }

      replyText =
        response.text?.trim() ||
        `Done ${honorific}! Here are the details for ${instant.searchQuery || "your request"}.`;
    } catch {
      replyText = instant.isSearchQuery
        ? `Here are the Google search results for ${instant.searchQuery}, ${honorific}! You can view the details right on screen, and say "return back to your page" whenever you're ready.`
        : `Okay ${honorific}, executed right away!`;
    }

    // Update the in-page Google Search overlay with the AI's explanation!
    if (instant.isSearchQuery && instant.searchQuery) {
      showGoogleSearchOverlay(instant.searchQuery, replyText);
    }

    options?.onToken?.(replyText);
    options?.callbacks?.onToken?.(replyText);
    options?.onStageChange?.("speaking");

    if (options?.speakAudio !== false && !options?.muteAudio) {
      await this.speakAloudNaturally(replyText);
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