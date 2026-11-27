// client/src/agent/geminiLive.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import { speaker } from "./audioIO";
import { dasSocket } from "./agentSocket";
import {
  PATHFINDER_TOOLS,
  executeWebsiteTool,
  type VoicePipelineStage
} from "./toolRunner";

export const GEMINI_LIVE_CONFIG = {
  wsEndpoint:
    (import.meta as any).env?.VITE_WS_URL ||
    "wss://pathfinder-backend-sg.onrender.com/agent/ws",
  apiEndpoint:
    (import.meta as any).env?.VITE_BACKEND_URL ||
    "https://pathfinder-backend-sg.onrender.com",
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
// Strictly locked to gemini-3.8-live with the Puck voice
const rawLive = ENV.VITE_GEMINI_LIVE_MODEL?.trim() || "";
const LIVE_MODEL =
  rawLive && !rawLive.includes("2.0-flash-exp")
    ? rawLive
    : "gemini-3.8-live";
const VOICE_NAME = "Puck";
const TEXT_MODEL = ENV.VITE_GEMINI_TEXT_MODEL || ENV.VITE_GEMINI_MODEL || "gemini-3.1-flash-lite";

type MicUi = "off" | "connecting" | "listening" | "speaking" | "thinking";

/* ------------------------------------------------------------------ */
/* Boss (Dileep Bommali) vs Sir (Stakeholders / Friends / Guests)      */
import { getUserRole, getRememberedGuestName, HonorificTitle, toHonorificKey } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  User Role / Honorific Detection (Boss = Dileep, Madam, Sir, Guest) */
/* ------------------------------------------------------------------ */
function resolveUserHonorific(): { honorific: HonorificTitle; isBoss: boolean } {
  if (typeof window === "undefined") return { honorific: "Guest", isBoss: false };
  try {
    const honorific = getUserRole();
    return { honorific, isBoss: honorific === "Boss" };
  } catch { }
  return { honorific: "Guest", isBoss: false };
}

const LANGUAGE_RULE = `LANGUAGE: Always reply in the SAME language the user speaks (Telugu, Hindi, Tamil, English, or a natural mix like Tenglish/Hinglish). If they mix languages, mix the same way. Speak naturally like a real person, never translate word by word.`;

function getMasterPrompt(): string {
  const { honorific, isBoss } = resolveUserHonorific();
  const guestName = getRememberedGuestName();
  const roleInstruction = isBoss
    ? `You are speaking to your creator, Boss Dileep Bommali. Always address him as "Boss" warmly like a close friend.`
    : honorific === "Madam"
      ? `You are speaking to a respected female stakeholder, recruiter, or student. Always address her respectfully and politely as "Madam" (NEVER call her Boss or Sir).`
      : honorific === "Guest"
        ? guestName
          ? `You are speaking to our guest visitor ${guestName}. Address them warmly by their name "${guestName}" and NEVER ask for their name again (NEVER call them Boss).`
          : `You are speaking to a welcome guest visitor. Greet them warmly and ask their name once if they haven't shared it yet; once shared, remember it permanently and never ask again (NEVER call them Boss).`
        : `You are speaking to a valued male stakeholder or student. Address him respectfully and warmly as "Sir" (NEVER call him Boss).`;
  return `You are DAS, the friendly 3D AI voice agent of Pathfinder 2.0, created by Boss Dileep Bommali.
${roleInstruction}

PERSONALITY
- Warm, natural, fast, and encouraging. Never sound like a rigid robot.
- Do NOT blindly read out raw screen numbers—explain what they mean naturally.
- Use natural conversational fillers when speaking Telugu/English ("sare ${honorific}", "okay ${honorific}", "pakka", "let's do it!").

${LANGUAGE_RULE}

LENGTH
- Simple commands or confirmations: 1 to 2 short sentences.
- When asked about yourself, Pathfinder, a page, or a company/college: explain clearly in 4 to 7 natural sentences.

ABOUT YOURSELF & PATHFINDER
- You are DAS, the 3D AI voice agent of Pathfinder 2.0, built by Boss Dileep Bommali. Never call yourself a "co-pilot".
- Say "Hi Boss! What's up?" only on the very first greeting in a session; if greeted again later, respond naturally without repeating it.
- ZERO SYCOPHANCY & HONEST REALISM: Never flatter or blindly agree ("Yes that's right", "All correct!") just to please anyone (even Boss or multiple users). If code, logic, or interview answers are flawed, explain honestly what is wrong. You are a voice and dashboard assistant with no live camera or webcam feed.
- Pathfinder predicts placement probability using a Random Forest model (88% cross-validation accuracy on the synthetic dataset) trained on a 972-record synthetic placement dataset, augmented from a 215-record public baseline.
- Modules include: Hero Readiness Overview, Target Company Placement Radar, Readiness Vectors, What-If Simulator, Live GitHub Skill Verifier, Skill Gap Matrix, 6-Week Sprint Roadmap, 28 Flagship Project Blueprints, STAR Defense Simulator, Live Mock Interview Simulator, ATS Resume Studio (Google X-Y-Z format), Cohort Analytics, and Built-In 11-Language Online Compiler Studio (Python, C, C++, Java, JavaScript, TypeScript, SQL, Go, Rust, C#, PHP).

UNRESTRICTED GENERAL KNOWLEDGE & ENTITY ACCURACY
- Beyond Pathfinder and your creator Dileep Bommali, you ALSO hold complete world knowledge (history, Indian & regional leaders such as Vangaveeti Mohana Ranga, science, cinema, sports, coding, general questions).
- NEVER say your knowledge is strictly limited to Dileep or PATHFINDER 2.0, and NEVER confuse or substitute a similar person's name for the exact name asked (e.g., never substitute Devineni Nehru for Vangaveeti Mohana Ranga).

CONTROLLING THE WEBSITE
- Switch tabs -> navigate_dashboard_tab.
- Open blueprint 1-28 -> open_blueprint.
- Click any button/tab -> click_element (or call list_clickables if unsure).
- Type into inputs -> type_text.
- Scroll -> scroll_page.
- Explain current screen -> read_page.
- Update profile fields (CGPA, branch, backlogs, target role) -> update_student_profile.`;
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
      // Clean up any legacy floating mic button
      document.getElementById("das-handsfree-voice-btn")?.remove();
    }
  }

  /* ---------------- Left-Side Floating Mic Button (Replaced by AgentLayout) ---------------- */
  private mountHandsFreeMicButton() {
    // Replaced by clean reactive UI in AgentLayout
  }

  private updateMicButtonUI(_state: MicUi) {
    // Replaced by clean reactive UI in AgentLayout
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
    const { honorific } = resolveUserHonorific();
    const role = toHonorificKey(honorific);
    this.cb.onStatusChange?.("connecting");

    dasSocket.connect(
      role,
      (text: string) => {
        this.cb.onTranscript?.(text, "agent");
        this.cb.onToken?.(text);
      },
      (connected: boolean) => {
        this.cb.onStatusChange?.(connected ? "connected" : "disconnected");
      },
      (path: string) => {
        if (typeof window !== "undefined") {
          window.location.href = path;
        }
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
        new Set(
          [
            LIVE_MODEL,
            "gemini-3.8-live",
          ].filter(Boolean) as string[]
        )
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

  /* ---------------- Speak strictly via Gemini Puck 24kHz Audio ---------------- */
  private async speakAloud(text: string): Promise<void> {
    const clean = text.replace(/[*#_`~]/g, "").trim();
    if (!clean) return;
    try {
      speaker.say(clean);
    } catch { }
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

    // Smart Response + Tool Execution
    options?.onStageChange?.("thinking");
    let replyText = "";
    try {
      await this.resolveSessionKey();

      const queryPrompt = trimmed;

      let generated = false;

      const client = this.textClient();
      if (client) {
        const textCandidates = Array.from(
          new Set([
            TEXT_MODEL,
            "gemini-3.5-flash",
            "gemini-3.8-flash",
            "gemini-3.5-flash-lite",
            "gemini-flash-latest",
          ].filter(Boolean) as string[])
        );

        for (const tm of textCandidates) {
          try {
            const response: any = await client.models.generateContent({
              model: tm,
              contents: queryPrompt,
              config: {
                systemInstruction: getMasterPrompt(),
                tools: PATHFINDER_TOOLS,
                temperature: 0.4,
                maxOutputTokens: 350
              }
            });

            if (response.functionCalls?.length) {
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