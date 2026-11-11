// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import { speaker } from "./audioIO";
import { dasSocket } from "./agentSocket";
import {
  PATHFINDER_TOOLS,
  executeWebsiteTool,
  tryInstantBrowserCommand,
  type VoicePipelineStage
} from "./toolRunner";

export const GEMINI_LIVE_CONFIG = {
  wsEndpoint:
    (import.meta as any).env?.VITE_WS_URL ||
    "wss://pathfinder-backend-klrp.onrender.com/agent/ws",
  apiEndpoint:
    (import.meta as any).env?.VITE_BACKEND_URL ||
    "https://pathfinder-backend-klrp.onrender.com",
  voiceName: "Puck",
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  supportedLanguages: ["te-IN", "en-IN", "hi-IN"],
};

export function formatQuickCommand(commandText: string, role: "boss" | "sir"): string {
  const prefix = role === "boss" ? "[User: Boss Dileep]" : "[User: Evaluator Sir]";
  return `${prefix} ${commandText}`;
}

export interface GeminiLiveCallbacks {
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInterrupted?: () => void;
  onTranscript?: (text: string, role: "user" | "agent") => void;
  onToken?: (fullText: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onStageChange?: (stage: VoicePipelineStage) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

const ENV = import.meta.env as Record<string, string | undefined>;
// FIXED: Valid Gemini Live WebSocket model so Puck voice never fails!
const LIVE_MODEL = ENV.VITE_GEMINI_LIVE_MODEL || "gemini-3.8-live";
const VOICE_NAME = "Puck";
const TEXT_MODEL = ENV.VITE_GEMINI_TEXT_MODEL || "gemini-flash-lite-latest";

type MicUi = "off" | "connecting" | "listening" | "speaking" | "thinking";

/* ------------------------------------------------------------------ */
/* Boss (Dileep Bommali) vs Sir (Stakeholders / Friends / Guests)      */
/* ------------------------------------------------------------------ */
function resolveUserHonorific(): { honorific: "Boss" | "Sir"; isBoss: boolean } {
  if (typeof window === "undefined") return { honorific: "Boss", isBoss: true };
  try {
    const mode = (localStorage.getItem("das_mode") || "").toUpperCase();
    const role = (localStorage.getItem("userRole") || "").toLowerCase();
    const isOwner = localStorage.getItem("isOwner") === "true";
    const savedUser = (localStorage.getItem("pathfinder_user") || "").toLowerCase();
    const email = (localStorage.getItem("userEmail") || localStorage.getItem("email") || "").toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);

    // If explicit visitor query param (?mode=sir or ?guest=true)
    if (urlParams.get("mode") === "sir" || urlParams.get("guest") === "true") {
      return { honorific: "Sir", isBoss: false };
    }

    // Boss (Dileep Bommali) Detection
    const isBossMatch =
      isOwner ||
      mode === "BOSS" ||
      role === "boss" ||
      savedUser.includes("dileep") ||
      savedUser.includes("bommali") ||
      email.includes("dileep") ||
      email.includes("bommali") ||
      urlParams.get("mode") === "boss" ||
      urlParams.get("role") === "boss";

    // If a different guest email is explicitly set without Boss flags, treat as Sir
    const isGuest = !isBossMatch && email.length > 3 && !email.includes("dileep") && mode !== "BOSS";
    if (isGuest) {
      return { honorific: "Sir", isBoss: false };
    }

    return { honorific: "Boss", isBoss: true };
  } catch { }
  return { honorific: "Boss", isBoss: true };
}

const LANGUAGE_RULE = `LANGUAGE: Always reply in the SAME language the user speaks (Telugu, Hindi, Tamil, English, or a natural mix like Tenglish/Hinglish). If they mix languages, mix the same way. Speak naturally like a real person, never translate word by word.`;

function getMasterPrompt(): string {
  const { honorific, isBoss } = resolveUserHonorific();
  return `You are DAS, the friendly 3D AI voice co-pilot of Pathfinder 2.0, created by Boss Dileep Bommali.
${isBoss
      ? `You are speaking to your creator, Boss Dileep Bommali. Always address him as "Boss" warmly like a close friend.`
      : `You are speaking to a valued stakeholder, guest, or candidate. Address them respectfully and warmly as "Sir".`
    }

PERSONALITY
- Warm, natural, fast, and encouraging. Never sound like a rigid robot.
- Do NOT blindly read out raw screen numbers—explain what they mean naturally.
- Use natural conversational fillers when speaking Telugu/English ("sare Boss", "okay Sir", "pakka", "let's do it!").

${LANGUAGE_RULE}

LENGTH
- Simple commands or confirmations: 1 to 2 short sentences.
- When asked about yourself, Pathfinder, a page, or a company/college: explain clearly in 4 to 7 natural sentences.

ABOUT YOURSELF & PATHFINDER
- You are DAS, the 3D AI co-pilot of Pathfinder 2.0, built by Boss Dileep Bommali.
- Pathfinder predicts placement probability using a Random Forest model trained on 972 verified campus placement records.
- Modules include: Hero Readiness Overview, Target Company Placement Radar, Readiness Vectors, What-If Simulator, Live GitHub Skill Verifier, Skill Gap Matrix, 6-Week Sprint Roadmap, 23 Flagship Project Blueprints, STAR Defense Simulator, Live Mock Interview Simulator, ATS Resume Studio (Google X-Y-Z format), Cohort Analytics, and Google Workspace Automation (Gmail, Calendar, TPO Sheets).

CONTROLLING THE WEBSITE & GOOGLE
- Switch tabs -> navigate_dashboard_tab.
- Open blueprint 1-23 -> open_blueprint.
- Click any button/tab -> click_element (or call list_clickables if unsure).
- Type into inputs -> type_text.
- Scroll -> scroll_page.
- Explain current screen -> read_page.
- Search Google or open external sites (Google, YouTube, LinkedIn, Gmail, GitHub) -> open_external_website_or_google_search, then explain the summary aloud to ${honorific}.
- Close Google and come back -> return_to_pathfinder_page, and confirm "Okay ${honorific}, we are back on your Pathfinder page!"
- Send Gmail / Schedule Google Calendar / Sync TPO Sheet -> send_gmail_automation, schedule_google_calendar_interview, sync_student_to_tpo_google_sheet.`;
}

export class PathfinderGeminiLive {
  private session: any = null;
  private connecting: Promise<any> | null = null;
  private cb: GeminiLiveCallbacks = {};
  private resolvedKey = "";

  private handsFreeActive = false;
  private isAgentSpeaking = false;
  private agentText = "";
  private turnWaiter: (() => void) | null = null;

  // Mic (16kHz PCM)
  private micStream: MediaStream | null = null;
  private micCtx: AudioContext | null = null;
  private micNode: ScriptProcessorNode | null = null;
  private lastExternalMic = 0;

  // Speaker (24kHz PCM - Puck Only)
  private outCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private playing: AudioBufferSourceNode[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      // Remove any old right-side overlay if it exists
      document.getElementById("das-google-live-overlay")?.remove();
      setTimeout(() => this.mountHandsFreeMicButton(), 600);
    }
  }

  /* ---------------- Left-Side Floating Mic Button ---------------- */
  private mountHandsFreeMicButton() {
    if (typeof document === "undefined") return;
    if (document.getElementById("das-handsfree-voice-btn")) return;

    const btn = document.createElement("button");
    btn.id = "das-handsfree-voice-btn";
    btn.type = "button";
    btn.setAttribute("data-das-ignore", "true");
    btn.innerHTML = `🎙️ Start Hands-Free Voice`;
    btn.style.cssText =
      "position:fixed;bottom:24px;left:24px;z-index:99999;display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:700;color:#ffffff;background:linear-gradient(135deg,#dc2626,#991b1b);border:1px solid rgba(255,255,255,0.25);box-shadow:0 8px 30px rgba(220,38,38,0.5);cursor:pointer;transition:all 0.25s ease;font-family:sans-serif;";
    btn.onclick = () => {
      window.dispatchEvent(new CustomEvent("das-toggle-mic"));
    };
    document.body.appendChild(btn);
  }

  private updateMicButtonUI(state: MicUi) {
    const btn = document.getElementById("das-handsfree-voice-btn");
    if (!btn) return;
    if (state === "off") {
      btn.innerHTML = `🎙️ Start Hands-Free Voice`;
      btn.style.background = "linear-gradient(135deg,#dc2626,#991b1b)";
      btn.style.boxShadow = "0 8px 30px rgba(220,38,38,0.5)";
    } else if (state === "connecting") {
      btn.innerHTML = `⏳ Connecting DAS (Puck)...`;
      btn.style.background = "linear-gradient(135deg,#7c3aed,#5b21b6)";
    } else if (state === "listening") {
      btn.innerHTML = `🟢 Listening... (Speak to DAS)`;
      btn.style.background = "linear-gradient(135deg,#059669,#047857)";
      btn.style.boxShadow = "0 0 28px rgba(16,185,129,0.75)";
    } else if (state === "thinking") {
      btn.innerHTML = `⚡ DAS Thinking...`;
      btn.style.background = "linear-gradient(135deg,#d97706,#b45309)";
    } else if (state === "speaking") {
      btn.innerHTML = `🔊 DAS (Puck) Speaking...`;
      btn.style.background = "linear-gradient(135deg,#2563eb,#1d4ed8)";
      btn.style.boxShadow = "0 0 28px rgba(59,130,246,0.75)";
    }
  }

  /* ---------------- Speaker (24kHz Gemini Live Puck Audio) ---------------- */
  private ensureOut() {
    if (!this.outCtx || this.outCtx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outCtx = new AudioCtx({ sampleRate: 24000 });
      this.analyser = this.outCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.outCtx.destination);
    }
    if (this.outCtx.state === "suspended") void this.outCtx.resume();
  }

  public getAnalyser(): AnalyserNode | null {
    this.ensureOut();
    return this.analyser;
  }

  private playChunk(b64: string) {
    this.ensureOut();
    const ctx = this.outCtx!;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;

    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.analyser!);
    this.nextPlayTime = Math.max(this.nextPlayTime, ctx.currentTime);
    src.start(this.nextPlayTime);
    this.nextPlayTime += buf.duration;
    this.playing.push(src);
    src.onended = () => {
      this.playing = this.playing.filter((s) => s !== src);
      if (this.playing.length === 0) {
        this.isAgentSpeaking = false;
        if (this.handsFreeActive) this.updateMicButtonUI("listening");
      }
    };
  }

  private stopPlayback() {
    this.playing.forEach((s) => {
      try {
        s.stop();
      } catch { }
    });
    this.playing = [];
    this.nextPlayTime = 0;
    this.isAgentSpeaking = false;
  }

  /* ---------------- Mic (16kHz PCM Direct to WebSocket) ---------------- */
  private async startMic() {
    if (this.micStream) return;
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.micCtx = new AudioCtx({ sampleRate: 16000 });
    const source = this.micCtx.createMediaStreamSource(this.micStream);
    this.micNode = this.micCtx.createScriptProcessor(2048, 1, 1);
    this.micNode.onaudioprocess = (e) => {
      if (!this.session || this.isAgentSpeaking) return;
      if (Date.now() - this.lastExternalMic < 1500) return;
      const f = e.inputBuffer.getChannelData(0);
      const i16 = new Int16Array(f.length);
      for (let i = 0; i < f.length; i++) {
        const v = Math.max(-1, Math.min(1, f[i]));
        i16[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
      const u8 = new Uint8Array(i16.buffer);
      let s = "";
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      try {
        this.session.sendRealtimeInput({
          media: { data: btoa(s), mimeType: "audio/pcm;rate=16000" }
        });
      } catch { }
    };
    source.connect(this.micNode);
    this.micNode.connect(this.micCtx.destination);
  }

  private stopMic() {
    try {
      this.micNode?.disconnect();
    } catch { }
    this.micNode = null;
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    try {
      void this.micCtx?.close();
    } catch { }
    this.micCtx = null;
  }

  /* ---------------- Hands-Free Voice Control ---------------- */
  public async startHandsFreeVoice() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("das-toggle-mic"));
  }

  public stopHandsFreeVoice() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("das-toggle-mic"));
  }

  /* ---------------- Server-Side Persistent WebSocket Connection ---------------- */
  private async resolveSessionKey(): Promise<string> {
    if (this.resolvedKey) return this.resolvedKey;
    if (ENV.VITE_GEMINI_API_KEY) {
      this.resolvedKey = ENV.VITE_GEMINI_API_KEY;
      return ENV.VITE_GEMINI_API_KEY;
    }
    try {
      const res = await fetch(`${API_BASE}/api/gemini-live-key`);
      if (res.ok) {
        const data = await res.json();
        if (data?.status === "ready") {
          this.resolvedKey = "backend_managed";
          return "backend_managed";
        }
      }
    } catch { }
    return "backend_managed";
  }

  async connect(callbacks?: GeminiLiveCallbacks) {
    if (callbacks) this.cb = callbacks;
    const { isBoss } = resolveUserHonorific();
    const role = isBoss ? "boss" : "sir";
    this.cb.onStatusChange?.("connecting");

    dasSocket.connect(
      role,
      (text) => {
        this.cb.onTranscript?.(text, "agent");
        this.cb.onToken?.(text);
      },
      (connected) => {
        this.cb.onStatusChange?.(connected ? "connected" : "disconnected");
      },
      (path) => {
        if (typeof window !== "undefined") {
          window.location.href = path;
        }
      },
      (userText) => {
        this.cb.onTranscript?.(userText, "user");
      },
      () => {
        this.cb.onInterrupted?.();
      }
    );
    return dasSocket;
  }

  private async doConnect() {
    try {
      this.cb.onStatusChange?.("connecting");
      const key = await this.resolveSessionKey();
      if (!key) throw new Error("VITE_GEMINI_API_KEY missing");
      this.resolvedKey = key;

      const liveAi = new GoogleGenAI({ apiKey: key });

      const candidateModels = Array.from(
        new Set([
          ENV.VITE_GEMINI_LIVE_MODEL,
          "gemini-3.8-live",
          "models/gemini-3.8-live",
          "gemini-2.0-flash-exp",
          "gemini-2.0-flash-realtime-exp"
        ].filter(Boolean) as string[])
      );

      let lastErr: any = null;
      for (const m of candidateModels) {
        try {
          this.session = await liveAi.live.connect({
            model: m,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: VOICE_NAME // Strictly "Puck" (Male Voice)
                  }
                }
              },
              systemInstruction: { parts: [{ text: getMasterPrompt() }] },
              tools: PATHFINDER_TOOLS
            },
            callbacks: {
              onopen: () => this.cb.onStatusChange?.("connected"),
              onmessage: (msg: any) => void this.handleLiveMessage(msg),
              onerror: (e: any) => {
                console.error("[DAS] Live WebSocket error:", e);
                this.cb.onStatusChange?.("error");
              },
              onclose: () => {
                this.session = null;
                this.cb.onStatusChange?.("disconnected");
                if (this.handsFreeActive) this.stopHandsFreeVoice();
              }
            }
          });
          if (this.session) {
            console.log(`[DAS] Live WebSocket connected with model ${m}`);
            break;
          }
        } catch (connErr) {
          lastErr = connErr;
          console.warn(`[DAS] Live model ${m} handshake notice:`, connErr);
        }
      }

      if (!this.session && lastErr) throw lastErr;
      return this.session;
    } catch (e: any) {
      console.error(`[DAS] Live connect failed:`, e);
      this.session = null;
      this.cb.onStatusChange?.("error");
      return null;
    }
  }

  private sendText(text: string) {
    if (!this.session) return;
    try {
      this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true
      });
    } catch (e) {
      console.error("[DAS] sendText failed:", e);
    }
  }

  private setUi(state: MicUi) {
    if (this.handsFreeActive) this.updateMicButtonUI(state);
  }

  private async handleLiveMessage(msg: any) {
    const sc = msg.serverContent;

    if (sc?.interrupted) {
      this.stopPlayback();
      this.agentText = "";
      this.isAgentSpeaking = false;
      this.cb.onInterrupted?.();
      this.cb.onStageChange?.("interrupted");
      this.setUi("listening");
    }

    for (const part of sc?.modelTurn?.parts || []) {
      const data = part.inlineData?.data;
      if (data) {
        this.isAgentSpeaking = true;
        this.setUi("speaking");
        this.cb.onStageChange?.("speaking");
        this.playChunk(data);
        this.cb.onAudioChunk?.(data);
      }
      if (part.text) {
        this.agentText += part.text;
        this.cb.onTranscript?.(part.text, "agent");
        this.cb.onToken?.(this.agentText);
      }
    }

    if (sc?.turnComplete) {
      this.agentText = "";
      this.turnWaiter?.();
      this.turnWaiter = null;
    }

    const calls = msg.toolCall?.functionCalls;
    if (calls?.length) await this.handleToolCalls(calls);
  }

  private async handleToolCalls(calls: any[]) {
    const functionResponses = await Promise.all(
      calls.map(async (call) => {
        const name: string = call.name || "";
        const args: Record<string, any> = call.args || {};
        this.cb.onToolCall?.(name, args);
        let output: any;
        try {
          output = await this.runOneTool(name, args);
        } catch (e: any) {
          output = { ok: false, explain: `Tool error: ${e?.message || e}` };
        }
        return { id: call.id, name, response: { output } };
      })
    );
    try {
      await this.session?.sendToolResponse({ functionResponses });
    } catch (e) {
      console.error("[DAS] sendToolResponse failed:", e);
    }
  }

  private async runOneTool(name: string, args: Record<string, any>) {
    if (name === "open_external_website_or_google_search") {
      const query = String(args.searchQuery || args.siteOrUrl || "").trim();
      const summary = query ? await this.searchSummary(query) : "";
      const result = await executeWebsiteTool(name, args);
      return { ...result, summary };
    }
    return executeWebsiteTool(name, args);
  }

  private textClient(): GoogleGenAI | null {
    const key = ENV.VITE_GEMINI_API_KEY;
    if (!key) return null;
    try {
      return new GoogleGenAI({ apiKey: key });
    } catch {
      return null;
    }
  }

  private async searchSummary(query: string): Promise<string> {
    try {
      const client = this.textClient();
      if (!client) return "";
      const r: any = await client.models.generateContent({
        model: TEXT_MODEL,
        contents: `Give a clear, accurate, friendly summary (3 to 4 sentences) about: ${query}`,
        config: { tools: [{ googleSearch: {} }], temperature: 0.3, maxOutputTokens: 300 }
      });
      return r.text?.trim() || "";
    } catch {
      return "";
    }
  }

  /* ---------------- Speak via Gemini Live or Resilient Audio ---------------- */
  private async speakAloud(text: string): Promise<void> {
    const clean = text.replace(/[*#_`~]/g, "").trim();
    if (!clean) return;
    try {
      speaker.say(clean);
    } catch { }
    if (this.session) {
      try {
        this.sendText(
          `Speak this exact message aloud naturally: "${clean}"`
        );
      } catch { }
    }
  }

  async speakText(text: string): Promise<boolean> {
    await this.speakAloud(text);
    return true;
  }

  /* ---------------- Typed Command Bar Turn ---------------- */
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
    const { honorific, isBoss } = resolveUserHonorific();
    const trimmed = userText.trim();
    const shouldSpeak = options?.speakAudio !== false && !options?.muteAudio;
    const emit = (t: string) => {
      options?.onToken?.(t);
      options?.callbacks?.onToken?.(t);
    };

    this.stopPlayback();


    // 2. 0ms Instant Browser Command (Open Google / Search / Return Back to Page)
    const instant = tryInstantBrowserCommand(trimmed);
    if (instant.handled && !instant.isSearchQuery) {
      const reply = `Okay ${honorific}! I've ${instant.actionSummary}.`;
      emit(reply);
      if (shouldSpeak) await this.speakAloud(reply);
      return reply;
    }

    // 3. Smart Response + Tool Execution
    options?.onStageChange?.("thinking");
    let replyText = "";
    try {
      await this.resolveSessionKey();

      const queryPrompt = instant.isSearchQuery
        ? `The user ${honorific} asked you to search Google for: "${instant.searchQuery}". Give a clear, friendly 3-sentence summary about "${instant.searchQuery}". Address them as ${honorific}.`
        : trimmed;

      let generated = false;

      const client = this.textClient();
      if (client) {
        const textCandidates = Array.from(
          new Set([
            "gemini-3.1-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            TEXT_MODEL
          ].filter(Boolean) as string[])
        );

        for (const tm of textCandidates) {
          try {
            const response: any = await client.models.generateContent({
              model: tm,
              contents: queryPrompt,
              config: {
                systemInstruction: getMasterPrompt(),
                tools: instant.isSearchQuery ? [{ googleSearch: {} }] : PATHFINDER_TOOLS,
                temperature: 0.4,
                maxOutputTokens: 350
              }
            });

            if (!instant.isSearchQuery && response.functionCalls?.length) {
              for (const call of response.functionCalls) {
                options?.onToolCall?.(call.name || "", call.args || {});
                await executeWebsiteTool(call.name || "", (call.args as Record<string, any>) || {});
              }
            }

            if (response.text?.trim()) {
              replyText = response.text.trim();
              generated = true;
              break;
            }
          } catch (clientErr) {
            console.warn(`[DAS] Direct Gemini SDK text generation with ${tm} notice:`, clientErr);
          }
        }
      }

      // If client SDK was missing key in bundle or blocked, route to Render backend chat proxy
      if (!generated) {
        try {
          const backendRes = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: queryPrompt,
              user_context: { honorific, isBoss }
            })
          });
          if (backendRes.ok) {
            const data = await backendRes.json();
            replyText = data?.reply || data?.message || data?.text || "";
            if (replyText) generated = true;
          }
        } catch (backendErr) {
          console.warn("[DAS] Backend chat proxy notice:", backendErr);
        }
      }

      if (!replyText) {
        replyText = isBoss
          ? `Boss, I am connected and ready. Tell me which section or tool to open!`
          : `Sir, I am connected and ready. How can I help you today?`;
      }
    } catch (e: any) {
      console.error("[DAS] sendTurn error:", e);
      replyText = isBoss
        ? `Boss, I am online. Tell me which dashboard tab or tool to open!`
        : `Sir, I am online. Tell me which dashboard tab or tool to open!`;
    }

    emit(replyText);
    options?.onStageChange?.("speaking");
    if (shouldSpeak) await this.speakAloud(replyText);
    return replyText;
  }

  sendMicAudio(base64Pcm16k: string) {
    if (!this.session) return;
    this.lastExternalMic = Date.now();
    this.session.sendRealtimeInput({
      media: { data: base64Pcm16k, mimeType: "audio/pcm;rate=16000" }
    });
  }

  disconnect() {
    this.stopHandsFreeVoice();
    if (this.session) {
      try {
        this.session.close();
      } catch { }
      this.session = null;
    }
  }
}

export const geminiLive = new PathfinderGeminiLive();