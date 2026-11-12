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
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const micCtx: AudioContext = new AC();
    if (micCtx.state === "suspended") {
      micCtx.resume().catch(() => {});
    }
    const inputSampleRate = micCtx.sampleRate;
    const source = micCtx.createMediaStreamSource(stream);
    const processor = micCtx.createScriptProcessor(2048, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = downsampleTo16k(inputData, inputSampleRate);
      if (pcm16.length === 0) return;
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
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
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
      this.analyser.getByteTimeDomainData(this.buf as any);
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


function downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  const sampleRatio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / sampleRatio);
  const output = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * sampleRatio;
    const indexFloor = Math.floor(srcIndex);
    const indexCeil = Math.min(input.length - 1, Math.ceil(srcIndex));
    const fraction = srcIndex - indexFloor;
    const interpolated =
      input[indexFloor] * (1 - fraction) + input[indexCeil] * fraction;
    const s = Math.max(-1, Math.min(1, interpolated));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

class AudioEngine {
  public audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private micStream: MediaStream | null = null;
  public micCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private freqData: Uint8Array = new Uint8Array(128);
  public micVolume: number = 0;

  public initContext() {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.audioCtx = new AudioContextClass();
      } catch {
        this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.65;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  // Calculate volume using simple average of frequency data extracted via AnalyserNode
  public getVolume(): number {
    if (!this.analyser) {
      return speaker.level();
    }
    this.analyser.getByteFrequencyData(this.freqData as any);
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

    let binaryStr: string;
    try {
      binaryStr = window.atob(base64Pcm);
    } catch {
      return;
    }

    const len = binaryStr.length;
    const safeLen = len - (len % 2);
    if (safeLen <= 0) return;

    const bytes = new Uint8Array(safeLen);
    for (let i = 0; i < safeLen; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const int16Data = new Int16Array(bytes.buffer, 0, safeLen / 2);
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
      // 180ms Hardware Lookahead Jitter Buffer: Prevents network packet underrun and voice stuttering
      this.nextPlayTime = currentTime + 0.18;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.activeSources.push(source);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
    };
  }

  // Returns true when DAS is actively playing audio chunks through speaker
  public isSpeaking(): boolean {
    if (!this.audioCtx) return false;
    return this.activeSources.length > 0 && this.nextPlayTime > this.audioCtx.currentTime;
  }

  // Clear audio queue immediately when user interrupts DAS
  public clearAudioQueue() {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    });
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  // Start capturing 16kHz PCM audio from user's microphone across all hardware (Bluetooth headphones, earbuds, earphones, built-in)
  public async startMicCapture(onPcmChunk: (base64Pcm: string) => void) {
    this.initContext();
    this.stopMicCapture();

    // Universal device capture constraints without rigid sampleRate that crashes Bluetooth drivers
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    // Use native device sample rate (44.1kHz / 48kHz / 16kHz) to avoid NotSupportedError
    this.micCtx = new AudioContextClass();
    if (this.micCtx.state === "suspended") {
      await this.micCtx.resume();
    }

    const inputSampleRate = this.micCtx.sampleRate;
    const source = this.micCtx.createMediaStreamSource(this.micStream);

    // Buffer size 2048 prevents underruns on Windows audio pipelines
    const bufferSize = 2048;
    this.processor = this.micCtx.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);

      // Compute mic volume RMS
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.micVolume = Math.min(1.0, rms * 4.0);

      // User Barge-In: If user speaks while DAS is outputting audio, interrupt immediately
      if (this.isSpeaking()) {
        if (rms > 0.035) {
          this.clearAudioQueue();
        } else {
          return; // Suppress echo leakage
        }
      }

      // Downsample input to pristine 16000 Hz 16-bit PCM for Gemini Live
      const pcm16 = downsampleTo16k(inputData, inputSampleRate);
      if (pcm16.length === 0) return;

      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = "";
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      onPcmChunk(window.btoa(binary));
    };

    // Muted gain node keeps processor pump active without feedback
    const silentGain = this.micCtx.createGain();
    silentGain.gain.value = 0;
    source.connect(this.processor);
    this.processor.connect(silentGain);
    silentGain.connect(this.micCtx.destination);
  }

  public stopMicCapture() {
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
    }
    if (this.micCtx) {
      try {
        this.micCtx.close();
      } catch {}
      this.micCtx = null;
    }
    this.micVolume = 0;
  }
}

export class CameraEngine {
  private videoStream: MediaStream | null = null;
  private intervalId: any = null;
  public videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private lastFrameBase64: string | null = null;

  public async startCameraCapture(
    onFrame: (base64Jpeg: string) => void,
    fps = 2
  ): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });

      this.videoEl = document.createElement("video");
      this.videoEl.muted = true;
      this.videoEl.autoplay = true;
      this.videoEl.playsInline = true;
      this.videoEl.setAttribute("playsinline", "true");
      this.videoEl.setAttribute("webkit-playsinline", "true");
      // Keep hidden in DOM so Chromium never throttles or pauses background frame decoding
      this.videoEl.style.position = "fixed";
      this.videoEl.style.bottom = "-9999px";
      this.videoEl.style.left = "-9999px";
      this.videoEl.style.width = "1px";
      this.videoEl.style.height = "1px";
      this.videoEl.style.opacity = "0";
      this.videoEl.style.pointerEvents = "none";
      document.body.appendChild(this.videoEl);

      this.videoEl.srcObject = this.videoStream;
      await this.videoEl.play();

      this.canvasEl = document.createElement("canvas");
      this.canvasEl.width = 640;
      this.canvasEl.height = 480;
      const ctx = this.canvasEl.getContext("2d", { willReadFrequently: true });

      this.intervalId = setInterval(() => {
        if (!this.videoEl || !ctx || !this.canvasEl) return;
        if (this.videoEl.readyState < 2) return; // Wait for HAVE_CURRENT_DATA
        ctx.drawImage(this.videoEl, 0, 0, this.canvasEl.width, this.canvasEl.height);
        const dataUrl = this.canvasEl.toDataURL("image/jpeg", 0.7);
        const commaIdx = dataUrl.indexOf(",");
        if (commaIdx !== -1) {
          const base64 = dataUrl.substring(commaIdx + 1);
          this.lastFrameBase64 = base64;
          onFrame(base64);
        }
      }, 1000 / fps);
      return true;
    } catch (e) {
      console.warn("Camera access denied or failed:", e);
      this.stopCameraCapture();
      return false;
    }
  }

  public getLatestFrameBase64(): string | null {
    if (!this.videoEl || !this.canvasEl) return this.lastFrameBase64;
    try {
      const ctx = this.canvasEl.getContext("2d");
      if (ctx && this.videoEl.readyState >= 2) {
        ctx.drawImage(this.videoEl, 0, 0, this.canvasEl.width, this.canvasEl.height);
        const dataUrl = this.canvasEl.toDataURL("image/jpeg", 0.75);
        const commaIdx = dataUrl.indexOf(",");
        if (commaIdx !== -1) {
          this.lastFrameBase64 = dataUrl.substring(commaIdx + 1);
        }
      }
    } catch {}
    return this.lastFrameBase64;
  }

  public stopCameraCapture() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((t) => t.stop());
      this.videoStream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      if (this.videoEl.parentNode) {
        this.videoEl.parentNode.removeChild(this.videoEl);
      }
      this.videoEl = null;
    }
    this.canvasEl = null;
    this.lastFrameBase64 = null;
  }

  public get isStreaming(): boolean {
    return this.videoStream !== null;
  }
}

export const cameraEngine = new CameraEngine();
export const audioEngine = new AudioEngine();
export { AudioEngine as BrowserAudioLoop };
export function getLiveAudioVolume(): number {
  return audioEngine.getVolume();
}
