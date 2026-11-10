/**
 * audioIO.ts - Unified Gemini Voice Audio I/O & 3D Lip-Sync Analyser
 * - Gapless sample-accurate 24kHz PCM playback for Gemini Live native audio chunks (`playAudioChunk`).
 * - High-clarity natural neural voice synthesis with Puck/Charon resonance profile for spoken replies (`say`).
 * - Real-time 16kHz PCM microphone capture (`startLiveMicStream`) for Gemini Live (`sendRealtimeInput`).
 * - Web Audio API AnalyserNode (`speaker.level()`) so the 3D Avatar mouth moves at 60 FPS in sync with speech.
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
  private oscNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
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
  private simInterval: any = null;

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
        this.ctxRef.resume().catch(() => { });
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
      this.analyser.smoothingTimeConstant = 0.4;
      this.analyser.connect(this.ctxRef.destination);
      this.initialized = true;
    } catch {
      try {
        this.ctxRef = new AC();
        this.analyser = this.ctxRef.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.4;
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
      } catch { }
    }
  }

  /**
   * Resilient Neural Voice Synthesizer & Speech Player:
   * - Speaks aloud instantly with authoritative natural male voice profile.
   * - Integrates directly with Web Audio API for real-time 60 FPS 3D Avatar lip sync.
   */
  say(raw: string) {
    if (typeof window === "undefined") return;

    // Strict Pure Puck Voice Mode: Cancel and prevent any browser default robotic voices
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    const beforeDetails = raw.split("|||")[0] || "";
    const text = beforeDetails
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/[*_#`>|~]/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;

    // Stop any existing playback
    this.stop();

    // Exclusively route to Gemini Live WebSocket for 24kHz Puck Voice synthesis
    try {
      const socket = (window as any).dasSocket;
      if (socket && typeof socket.sendTextCommand === "function") {
        socket.sendTextCommand(text);
      }
    } catch (err) {
      console.warn("[Speaker] Puck Voice WebSocket dispatch notice:", err);
    }
  }

  private startLipSyncSimulation() {
    this.stopLipSyncSimulation();
    let tick = 0;
    this.simInterval = setInterval(() => {
      tick++;
      // Natural speech rhythm with syllable cadence around 128 baseline
      const wave = Math.abs(Math.sin(tick * 0.38) * Math.cos(tick * 0.19));
      const simulatedVal = Math.floor(128 + wave * 75);
      for (let i = 0; i < 64; i++) {
        this.buf[i] = simulatedVal;
      }
    }, 40);
  }

  private stopLipSyncSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.buf.fill(0);
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
      } catch { }
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
      try {
        source.start();
      } catch {
        this.scheduledPcmSources.delete(source);
      }
    }
  }

  get isSpeaking(): boolean {
    return this.activeSpeaking || this.scheduledPcmSources.size > 0;
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
      } catch { }
      stream.getTracks().forEach((t) => t.stop());
      micCtx.close().catch(() => { });
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
      } catch { }
    });
    this.scheduledPcmSources.clear();
    try {
      this.currentSource?.stop();
    } catch { }
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
    } else if (this.activeSpeaking) {
      let sum = 0;
      const len = Math.min(this.buf.length, 64);
      for (let i = 0; i < len; i++) {
        const x = (this.buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / len);
      if (rms > 0.01) return Math.min(0.45, rms * 1.5);
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
  r.onerror = () => { };
  r.start();
  return () => r.stop();
}

export const speaker = new Speaker(
  () =>
    localStorage.getItem("pathfinder_token") ||
    sessionStorage.getItem("pathfinder_token")
);
export const audioManager = speaker;


class AudioEngine {
  public audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private freqData: Uint8Array = new Uint8Array(128);

  public initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.65;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Calculate volume using simple average of frequency data extracted via AnalyserNode
  public getVolume(): number {
    if (!this.analyser) {
      return speaker.level();
    }
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    const bins = 48; // Vocal frequency spectrum
    for (let i = 0; i < bins; i++) {
      sum += this.freqData[i];
    }
    const avg = sum / bins;
    return Math.min(1.0, Math.max(0.0, (avg - 6) / 100.0));
  }

  // Play incoming 24kHz 16-bit PCM base64 audio from Gemini Live & route through AnalyserNode for Lip-Sync
  public playPcmChunk(base64Pcm: string, sampleRate = 24000) {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    const binaryStr = window.atob(base64Pcm);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    const currentTime = this.audioCtx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.02;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  // Start capturing 16kHz PCM audio from user's microphone
  public async startMicCapture(onPcmChunk: (base64Pcm: string) => void) {
    this.initContext();
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const micCtx = new AudioContext({ sampleRate: 16000 });
    const source = micCtx.createMediaStreamSource(this.micStream);
    this.processor = micCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
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
      onPcmChunk(window.btoa(binary));
    };

    source.connect(this.processor);
    this.processor.connect(micCtx.destination);
  }

  public stopMicCapture() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }
}

export const audioEngine = new AudioEngine();
export function getLiveAudioVolume(): number {
  return audioEngine.getVolume();
}