/**
 * Browser Microphone Capture (client/src/voice/audio/mic.ts)
 * Captures user audio with getUserMedia (echoCancellation, noiseSuppression, autoGainControl ON),
 * runs AudioWorklet resampler to 16kHz PCM16, and dispatches base64 chunks.
 */

export interface MicCaptureOptions {
  onAudioChunk: (base64Chunk: string, rawBytes?: ArrayBuffer) => void;
  onError?: (err: Error) => void;
}

export class MicrophoneCapture {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isCapturing = false;
  private onAudioChunk: (base64Chunk: string, rawBytes?: ArrayBuffer) => void;
  private onError?: (err: Error) => void;

  constructor(options: MicCaptureOptions) {
    this.onAudioChunk = options.onAudioChunk;
    this.onError = options.onError;
  }

  public async start(): Promise<boolean> {
    if (this.isCapturing) return true;

    try {
      // 1. Request microphone with browser native AEC, AGC, and NS
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      // 2. Load AudioWorklet module
      try {
        await this.audioCtx.audioWorklet.addModule("/src/voice/audio/mic-worklet.js");
      } catch {
        // Fallback inline blob url if /src path is not directly accessible
        const workletCode = `
          class MicResamplerProcessor extends AudioWorkletProcessor {
            constructor() { super(); this.buffer = []; }
            process(inputs) {
              const input = inputs[0];
              if (!input || !input[0]) return true;
              const inputData = input[0];
              const ratio = sampleRate / 16000;
              for (let i = 0; i < inputData.length; i += ratio) {
                const sample = Math.max(-1.0, Math.min(1.0, inputData[Math.floor(i)]));
                this.buffer.push(sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff));
              }
              if (this.buffer.length >= 512) {
                const pcmChunk = new Int16Array(this.buffer.splice(0, 512));
                this.port.postMessage(pcmChunk.buffer, [pcmChunk.buffer]);
              }
              return true;
            }
          }
          registerProcessor("mic-resampler-processor", MicResamplerProcessor);
        `;
        const blob = new Blob([workletCode], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        await this.audioCtx.audioWorklet.addModule(url);
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioCtx, "mic-resampler-processor");

      this.workletNode.port.onmessage = (event: MessageEvent) => {
        if (!this.isCapturing) return;
        const arrayBuffer = event.data as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Chunk = btoa(binary);
        this.onAudioChunk(base64Chunk, arrayBuffer);
      };

      this.sourceNode.connect(this.workletNode);
      this.isCapturing = true;
      return true;
    } catch (err: any) {
      this.stop();
      if (this.onError) this.onError(err);
      return false;
    }
  }

  public stop() {
    this.isCapturing = false;
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  public get active(): boolean {
    return this.isCapturing;
  }
}
