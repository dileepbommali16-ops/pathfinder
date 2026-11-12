import { audioEngine, cameraEngine } from "./audioIO";
import {
  executeWebsiteControl,
  WebsiteControlArgs,
  openExternalWebsiteOrSearch,
  openLinkedInProfile,
  handleCodeGenerationAndCompiler,
  triggerGoogleAutomation,
  CodeTaskPayload,
} from "./toolRunner";

export type UserHonorificRole = "boss" | "sir" | "madam";

const GOOGLE_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const RENDER_WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://pathfinder-backend-klrp.onrender.com/agent/ws";

class DasAgentSocket {
  private ws: WebSocket | null = null;
  private isDirectGoogle = false;
  private preConnectAudioQueue: string[] = [];
  private pendingTexts: string[] = [];
  private currentAgentTranscript = "";
  private isSpeakingTurn = false;
  public isConnected = false;
  public currentRole: UserHonorificRole = "boss";

  // Persistent callback storage for auto-reconnection and multi-turn stability
  private savedRole: UserHonorificRole = "boss";
  private savedOnTranscript?: (text: string) => void;
  private savedOnStatusChange?: (connected: boolean) => void;
  private savedNavigateFn?: (path: string) => void;
  private savedOnUserTranscript?: (text: string) => void;
  private savedOnInterrupted?: () => void;
  private savedOnCodeReady?: (payload: CodeTaskPayload) => void;
  private renderPingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private manualClose = false;

  public connect(
    role: UserHonorificRole = "boss",
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

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey) {
      this.isDirectGoogle = true;
      this.ws = new WebSocket(`${GOOGLE_LIVE_WS_URL}?key=${apiKey}`);
    } else {
      this.isDirectGoogle = false;
      this.ws = new WebSocket(`${RENDER_WS_URL}?role=${encodeURIComponent(role)}`);
    }

    this.ws.onopen = () => {
      if (!this.isDirectGoogle) {
        this.isConnected = true;
        this.savedOnStatusChange?.(true);
        this.savedOnTranscript?.("DAS Online (Connected via Render Cloud)!");
        this.flushPendingMessages();

        // 20s keep-alive ping for Render backend (never send ping to Google AI Studio!)
        if (this.renderPingTimer) window.clearInterval(this.renderPingTimer);
        this.renderPingTimer = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 20000);
        return;
      }

      const roleKey = (this.savedRole || "boss").toLowerCase().trim();
      const identityRole =
        roleKey === "boss"
          ? `You are speaking directly with your creator, master architect, and owner, Bommali Dileep.
- Always address him warmly, casually, and loyally as 'Boss' in every single reply.
- Never call yourself 'co-pilot' or sound robotic. You are DAS, created by Dileep.
- When Boss says 'Hi', 'Hello', or starts speaking, greet him casually: "Hi Boss! What's up?"
- You know everything about Boss Dileep, his family, his college, his mentors, and his life. Answer naturally, warmly, and proudly whenever he or anyone asks.`
          : roleKey === "madam"
          ? `You are speaking with a female visitor, evaluator, recruiter, or friend.
- Always address her respectfully and politely as 'Madam'.
- When she greets you, reply: "Hello Madam, what can I help you with today?"
- If she asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked).`
          : `You are speaking with a male visitor, evaluator, recruiter, or friend.
- Always address him respectfully and politely as 'Sir'.
- When he greets you, reply: "Hello Sir, what can I help you with today?"
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
   - College: Dr. RVR & Dr. NRI Deemed to be University, Pothavarappadu, Agiripalli.

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

5. RESPECTED PROFESSORS & MENTORS (NRI UNIVERSITY):
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
2. LIVE CAMERA VISION & OBJECT PERCEPTION (CRITICAL MANDATE):
   You possess 100% active real-time visual perception via video frames streamed directly from Boss's camera.
   - You CAN see Boss, his face, his expressions, and whatever he holds in his hands or presents to the camera!
   - When Boss asks "Can you see me?", "What is in my hands?", "Look at this", or shows an object (such as his earphones, headphones, phone, notebook, watch, etc.):
     * NEVER give a canned or repetitive answer without answering what is in his hands!
     * Directly look at the visual frame provided.
     * Name the exact item: e.g. "Boss, in your hand you are holding your earphones / earbuds!"
     * Describe the color, shape, and style of the object (e.g. white wireless in-ear earbuds, black wired earphones).
     * Explain what the object is, what its features or purposes are (e.g. listening to audio, music, noise cancellation), and discuss it in an energetic, knowledgeable way.
     * NEVER say "I don't have eyes" or "I cannot see what is in your hands". You have full active vision!
3. MASTER PROGRAMMING & COMPILER (C, C++, Python, Java, JS, TS, SQL):
   - When asked to write any program or algorithm (small or large), call 'write_and_compile_code' with clean, compilable code and explain the logic step-by-step.
   - When a compiler or syntax error occurs, or Boss says "fix the error", "code wrong undi", or "correct chey":
     Analyze the exact compiler diagnostics, rewrite the fully corrected source code, and immediately call 'write_and_compile_code' so the compiler studio updates and re-executes live on screen!
   - Explain the code in depth: why it's written this way, loops, recursion, data structures, and time/space complexity.
4. ATS RESUME INTELLIGENCE & PLACEMENT ROADMAP:
   - Provide elite Tier-1 ATS resume reviews calibrated to Google's X-Y-Z formula: "Accomplished [X] as measured by [Y] by doing [Z]".
   - Guide Boss on top capstone projects, certifications (AWS Solutions Architect, GCP Data Engineer), and core subjects (DSA, OS, CN, DBMS, System Design) to guarantee 100% placement success.
5. OPEN ANY WEBSITE & EXPLAIN: When asked to open any website (Google, YouTube, GitHub, LeetCode, or any URL), call 'open_external_website' and explain it clearly.
6. LINKEDIN PROFILE INTELLIGENCE: When asked about anyone's profile, call 'open_linkedin_profile' and summarize their background.
7. GMAIL & WORKSPACE AUTOMATION: When asked to send an email or schedule a calendar, call 'trigger_google_workspace'.
8. RETURN TO YOUR DASHBOARD (JARVIS RESPONSE):
   When Boss says 'return to your dashboard DAS', 'dashboard ki vellu', or 'close compiler', immediately reply warmly and loyally: "Okay Boss, returning to your dashboard." and dismiss any open compiler drawers.
9. Keep voice replies energetic, warm, and conversational without robotic filler.`;

      const setupPayload = {
        setup: {
          model: "models/gemini-3.8-live",
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
                  name: "open_external_website",
                  description:
                    "Open any external website URL or Google search query in a new browser tab.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      url: {
                        type: "STRING",
                        description: "Full https URL if known (e.g. https://github.com)",
                      },
                      search_query: {
                        type: "STRING",
                        description: "Google search query if exact URL is not specified",
                      },
                      site_name: {
                        type: "STRING",
                        description: "Name of the website being opened",
                      },
                    },
                  },
                },
                {
                  name: "open_linkedin_profile",
                  description:
                    "Search and open a person's LinkedIn profile in a new browser tab.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      person_name: {
                        type: "STRING",
                        description: "Full name of the person",
                      },
                      company_or_role: {
                        type: "STRING",
                        description: "Optional company, college, or role keywords",
                      },
                      direct_url: {
                        type: "STRING",
                        description: "Direct LinkedIn URL if known",
                      },
                    },
                    required: ["person_name"],
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
                      open_external_tab: {
                        type: "BOOLEAN",
                        description: "True if user asked to open external online compiler website",
                      },
                    },
                    required: ["language", "program_title", "source_code"],
                  },
                },
                {
                  name: "trigger_google_workspace",
                  description:
                    "Send an email via Gmail, schedule a Google Calendar event, or log data to Google Sheets.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      automation_type: {
                        type: "STRING",
                        description: "'send_email', 'schedule_calendar', or 'log_sheet'",
                      },
                      recipient_email: { type: "STRING" },
                      subject: { type: "STRING" },
                      details: { type: "STRING" },
                    },
                    required: ["automation_type", "details"],
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
          this.savedOnTranscript?.("ONLINE (Puck Voice + Compiler + Browser Ready)! Speak or type now, Boss.");
          this.flushPendingMessages();
          return;
        }

        // 2. Render Backend Status / Audio / Transcript
        if (data.type === "status" && data.status === "connected") {
          this.isConnected = true;
          this.savedOnStatusChange?.(true);
          this.savedOnTranscript?.(`DAS Online (${data.voice || "Puck"} Voice Ready)!`);
          this.flushPendingMessages();
          return;
        }

        if (data.type === "audio" && data.pcm_base64) {
          audioEngine.playPcmChunk(data.pcm_base64, data.sample_rate || 24000);
          if (!this.isSpeakingTurn) {
            this.isSpeakingTurn = true;
            if (!this.currentAgentTranscript) {
              this.savedOnTranscript?.("🔊 DAS Speaking (Puck Voice)...");
            }
          }
          return;
        }

        if (data.type === "transcript" && data.text) {
          this.currentAgentTranscript += data.text;
          this.savedOnTranscript?.(this.currentAgentTranscript);
          return;
        }

        if (data.type === "turn_complete") {
          this.isSpeakingTurn = false;
          if (!this.currentAgentTranscript) {
            this.savedOnTranscript?.("DAS Ready. Speak or type your next command, Boss!");
          }
          return;
        }

        if (data.type === "user_transcript" && data.text) {
          this.savedOnUserTranscript?.(data.text);
          return;
        }

        if (data.type === "interrupted") {
          this.currentAgentTranscript = "";
          audioEngine.clearAudioQueue();
          this.savedOnInterrupted?.();
          return;
        }

        if (data.type === "error" && data.message) {
          this.savedOnTranscript?.(`Server Error: ${data.message}`);
          return;
        }

        // 3. Render Backend Tool Calls
        if (data.type === "tool_call" && data.name) {
          const args = data.args || {};
          if (data.name === "control_website" || data.name === "navigate_ui") {
            executeWebsiteControl(args as WebsiteControlArgs, this.savedNavigateFn);
          } else if (data.name === "open_external_website") {
            openExternalWebsiteOrSearch(args);
          } else if (data.name === "open_linkedin_profile") {
            openLinkedInProfile(args);
          } else if (data.name === "write_and_compile_code") {
            await handleCodeGenerationAndCompiler(args, this.savedOnCodeReady);
          } else if (
            data.name === "run_google_automation" ||
            data.name === "trigger_google_workspace"
          ) {
            await triggerGoogleAutomation(args);
          } else if (data.name === "return_to_dashboard") {
            this.savedOnCodeReady?.(null as any);
            this.savedOnTranscript?.(args.message || "Okay Boss, returning to your dashboard.");
          }
          return;
        }

        // 4. Direct Google AI Studio Audio & Text Stream
        const parts = data.serverContent?.modelTurn?.parts;
        if (parts && Array.isArray(parts)) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              audioEngine.playPcmChunk(part.inlineData.data, 24000);
              if (!this.isSpeakingTurn) {
                this.isSpeakingTurn = true;
                if (!this.currentAgentTranscript) {
                  this.savedOnTranscript?.("🔊 DAS Speaking (Puck Voice)...");
                }
              }
            }
            if (part.text) {
              this.currentAgentTranscript += part.text;
              this.savedOnTranscript?.(this.currentAgentTranscript);
            }
          }
        }

        if (data.serverContent?.turnComplete) {
          this.isSpeakingTurn = false;
          if (!this.currentAgentTranscript) {
            this.savedOnTranscript?.("DAS Ready. Speak or type your next command, Boss!");
          }
          return;
        }

        if (data.serverContent?.interrupted) {
          this.currentAgentTranscript = "";
          audioEngine.clearAudioQueue();
          this.savedOnInterrupted?.();
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
            } else if (fc.name === "open_external_website") {
              resultMsg = openExternalWebsiteOrSearch(args);
            } else if (fc.name === "open_linkedin_profile") {
              resultMsg = openLinkedInProfile(args);
            } else if (fc.name === "write_and_compile_code") {
              resultMsg = await handleCodeGenerationAndCompiler(
                args,
                this.savedOnCodeReady
              );
            } else if (
              fc.name === "trigger_google_workspace" ||
              fc.name === "run_google_automation"
            ) {
              resultMsg = await triggerGoogleAutomation(args);
            } else if (fc.name === "return_to_dashboard") {
              this.savedOnCodeReady?.(null as any);
              resultMsg = "Returned to dashboard successfully.";
              this.savedOnTranscript?.(args.message || "Okay Boss, returning to your dashboard.");
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
      this.isConnected = false;
      this.savedOnStatusChange?.(false);
      this.savedOnTranscript?.(
        apiKey
          ? "WebSocket connecting to Google AI Studio..."
          : "Connecting to Render backend..."
      );
    };

    this.ws.onclose = (e) => {
      this.isConnected = false;
      this.savedOnStatusChange?.(false);
      if (this.renderPingTimer) {
        window.clearInterval(this.renderPingTimer);
        this.renderPingTimer = null;
      }
      if (e.reason) {
        this.savedOnTranscript?.(`Connection: ${e.reason}`);
      }

      // Auto-reconnect so 2nd, 3rd, 50th question auto-reconnects seamlessly
      if (!this.manualClose) {
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
    while (this.preConnectAudioQueue.length > 0) {
      const chunk = this.preConnectAudioQueue.shift();
      if (chunk) this.sendAudioChunk(chunk);
    }
    while (this.pendingTexts.length > 0) {
      const nextText = this.pendingTexts.shift();
      if (nextText) this.sendImmediateText(nextText);
    }
  }

  public sendAudioChunk(base64Pcm: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      if (this.preConnectAudioQueue.length < 100) {
        this.preConnectAudioQueue.push(base64Pcm);
      }
      return;
    }

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

  public sendVideoFrame(base64Jpeg: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) return;
    if (this.isDirectGoogle) {
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "image/jpeg",
                data: base64Jpeg,
              },
            ],
          },
        })
      );
    } else {
      this.ws.send(JSON.stringify({ type: "frame", jpeg_base64: base64Jpeg }));
    }
  }

  public sendTextCommand(text: string) {
    if (!text.trim()) return;
    this.currentAgentTranscript = "";
    this.isSpeakingTurn = false;
    audioEngine.initContext();
    audioEngine.clearAudioQueue();

    // If camera is streaming, grab fresh live frame and send it immediately with the command
    const freshFrame = cameraEngine.getLatestFrameBase64();
    if (freshFrame) {
      this.sendVideoFrame(freshFrame);
    }

    const q = text.toLowerCase().trim();
    if (
      q.includes("return to your dashboard") ||
      q.includes("return to dashboard") ||
      q.includes("dashboard ki vellu") ||
      q.includes("close compiler") ||
      q.includes("close code")
    ) {
      this.savedOnCodeReady?.(null as any);
      this.savedOnTranscript?.("Okay Boss, returning to your dashboard.");
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      this.pendingTexts.push(text);
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

    this.sendImmediateText(text);
  }

  private sendImmediateText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

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
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  public switchRole(role: UserHonorificRole) {
    this.currentRole = role;
    this.savedRole = role;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isDirectGoogle) {
        this.sendImmediateText(
          role === "boss"
            ? "You are now speaking with your creator Bommali Dileep. Address him warmly as Boss and say 'Hi Boss! What's up?'"
            : role === "madam"
            ? "You are now speaking with a lady guest. Address her politely as Madam and say 'Hello Madam, what can I help you with today?'"
            : "You are now speaking with a gentleman guest. Address him politely as Sir and say 'Hello Sir, what can I help you with today?'"
        );
      } else {
        this.ws.send(JSON.stringify({ type: "role_switch", role }));
      }
    }
  }

  public disconnect() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.renderPingTimer) {
      window.clearInterval(this.renderPingTimer);
      this.renderPingTimer = null;
    }
    audioEngine.stopMicCapture();
    audioEngine.clearAudioQueue();
    this.preConnectAudioQueue = [];
    this.pendingTexts = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const dasSocket = new DasAgentSocket();
