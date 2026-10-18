/**
 * Gapless Web Audio PCM Player (client/src/voice/audio/player.ts)
 * Schedules 24 kHz PCM16 chunks gaplessly, exposes an AnalyserNode and RMS to the avatar,
 * and supports instant interruption (<50ms audio cut-off and mouth reset).
 */

export class AudioQueuePlayer {
  private audioCtx: AudioContext | null = null;
  public analyserNode: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private freqData: Uint8Array = new Uint8Array(128);
  public isPlaying: boolean = false;
  private onPlaybackEnded?: () => void;

  constructor(onPlaybackEnded?: () => void) {
    this.onPlaybackEnded = onPlaybackEnded;
    this.initContext();
  }

  private initContext() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx({ sampleRate: 24000 });
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.2;
      this.analyserNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn("[AudioQueuePlayer] AudioContext init deferred until user gesture:", e);
    }
  }

  public async resumeContext(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }
  }

  /**
   * Enqueues a base64-encoded 24 kHz 16-bit PCM chunk and schedules it gaplessly.
   */
  public enqueuePCMChunk(base64Data: string) {
    if (!this.audioCtx) this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    // Decode base64 to binary PCM16
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);

    // Convert to Float32 audio samples (-1.0 to 1.0)
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    if (this.analyserNode) {
      source.connect(this.analyserNode);
    } else {
      source.connect(this.audioCtx.destination);
    }

    const currentTime = this.audioCtx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.02; // Small 20ms lead buffer to avoid underrun clicks
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.isPlaying = true;
    this.activeSources.push(source);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        if (this.onPlaybackEnded) this.onPlaybackEnded();
      }
    };
  }

  /**
   * Instant interruption: immediately stops all active playback sources,
   * resets the scheduling clock, and drops the mouth to neutral.
   */
  public stopAll() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    this.isPlaying = false;
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  /**
   * Calculates real-time Root-Mean-Square (RMS) loudness for avatar lip-syncing.
   */
  public getRMS(): number {
    if (!this.analyserNode || !this.isPlaying) return 0;

    (this.analyserNode as any).getByteFrequencyData(this.freqData);
    let sum = 0;
    // Inspect vocal formant range (indices 2 to 28)
    for (let i = 2; i < 28; i++) {
      sum += this.freqData[i];
    }
    const normalized = sum / (26 * 255);
    return Math.min(1.0, normalized * 1.8);
  }
}
