/**
 * Pathfinder DAS Agent: Gemini Live WebSocket Pipeline (TypeScript Client)
 * Implements:
 * 1. Bidirectional WebSocket connection to Gemini Live:
 *    wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}
 * 2. Setup payload: model gemini-2.0-flash-exp, responseModalities ["AUDIO"], Puck prebuilt voice config
 * 3. System Instruction: DAS friendly senior AI career coach for Pathfinder. Initial greeting: "I'm your AI, your DAS Agent. Tell me, how can I help you?"
 * 4. WebAudio AudioBufferSourceNode PCM conversion + AnalyserNode volume calculation for real-time 3D mouth lip-sync.
 * 5. Text chat input transmission over WebSocket for audio responses.
 */

export interface GeminiLiveOptions {
  apiKey?: string;
  onTranscript?: (text: string) => void;
  onStateChange?: (state: "ready" | "listening" | "thinking" | "speaking" | "error") => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

export class GeminiLivePipeline {
  private apiKey: string;
  private onTranscript?: (text: string) => void;
  private onStateChange?: (state: "ready" | "listening" | "thinking" | "speaking" | "error") => void;
  private onAudioStart?: () => void;
  private onAudioEnd?: () => void;

  public ws: WebSocket | null = null;
  public audioContext: AudioContext | null = null;
  public analyserNode: AnalyserNode | null = null;
  private freqData: Uint8Array = new Uint8Array(128);
  private nextPlayTime: number = 0;
  public isPlaying: boolean = false;
  public isConnected: boolean = false;

  constructor(options: GeminiLiveOptions = {}) {
    this.apiKey = options.apiKey || "";
    this.onTranscript = options.onTranscript;
    this.onStateChange = options.onStateChange;
    this.onAudioStart = options.onAudioStart;
    this.onAudioEnd = options.onAudioEnd;
  }

  public async init(): Promise<this> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx({ sampleRate: 24000 });
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.2;
    this.analyserNode.connect(this.audioContext.destination);

    if (!this.apiKey) {
      try {
        const resp = await fetch("/api/gemini-live-key");
        if (resp.ok) {
          const data = await resp.json();
          this.apiKey = data.apiKey || data.key || "";
        }
      } catch (e) {
        console.warn("[geminiLive] Could not fetch /api/gemini-live-key:", e);
      }
    }

    return this;
  }

  public connect(): boolean {
    if (!this.apiKey) {
      console.warn("[geminiLive] No GEMINI_API_KEY available.");
      return false;
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.onStateChange) this.onStateChange("ready");

        const setupPayload = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Puck" }
                }
              }
            },
            systemInstruction: {
              parts: [
                {
                  text: "You are 'DAS', a friendly senior AI career and technical coach for Pathfinder. On initialization, always say exactly: 'I\\'m your AI, your DAS Agent. Tell me, how can I help you?'"
                }
              ]
            }
          }
        };
        this.ws?.send(JSON.stringify(setupPayload));

        // Initial turn trigger
        setTimeout(() => {
          this.sendUserText("Hello, please introduce yourself.");
        }, 400);
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          let data: any;
          if (event.data instanceof Blob) {
            data = JSON.parse(await event.data.text());
          } else {
            data = JSON.parse(event.data);
          }

          const parts = data.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.text && this.onTranscript) {
              this.onTranscript(part.text);
            }
            if (part.inlineData?.data) {
              this.playPcmAudio(part.inlineData.data);
            }
          }

          if (data.serverContent?.turnComplete) {
            if (this.onStateChange) this.onStateChange("ready");
          }
        } catch (err) {
          console.error("[geminiLive] Message handling error:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[geminiLive] WebSocket error:", err);
        if (this.onStateChange) this.onStateChange("error");
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.onStateChange) this.onStateChange("error");
      };

      return true;
    } catch (err) {
      console.error("[geminiLive] Connect failure:", err);
      return false;
    }
  }

  public playPcmAudio(base64Data: string) {
    if (!this.audioContext || !this.analyserNode) return;
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.analyserNode);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlayTime);
    sourceNode.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.isPlaying = true;
    if (this.onAudioStart) this.onAudioStart();
    if (this.onStateChange) this.onStateChange("speaking");

    sourceNode.onended = () => {
      if (this.audioContext && this.audioContext.currentTime >= this.nextPlayTime - 0.05) {
        this.isPlaying = false;
        if (this.onAudioEnd) this.onAudioEnd();
        if (this.onStateChange) this.onStateChange("ready");
      }
    };
  }

  public sendUserText(text: string): boolean {
    if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const payload = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text: text }]
          }
        ],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(payload));
    if (this.onStateChange) this.onStateChange("thinking");
    return true;
  }

  public getAudioVolume(): number {
    if (!this.analyserNode || !this.isPlaying) return 0;
    (this.analyserNode as any).getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 2; i < 28; i++) {
      sum += this.freqData[i];
    }
    return sum / (26 * 255);
  }
}
