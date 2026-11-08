/**
 * audioIO.ts - Unified Gemini Live Audio I/O & 3D Lip-Sync Analyser
 * - Gapless sample-accurate 24kHz PCM playback for Gemini Live native audio chunks (`playAudioChunk`).
 * - Real-time 16kHz PCM microphone capture (`startLiveMicStream`) for Gemini Live (`sendRealtimeInput`).
 * - Web Audio API AnalyserNode (`speaker.level()`) so the 3D Avatar mouth moves in real time with Gemini's voice.
 */

// Disable browser robotic speechSynthesis fallback completely
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.cancel();
    delete (window as any).speechSynthesis;
  } catch {}
}

/**
 * Legacy compatibility helper (returns null so callers use Gemini Live native PCM stream).
 */
export async function fetchDeepgramMp3(
  _text: string,
  _token?: string | null
): Promise<ArrayBuffer | null> {
  return null;
}

export class Speaker {
  private ctxRef: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private gen = 0;
  private pending = 0;
  private currentSource?: AudioBufferSourceNode;
  private scheduledPcmSources: Set<AudioBufferSourceNode> = new Set();
  private nextPcmTime = 0;
  private buf = new Uint8Array(512);
  onState?: (speaking: boolean) => void;
  private initialized = false;
  private activeSpeaking = false;
  private pendingGreetingText: string | null = null;

  constructor(
    private getToken: () => string | null = () => null,
    onState?: (speaking: boolean) => void
  ) {
    void this.getToken;
    if (onState) this.onState = onState;
    this.installAutoplayUnlock();
  }

  private installAutoplayUnlock() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      if (this.ctxRef && this.ctxRef.state === "suspended") {
        this.ctxRef.resume().catch(() => {});
      }
      if (this.pendingGreetingText && !this.activeSpeaking) {
        const textToSpeak = this.pendingGreetingText;
        this.pendingGreetingText = null;
        this.say(textToSpeak);
      }
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (this.initialized && this.ctxRef) return this.ctxRef;
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctxRef = new AC({ sampleRate: 24000 });
      this.analyser = this.ctxRef.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.5;
      this.analyser.connect(this.ctxRef.destination);
      this.initialized = true;
    } catch {
      try {
        this.ctxRef = new AC();
        this.analyser = this.ctxRef.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.connect(this.ctxRef.destination);
        this.initialized = true;
      } catch {
        this.ctxRef = null;
      }
    }
    return this.ctxRef;
  }

  private async resumeContext() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // Browser autoplay policy until first user interaction
      }
    }
  }

  /**
   * Speaks text aloud through the Unified Gemini Live WebSocket session.
   */
  say(raw: string) {
    const beforeDetails = raw.split("|||")[0] || "";
    const text = beforeDetails
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/[*_#`>|~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;

    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      this.pendingGreetingText = text;
      ctx.resume().catch(() => {});
    }

    import("./geminiLive")
      .then(({ geminiLive }) => {
        geminiLive.speakText(text);
      })
      .catch(() => {});
  }

  streamChunk(chunkText: string) {
    this.say(chunkText);
  }

  /**
   * Gapless sample-accurate 24kHz PCM linear audio streamer for Gemini Live WebSocket chunks.
   */
  async playAudioChunk(base64Pcm: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {}
    }

    let binary: string;
    try {
      binary = window.atob(base64Pcm);
    } catch {
      return;
    }
    const byteLen = binary.length - (binary.length % 2);
    if (byteLen <= 0) return;

    const bytes = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (this.analyser) {
      source.connect(this.analyser);
    } else {
      source.connect(ctx.destination);
    }

    const now = ctx.currentTime;
    if (this.nextPcmTime < now) {
      this.nextPcmTime = now + 0.015;
    }
    const startAt = this.nextPcmTime;
    this.nextPcmTime += buffer.duration;

    this.scheduledPcmSources.add(source);
    this.currentSource = source;
    if (!this.activeSpeaking) {
      this.activeSpeaking = true;
      this.onState?.(true);
    }

    source.onended = () => {
      this.scheduledPcmSources.delete(source);
      if (this.currentSource === source) {
        this.currentSource =
          this.scheduledPcmSources.size > 0
            ? Array.from(this.scheduledPcmSources)[0]
            : undefined;
      }
      if (this.scheduledPcmSources.size === 0 && this.pending === 0) {
        this.activeSpeaking = false;
        this.onState?.(false);
      }
    };

    try {
      source.start(startAt);
    } catch {
      this.scheduledPcmSources.delete(source);
    }
  }

  /**
   * Captures 16kHz 16-bit mono PCM audio from the user's microphone for Gemini Live WebSocket.
   */
  async startLiveMicStream(
    onPcmBase64: (base64Pcm16k: string) => void
  ): Promise<(() => void) | null> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return null;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const micCtx: AudioContext = new AC({ sampleRate: 16000 });
    const source = micCtx.createMediaStreamSource(stream);
    const processor = micCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = "";
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      onPcmBase64(window.btoa(binary));
    };

    source.connect(processor);
    processor.connect(micCtx.destination);

    return () => {
      try {
        processor.disconnect();
        source.disconnect();
      } catch {}
      stream.getTracks().forEach((t) => t.stop());
      micCtx.close().catch(() => {});
    };
  }

  stop() {
    this.gen++;
    this.nextPcmTime = 0;
    this.pendingGreetingText = null;
    this.scheduledPcmSources.forEach((s) => {
      try {
        s.onended = null;
        s.stop();
      } catch {}
    });
    this.scheduledPcmSources.clear();
    try {
      this.currentSource?.stop();
    } catch {}
    this.currentSource = undefined;
    this.pending = 0;
    this.activeSpeaking = false;
    this.onState?.(false);
  }

  level(): number {
    if (
      this.analyser &&
      (this.currentSource || this.scheduledPcmSources.size > 0)
    ) {
      this.analyser.getByteTimeDomainData(this.buf);
      let sum = 0;
      const len = this.buf.length;
      for (let i = 0; i < len; i++) {
        const x = (this.buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / len);
      if (rms > 0.015) return Math.min(0.48, rms * 1.8);
    }
    return 0;
  }

  clearPlaybackQueue(): void {
    this.stop();
  }

  async initContext(): Promise<AudioContext | null> {
    await this.resumeContext();
    return this.ctxRef ?? null;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

export function startListening(
  lang: string,
  onInterim: (t: string) => void,
  onFinal: (t: string) => void,
  onEnd: () => void
): (() => void) | null {
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  let finalText = "";
  r.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    onInterim(finalText + interim);
  };
  r.onend = () => {
    onEnd();
    if (finalText.trim()) onFinal(finalText.trim());
  };
  r.onerror = () => {};
  r.start();
  return () => r.stop();
}

export const speaker = new Speaker(
  () =>
    localStorage.getItem("pathfinder_token") ||
    sessionStorage.getItem("pathfinder_token")
);
export const audioManager = speaker;
