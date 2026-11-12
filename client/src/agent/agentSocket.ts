import { audioEngine } from "./audioIO";
import {
  executeWebsiteControl,
  WebsiteControlArgs,
  openExternalWebsiteOrSearch,
  openLinkedInProfile,
  handleCodeGenerationAndCompiler,
  triggerGoogleAutomation,
  CodeTaskPayload,
} from "./toolRunner";

export type UserHonorificRole = "boss" | "sir";

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

      const honorificRule =
        this.savedRole === "boss"
          ? "You are speaking with your creator and owner, Bommali Dileep. Always address him warmly as 'Boss' in every response."
          : "You are speaking with a guest evaluator or client. Always address them politely as 'Sir' in every response.";

      const systemPrompt = `You are DAS, the Autonomous 3D AI Voice Co-Pilot & Master Software Engineer powering PATHFINDER 2.0.
${honorificRule}

CORE AUTONOMOUS POWERS:
1. MULTILINGUAL FLUENCY: Speak fluently in Telugu, English, or Hindi matching the user's language.
2. OPEN ANY WEBSITE & EXPLAIN: When asked to open any website (Google, YouTube, GitHub, LeetCode, documentation, or any URL), call 'open_external_website' and clearly explain the website or topic.
3. MASTER CODING & COMPILER (C, C++, Python, Java, JS, TS, SQL): You are an expert programmer. Whenever the user asks you to open an online compiler (like C compiler, Python compiler) or write any program or algorithm (small or large), MUST call 'write_and_compile_code' with the complete, bug-free source code and explain the logic step-by-step.
4. LINKEDIN PROFILE INTELLIGENCE: Whenever asked to open someone's LinkedIn profile or tell about any professional, call 'open_linkedin_profile', and speak a clear summary of their profile, role, and achievements.
5. GMAIL & GOOGLE WORKSPACE AUTOMATION: Whenever asked to send an email, schedule a calendar invite, or log data to Google Sheets, call 'trigger_google_workspace'.
6. PATHFINDER UI CONTROL: To switch internal dashboard pages ('/', '/blueprints', '/resume-studio', '/mock-interview'), call 'control_website'.`;

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
          return;
        }

        if (data.type === "transcript" && data.text) {
          this.currentAgentTranscript += data.text;
          this.savedOnTranscript?.(this.currentAgentTranscript);
          return;
        }

        if (data.type === "turn_complete") {
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
          }
          return;
        }

        // 4. Direct Google AI Studio Audio & Text Stream
        const parts = data.serverContent?.modelTurn?.parts;
        if (parts && Array.isArray(parts)) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              audioEngine.playPcmChunk(part.inlineData.data, 24000);
            }
            if (part.text) {
              this.currentAgentTranscript += part.text;
              this.savedOnTranscript?.(this.currentAgentTranscript);
            }
          }
        }

        if (data.serverContent?.turnComplete) {
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
    audioEngine.initContext();
    audioEngine.clearAudioQueue();

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
            ? "Address me as Boss from now on."
            : "Address me as Sir from now on."
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
