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


export interface MediaDeviceOption {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface MicSignalStatus {
  rms: number;
  volume: number;
  silentMs: number;
  rawFallbackUsed: boolean;
  deviceLabel: string;
}

export interface MicCaptureOptions {
  deviceId?: string;
  rawMode?: boolean;
  onSignalStatus?: (status: MicSignalStatus) => void;
  onAutoFallback?: () => void;
  onAutoDeviceSwitch?: (device: MediaDeviceOption) => void;
  shouldSuppressEcho?: () => boolean;
  onSpeechIdle?: () => void;
}

function downsampleTo16k(
  input: Float32Array,
  inputSampleRate: number,
  adaptiveGain = 1.0,
  gateOpen = true
): Int16Array {
  if (!gateOpen) {
    const outLen = Math.max(1, Math.round(input.length / (inputSampleRate / 16000)));
    return new Int16Array(outLen); // Crisp digital zero silence for instant VAD end-of-turn
  }

  if (inputSampleRate === 16000 && Math.abs(adaptiveGain - 1.0) < 0.01) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  const sampleRatio = inputSampleRate / 16000;
  const newLength = Math.max(1, Math.round(input.length / sampleRatio));
  const output = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    let val = 0;
    if (sampleRatio >= 1.25) {
      // Anti-aliased box average over source window preserves vocal consonants cleanly
      const start = Math.floor(i * sampleRatio);
      const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * sampleRatio)));
      let acc = 0;
      for (let j = start; j < end; j++) {
        acc += input[j];
      }
      val = acc / (end - start);
    } else {
      const srcIndex = i * sampleRatio;
      const indexFloor = Math.min(input.length - 1, Math.floor(srcIndex));
      const indexCeil = Math.min(input.length - 1, Math.ceil(srcIndex));
      const fraction = srcIndex - indexFloor;
      val = input[indexFloor] * (1 - fraction) + input[indexCeil] * fraction;
    }

    if (adaptiveGain > 1.01) {
      val = Math.tanh(val * adaptiveGain);
    }
    const s = Math.max(-1, Math.min(1, val));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

const MIC_WORKLET_CODE = `
class DasMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch0 = input[0];
    if (!ch0) return true;
    const numChannels = input.length;
    for (let i = 0; i < ch0.length; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += (input[ch] && input[ch][i]) || 0;
      }
      this._buffer[this._offset++] = sum / numChannels;
      if (this._offset >= this._buffer.length) {
        const copy = new Float32Array(this._buffer);
        this.port.postMessage(copy.buffer, [copy.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("das-mic-processor", DasMicProcessor);
`;

const PCM_PLAYER_WORKLET_CODE = `
class DasPcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.cap = 24000 * 30;
    this.ring = new Float32Array(this.cap);
    this.readPos = 0;
    this.writePos = 0;
    this.avail = 0;
    this.srcRate = 24000;
    this.phase = 0;
    this.buffering = true;
    this.turnStarted = false;
    this.wasActive = false;
    this.drain = false;
    this.gainEnv = 0;
    this.lastSample = 0;
    this.lastOut = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (!m) return;
      if (m.type === "clear") {
        this.readPos = 0;
        this.writePos = 0;
        this.avail = 0;
        this.phase = 0;
        this.buffering = true;
        this.turnStarted = false;
        if (this.wasActive) {
          this.wasActive = false;
          this.port.postMessage({ type: "playing", active: false });
        }
        this.drain = false;
        this.gainEnv = 0;
        this.lastSample = 0;
        this.lastOut = 0;
      } else if (m.type === "drain") {
        this.drain = true;
      } else if (m.type === "push" && m.pcm) {
        const samples = new Float32Array(m.pcm);
        if (m.rate) this.srcRate = m.rate;
        this.drain = false;
        if (!this.wasActive && samples.length > 0) {
          this.wasActive = true;
          this.port.postMessage({ type: "playing", active: true });
        }
        for (let i = 0; i < samples.length; i++) {
          if (this.avail < this.cap - 1) {
            this.ring[this.writePos] = samples[i];
            this.writePos = (this.writePos + 1) % this.cap;
            this.avail++;
          }
        }
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    const prebuffer = Math.round(this.srcRate * (this.turnStarted ? 0.025 : 0.16));
    if (this.buffering) {
      if (this.avail >= prebuffer || (this.drain && this.avail > 0)) {
        this.buffering = false;
        this.turnStarted = true;
      } else {
        if (this.drain && this.avail === 0) {
          this.drain = false;
          this.turnStarted = false;
          if (this.wasActive) {
            this.wasActive = false;
            this.port.postMessage({ type: "playing", active: false });
          }
        }
        out.fill(0);
        return true;
      }
    }
    const step = this.srcRate / sampleRate;
    for (let i = 0; i < out.length; i++) {
      if (this.avail >= 2) {
        const idx0 = (this.readPos + Math.floor(this.phase)) % this.cap;
        const idx1 = (idx0 + 1) % this.cap;
        const frac = this.phase - Math.floor(this.phase);
        const s = this.ring[idx0] + frac * (this.ring[idx1] - this.ring[idx0]);
        this.lastSample = s;
        this.gainEnv = Math.min(1, this.gainEnv + 0.035);
        this.lastOut = s * this.gainEnv;
        out[i] = this.lastOut;
        this.phase += step;
        const adv = Math.floor(this.phase);
        if (adv > 0) {
          const take = Math.min(adv, this.avail - 1);
          this.readPos = (this.readPos + take) % this.cap;
          this.avail -= take;
          this.phase -= take;
        }
      } else if (this.avail === 1) {
        const s = this.ring[this.readPos];
        this.readPos = (this.readPos + 1) % this.cap;
        this.avail = 0;
        this.phase = 0;
        this.lastSample = s;
        this.gainEnv = Math.min(1, this.gainEnv + 0.035);
        this.lastOut = s * this.gainEnv;
        out[i] = this.lastOut;
      } else {
        this.gainEnv = Math.max(0, this.gainEnv - 0.06);
        this.lastOut = this.lastSample * this.gainEnv;
        out[i] = this.lastOut;
        if (this.gainEnv <= 0.001) {
          this.lastOut = 0;
          this.lastSample = 0;
          this.buffering = true;
          if (this.drain) {
            this.drain = false;
            this.turnStarted = false;
            if (this.wasActive) {
              this.wasActive = false;
              this.port.postMessage({ type: "playing", active: false });
            }
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("das-pcm-player", DasPcmPlayer);
`;

class AudioEngine {
  public audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private playerNode: AudioWorkletNode | null = null;
  private playerBlobUrl: string | null = null;
  private playerInitPromise: Promise<void> | null = null;
  private playerReady: boolean = false;
  private playingUntilPerfMs: number = 0;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private micStream: MediaStream | null = null;
  public micCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletBlobUrl: string | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private keepaliveTimer: number | null = null;
  private freqData: Uint8Array = new Uint8Array(128);
  public micVolume: number = 0;
  public activeMicLabel: string = "";
  public selectedSpeakerId: string = "";
  private softGain: number = 1.0;
  private dcPrevX: number = 0;
  private dcPrevY: number = 0;
  private noiseFloor: number = 0.0032;
  private gateHoldMs: number = 0;
  private inUtterance: boolean = false;
  private tailSilenceSentMs: number = 0;
  private preRollChunks: string[] = [];
  private lastUiStatusAt: number = 0;
  private activeTurnMode: "worklet" | "fallback" | null = null;
  private workletPlaying: boolean = false;
  private speechOnsetFrames: number = 0;
  private typingSuppressUntilMs: number = 0;
  private zeroSignalMs: number = 0;
  private rawFallbackAttempted: boolean = false;
  private deviceFallbackAttempted: boolean = false;
  private captureToken: number = 0;

  public notifyTypingActivity(durationMs = 850) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.typingSuppressUntilMs = Math.max(this.typingSuppressUntilMs, now + durationMs);
    this.speechOnsetFrames = 0;
    if (!this.inUtterance) {
      this.gateHoldMs = 0;
      this.preRollChunks = [];
    }
  }

  private ensurePlayerWorklet() {
    if (!this.audioCtx || !this.analyser || this.playerReady || this.playerInitPromise) return;
    if (!this.audioCtx.audioWorklet || typeof Blob === "undefined") return;

    const ctx = this.audioCtx;
    const analyser = this.analyser;
    this.playerInitPromise = (async () => {
      try {
        const blob = new Blob([PCM_PLAYER_WORKLET_CODE], { type: "application/javascript" });
        this.playerBlobUrl = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(this.playerBlobUrl);
        if (this.audioCtx !== ctx || this.analyser !== analyser) return;
        const node = new AudioWorkletNode(ctx, "das-pcm-player", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        node.port.onmessage = (evt) => {
          if (evt.data?.type === "playing") {
            const active = Boolean(evt.data.active);
            this.workletPlaying = active;
            if (!active) {
              const nowP = typeof performance !== "undefined" ? performance.now() : Date.now();
              this.playingUntilPerfMs = nowP + 180;
            }
          }
        };
        node.connect(analyser);
        this.playerNode = node;
        this.playerReady = true;
      } catch (err) {
        console.warn("AudioWorklet PCM player fallback active:", err);
      }
    })();
  }

  public initContext() {
    if (this.audioCtx && this.audioCtx.state === "closed") {
      this.audioCtx = null;
      this.analyser = null;
      this.masterGain = null;
      this.playerNode = null;
      this.playerInitPromise = null;
      this.playerReady = false;
      this.activeSources = [];
      this.activeTurnMode = null;
      this.nextPlayTime = 0;
      this.playingUntilPerfMs = 0;
    }
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.audioCtx = new AudioContextClass({ latencyHint: "playback" });
      } catch {
        try {
          this.audioCtx = new AudioContextClass();
        } catch {
          this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
        }
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.65;
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 1.0;
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);
      if (this.selectedSpeakerId && typeof (this.audioCtx as any).setSinkId === "function") {
        (this.audioCtx as any).setSinkId(this.selectedSpeakerId).catch(() => {});
      }
      this.ensurePlayerWorklet();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public unlockAudio() {
    try {
      this.initContext();
      if (!this.audioCtx || !this.masterGain) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      const silentBuf = this.audioCtx.createBuffer(1, 1, this.audioCtx.sampleRate || 24000);
      const src = this.audioCtx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(this.masterGain);
      src.start(0);
    } catch {}
  }

  public async setOutputDevice(deviceId: string) {
    this.selectedSpeakerId = deviceId || "";
    this.initContext();
    if (this.audioCtx && typeof (this.audioCtx as any).setSinkId === "function") {
      try {
        await (this.audioCtx as any).setSinkId(deviceId || "");
      } catch (err) {
        console.warn("setSinkId failed:", err);
      }
    }
  }

  public async listAudioDevices(): Promise<{
    inputs: MediaDeviceOption[];
    outputs: MediaDeviceOption[];
  }> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return { inputs: [], outputs: [] };
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = all
      .filter((d) => d.kind === "audioinput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${idx + 1}`,
        kind: d.kind,
      }));
    const outputs = all
      .filter((d) => d.kind === "audiooutput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker / Headphones ${idx + 1}`,
        kind: d.kind,
      }));
    return { inputs, outputs };
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

  // Play incoming 24kHz 16-bit PCM base64 audio via continuous AudioWorklet ring buffer (zero gap/stutter!)
  public playPcmChunk(base64Pcm: string, sampleRate = 24000) {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

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

    const durMs = (float32Data.length / Math.max(8000, sampleRate)) * 1000;
    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!this.isSpeaking() && this.activeSources.length === 0) {
      this.activeTurnMode = null;
    }
    if (!this.activeTurnMode) {
      this.activeTurnMode = this.playerReady && this.playerNode ? "worklet" : "fallback";
    }

    const baseMs = Math.max(nowPerf + 160, this.playingUntilPerfMs);
    this.playingUntilPerfMs = Math.min(nowPerf + 30000, baseMs + durMs);

    if (this.activeTurnMode === "worklet" && this.playerReady && this.playerNode) {
      this.playerNode.port.postMessage(
        { type: "push", pcm: float32Data.buffer, rate: sampleRate },
        [float32Data.buffer]
      );
      return;
    }

    // Brief fallback while AudioWorklet module finishes initial registration (locked per turn to avoid overlap)
    const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    const currentTime = this.audioCtx.currentTime;
    if (this.nextPlayTime < currentTime || this.nextPlayTime > currentTime + 3.0) {
      this.nextPlayTime = currentTime + 0.04;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.activeSources.push(source);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0 && !this.isSpeaking()) {
        this.activeTurnMode = null;
      }
    };
  }

  public flushAudioPlayer() {
    if (this.playerReady && this.playerNode) {
      this.playerNode.port.postMessage({ type: "drain" });
    }
  }

  // Returns true while DAS is actively playing or draining audio (prevents mid-sentence speaker echo cuts)
  public isSpeaking(): boolean {
    if (this.workletPlaying) {
      return true;
    }
    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (nowPerf < this.playingUntilPerfMs + 420) {
      return true;
    }
    if (!this.audioCtx) return false;
    if (this.audioCtx.currentTime > this.nextPlayTime + 0.15) {
      this.activeSources = [];
      return false;
    }
    return this.activeSources.length > 0 && this.nextPlayTime > this.audioCtx.currentTime;
  }

  // Clear audio queue immediately when user genuinely interrupts DAS or starts a new turn
  public clearAudioQueue() {
    this.activeTurnMode = null;
    this.workletPlaying = false;
    if (this.playerNode) {
      try {
        this.playerNode.port.postMessage({ type: "clear" });
      } catch {}
    }
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    });
    this.activeSources = [];
    this.playingUntilPerfMs = 0;
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  private async switchAwayFromDeadMic(
    onPcmChunk: (base64Pcm: string) => void,
    options?: MicCaptureOptions
  ) {
    try {
      const { inputs } = await this.listAudioDevices();
      const currentLower = this.activeMicLabel.toLowerCase();
      const candidates = inputs.filter(
        (d) =>
          d.deviceId &&
          d.deviceId !== "default" &&
          d.deviceId !== "communications" &&
          d.deviceId !== options?.deviceId &&
          d.label.toLowerCase() !== currentLower
      );
      if (candidates.length === 0) return;

      // Prefer active Microphone Array / Bluetooth / USB over unconnected jack labels
      candidates.sort((a, b) => {
        const score = (lbl: string) => {
          const l = lbl.toLowerCase();
          if (l.includes("array") || l.includes("internal") || l.includes("realtek") && !l.includes("headset")) return 3;
          if (l.includes("hands-free") || l.includes("buds") || l.includes("airpods") || l.includes("bluetooth") || l.includes("usb")) return 2;
          return 1;
        };
        return score(b.label) - score(a.label);
      });

      const chosen = candidates[0];
      options?.onAutoDeviceSwitch?.(chosen);
      await this.startMicCapture(onPcmChunk, {
        ...options,
        deviceId: chosen.deviceId,
        rawMode: false,
      });
    } catch {}
  }

  private processCapturedFloatFrame(
    monoInput: Float32Array,
    inputSampleRate: number,
    onPcmChunk: (base64Pcm: string) => void,
    options?: MicCaptureOptions,
    token?: number
  ) {
    if (token !== undefined && token !== this.captureToken) return;

    // 1st-order DC high-pass filter strips 3.5mm jack DC offset & 50/60Hz electrical hum
    let prevX = this.dcPrevX;
    let prevY = this.dcPrevY;
    const filtered = new Float32Array(monoInput.length);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < monoInput.length; i++) {
      const x = monoInput[i];
      const y = x - prevX + 0.992 * prevY;
      prevX = x;
      prevY = y;
      filtered[i] = y;
      const ay = y < 0 ? -y : y;
      if (ay > peak) peak = ay;
      sum += y * y;
    }
    this.dcPrevX = prevX;
    this.dcPrevY = prevY;

    const rms = Math.sqrt(sum / Math.max(1, filtered.length));
    const frameMs = (filtered.length / Math.max(8000, inputSampleRate)) * 1000;

    // Detect truly dead / muted jack (digital flatline peak < 0.00004) vs quiet active mic
    if (peak < 0.00004) {
      this.zeroSignalMs += frameMs;
    } else {
      this.zeroSignalMs = 0;
    }

    // Bi-directional adaptive ambient noise floor (prevents laptop fan / AC hum locking the gate open)
    if (rms > 0.0001) {
      if (rms < this.noiseFloor) {
        this.noiseFloor = Math.max(0.001, this.noiseFloor * 0.88 + rms * 0.12);
      } else if (rms < 0.032 && this.gateHoldMs <= 0) {
        this.noiseFloor = Math.min(0.022, this.noiseFloor * 0.992 + rms * 0.008);
      }
    }
    const speechThreshold = Math.max(0.008, this.noiseFloor * 2.5);
    if (rms >= speechThreshold) {
      this.speechOnsetFrames = Math.min(10, this.speechOnsetFrames + 1);
      if (this.inUtterance || this.speechOnsetFrames >= 2) {
        this.gateHoldMs = 520;
      }
    } else {
      this.speechOnsetFrames = 0;
      if (this.gateHoldMs > 0) {
        this.gateHoldMs = Math.max(0, this.gateHoldMs - frameMs);
      }
    }
    const gateOpen = this.gateHoldMs > 0;

    // Mild adaptive speech boost ONLY when gate is open (never boost background noise!)
    if (gateOpen && rms >= speechThreshold && rms < 0.09) {
      const targetGain = Math.min(2.4, 0.09 / Math.max(rms, 0.008));
      this.softGain = this.softGain * 0.72 + targetGain * 0.28;
    } else if (rms >= 0.09) {
      this.softGain = this.softGain * 0.7 + 1.0 * 0.3;
    } else {
      this.softGain = this.softGain * 0.9 + 1.0 * 0.1;
    }

    const meterLevel = gateOpen
      ? Math.min(1.0, rms * this.softGain * 6.5)
      : Math.min(0.14, rms * 4.0);
    this.micVolume = Math.max(meterLevel, this.micVolume * 0.65);

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (options?.onSignalStatus && now - this.lastUiStatusAt >= 120) {
      this.lastUiStatusAt = now;
      options.onSignalStatus({
        rms,
        volume: this.micVolume,
        silentMs: this.zeroSignalMs,
        rawFallbackUsed: this.rawFallbackAttempted,
        deviceLabel: this.activeMicLabel,
      });
    }

    // If selected headset jack / default device has 0.0000 digital flatline for 2.5s, switch to active hardware mic
    if (this.zeroSignalMs > 2500 && !this.deviceFallbackAttempted) {
      this.deviceFallbackAttempted = true;
      this.switchAwayFromDeadMic(onPcmChunk, options);
      return;
    }

    // Ironclad Echo & Keyboard-Click Shield: never self-clear active audio or trigger phantom turns on speaker echo or keystrokes
    const echoActive = this.isSpeaking() || (options?.shouldSuppressEcho?.() ?? false);
    const typingSuppressed = now < this.typingSuppressUntilMs && !this.inUtterance;
    if (echoActive || typingSuppressed) {
      this.speechOnsetFrames = 0;
      this.gateHoldMs = 0;
      this.inUtterance = false;
      this.tailSilenceSentMs = 0;
      this.preRollChunks = [];
      return;
    }

    const pcm16 = downsampleTo16k(filtered, inputSampleRate, this.softGain, gateOpen);
    if (pcm16.length === 0) return;

    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = "";
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = window.btoa(binary);

    if (gateOpen) {
      // Flush short pre-roll ring when speech begins so initial consonants are crystal clear
      if (!this.inUtterance) {
        this.inUtterance = true;
        this.tailSilenceSentMs = 0;
        for (const pre of this.preRollChunks) {
          onPcmChunk(pre);
        }
        this.preRollChunks = [];
      }
      this.tailSilenceSentMs = 0;
      onPcmChunk(b64);
    } else if (this.inUtterance) {
      // Stream 720ms of clean digital zeroes so Gemini VAD ends turn reliably, then stop flooding idle traffic
      this.tailSilenceSentMs += frameMs;
      onPcmChunk(b64);
      if (this.tailSilenceSentMs >= 720) {
        this.inUtterance = false;
        this.tailSilenceSentMs = 0;
        options?.onSpeechIdle?.();
      }
    } else {
      this.preRollChunks.push(b64);
      if (this.preRollChunks.length > 3) {
        this.preRollChunks.shift();
      }
    }
  }

  // Start capturing 16kHz PCM audio across all hardware (Bluetooth buds, headphones, earphones, built-in mic)
  public async startMicCapture(
    onPcmChunk: (base64Pcm: string) => void,
    options?: MicCaptureOptions
  ) {
    this.stopMicCapture();
    const token = ++this.captureToken;
    this.zeroSignalMs = 0;
    this.softGain = 1.0;
    this.dcPrevX = 0;
    this.dcPrevY = 0;
    this.noiseFloor = 0.0032;
    this.gateHoldMs = 0;
    this.inUtterance = false;
    this.tailSilenceSentMs = 0;
    this.preRollChunks = [];
    this.lastUiStatusAt = 0;
    this.speechOnsetFrames = 0;
    this.rawFallbackAttempted = Boolean(options?.rawMode);
    if (!options?.deviceId) {
      this.deviceFallbackAttempted = false;
    }

    const raw = Boolean(options?.rawMode);
    const devConstraint = options?.deviceId
      ? { deviceId: { ideal: options.deviceId } }
      : {};

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...devConstraint,
          echoCancellation: !raw,
          noiseSuppression: !raw,
          autoGainControl: !raw,
          channelCount: { ideal: 1 },
        },
      });
    } catch {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: options?.deviceId ? { deviceId: { ideal: options.deviceId } } : true,
        });
      } catch {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    }

    // Re-init playback context AFTER Bluetooth HFP/microphone acquisition so output routing stays active
    this.initContext();
    if (this.audioCtx?.state === "suspended") {
      await this.audioCtx.resume().catch(() => {});
    }

    const tracks = this.micStream.getAudioTracks();
    this.activeMicLabel = tracks[0]?.label || "Default Microphone";
    if (tracks[0]) {
      tracks[0].onended = () => {
        if (this.captureToken === token && this.micStream) {
          this.startMicCapture(onPcmChunk, {
            ...options,
            deviceId: undefined,
          }).catch(() => {});
        }
      };
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.micCtx = new AudioContextClass({ latencyHint: "interactive" });
    if (this.micCtx.state === "suspended") {
      await this.micCtx.resume();
    }

    const inputSampleRate = this.micCtx.sampleRate;
    const source = this.micCtx.createMediaStreamSource(this.micStream);
    this.micSource = source;

    // Watchdog keeps both mic and speaker contexts awake across Windows BT/headset transitions
    this.keepaliveTimer = window.setInterval(() => {
      if (this.micCtx && this.micCtx.state === "suspended") {
        this.micCtx.resume().catch(() => {});
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
    }, 1200);

    // Primary path: AudioWorkletNode (modern, zero deprecation/culling across Chromium)
    let workletReady = false;
    if (this.micCtx.audioWorklet && typeof Blob !== "undefined") {
      try {
        const blob = new Blob([MIC_WORKLET_CODE], { type: "application/javascript" });
        this.workletBlobUrl = URL.createObjectURL(blob);
        await this.micCtx.audioWorklet.addModule(this.workletBlobUrl);
        if (this.captureToken !== token || !this.micCtx) return;

        this.workletNode = new AudioWorkletNode(this.micCtx, "das-mic-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 2,
          channelCountMode: "explicit",
        });
        this.workletNode.port.onmessage = (evt) => {
          const mono = new Float32Array(evt.data);
          this.processCapturedFloatFrame(mono, inputSampleRate, onPcmChunk, options, token);
        };
        const ultraLowGain = this.micCtx.createGain();
        ultraLowGain.gain.value = 0.00001;
        source.connect(this.workletNode);
        this.workletNode.connect(ultraLowGain);
        ultraLowGain.connect(this.micCtx.destination);
        workletReady = true;
      } catch (err) {
        console.warn("AudioWorklet fallback to ScriptProcessor:", err);
      }
    }

    if (!workletReady) {
      const bufferSize = 2048;
      this.processor = this.micCtx.createScriptProcessor(bufferSize, 2, 1);
      this.processor.onaudioprocess = (event) => {
        const buf = event.inputBuffer;
        const ch0 = buf.getChannelData(0);
        const mono = new Float32Array(ch0.length);
        const channels = Math.max(1, buf.numberOfChannels);
        for (let i = 0; i < ch0.length; i++) {
          let sum = 0;
          for (let ch = 0; ch < channels; ch++) {
            sum += buf.getChannelData(ch)[i] || 0;
          }
          mono[i] = sum / channels;
        }
        this.processCapturedFloatFrame(mono, inputSampleRate, onPcmChunk, options, token);
      };
      const ultraLowGain = this.micCtx.createGain();
      ultraLowGain.gain.value = 0.00001;
      source.connect(this.processor);
      this.processor.connect(ultraLowGain);
      ultraLowGain.connect(this.micCtx.destination);
    }
  }

  public stopMicCapture() {
    this.captureToken++;
    if (this.keepaliveTimer !== null) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }
    if (this.workletBlobUrl) {
      try {
        URL.revokeObjectURL(this.workletBlobUrl);
      } catch {}
      this.workletBlobUrl = null;
    }
    if (this.processor) {
      try {
        this.processor.onaudioprocess = null;
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
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
    this.activeMicLabel = "";
  }
}

export class CameraEngine {
  private videoStream: MediaStream | null = null;
  private intervalId: any = null;
  public videoEl: HTMLVideoElement | null = null;
  private ownedVideoEl: boolean = false;
  private canvasEl: HTMLCanvasElement | null = null;
  private lumaCanvas: HTMLCanvasElement | null = null;
  private prevLuma: Uint8Array | null = null;
  private baselineLuma: Uint8Array | null = null;
  private firstFrameNotified: boolean = false;
  private settleCount: number = 0;
  private lastAnnounceAt: number = 0;
  private lastFrameBase64: string | null = null;
  public activeResolution: string = "";

  public async listVideoDevices(): Promise<MediaDeviceOption[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    return all
      .filter((d) => d.kind === "videoinput")
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${idx + 1}`,
        kind: d.kind,
      }));
  }

  public attachPreviewElement(previewEl: HTMLVideoElement | null) {
    if (!previewEl || !this.videoStream) return;
    if (previewEl.srcObject !== this.videoStream) {
      previewEl.muted = true;
      previewEl.autoplay = true;
      previewEl.playsInline = true;
      previewEl.srcObject = this.videoStream;
      previewEl.play().catch(() => {});
    }
    if (this.ownedVideoEl && this.videoEl && this.videoEl !== previewEl) {
      if (this.videoEl.parentNode) this.videoEl.parentNode.removeChild(this.videoEl);
      this.ownedVideoEl = false;
    }
    this.videoEl = previewEl;
  }

  private sampleLumaGrid(): { grid: Uint8Array; mean: number } | null {
    if (!this.videoEl || this.videoEl.readyState < 2) return null;
    if (!this.lumaCanvas) {
      this.lumaCanvas = document.createElement("canvas");
      this.lumaCanvas.width = 24;
      this.lumaCanvas.height = 18;
    }
    const lctx = this.lumaCanvas.getContext("2d", { willReadFrequently: true });
    if (!lctx) return null;
    lctx.drawImage(this.videoEl, 0, 0, 24, 18);
    const data = lctx.getImageData(0, 0, 24, 18).data;
    const grid = new Uint8Array(24 * 18);
    let total = 0;
    for (let i = 0, p = 0; i < grid.length; i++, p += 4) {
      const y = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
      grid[i] = y;
      total += y;
    }
    return { grid, mean: total / grid.length };
  }

  private gridDiff(a: Uint8Array | null, b: Uint8Array): number {
    if (!a || a.length !== b.length) return 1.0;
    let diff = 0;
    for (let i = 0; i < b.length; i++) {
      diff += Math.abs(a[i] - b[i]);
    }
    return diff / (b.length * 255);
  }

  public resetMonitorBaseline() {
    const sample = this.sampleLumaGrid();
    if (sample) {
      this.baselineLuma = sample.grid;
      this.prevLuma = sample.grid;
    }
    this.settleCount = 0;
    this.lastAnnounceAt = Date.now();
  }

  private captureCanvasFrame(quality: number, maxWidth = 640): string | null {
    if (!this.videoEl || !this.canvasEl) return this.lastFrameBase64;
    if (this.videoEl.readyState < 2) return this.lastFrameBase64;
    const vw = this.videoEl.videoWidth || 1280;
    const vh = this.videoEl.videoHeight || 720;
    const scale = vw > maxWidth ? maxWidth / vw : 1;
    const cw = Math.max(320, Math.round(vw * scale));
    const ch = Math.max(240, Math.round(vh * scale));
    if (this.canvasEl.width !== cw || this.canvasEl.height !== ch) {
      this.canvasEl.width = cw;
      this.canvasEl.height = ch;
    }
    this.activeResolution = `${vw}x${vh}`;
    const ctx = this.canvasEl.getContext("2d");
    if (!ctx) return this.lastFrameBase64;
    ctx.drawImage(this.videoEl, 0, 0, cw, ch);
    const dataUrl = this.canvasEl.toDataURL("image/jpeg", quality);
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx !== -1) {
      const b64 = dataUrl.substring(commaIdx + 1);
      this.lastFrameBase64 = b64;
      return b64;
    }
    return this.lastFrameBase64;
  }

  public async startCameraCapture(
    onFrame: (base64Jpeg: string) => void,
    fps = 1.0,
    options?: {
      previewEl?: HTMLVideoElement | null;
      deviceId?: string;
      onFirstFrame?: () => void;
      onSceneChanged?: (base64Jpeg: string) => void;
      shouldPauseMonitor?: () => boolean;
    }
  ): Promise<boolean> {
    try {
      this.stopCameraCapture();
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 360 },
        frameRate: { ideal: 15, max: 30 },
        ...(options?.deviceId
          ? { deviceId: { ideal: options.deviceId } }
          : { facingMode: "user" }),
      };

      try {
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      } catch {
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (options?.previewEl) {
        this.videoEl = options.previewEl;
        this.ownedVideoEl = false;
      } else {
        this.videoEl = document.createElement("video");
        this.ownedVideoEl = true;
        this.videoEl.style.position = "fixed";
        this.videoEl.style.bottom = "4px";
        this.videoEl.style.left = "4px";
        this.videoEl.style.width = "160px";
        this.videoEl.style.height = "90px";
        this.videoEl.style.opacity = "0.01";
        this.videoEl.style.pointerEvents = "none";
        this.videoEl.style.zIndex = "0";
        document.body.appendChild(this.videoEl);
      }

      this.videoEl.muted = true;
      this.videoEl.autoplay = true;
      this.videoEl.playsInline = true;
      this.videoEl.setAttribute("playsinline", "true");
      this.videoEl.setAttribute("webkit-playsinline", "true");
      this.videoEl.srcObject = this.videoStream;

      await new Promise<void>((resolve) => {
        if (!this.videoEl) return resolve();
        if (this.videoEl.readyState >= 1) return resolve();
        const timer = window.setTimeout(resolve, 1500);
        this.videoEl.onloadedmetadata = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      await this.videoEl.play().catch(() => {});

      this.canvasEl = document.createElement("canvas");
      this.canvasEl.width = 720;
      this.canvasEl.height = 405;
      this.firstFrameNotified = false;
      this.prevLuma = null;
      this.baselineLuma = null;
      this.settleCount = 0;
      this.lastAnnounceAt = Date.now();

      const pushFrame = () => {
        const b64 = this.captureCanvasFrame(0.70, 640);
        if (!b64) return;
        onFrame(b64);

        const luma = this.sampleLumaGrid();
        if (!luma || luma.mean < 6) return;

        if (!this.firstFrameNotified) {
          this.firstFrameNotified = true;
          this.baselineLuma = luma.grid;
          this.prevLuma = luma.grid;
          this.lastAnnounceAt = Date.now();
          options?.onFirstFrame?.();
          return;
        }

        const frameDiff = this.gridDiff(this.prevLuma, luma.grid);
        const sceneDelta = this.gridDiff(this.baselineLuma, luma.grid);
        this.prevLuma = luma.grid;

        const now = Date.now();
        const cooledDown = now - this.lastAnnounceAt >= 6000;
        const paused = options?.shouldPauseMonitor?.() ?? false;
        if (!cooledDown || paused) {
          this.settleCount = 0;
          return;
        }

        if (sceneDelta >= 0.062 && frameDiff <= 0.045) {
          this.settleCount += 1;
          if (this.settleCount >= 2) {
            this.baselineLuma = luma.grid;
            this.settleCount = 0;
            this.lastAnnounceAt = now;
            const hdB64 = this.captureCanvasFrame(0.82, 720) || b64;
            options?.onSceneChanged?.(hdB64);
          }
        } else {
          this.settleCount = 0;
        }
      };

      window.setTimeout(pushFrame, 180);
      this.intervalId = setInterval(pushFrame, Math.round(1000 / Math.max(0.5, fps)));
      return true;
    } catch (e) {
      console.warn("Camera access denied or failed:", e);
      this.stopCameraCapture();
      return false;
    }
  }

  public getLatestFrameBase64(): string | null {
    try {
      return this.captureCanvasFrame(0.82, 720);
    } catch {
      return this.lastFrameBase64;
    }
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
      if (this.ownedVideoEl && this.videoEl.parentNode) {
        this.videoEl.parentNode.removeChild(this.videoEl);
      }
      this.videoEl = null;
      this.ownedVideoEl = false;
    }
    this.canvasEl = null;
    this.lumaCanvas = null;
    this.prevLuma = null;
    this.baselineLuma = null;
    this.firstFrameNotified = false;
    this.settleCount = 0;
    this.lastFrameBase64 = null;
    this.activeResolution = "";
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
