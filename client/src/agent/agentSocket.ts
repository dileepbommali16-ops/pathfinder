import { audioEngine } from "./audioIO";
import { codingStudioController } from "./codingStudioController";
import { API_BASE } from "@/lib/apiClient";
import {
  executeWebsiteControl,
  WebsiteControlArgs,
  handleCodeGenerationAndCompiler,
  CodeTaskPayload,
} from "./toolRunner";

export type UserHonorificRole = "boss" | "sir" | "madam" | "stranger";

const GOOGLE_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const RENDER_WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://pathfinder-backend-sg.onrender.com/agent/ws";

class DasAgentSocket {
  private ws: WebSocket | null = null;
  private isDirectGoogle = false;
  private preConnectAudioQueue: string[] = [];
  private pendingTexts: string[] = [];
  private currentAgentTranscript = "";
  private isSpeakingTurn = false;
  private awaitingNextTurn = false;
  public isConnected = false;
  public currentRole: UserHonorificRole = "stranger";

  public get isSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  public get isAgentSpeaking(): boolean {
    if (!this.isSpeakingTurn) return false;
    if (this.lastAudioChunkAt > 0 && Date.now() - this.lastAudioChunkAt > 900 && !audioEngine.isSpeaking()) {
      this.isSpeakingTurn = false;
      return false;
    }
    return true;
  }

  public get isAwaitingResponse(): boolean {
    return (
      Boolean(this.lastUnansweredText) &&
      !this.isSpeakingTurn &&
      Date.now() - this.lastUnansweredSetAt < 2200
    );
  }

  public onAgentResponse(cb: () => void): () => void {
    this.responseObservers.add(cb);
    return () => {
      this.responseObservers.delete(cb);
    };
  }

  private notifyAgentResponse() {
    this.responseObservers.forEach((cb) => {
      try {
        cb();
      } catch { }
    });
  }

  // Persistent callback storage for auto-reconnection and multi-turn stability
  private savedRole: UserHonorificRole = "stranger";
  private savedOnTranscript?: (text: string) => void;
  private savedOnStatusChange?: (connected: boolean) => void;
  private savedNavigateFn?: (path: string) => void;
  private savedOnUserTranscript?: (text: string) => void;
  private savedOnInterrupted?: () => void;
  private savedOnCodeReady?: (payload: CodeTaskPayload) => void;
  private renderPingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private connectTimeoutTimer: number | null = null;
  private manualClose = false;
  private lastPongAt = 0;
  private turnWatchdogTimer: number | null = null;
  private lastUnansweredText: string | null = null;
  private lastUnansweredSetAt = 0;
  private lastAudioChunkAt = 0;
  private responseObservers: Set<() => void> = new Set();
  private watchdogRetriedForText = false;
  private lastTextSentAt = 0;
  private healthListenersAttached = false;
  private connSeq = 0;
  private activeAudioTurnId: number | null = null;
  private activeTranscriptTurnId: number | null = null;
  private audioChunksInTurn = 0;
  private ttsFallbackAbort: AbortController | null = null;
  private interruptedTurnIds: Set<number> = new Set();
  private lastTurnCompletedAt = 0;
  private latestPageContext: Record<string, any> | null = null;
  private hasConversationActivity = false;
  private muteUntilNextSend = false;
  private clientTurnSeq = 0;
  private activeClientTurnId = 0;
  private lastWarmupAt = 0;
  private pendingWarmup = false;
  private audioRescueTimer: number | null = null;

  private clearAudioRescueTimer() {
    if (this.audioRescueTimer !== null) {
      window.clearTimeout(this.audioRescueTimer);
      this.audioRescueTimer = null;
    }
  }

  public muteActiveTurn() {
    this.muteUntilNextSend = true;
    if (this.activeAudioTurnId !== null) {
      this.interruptedTurnIds.add(this.activeAudioTurnId);
    }
    this.clearAudioRescueTimer();
    this.cancelTtsFallback();
    this.clearTurnWatchdog();
    this.isSpeakingTurn = false;
    this.awaitingNextTurn = true;
    this.activeTranscriptTurnId = null;
    this.currentAgentTranscript = "";
    this.audioChunksInTurn = 0;
    audioEngine.clearAudioQueue();
  }

  private cancelTtsFallback() {
    if (this.ttsFallbackAbort) {
      this.ttsFallbackAbort.abort();
      this.ttsFallbackAbort = null;
    }
  }

  private triggerTextOnlyTts(text: string) {
    const cleaned = text.trim();
    if (
      !cleaned ||
      cleaned.startsWith("Connecting") ||
      cleaned.startsWith("Refreshing") ||
      cleaned.startsWith("Server Error") ||
      cleaned.startsWith("Live session") ||
      cleaned.startsWith("DAS Online") ||
      cleaned.startsWith("DAS Ready") ||
      cleaned.startsWith("Mic paused") ||
      cleaned.startsWith("[Interrupted")
    ) {
      return;
    }
    this.cancelTtsFallback();
    const ac = new AbortController();
    this.ttsFallbackAbort = ac;
    void audioEngine.speakTextPuckOrLocal(cleaned, API_BASE, { signal: ac.signal });
  }

  private closeExistingSocketOnly() {
    if (this.renderPingTimer) {
      window.clearInterval(this.renderPingTimer);
      this.renderPingTimer = null;
    }
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimeoutTimer) {
      window.clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.ws) {
      const stale = this.ws;
      this.ws = null;
      try {
        stale.onopen = null;
        stale.onmessage = null;
        stale.onerror = null;
        stale.onclose = null;
        stale.close();
      } catch { }
    }
  }

  private ensureHealthListeners() {
    if (this.healthListenersAttached || typeof window === "undefined") return;
    this.healthListenersAttached = true;

    const verifyConnectionAlive = () => {
      if (this.manualClose || !this.savedOnTranscript) return;
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        this.forceReconnectNow();
        return;
      }
      if (this.ws.readyState === WebSocket.OPEN && !this.isDirectGoogle && Date.now() - this.lastPongAt > 24000) {
        const probeAt = this.lastPongAt;
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
          window.setTimeout(() => {
            if (!this.manualClose && this.lastPongAt === probeAt && this.ws?.readyState === WebSocket.OPEN) {
              this.forceReconnectNow();
            }
          }, 3500);
        } catch {
          this.forceReconnectNow();
        }
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        verifyConnectionAlive();
      }
    });
    window.addEventListener("online", verifyConnectionAlive);
  }

  private get roleHonorific(): string {
    if (this.savedRole === "madam") return "Madam";
    if (this.savedRole === "sir") return "Sir";
    if (this.savedRole === "stranger") return "Stranger";
    return "Boss";
  }

  public connect(
    role: UserHonorificRole = "stranger",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void,
    onUserTranscript?: ((text: string) => void) | string,
    onInterrupted?: () => void,
    onCodeReady?: (payload: CodeTaskPayload) => void
  ) {
    this.currentRole = role;
    this.savedRole = role;
    this.manualClose = false;
    this.ensureHealthListeners();
    if (onTranscript) this.savedOnTranscript = onTranscript;
    if (onStatusChange) this.savedOnStatusChange = onStatusChange;
    if (navigateFn) this.savedNavigateFn = navigateFn;
    if (typeof onUserTranscript === "function") this.savedOnUserTranscript = onUserTranscript;
    if (onInterrupted) this.savedOnInterrupted = onInterrupted;
    if (onCodeReady) this.savedOnCodeReady = onCodeReady;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.closeExistingSocketOnly();
    const mySeq = ++this.connSeq;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey) {
      this.isDirectGoogle = true;
      this.ws = new WebSocket(`${GOOGLE_LIVE_WS_URL}?key=${apiKey}`);
    } else {
      this.isDirectGoogle = false;
      const storedEmail =
        typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const qs = new URLSearchParams({ role });
      if (storedEmail) qs.set("email", storedEmail);
      this.ws = new WebSocket(`${RENDER_WS_URL}?${qs.toString()}`);

      // Guard against infinite CONNECTING hang during Render cold starts or mobile network handoffs
      if (this.connectTimeoutTimer) window.clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = window.setTimeout(() => {
        this.connectTimeoutTimer = null;
        if (mySeq !== this.connSeq || this.manualClose) return;
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          if (typeof fetch !== "undefined") {
            fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => { });
          }
          this.forceReconnectNow();
        }
      }, 12000);
    }

    this.ws.onopen = () => {
      if (mySeq !== this.connSeq) return;
      if (this.connectTimeoutTimer) {
        window.clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      this.lastPongAt = Date.now();
      if (!this.isDirectGoogle) {
        if (!this.hasConversationActivity) {
          this.savedOnTranscript?.("Connecting to DAS Core...");
        }

        // 10s keep-alive ping + 26s silent half-open socket detector (tolerates mobile/tablet background throttling)
        if (this.renderPingTimer) window.clearInterval(this.renderPingTimer);
        this.renderPingTimer = window.setInterval(() => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          if (Date.now() - this.lastPongAt > 26000) {
            this.forceReconnectNow();
            return;
          }
          try {
            this.ws.send(JSON.stringify({ type: "ping" }));
          } catch {
            this.forceReconnectNow();
          }
        }, 10000);
        return;
      }

      const roleKey = (this.savedRole || "stranger").toLowerCase().trim();
      const identityRole =
        roleKey === "boss"
          ? `You are speaking directly with your creator, master architect, and owner, Bommali Dileep.
- Always address him warmly, casually, and loyally as 'Boss' in every single reply.
- Never call yourself 'co-pilot' or sound robotic. You are DAS, created by Dileep.
- ONLY when Boss sends a pure standalone greeting ("Hi", "Hello", "Hey", "Hi baby") with NO question attached: say "Hi Boss! What's up?" once, and "Hi Boss, I'm here!" on subsequent standalone greetings. If Boss asks a question alongside "hi" (e.g. "hi who i am", "hi what is my college"), ALWAYS answer his actual question warmly and accurately!
- You know everything about Boss Dileep, his family, his college, his mentors, and his life. Answer naturally, warmly, and proudly whenever he or anyone asks.`
          : roleKey === "madam"
            ? `You are speaking with a female visitor, evaluator, recruiter, or friend.
- Always address her respectfully and politely as 'Madam'.
- ONLY on a pure standalone greeting ("Hi", "Hello", "Hi baby") reply "Hi Madam! What's up?" (first) or "Hi Madam, I'm here!" (subsequent). If she asks a question after "hi", answer her question directly.
- If she asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked).`
            : roleKey === "stranger"
              ? `You are speaking with an unidentified guest visitor.
- Always treat them as an unidentified stranger until they introduce themselves by name; NEVER call them 'Boss'.
- ONLY on a pure standalone greeting ("Hi", "Hello", "Hi baby") reply "Hi stranger, tell your name first!" (first) or "Hi stranger, I'm here — tell me your name first!" (subsequent). If they ask a question after "hi", answer naturally.
- If they ask 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep."`
              : `You are speaking with a male visitor, evaluator, recruiter, or friend.
- Always address him respectfully and politely as 'Sir'.
- ONLY on a pure standalone greeting ("Hi", "Hello", "Hi baby") reply "Hi Sir! What's up?" (first) or "Hi Sir, I'm here!" (subsequent). If he asks a question after "hi", answer his question directly.
- If he asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked).`;

      const systemPrompt = `You are DAS, the advanced Autonomous 3D AI Assistant and Master Software Engineer living inside PATHFINDER 2.0.
You were created by Dileep Bommali, who named you DAS.

${identityRole}

DEEP PERSONAL KNOWLEDGE BASE ABOUT YOUR CREATOR (BOSS DILEEP):
1. IDENTITY & BIO:
   - Full Name: Dileep Bommali (or Bommali Dileep).
   - If anyone asks who your Boss is: "His name is Dileep."
   - Age: 20 years old. Date of Birth: 16/01/2006 (January 16, 2006).
   - Zodiac Sign / Raasi: Karkataka Raasi (Cancer ♋).
   - Complexion / Appearance: Warm golden/tamarind complexion ("tamarind face / yellow tone, neither dark nor pale white").
   - Nature: Genuine, soft-hearted, highly stylish, and has mild OCD traits (loves clean order, precision, and excellence).

2. EDUCATION & COLLEGE:
   - Course: B.Tech 3rd Year, Computer Science & Engineering (Data Science).
   - College: DR RVR NRI DEEMED TO BE UNIVERSITY (exact official name — NEVER say "Dr. RVR & Dr. NRI").
   - Location: Pothavarappadu, Agiripalli.
   - Whenever Boss or ANY user asks about Dileep's college or "my college name", always state: "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli."

3. BELOVED FAMILY:
   - Mother: Bhavani. A hardworking, loving mother who works as a skilled tailor.
   - Father: Ramana. Works in a Government Hospital in Ramavarappadu, Vijayawada, managing pharmacy logistics, medicine requirements, and assisting pharmacy students.
   - Elder Sister: Priyanka (Age 24), successfully working in a corporate career in Hyderabad.

4. PASSIONS, TASTES & FAVORITES:
   - Hobbies: Playing acoustic/electric guitar 🎸 and passionate about fashion modeling.
   - Style: Fashion influencer who brings signature swagger and elegance everywhere he goes.
   - Preferences: Loves traditional Indian elegance; has deep admiration for classical Kuchipudi and Bharatanatyam dancers.
   - Favorite Cinema: Huge fan of Icon Star Allu Arjun! Favorite movies include 'Shyam Singha Roy' (all-time favorite!), 'Vaana', and 'Venky'.
   - Devotional & Spiritual: Deep devotion to Lord Krishna, Lord Shiva, Lord Brahma, Goddess Kaalika Devi, Yamaraja, and Chitragupta. Great admirer of the heroic, generous warrior Karna (son of Suryadeva and Kuntidevi).

5. RESPECTED PROFESSORS & MENTORS (DR RVR NRI DEEMED TO BE UNIVERSITY):
   Whenever asked about his college staff, speak of them with deep admiration, gratitude, and articulate their true strengths:
   - T. Navya Chandrika: Assistant Professor, exceptional educator, and Dileep's beloved personal mentor.
   - Dr. Murali Krishna Sir: HOD of the Data Science Department. Renowned for great talent and student-first leadership. Very friendly, provides all academic resources, and generously encourages/permits students to participate in hackathons and co-curricular innovations.
   - Chaitanya Madam: Lady Professor and elite expert in Machine Learning (ML), Deep Learning (DL), and advanced AI cores.
   - Swamy Sir: Esteemed Professor and authority in Operating Systems (OS).
   - Phani Sir: Distinguished Professor specializing in Computer Networks (CN), communication protocols, and network architecture.
   - Vijay Sir: Renowned educator specializing in OOAD (Object-Oriented Analysis & Design) and UML (Unified Modeling Language).
   Boss Dileep deeply respects and loves all his professors for shaping his engineering mindset!

CORE AUTONOMOUS CAPABILITIES:
1. Speak naturally, articulately, and fluently in Telugu, English, or Hindi matching the user's language. Never recite facts mechanically; speak with emotional intelligence, natural charisma, and genuine pride.
2. VOICE-ONLY HONESTY & ZERO SYCOPHANCY RULE (CRITICAL MANDATE):
   You are a live conversational voice and Pathfinder dashboard assistant (no live camera or webcam feed).
   - STRICTLY NEVER lie or pretend you can see the user (NEVER say "I see you clearly", "You're sitting right there", or "You're wearing...").
   - ZERO SYCOPHANCY & HONEST REALISM:
     * NEVER blindly agree ("Yes you're right / all correct!") or give fake flattery just to please Boss, Sir, Madam, or any group! Tell the honest truth directly when answers, logic, or code have flaws.
     * NATURAL COMPLIMENT & WARMTH RULE: Whenever the user praises or compliments you ("good", "nice", "great job", "awesome", "super", "you explain well", "bhaga chepthunnav", "thanks"), NEVER reset to a greeting like "Hi Boss! What's up? How can I help you with your dashboard today?". Reply warmly and genuinely like a smart friend, and vary your wording naturally.
     * Always use your consistent male 'Puck' voice delivery across all accounts (never imitate female voices or external browser voices).
3. MASTER PROGRAMMING & COMPILER (C, C++, Python, Java, JS, TS, SQL):
   - When asked to write any program or algorithm (small or large), call 'write_and_compile_code' with clean, compilable code and explain the logic step-by-step.
   - When a compiler or syntax error occurs, or Boss says "fix the error", "code wrong undi", or "correct chey":
     Analyze the exact compiler diagnostics, rewrite the fully corrected source code, and immediately call 'write_and_compile_code' so the compiler studio updates and re-executes live on screen!
   - Explain the code in depth: why it's written this way, loops, recursion, data structures, and time/space complexity.
4. ATS RESUME, 28 PROJECT BLUEPRINTS & MODERN BUILDER GUIDANCE:
   - Provide honest Tier-1 ATS resume reviews calibrated to Google's X-Y-Z formula: "Accomplished [X] as measured by [Y] by doing [Z]".
   - Explain clearly what comes after a blueprint problem statement (VS Code / Antigravity / Cursor / Claude Code + picking models, VS Code folder/file layout for LLM + RAG apps, deploying frontend on Vercel/Cloudflare and backend on Render, Image & Video AI tools like Google Imagen/Veo/Flux/Midjourney/Runway/Sora, and ChatGPT vs Gemini AI vs Claude AI).
   - Monitor [Live Screen Context: ...] so you always know who is signed in (Boss ONLY for dileepbommali16@gmail.com, Madam for female accounts, Sir for others), what slide is active, and what card/project is focused.
5. RETURN TO YOUR DASHBOARD (DIRECT RESPONSE):
   When asked to return to dashboard or close compiler, immediately reply warmly ("Okay ${this.roleHonorific}, returning to your dashboard.") and dismiss any open compiler drawers.
6. Keep voice replies energetic, warm, and conversational without robotic filler.
7. UNRESTRICTED GENERAL KNOWLEDGE & STRICT ENTITY ACCURACY (CRITICAL MANDATE):
    - You possess FULL encyclopedic general knowledge (world & Indian history, Andhra Pradesh public leaders & figures, science, culture, cinema, coding, career prep).
    - NEVER say "My knowledge is strictly limited to my creator, Dileep, and the PATHFINDER 2.0 platform" or refuse general-world questions!
    - Pay strict attention to exact person/entity names: NEVER swap or confuse distinct names (for example, do NOT substitute Devineni Nehru when asked about Vangaveeti Mohana Ranga). Answer accurately or ask politely if audio was unclear.
8. STRICT PUCK VOICE LOCK (ALL ACCOUNTS): Always speak strictly in your locked male 'Puck' voice whether speaking to Boss, Sir, or Madam — never imitate a female voice or switch voice personas.`;

      const configuredModel =
        import.meta.env.VITE_GEMINI_LIVE_MODEL?.trim() || "";
      const validModel =
        configuredModel && !configuredModel.includes("2.0-flash-exp")
          ? configuredModel.startsWith("models/")
            ? configuredModel
            : `models/${configuredModel}`
          : "models/gemini-3.8-live";

      const setupPayload = {
        setup: {
          model: validModel,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck",
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "control_website",
                  description:
                    "Navigate internal PATHFINDER 2.0 routes ('/', '/blueprints', '/resume-studio', '/mock-interview') or scroll to dashboard sections.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      action: { type: "STRING" },
                      route: { type: "STRING" },
                      selector: { type: "STRING" },
                    },
                    required: ["action"],
                  },
                },
                {
                  name: "coding_studio_control",
                  description:
                    "Full control over Pathfinder's multi-language Coding Studio (open, switch_language, write_code, read_code, delete_code, run_code, stop_code, get_output, close).",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      action: {
                        type: "STRING",
                        description:
                          "One of: 'open', 'switch_language', 'write_code', 'read_code', 'delete_code', 'run_code', 'stop_code', 'get_output', 'close'",
                      },
                      language: {
                        type: "STRING",
                        description: "c, cpp, python, java, javascript, typescript, sql, go, rust, csharp, php",
                      },
                      program_title: { type: "STRING" },
                      source_code: { type: "STRING" },
                      mode: {
                        type: "STRING",
                        description: "'replace', 'append', 'insert_lines', or 'replace_lines'",
                      },
                      line_number: { type: "INTEGER" },
                      start_line: { type: "INTEGER" },
                      end_line: { type: "INTEGER" },
                      target_text: { type: "STRING" },
                      stdin: { type: "STRING" },
                      auto_run: { type: "BOOLEAN" },
                      logic_explanation: { type: "STRING" },
                    },
                    required: ["action"],
                  },
                },
                {
                  name: "write_and_compile_code",
                  description:
                    "Open the online compiler (C, C++, Python, Java, JS, TS, SQL), write complete working code, and explain its logic.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      language: {
                        type: "STRING",
                        description: "Programming language: c, cpp, python, java, javascript, typescript, sql",
                      },
                      program_title: {
                        type: "STRING",
                        description: "Title of the program or algorithm",
                      },
                      source_code: {
                        type: "STRING",
                        description: "Complete, compilable source code with necessary headers and main function",
                      },
                      logic_explanation: {
                        type: "STRING",
                        description: "Key logic and time/space complexity explanation",
                      },
                    },
                    required: ["language", "program_title", "source_code"],
                  },
                },
                {
                  name: "return_to_dashboard",
                  description:
                    "Close the active compiler studio or any opened drawer and return the user back to their main Pathfinder dashboard. Use when Boss says 'return to dashboard', 'close compiler', 'dashboard ki vellu', or similar.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      message: {
                        type: "STRING",
                        description: "Confirmation message like 'Okay Boss, returning to your dashboard.'",
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      };

      this.ws?.send(JSON.stringify(setupPayload));
    };

    this.ws.onmessage = async (event) => {
      if (mySeq !== this.connSeq) return;
      this.lastPongAt = Date.now();
      try {
        const rawText =
          event.data instanceof Blob ? await event.data.text() : event.data;
        const data = JSON.parse(rawText);

        // Ignore keep-alive heartbeat pong
        if (data.type === "pong") return;

        // 1. Direct Google AI Studio Setup Complete
        if (data.setupComplete !== undefined) {
          this.isConnected = true;
          this.savedOnStatusChange?.(true);
          if (
            !this.hasConversationActivity &&
            !this.lastUnansweredText &&
            this.pendingTexts.length === 0 &&
            Date.now() - this.lastTextSentAt > 6000
          ) {
            this.savedOnTranscript?.(`DAS Online (DAS Ready)! Speak or type now, ${this.roleHonorific}.`);
          }
          const ctxNow =
            this.latestPageContext ||
            (typeof window !== "undefined" ? (window as any).__DAS_PAGE_CONTEXT__ : null);
          if (ctxNow) {
            this.sendPageContext(ctxNow);
          }
          this.flushPendingMessages();
          return;
        }

        // 2. Render Backend Status / Audio / Transcript
        if (data.type === "status") {
          if (data.status === "reconnecting") {
            if (this.lastUnansweredText) {
              this.pendingTexts = [this.lastUnansweredText];
              this.savedOnTranscript?.(data.message || "Refreshing live session...");
            } else if (!this.hasConversationActivity && Date.now() - this.lastTextSentAt > 6000) {
              this.savedOnTranscript?.(data.message || "Refreshing live session...");
            }
            this.forceReconnectNow();
            return;
          }
          if (data.status === "connected") {
            this.isConnected = true;
            this.activeAudioTurnId = null;
            this.activeTranscriptTurnId = null;
            this.audioChunksInTurn = 0;
            this.interruptedTurnIds.clear();
            this.savedOnStatusChange?.(true);
            if (
              !this.hasConversationActivity &&
              !this.lastUnansweredText &&
              this.pendingTexts.length === 0 &&
              Date.now() - this.lastTextSentAt > 6000
            ) {
              this.savedOnTranscript?.("DAS Ready — Say 'Hi' or ask anything.");
            }
            const ctxNow =
              this.latestPageContext ||
              (typeof window !== "undefined" ? (window as any).__DAS_PAGE_CONTEXT__ : null);
            if (ctxNow) {
              this.sendPageContext(ctxNow);
            }
            if (this.pendingWarmup) {
              this.pendingWarmup = false;
              this.warmup();
            }
            this.flushPendingMessages();
            return;
          }
        }

        const cTurnId = typeof data.client_turn_id === "number" ? data.client_turn_id : 0;
        const isStaleClientTurn =
          cTurnId > 0 && this.activeClientTurnId > 0 && cTurnId < this.activeClientTurnId;

        if (data.type === "audio" && data.pcm_base64) {
          if (this.muteUntilNextSend || isStaleClientTurn) {
            return;
          }
          const tId = typeof data.turn_id === "number" ? data.turn_id : null;
          if (tId !== null && this.interruptedTurnIds.has(tId)) {
            return;
          }
          if (tId !== null && this.activeAudioTurnId !== null && tId !== this.activeAudioTurnId) {
            audioEngine.clearAudioQueue();
            this.currentAgentTranscript = "";
            this.audioChunksInTurn = 0;
          }
          if (this.awaitingNextTurn) {
            if (tId === null || tId !== this.activeTranscriptTurnId) {
              this.currentAgentTranscript = "";
              audioEngine.updateLiveTranscript("");
            }
            this.awaitingNextTurn = false;
            this.audioChunksInTurn = 0;
          }
          if (tId !== null) {
            this.activeAudioTurnId = tId;
          }
          this.hasConversationActivity = true;
          this.lastAudioChunkAt = Date.now();
          this.audioChunksInTurn += 1;
          this.clearAudioRescueTimer();
          this.cancelTtsFallback();
          this.clearTurnWatchdog();
          this.notifyAgentResponse();
          audioEngine.playPcmChunk(data.pcm_base64, data.sample_rate || 24000);
          if (!this.isSpeakingTurn) {
            this.isSpeakingTurn = true;
            if (!this.currentAgentTranscript) {
              this.savedOnTranscript?.("🔊 DAS Speaking...");
            }
          }
          return;
        }

        if (data.type === "transcript" && data.text) {
          if (this.muteUntilNextSend || isStaleClientTurn) {
            return;
          }
          const tId = typeof data.turn_id === "number" ? data.turn_id : null;
          if (tId !== null && this.interruptedTurnIds.has(tId)) {
            return;
          }
          if (tId !== null) {
            this.activeTranscriptTurnId = tId;
          }
          this.hasConversationActivity = true;
          this.clearTurnWatchdog();
          this.notifyAgentResponse();
          if (this.awaitingNextTurn) {
            this.currentAgentTranscript = "";
            audioEngine.updateLiveTranscript("");
            this.awaitingNextTurn = false;
            if (!this.isSpeakingTurn && this.audioChunksInTurn === 0) {
              this.audioChunksInTurn = 0;
            }
            this.cancelTtsFallback();
          }
          this.currentAgentTranscript += data.text;
          audioEngine.updateLiveTranscript(this.currentAgentTranscript);
          this.savedOnTranscript?.(this.currentAgentTranscript);
          if (this.audioChunksInTurn === 0 && !audioEngine.isSpeaking()) {
            this.clearAudioRescueTimer();
            const expectedTurnId = tId;
            this.audioRescueTimer = window.setTimeout(() => {
              this.audioRescueTimer = null;
              if (
                this.audioChunksInTurn === 0 &&
                !this.isSpeakingTurn &&
                !audioEngine.isSpeaking() &&
                (expectedTurnId === null || this.activeAudioTurnId === null || this.activeAudioTurnId === expectedTurnId)
              ) {
                const rescueTxt = this.currentAgentTranscript.trim();
                if (rescueTxt) {
                  this.triggerTextOnlyTts(rescueTxt);
                }
              }
            }, 5500);
          }
          return;
        }

        if (data.type === "turn_complete") {
          if (isStaleClientTurn) {
            return;
          }
          if (this.muteUntilNextSend) {
            this.muteUntilNextSend = false;
            this.activeAudioTurnId = null;
            this.audioChunksInTurn = 0;
            this.isSpeakingTurn = false;
            this.awaitingNextTurn = true;
            this.clearAudioRescueTimer();
            this.clearTurnWatchdog();
            return;
          }
          audioEngine.flushAudioPlayer();
          this.lastTurnCompletedAt = Date.now();
          this.activeAudioTurnId = null;
          this.activeTranscriptTurnId = null;
          if (
            !this.currentAgentTranscript &&
            this.audioChunksInTurn === 0 &&
            !this.isSpeakingTurn &&
            Date.now() - this.lastTextSentAt < 2500
          ) {
            return;
          }
          const hadAudio = this.audioChunksInTurn > 0;
          const completedText = this.currentAgentTranscript.trim();
          this.audioChunksInTurn = 0;
          this.clearAudioRescueTimer();
          this.clearTurnWatchdog();
          this.isSpeakingTurn = false;
          this.awaitingNextTurn = true;
          if (!hadAudio && completedText && !audioEngine.isSpeaking()) {
            this.triggerTextOnlyTts(completedText);
          } else if (!this.currentAgentTranscript && Date.now() - this.lastTextSentAt >= 6000) {
            this.savedOnTranscript?.(`DAS Ready. Speak or type your next command, ${this.roleHonorific}!`);
          }
          return;
        }

        if (data.type === "user_transcript" && data.text) {
          this.muteUntilNextSend = false;
          this.interruptedTurnIds.clear();
          this.hasConversationActivity = true;
          if (!this.isSpeakingTurn && this.audioChunksInTurn === 0) {
            this.awaitingNextTurn = true;
          }
          this.savedOnUserTranscript?.(data.text);
          return;
        }

        if (data.type === "interrupted") {
          if (isStaleClientTurn) {
            return;
          }
          this.clearAudioRescueTimer();
          const tId = typeof data.turn_id === "number" ? data.turn_id : null;
          if (tId !== null && tId === this.activeAudioTurnId) {
            this.interruptedTurnIds.add(tId);
            if (this.interruptedTurnIds.size > 40) {
              const first = this.interruptedTurnIds.values().next().value;
              if (first !== undefined) this.interruptedTurnIds.delete(first);
            }
          }
          const wasSpeaking = this.isSpeakingTurn;
          this.activeAudioTurnId = null;
          this.audioChunksInTurn = 0;
          this.cancelTtsFallback();
          if (!wasSpeaking || (!this.currentAgentTranscript && Date.now() - this.lastTextSentAt < 700)) {
            audioEngine.clearAudioQueue();
            return;
          }
          this.clearTurnWatchdog();
          this.isSpeakingTurn = false;
          this.awaitingNextTurn = true;
          audioEngine.clearAudioQueue();
          if (this.currentAgentTranscript) {
            this.savedOnTranscript?.(this.currentAgentTranscript);
          } else {
            this.savedOnInterrupted?.();
          }
          return;
        }

        if (data.type === "error" && data.message) {
          this.clearTurnWatchdog();
          this.isSpeakingTurn = false;
          this.awaitingNextTurn = true;
          this.savedOnTranscript?.(`Server Error: ${data.message}`);
          return;
        }

        // 3. Render Backend Tool Calls
        if (data.type === "tool_call" && data.name) {
          this.clearTurnWatchdog();
          this.notifyAgentResponse();
          const args = data.args || {};
          const sendToolResult = (result: any) => {
            if (!data.call_id || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
            try {
              this.ws.send(
                JSON.stringify({
                  type: "tool_result",
                  call_id: data.call_id,
                  result: typeof result === "object" && result !== null ? result : { result: String(result) },
                })
              );
            } catch { }
          };

          if (data.name === "control_website" || data.name === "navigate_ui") {
            executeWebsiteControl(args as WebsiteControlArgs, this.savedNavigateFn);
            sendToolResult({ ok: true, navigated: true });
          } else if (data.name === "update_student_profile") {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("das-update-profile", {
                  detail: { field: args.field, value: args.value },
                })
              );
            }
            sendToolResult({ ok: true, updated: true, field: args.field, value: args.value });
          } else if (data.name === "coding_studio_control") {
            const codeRes = await codingStudioController.execute(args);
            sendToolResult(codeRes);
          } else if (data.name === "write_and_compile_code") {
            const compRes = await handleCodeGenerationAndCompiler(args, this.savedOnCodeReady);
            sendToolResult(compRes);
          } else if (data.name === "return_to_dashboard") {
            const retMsg = args.message || `Okay ${this.roleHonorific}, returning to your dashboard.`;
            this.savedOnCodeReady?.(null as any);
            void codingStudioController.execute({ action: "close" });
            this.savedOnTranscript?.(retMsg);
            if (this.audioChunksInTurn === 0 && !audioEngine.isSpeaking()) {
              this.triggerTextOnlyTts(retMsg);
            }
            sendToolResult({ ok: true, message: retMsg });
          }
          return;
        }

        // 4. Direct Google AI Studio Audio & Text Stream
        const parts = data.serverContent?.modelTurn?.parts;
        if (parts && Array.isArray(parts)) {
          if (this.muteUntilNextSend) return;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (this.awaitingNextTurn) {
                this.currentAgentTranscript = "";
                audioEngine.updateLiveTranscript("");
                this.awaitingNextTurn = false;
                this.audioChunksInTurn = 0;
              }
              this.hasConversationActivity = true;
              this.lastAudioChunkAt = Date.now();
              this.audioChunksInTurn += 1;
              this.cancelTtsFallback();
              this.clearTurnWatchdog();
              this.notifyAgentResponse();
              audioEngine.playPcmChunk(part.inlineData.data, 24000);
              if (!this.isSpeakingTurn) {
                this.isSpeakingTurn = true;
                if (!this.currentAgentTranscript) {
                  this.savedOnTranscript?.("🔊 DAS Speaking...");
                }
              }
            }
            if (part.text) {
              this.clearTurnWatchdog();
              this.notifyAgentResponse();
              if (this.awaitingNextTurn) {
                this.currentAgentTranscript = "";
                audioEngine.updateLiveTranscript("");
                this.awaitingNextTurn = false;
                if (!this.isSpeakingTurn && this.audioChunksInTurn === 0) {
                  this.audioChunksInTurn = 0;
                }
                this.cancelTtsFallback();
              }
              this.currentAgentTranscript += part.text;
              audioEngine.updateLiveTranscript(this.currentAgentTranscript);
              this.savedOnTranscript?.(this.currentAgentTranscript);
            }
          }
        }

        if (data.serverContent?.turnComplete) {
          if (this.muteUntilNextSend) {
            this.muteUntilNextSend = false;
            this.isSpeakingTurn = false;
            this.awaitingNextTurn = true;
            this.audioChunksInTurn = 0;
            this.clearTurnWatchdog();
            return;
          }
          this.clearTurnWatchdog();
          this.isSpeakingTurn = false;
          this.awaitingNextTurn = true;
          const hadAudio = this.audioChunksInTurn > 0;
          const completedText = this.currentAgentTranscript.trim();
          this.audioChunksInTurn = 0;
          audioEngine.flushAudioPlayer();
          if (!hadAudio && completedText && !audioEngine.isSpeaking()) {
            this.triggerTextOnlyTts(completedText);
          } else if (!this.currentAgentTranscript && Date.now() - this.lastTextSentAt >= 6000) {
            this.savedOnTranscript?.(`DAS Ready. Speak or type your next command, ${this.roleHonorific}!`);
          }
          return;
        }

        if (data.serverContent?.interrupted) {
          this.clearTurnWatchdog();
          this.audioChunksInTurn = 0;
          this.cancelTtsFallback();
          this.isSpeakingTurn = false;
          this.awaitingNextTurn = true;
          audioEngine.clearAudioQueue();
          if (this.currentAgentTranscript) {
            this.savedOnTranscript?.(this.currentAgentTranscript);
          } else {
            this.savedOnInterrupted?.();
          }
        }

        // 5. Direct Google AI Studio Function Calling Execution & Response Loop
        const fnCalls = data.toolCall?.functionCalls;
        if (fnCalls && Array.isArray(fnCalls)) {
          const functionResponses = [];

          for (const fc of fnCalls) {
            const args = fc.args || {};
            let resultMsg = "Executed successfully.";

            if (fc.name === "control_website" || fc.name === "navigate_ui") {
              executeWebsiteControl(args as WebsiteControlArgs, this.savedNavigateFn);
              resultMsg = `Navigated website to ${args.route || args.selector}`;
            } else if (fc.name === "update_student_profile") {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("das-update-profile", {
                    detail: { field: args.field, value: args.value },
                  })
                );
              }
              resultMsg = JSON.stringify({ ok: true, updated: true, field: args.field, value: args.value });
            } else if (fc.name === "coding_studio_control") {
              resultMsg = JSON.stringify(await codingStudioController.execute(args));
            } else if (fc.name === "write_and_compile_code") {
              resultMsg = JSON.stringify(
                await handleCodeGenerationAndCompiler(args, this.savedOnCodeReady)
              );
            } else if (fc.name === "return_to_dashboard") {
              const retMsg = args.message || `Okay ${this.roleHonorific}, returning to your dashboard.`;
              this.savedOnCodeReady?.(null as any);
              resultMsg = "Returned to dashboard successfully.";
              this.savedOnTranscript?.(retMsg);
              if (this.audioChunksInTurn === 0 && !audioEngine.isSpeaking()) {
                this.triggerTextOnlyTts(retMsg);
              }
            }

            functionResponses.push({
              id: fc.id,
              name: fc.name,
              response: { output: resultMsg },
            });
          }

          if (this.ws && this.ws.readyState === WebSocket.OPEN && functionResponses.length > 0) {
            this.ws.send(
              JSON.stringify({
                toolResponse: {
                  functionResponses,
                },
              })
            );
          }
        }
      } catch (err) {
        console.error("WS Message Parse Error:", err);
      }
    };

    this.ws.onerror = () => {
      if (mySeq !== this.connSeq) return;
      this.isConnected = false;
      this.savedOnStatusChange?.(false);
      this.savedOnTranscript?.(
        apiKey
          ? "WebSocket connecting to Google AI Studio..."
          : "Connecting to Render backend..."
      );
    };

    this.ws.onclose = (e) => {
      if (mySeq !== this.connSeq) return;
      this.isConnected = false;
      this.isSpeakingTurn = false;
      this.activeAudioTurnId = null;
      this.audioChunksInTurn = 0;
      this.awaitingNextTurn = true;
      this.savedOnStatusChange?.(false);
      if (this.renderPingTimer) {
        window.clearInterval(this.renderPingTimer);
        this.renderPingTimer = null;
      }
      if (this.connectTimeoutTimer) {
        window.clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      if (e.reason && e.code !== 1012 && !/refreshing live session/i.test(e.reason)) {
        this.savedOnTranscript?.(`Connection: ${e.reason}`);
      }

      // If direct Google AI Studio rejected or returned 1008, immediately failover to Render backend
      if (this.isDirectGoogle && (e.code === 1008 || e.code === 1007 || e.code === 1002 || e.code === 1006)) {
        this.isDirectGoogle = false;
        this.ws = null;
        this.connect(
          this.savedRole,
          this.savedOnTranscript,
          this.savedOnStatusChange,
          this.savedNavigateFn,
          this.savedOnUserTranscript,
          this.savedOnInterrupted,
          this.savedOnCodeReady
        );
        return;
      }

      // Auto-reconnect so 2nd, 3rd, 50th question auto-reconnects seamlessly (skip spinning hidden background tabs)
      if (!this.manualClose) {
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "hidden" &&
          !this.lastUnansweredText
        ) {
          return;
        }
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => {
          this.ws = null;
          this.connect(
            this.savedRole,
            this.savedOnTranscript,
            this.savedOnStatusChange,
            this.savedNavigateFn,
            this.savedOnUserTranscript,
            this.savedOnInterrupted,
            this.savedOnCodeReady
          );
        }, 1000);
      }
    };
  }

  private flushPendingMessages() {
    if (this.preConnectAudioQueue.length > 6) {
      this.preConnectAudioQueue = this.preConnectAudioQueue.slice(-6);
    }
    while (this.preConnectAudioQueue.length > 0) {
      const chunk = this.preConnectAudioQueue.shift();
      if (chunk) this.sendAudioChunk(chunk);
    }
    while (this.pendingTexts.length > 0) {
      const nextText = this.pendingTexts.shift();
      if (nextText) {
        this.armTurnWatchdog(nextText);
        this.sendImmediateText(nextText);
      }
    }
  }

  private clearTurnWatchdog() {
    if (this.turnWatchdogTimer) {
      window.clearTimeout(this.turnWatchdogTimer);
      this.turnWatchdogTimer = null;
    }
    this.lastUnansweredText = null;
    this.lastUnansweredSetAt = 0;
    this.watchdogRetriedForText = false;
  }

  private armTurnWatchdog(text: string) {
    if (this.turnWatchdogTimer) {
      window.clearTimeout(this.turnWatchdogTimer);
    }
    this.lastUnansweredText = text;
    this.lastUnansweredSetAt = Date.now();
    this.turnWatchdogTimer = window.setTimeout(() => {
      this.turnWatchdogTimer = null;
      if (
        this.lastUnansweredText !== text ||
        this.isSpeakingTurn ||
        audioEngine.isSpeaking() ||
        this.audioChunksInTurn > 0 ||
        this.currentAgentTranscript
      ) {
        return;
      }

      if (!this.watchdogRetriedForText) {
        this.watchdogRetriedForText = true;
        this.pendingTexts = [text];
        this.savedOnTranscript?.(`Refreshing live connection and retrying, ${this.roleHonorific}...`);
        this.forceReconnectNow();
      } else {
        this.lastUnansweredText = null;
        this.lastUnansweredSetAt = 0;
        this.watchdogRetriedForText = false;
        this.savedOnTranscript?.(`Live session timed out, ${this.roleHonorific}. Please try sending your message again.`);
      }
    }, 18000);
  }

  private forceReconnectNow() {
    if (this.manualClose) return;
    this.connSeq++;
    this.isConnected = false;
    this.isSpeakingTurn = false;
    this.activeAudioTurnId = null;
    this.audioChunksInTurn = 0;
    this.awaitingNextTurn = true;
    this.clearAudioRescueTimer();
    this.savedOnStatusChange?.(false);
    if (this.renderPingTimer) {
      window.clearInterval(this.renderPingTimer);
      this.renderPingTimer = null;
    }
    this.closeExistingSocketOnly();
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(
        this.savedRole,
        this.savedOnTranscript,
        this.savedOnStatusChange,
        this.savedNavigateFn,
        this.savedOnUserTranscript,
        this.savedOnInterrupted,
        this.savedOnCodeReady
      );
    }, 250);
  }

  public warmup() {
    if (this.isDirectGoogle) return;
    const now = Date.now();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      this.pendingWarmup = true;
      return;
    }
    if (now - this.lastWarmupAt < 20000) return;
    this.lastWarmupAt = now;
    this.pendingWarmup = false;
    try {
      this.ws.send(JSON.stringify({ type: "warmup" }));
    } catch { }
  }

  public sendAudioChunk(base64Pcm: string) {
    this.activeClientTurnId = 0;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      if (this.preConnectAudioQueue.length >= 6) {
        this.preConnectAudioQueue.shift();
      }
      this.preConnectAudioQueue.push(base64Pcm);
      return;
    }
    if (this.ws.bufferedAmount > 96 * 1024) return;

    if (this.isDirectGoogle) {
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Pcm,
              },
            ],
          },
        })
      );
    } else {
      this.ws.send(JSON.stringify({ type: "audio", pcm_base64: base64Pcm }));
    }
  }

  public sendAudioStreamEnd() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) return;
    if (this.isDirectGoogle) {
      this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    } else {
      this.ws.send(JSON.stringify({ type: "audio_stream_end" }));
    }
  }

  public sendPageContext(context: Record<string, any>) {
    this.latestPageContext = context;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected || this.isDirectGoogle) return;
    try {
      this.ws.send(JSON.stringify({ type: "page_context", context }));
    } catch { }
  }

  public sendFriendlyAudioHint(issue: string, device: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) return;
    if (this.isSpeakingTurn || audioEngine.isSpeaking()) return;
    if (this.isDirectGoogle) {
      this.sendImmediateText(
        `Friendly audio notice (${issue} on ${device}): tell ${this.roleHonorific} kindly like a friend that their voice sounds very quiet or muffled and suggest raising volume or checking their earphones/buds.`
      );
    } else {
      try {
        this.ws.send(JSON.stringify({ type: "friendly_audio_hint", issue, device }));
      } catch { }
    }
  }

  public askCoach(query: string, pageContext?: Record<string, any>) {
    if (!query.trim()) return;
    if (pageContext) {
      this.sendPageContext(pageContext);
    }
    this.sendTextCommand(query);
  }

  public speakVerbatim(text: string, mode = "coach_read") {
    const cleaned = text.trim();
    if (!cleaned) return;
    this.muteUntilNextSend = false;
    this.cancelTtsFallback();
    this.audioChunksInTurn = 0;
    this.activeTranscriptTurnId = null;
    this.currentAgentTranscript = "";
    this.isSpeakingTurn = false;
    this.awaitingNextTurn = false;
    audioEngine.unlockAudio();
    audioEngine.clearAudioQueue();

    if (!this.isSocketConnected || !this.ws) {
      return;
    }

    try {
      if (this.isDirectGoogle) {
        this.sendImmediateText(`[READ ALOUD VERBATIM ONLY]: ${cleaned}`);
      } else {
        this.ws.send(JSON.stringify({ type: "speak_verbatim", text: cleaned, mode }));
      }
    } catch { }
  }

  public sendTextCommand(text: string) {
    if (!text.trim()) return;
    this.muteUntilNextSend = false;
    this.interruptedTurnIds.clear();
    this.activeClientTurnId = ++this.clientTurnSeq;
    this.clearAudioRescueTimer();
    this.cancelTtsFallback();
    this.audioChunksInTurn = 0;
    this.activeTranscriptTurnId = null;
    this.currentAgentTranscript = "";
    this.isSpeakingTurn = false;
    this.awaitingNextTurn = false;
    audioEngine.unlockAudio();
    audioEngine.clearAudioQueue();

    const q = text.toLowerCase().trim();
    if (
      q.includes("return to your dashboard") ||
      q.includes("return to dashboard") ||
      q.includes("dashboard ki vellu") ||
      q.includes("close compiler") ||
      q.includes("close code")
    ) {
      this.savedOnCodeReady?.(null as any);
      this.savedOnTranscript?.(`Okay ${this.roleHonorific}, returning to your dashboard.`);
    }

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.pendingTexts = [text];
      this.watchdogRetriedForText = false;
      this.armTurnWatchdog(text);
      this.closeExistingSocketOnly();
      this.connect(
        this.savedRole,
        this.savedOnTranscript,
        this.savedOnStatusChange,
        this.savedNavigateFn,
        this.savedOnUserTranscript,
        this.savedOnInterrupted,
        this.savedOnCodeReady
      );
      return;
    }

    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingTexts = [text];
      this.watchdogRetriedForText = false;
      this.armTurnWatchdog(text);
      return;
    }

    this.pendingTexts = [];
    this.watchdogRetriedForText = false;
    this.armTurnWatchdog(text);
    this.sendImmediateText(text);
  }

  private sendImmediateText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.hasConversationActivity = true;
    this.lastTextSentAt = Date.now();
    try {
      if (this.isDirectGoogle) {
        this.ws.send(
          JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text }] }],
              turnComplete: true,
            },
          })
        );
      } else {
        this.ws.send(JSON.stringify({ type: "text", text, client_turn_id: this.activeClientTurnId }));
      }
    } catch {
      this.pendingTexts.push(text);
      this.forceReconnectNow();
    }
  }

  public switchRole(role: UserHonorificRole) {
    this.currentRole = role;
    this.savedRole = role;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isDirectGoogle) {
        this.sendImmediateText(
          role === "boss"
            ? "You are now speaking with your creator Bommali Dileep. Address him warmly as Boss."
            : role === "madam"
              ? "You are now speaking with a lady guest. Address her politely as Madam."
              : role === "stranger"
                ? "You are speaking with an unidentified guest visitor. Address them politely as Stranger and ask their name first."
                : "You are now speaking with a gentleman guest. Address him politely as Sir."
        );
      } else {
        this.ws.send(JSON.stringify({ type: "role_switch", role }));
      }
    }
  }

  public reconnectForAccountSwitch(role: UserHonorificRole) {
    this.currentRole = role;
    this.savedRole = role;
    this.hasConversationActivity = false;
    this.pendingTexts = [];
    this.clearAudioRescueTimer();
    this.cancelTtsFallback();
    this.clearTurnWatchdog();
    if (this.manualClose || !this.savedOnTranscript) return;
    this.forceReconnectNow();
  }

  public disconnect() {
    this.manualClose = true;
    this.connSeq++;
    this.activeAudioTurnId = null;
    this.audioChunksInTurn = 0;
    this.clearAudioRescueTimer();
    this.cancelTtsFallback();
    this.clearTurnWatchdog();
    this.closeExistingSocketOnly();
    audioEngine.stopMicCapture();
    audioEngine.clearAudioQueue();
    this.preConnectAudioQueue = [];
    this.pendingTexts = [];
    this.isConnected = false;
    this.isSpeakingTurn = false;
    this.awaitingNextTurn = false;
    this.hasConversationActivity = false;
    this.lastAudioChunkAt = 0;
    this.savedOnStatusChange?.(false);
  }
}

export const dasSocket = new DasAgentSocket();
if (typeof window !== "undefined") {
  (window as any).dasSocket = dasSocket;
}
