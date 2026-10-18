/**
 * Pathfinder DAS Agent: Gemini Live WebSocket Pipeline (geminiLive.js)
 * Implements:
 * 1. Bidirectional WebSocket stream to Gemini Live API:
 *    wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}
 * 2. Setup payload: model gemini-2.0-flash-exp, responseModalities ["AUDIO"], Puck prebuilt voice config
 * 3. System Instruction: DAS friendly senior AI career coach for Pathfinder. Initial greeting: "I'm your AI, your DAS Agent. Tell me, how can I help you?"
 * 4. WebAudio AudioBufferSourceNode PCM conversion + AnalyserNode volume calculation for real-time 3D mouth lip-sync.
 * 5. Text chat input transmission over WebSocket for audio responses.
 */

(function () {
  class GeminiLivePipeline {
    constructor(options = {}) {
      this.apiKey = options.apiKey || "";
      this.onTranscript = options.onTranscript || null;
      this.onStateChange = options.onStateChange || null;
      this.onAudioStart = options.onAudioStart || null;
      this.onAudioEnd = options.onAudioEnd || null;

      this.ws = null;
      this.audioContext = null;
      this.analyserNode = null;
      this.freqData = new Uint8Array(128);
      this.nextPlayTime = 0;
      this.isPlaying = false;
      this.isConnected = false;
    }

    async init() {
      // 1. Initialize WebAudio Context and AnalyserNode
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.2;
      this.analyserNode.connect(this.audioContext.destination);

      // 2. Fetch Gemini API Key if missing
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

    connect() {
      if (!this.apiKey) {
        console.warn("[geminiLive] No GEMINI_API_KEY available.");
        return false;
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      console.log("[geminiLive] Connecting to Gemini Live WebSocket...");

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log("[geminiLive] Connected to Gemini Live API.");
          if (this.onStateChange) this.onStateChange("ready");

          // 1. Send Setup Payload
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
          this.ws.send(JSON.stringify(setupPayload));

          // 2. Trigger initial greeting
          setTimeout(() => {
            this.sendUserText("Hello, please introduce yourself.");
          }, 400);
        };

        this.ws.onmessage = async (event) => {
          try {
            let data;
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
          console.log("[geminiLive] WebSocket connection closed.");
          if (this.onStateChange) this.onStateChange("disconnected");
        };

        return true;
      } catch (err) {
        console.error("[geminiLive] Connect failure:", err);
        return false;
      }
    }

    playPcmAudio(base64Data) {
      if (!this.audioContext) return;
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      // Convert base64 string to 16-bit PCM little-endian float array
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
        if (this.audioContext.currentTime >= this.nextPlayTime - 0.05) {
          this.isPlaying = false;
          if (this.onAudioEnd) this.onAudioEnd();
          if (this.onStateChange) this.onStateChange("ready");
        }
      };
    }

    sendUserText(text) {
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

    getAudioVolume() {
      if (!this.analyserNode || !this.isPlaying) return 0;
      this.analyserNode.getByteFrequencyData(this.freqData);
      let sum = 0;
      for (let i = 2; i < 28; i++) {
        sum += this.freqData[i];
      }
      return sum / (26 * 255);
    }
  }

  // Expose globally
  window.GeminiLivePipeline = GeminiLivePipeline;
})();
