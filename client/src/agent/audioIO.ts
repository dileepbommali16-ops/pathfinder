/**
 * audioIO.ts - Unified Gemini Voice Audio I/O & 3D Lip-Sync Analyser
 * - Gapless sample-accurate 24kHz PCM playback for Gemini Live native audio chunks (`playAudioChunk`).
 * - High-clarity natural neural voice synthesis with Puck/Charon resonance profile for spoken replies (`say`).
 * - Real-time 16kHz PCM microphone capture (`startLiveMicStream`) for Gemini Live (`sendRealtimeInput`).
 * - Web Audio API AnalyserNode (`speaker.level()`) so the 3D Avatar mouth moves at 60 FPS in sync with speech.
 */

import {
  analyzeAcousticFrame,
  buildVisemeTimeline,
  type VisemeTimeline,
  type VisemeWeights,
} from "./viseme";

export async function fetchDeepgramMp3(
  _text: string,
  _token?: string | null
): Promise<ArrayBuffer | null> {
  return null;
}

let clearAudioEngineHook: (() => void) | null = null;
let audioEngineSpeakingHook: (() => boolean) | null = null;

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
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private deferSpeakTimer: number | null = null;
  private simTimeline: VisemeTimeline | null = null;
  private simStartMs = 0;
  private simEstDurationMs = 0;
  private boundaryCharIndex = -1;
  private boundaryAtMs = 0;
  private synthWatchTimer: number | null = null;

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
      this.analyser.smoothingTimeConstant = 0.24;
      this.analyser.connect(this.ctxRef.destination);
      this.initialized = true;
    } catch {
      try {
        this.ctxRef = new AC();
        this.analyser = this.ctxRef.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.24;
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
   * Strict Pure Puck Voice Synthesizer & Speech Player:
   * - Routes ALL spoken utterances exclusively through Gemini Puck 24kHz PCM (/api/voice/tts -> Gemini Live Puck).
   * - Strictly disables browser window.speechSynthesis so female or robotic OS voices NEVER play.
   */
  say(raw: string) {
    if (typeof window === "undefined") return;

    // Strict Pure Puck Voice Mode: Cancel and prevent any browser default female/robotic OS voices
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

    this.stop(true);
    const apiBase =
      (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_BACKEND_URL ||
      "https://pathfinder-backend-sg.onrender.com";
    void audioEngine.speakTextPuckOrLocal(text, apiBase);
  }

  private startSynthWatchdog(runGen: number) {
    if (this.synthWatchTimer !== null) {
      window.clearInterval(this.synthWatchTimer);
      this.synthWatchTimer = null;
    }
    const launchedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.synthWatchTimer = window.setInterval(() => {
      if (this.gen !== runGen) {
        if (this.synthWatchTimer !== null) {
          window.clearInterval(this.synthWatchTimer);
          this.synthWatchTimer = null;
        }
        return;
      }
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const synthBusy =
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        Boolean(window.speechSynthesis.speaking || window.speechSynthesis.pending);

      // Sync activeSpeaking if browser began speaking without firing onstart
      if (!this.activeSpeaking && synthBusy && window.speechSynthesis.speaking) {
        this.simStartMs = now;
        this.activeSpeaking = true;
        this.onState?.(true);
        this.startLipSyncSimulation();
      }

      // Auto-clear if Chrome dropped onend/onerror or blocked autoplay after 1.5s grace
      const pastGrace = now - launchedAt > 900;
      const pastMax = now - launchedAt > this.simEstDurationMs + 3000;
      if ((pastGrace && !synthBusy) || pastMax) {
        this.activeSpeaking = false;
        this.activeUtterance = null;
        this.onState?.(false);
        this.stopLipSyncSimulation();
      }
    }, 120);
  }

  private startLipSyncSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.simInterval = setInterval(() => {
      const sample = this.getSpeechViseme();
      const amp = sample ? Math.min(1, sample.volume) : 0;
      const simulatedVal = Math.floor(128 + amp * 76);
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
    if (this.synthWatchTimer !== null) {
      window.clearInterval(this.synthWatchTimer);
      this.synthWatchTimer = null;
    }
    this.simTimeline = null;
    this.boundaryCharIndex = -1;
    this.buf.fill(0);
  }

  getSpeechViseme(): { weights: VisemeWeights; volume: number } | null {
    if (!this.activeSpeaking || !this.simTimeline) return null;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    let weights: VisemeWeights;
    if (this.boundaryCharIndex >= 0) {
      const subProgress = Math.max(0, Math.min(0.95, (now - this.boundaryAtMs) / 260));
      weights = this.simTimeline.sampleAtCharIndex(this.boundaryCharIndex, subProgress);
    } else {
      const frac = Math.max(0, Math.min(1, (now - this.simStartMs) / Math.max(400, this.simEstDurationMs)));
      weights = this.simTimeline.sampleAtFraction(frac);
    }
    const openEnergy = Math.min(1, Math.max(0, weights.jawOpen * 1.45 + weights.upperUp * 0.65 + weights.stretch * 0.25));
    return { weights, volume: openEnergy };
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
    return (
      this.activeSpeaking ||
      this.scheduledPcmSources.size > 0 ||
      Boolean(audioEngineSpeakingHook?.())
    );
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

  stop(clearSharedEngine = true) {
    this.gen++;
    if (clearSharedEngine) {
      clearAudioEngineHook?.();
    }
    if (this.deferSpeakTimer !== null) {
      window.clearTimeout(this.deferSpeakTimer);
      this.deferSpeakTimer = null;
    }
    this.activeUtterance = null;
    this.nextPcmTime = 0;
    this.pendingGreetingText = null;
    this.stopLipSyncSimulation();
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

export interface VoiceHealthAlert {
  issue: "low_volume" | "dead_accessory_mic";
  deviceLabel: string;
  volumePercent: number;
}

export interface MicCaptureOptions {
  deviceId?: string;
  rawMode?: boolean;
  onSignalStatus?: (status: MicSignalStatus) => void;
  onAutoFallback?: () => void;
  onAutoDeviceSwitch?: (device: MediaDeviceOption) => void;
  onVoiceHealthAlert?: (alert: VoiceHealthAlert) => void;
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
    this.cap = 24000 * 60;
    this.ring = new Float32Array(this.cap);
    this.readPos = 0;
    this.writePos = 0;
    this.avail = 0;
    this.srcRate = 24000;
    this.phase = 0;
    this.buffering = true;
    this.turnStarted = false;
    this.waitFrames = 0;
    this.wasActive = false;
    this.drain = false;
    this.gainEnv = 0;
    this.lastOut = 0;
    this.idleEmptySamples = 0;
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
        this.waitFrames = 0;
        this.drain = false;
        this.gainEnv = 0;
        this.lastOut = 0;
        this.idleEmptySamples = 0;
        if (this.wasActive) {
          this.wasActive = false;
          this.port.postMessage({ type: "playing", active: false });
        }
      } else if (m.type === "drain") {
        this.drain = true;
      } else if (m.type === "push" && m.pcm) {
        const samples = new Float32Array(m.pcm);
        if (m.rate) this.srcRate = m.rate;
        this.drain = false;
        if (samples.length > 0) {
          this.idleEmptySamples = 0;
          if (!this.wasActive) {
            this.wasActive = true;
            this.turnStarted = false;
            this.waitFrames = 0;
            this.buffering = true;
            this.port.postMessage({ type: "playing", active: true });
          }
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
    const prebuffer = Math.round(this.srcRate * (this.turnStarted ? 0.022 : 0.04));
    const waitCapFrames = Math.max(1, Math.round((this.turnStarted ? 0.05 : 0.08) * (sampleRate / out.length)));
    if (this.buffering) {
      if (this.avail > 0) {
        this.waitFrames++;
        this.idleEmptySamples = 0;
      } else {
        this.idleEmptySamples += out.length;
      }
      if (
        this.avail >= prebuffer ||
        (this.drain && this.avail > 0) ||
        (this.waitFrames >= waitCapFrames && this.avail > 0)
      ) {
        this.buffering = false;
        this.turnStarted = true;
        this.waitFrames = 0;
      } else {
        if ((this.drain && this.avail === 0) || (this.wasActive && this.avail === 0 && this.idleEmptySamples >= sampleRate * 0.85)) {
          this.drain = false;
          this.turnStarted = false;
          this.waitFrames = 0;
          this.idleEmptySamples = 0;
          this.gainEnv = 0;
          this.lastOut = 0;
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
        this.idleEmptySamples = 0;
        const idx0 = (this.readPos + Math.floor(this.phase)) % this.cap;
        const idx1 = (idx0 + 1) % this.cap;
        const frac = this.phase - Math.floor(this.phase);
        const s = this.ring[idx0] + frac * (this.ring[idx1] - this.ring[idx0]);
        this.gainEnv = Math.min(1, this.gainEnv + 0.06);
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
        this.idleEmptySamples = 0;
        const s = this.ring[this.readPos];
        this.readPos = (this.readPos + 1) % this.cap;
        this.avail = 0;
        this.phase = 0;
        this.gainEnv = Math.min(1, this.gainEnv + 0.06);
        this.lastOut = s * this.gainEnv;
        out[i] = this.lastOut;
      } else {
        this.idleEmptySamples++;
        this.lastOut *= 0.90;
        out[i] = this.lastOut;
        if (Math.abs(this.lastOut) < 0.0005) {
          this.lastOut = 0;
          this.buffering = true;
          this.waitFrames = 0;
          this.gainEnv = 0;
          if (this.drain || (this.wasActive && this.idleEmptySamples >= sampleRate * 0.85)) {
            this.drain = false;
            this.turnStarted = false;
            this.idleEmptySamples = 0;
            if (this.wasActive) {
              this.wasActive = false;
              this.port.postMessage({ type: "playing", active: false });
            }
          }
          for (let j = i + 1; j < out.length; j++) {
            out[j] = 0;
            this.idleEmptySamples++;
          }
          break;
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
  private echoGuardUntilPerfMs: number = 0;
  private ttsSpeakSeq: number = 0;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private micStream: MediaStream | null = null;
  public micCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletBlobUrl: string | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private keepaliveTimer: number | null = null;
  private freqData: Uint8Array = new Uint8Array(512);
  private timeData: Uint8Array = new Uint8Array(1024);
  public micVolume: number = 0;
  public activeMicLabel: string = "";
  public selectedSpeakerId: string = "";
  private userSelectedSpeaker: boolean = false;
  private globalUnlockBound: boolean = false;
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
  private weakSignalMs: number = 0;
  private lastHealthAlertAt: number = 0;
  private hadHealthySignal: boolean = false;
  private deviceChangeBound: boolean = false;
  private rawFallbackAttempted: boolean = false;
  private deviceFallbackAttempted: boolean = false;
  private captureToken: number = 0;
  private playerFailed: boolean = false;
  private pendingWorkletChunks: Array<{ pcm: Float32Array; rate: number }> = [];
  private pendingDrain: boolean = false;
  private lastAppliedSinkId: string | null = null;
  private wholePcmSource: AudioBufferSourceNode | null = null;
  private ttsTimeline: VisemeTimeline | null = null;
  private ttsStartPerfMs: number = 0;
  private ttsDurationMs: number = 0;
  private speakingListeners: Set<(speaking: boolean) => void> = new Set();
  private lastNotifiedSpeaking: boolean = false;
  private speakingEndTimer: number | null = null;

  constructor() {
    this.bindGlobalUnlock();
  }

  private bindGlobalUnlock() {
    if (this.globalUnlockBound || typeof window === "undefined") return;
    this.globalUnlockBound = true;
    const resumeExisting = () => {
      if (this.audioCtx && (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted")) {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.micCtx && (this.micCtx.state === "suspended" || (this.micCtx.state as string) === "interrupted")) {
        this.micCtx.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", resumeExisting, { passive: true });
    window.addEventListener("keydown", resumeExisting, { passive: true });
    window.addEventListener("touchstart", resumeExisting, { passive: true });
    window.addEventListener("click", resumeExisting, { passive: true });
  }

  public onSpeakingStateChange(cb: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(cb);
    try {
      cb(this.isSpeaking());
    } catch {}
    return () => {
      this.speakingListeners.delete(cb);
    };
  }

  private notifySpeakingListeners() {
    const speaking = this.isSpeaking();
    if (speaking) {
      const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      const waitMs = Math.max(80, Math.min(16000, this.playingUntilPerfMs + 110 - nowPerf));
      if (this.speakingEndTimer !== null) {
        window.clearTimeout(this.speakingEndTimer);
      }
      this.speakingEndTimer = window.setTimeout(() => {
        this.speakingEndTimer = null;
        this.notifySpeakingListeners();
      }, waitMs);
    } else if (this.speakingEndTimer !== null) {
      window.clearTimeout(this.speakingEndTimer);
      this.speakingEndTimer = null;
    }
    if (speaking === this.lastNotifiedSpeaking) return;
    this.lastNotifiedSpeaking = speaking;
    this.speakingListeners.forEach((cb) => {
      try {
        cb(speaking);
      } catch {}
    });
  }

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
    if (!this.audioCtx || !this.analyser || this.playerReady || this.playerInitPromise || this.playerFailed) return;
    if (!this.audioCtx.audioWorklet || typeof Blob === "undefined") {
      this.playerFailed = true;
      return;
    }

    const ctx = this.audioCtx;
    const analyser = this.analyser;
    this.playerInitPromise = (async () => {
      try {
        try {
          await ctx.audioWorklet.addModule("/worklets/das-pcm-player.js");
        } catch {
          const blob = new Blob([PCM_PLAYER_WORKLET_CODE], { type: "application/javascript" });
          this.playerBlobUrl = URL.createObjectURL(blob);
          await ctx.audioWorklet.addModule(this.playerBlobUrl);
        }
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
              this.playingUntilPerfMs = nowP + 110;
              this.echoGuardUntilPerfMs = Math.max(this.echoGuardUntilPerfMs, nowP + 520);
            }
            this.notifySpeakingListeners();
          }
        };
        node.connect(analyser);
        this.playerNode = node;
        this.playerReady = true;
        this.activeTurnMode = "worklet";
        // Flush any initial burst chunks that arrived while addModule() compiled
        while (this.pendingWorkletChunks.length > 0) {
          const item = this.pendingWorkletChunks.shift();
          if (!item) continue;
          node.port.postMessage(
            { type: "push", pcm: item.pcm.buffer, rate: item.rate },
            [item.pcm.buffer]
          );
        }
        if (this.pendingDrain) {
          this.pendingDrain = false;
          node.port.postMessage({ type: "drain" });
        }
      } catch (err) {
        this.playerFailed = true;
        console.warn("AudioWorklet PCM player fallback active:", err);
        const queued = this.pendingWorkletChunks.splice(0);
        for (const item of queued) {
          this.scheduleFallbackFloatPcm(item.pcm, item.rate);
        }
        this.pendingDrain = false;
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
      this.playerFailed = false;
      this.pendingWorkletChunks = [];
      this.pendingDrain = false;
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
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.28;
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 1.0;
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);
      if (this.selectedSpeakerId && typeof (this.audioCtx as any).setSinkId === "function") {
        (this.audioCtx as any).setSinkId(this.selectedSpeakerId).catch(() => {});
      }
      this.ensurePlayerWorklet();
      this.audioCtx.onstatechange = () => {
        if (this.audioCtx && (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted")) {
          this.audioCtx.resume().catch(() => {});
        }
      };
      this.bindAutoDeviceChange();
    }
    if (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private bindAutoDeviceChange() {
    if (this.deviceChangeBound || typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) {
      return;
    }
    this.deviceChangeBound = true;
    navigator.mediaDevices.addEventListener("devicechange", () => {
      void this.autoSyncOutputDevice();
    });
  }

  public async autoSyncOutputDevice() {
    try {
      // Keep Chrome's default sink ("") unless user explicitly picked a speaker so Windows BT/headset switches stay native
      if (!this.userSelectedSpeaker || !this.selectedSpeakerId) {
        if (this.audioCtx && this.lastAppliedSinkId && this.lastAppliedSinkId !== "") {
          await this.setOutputDevice("", false);
        }
        return;
      }
      const devices = await this.listAudioDevices();
      const stillPresent = devices.outputs.some((d) => d.deviceId === this.selectedSpeakerId);
      if (!stillPresent) {
        await this.setOutputDevice("", false);
      } else if (this.selectedSpeakerId !== (this.lastAppliedSinkId ?? "")) {
        await this.setOutputDevice(this.selectedSpeakerId, true);
      }
    } catch {}
  }

  public unlockAudio() {
    try {
      this.initContext();
      if (!this.audioCtx || !this.masterGain) return;
      if (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted") {
        this.audioCtx.resume().catch(() => {});
      }
      const silentBuf = this.audioCtx.createBuffer(1, 1, this.audioCtx.sampleRate || 24000);
      const src = this.audioCtx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(this.masterGain);
      src.start(0);
    } catch {}
  }

  public async setOutputDevice(deviceId: string, isUserChoice = true) {
    const normalized = deviceId || "";
    this.selectedSpeakerId = normalized;
    this.userSelectedSpeaker = Boolean(isUserChoice && normalized);
    if (!this.audioCtx && !normalized) {
      this.lastAppliedSinkId = "";
      return;
    }
    this.initContext();
    if (this.lastAppliedSinkId === normalized) return;
    if (this.audioCtx && typeof (this.audioCtx as any).setSinkId === "function") {
      try {
        await (this.audioCtx as any).setSinkId(normalized);
        this.lastAppliedSinkId = normalized;
      } catch (err) {
        console.warn("setSinkId failed:", err);
      }
    } else {
      this.lastAppliedSinkId = normalized;
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

  // Calculate volume using instantaneous RMS + vocal spectrum via AnalyserNode
  public getVolume(): number {
    return this.getSpeechFormants().volume;
  }

  /**
   * Returns instantaneous syllable amplitude, zero-crossing rate (ZCR), vocal formant bands,
   * and optional audio-locked phonetic viseme weights when whole-clip text is active.
   */
  public getSpeechFormants(): {
    volume: number;
    low: number;
    mid: number;
    high: number;
    zcr: number;
    isSpeaking: boolean;
    viseme?: VisemeWeights | null;
  } {
    const speakerFallback = () => {
      const sv = speaker.getSpeechViseme();
      if (sv) {
        return {
          volume: sv.volume,
          low: sv.weights.pucker + sv.weights.jawOpen * 0.6,
          mid: sv.weights.stretch + sv.weights.upperUp * 0.5,
          high: sv.weights.funnel * 0.5 + (sv.weights.stretch > 0.3 ? 0.2 : 0),
          zcr: 0.08,
          isSpeaking: true,
          viseme: sv.weights,
        };
      }
      const spk = speaker.level();
      if (spk <= 0.01) {
        return { volume: 0, low: 0, mid: 0, high: 0, zcr: 0, isSpeaking: false, viseme: null };
      }
      return {
        volume: Math.min(1, spk * 1.4),
        low: spk,
        mid: spk * 0.75,
        high: spk * 0.35,
        zcr: 0.08,
        isSpeaking: true,
        viseme: null,
      };
    };

    const activePlayback = this.isSpeaking();
    if (!this.analyser || !this.audioCtx || !activePlayback) {
      return speakerFallback();
    }

    const fftSize = this.analyser.fftSize;
    if (this.timeData.length !== fftSize) {
      this.timeData = new Uint8Array(fftSize);
    }
    if (this.freqData.length !== this.analyser.frequencyBinCount) {
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    this.analyser.getByteTimeDomainData(this.timeData as any);
    this.analyser.getByteFrequencyData(this.freqData as any);
    const { rms, zcr, low, mid, high } = analyzeAcousticFrame(
      this.timeData,
      this.freqData,
      this.audioCtx.sampleRate || 48000,
      fftSize
    );
    const speakingNow = activePlayback || rms > 0.0065;
    if (!speakingNow) {
      return speakerFallback();
    }

    // Genuine pause / silence inside an active turn -> close lips cleanly instead of holding an open mouth
    if (rms < 0.0075) {
      if (activePlayback) {
        return { volume: 0, low: 0, mid: 0, high: 0, zcr: 0, isSpeaking: true, viseme: null };
      }
      return speakerFallback();
    }

    const volume = Math.min(1.0, Math.pow(Math.max(0.0, (rms - 0.007) * 5.2), 0.78));
    let viseme: VisemeWeights | null = null;
    if (this.wholePcmSource && this.ttsTimeline && this.ttsDurationMs > 0) {
      const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
      const frac = Math.max(0, Math.min(1, (nowPerf - this.ttsStartPerfMs) / this.ttsDurationMs));
      viseme = this.ttsTimeline.sampleAtFraction(frac);
    }

    return { volume, low, mid, high, zcr, isSpeaking: true, viseme };
  }

  private decodeBase64Pcm16(base64Pcm: string): Float32Array | null {
    let binaryStr: string;
    try {
      binaryStr = window.atob(base64Pcm);
    } catch {
      return null;
    }

    const len = binaryStr.length;
    const safeLen = len - (len % 2);
    if (safeLen <= 0) return null;

    const bytes = new Uint8Array(safeLen);
    for (let i = 0; i < safeLen; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const int16Data = new Int16Array(bytes.buffer, 0, safeLen / 2);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    return float32Data;
  }

  // Speak text aloud strictly via Gemini Puck TTS (/api/voice/tts) -> WebAudio 24kHz PCM, or Gemini Live Puck WebSocket (NEVER browser SpeechSynthesis)
  public async speakTextPuckOrLocal(
    rawText: string,
    apiBase?: string,
    options?: { signal?: AbortSignal; shouldContinue?: () => boolean }
  ): Promise<boolean> {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    const cleaned = rawText
      .split("|||")[0]
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/```[\s\S]*?```/g, " code snippet shown on screen. ")
      .replace(/[*_#`>|~]/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 680);
    if (!cleaned) return false;
    if (options?.signal?.aborted || (options?.shouldContinue && !options.shouldContinue())) {
      return false;
    }

    const effectiveApiBase =
      apiBase ||
      (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_BACKEND_URL ||
      "https://pathfinder-backend-sg.onrender.com";

    const speakSeq = ++this.ttsSpeakSeq;
    this.unlockAudio();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(`${effectiveApiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: options?.signal,
          body: JSON.stringify({ text: cleaned, voice: "Puck" }),
        });
        if (
          speakSeq !== this.ttsSpeakSeq ||
          options?.signal?.aborted ||
          (options?.shouldContinue && !options.shouldContinue())
        ) {
          return false;
        }
        if (resp.ok) {
          const data = await resp.json();
          if (
            speakSeq !== this.ttsSpeakSeq ||
            options?.signal?.aborted ||
            (options?.shouldContinue && !options.shouldContinue())
          ) {
            return false;
          }
          if (data?.status === "ok" && data?.pcm_base64) {
            const played = await this.playWholePcmBase64(
              data.pcm_base64,
              Number(data.sample_rate) || 24000,
              undefined,
              cleaned
            );
            if (played) return true;
          }
          // Server explicitly returned HTTP 200 fallback_live — don't hammer the same endpoint twice
          break;
        }
        if (resp.status < 500) break;
      } catch (err: any) {
        if (err?.name === "AbortError") return false;
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    if (speakSeq !== this.ttsSpeakSeq || options?.signal?.aborted || (options?.shouldContinue && !options.shouldContinue())) {
      return false;
    }
    if (typeof window !== "undefined" && (window as any).dasSocket?.speakVerbatim) {
      (window as any).dasSocket.speakVerbatim(cleaned);
      return true;
    }
    return false;
  }

  public stopWholePcmPlayback() {
    const prev = this.wholePcmSource;
    this.wholePcmSource = null;
    this.ttsTimeline = null;
    this.ttsDurationMs = 0;
    if (prev) {
      prev.onended = null;
      try {
        prev.stop();
        prev.disconnect();
      } catch {}
    }
    this.notifySpeakingListeners();
  }

  public async playWholePcmBase64(
    base64Pcm: string,
    sampleRate = 24000,
    onEnded?: () => void,
    spokenText?: string
  ): Promise<boolean> {
    const float32Data = this.decodeBase64Pcm16(base64Pcm);
    if (!float32Data || float32Data.length === 0) return false;

    this.initContext();
    if (!this.audioCtx || !this.analyser) return false;
    if (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted") {
      try {
        await this.audioCtx.resume();
      } catch {}
    }

    this.clearAudioQueue();
    try {
      speaker?.stop?.(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}

    const rate = Math.max(8000, sampleRate);
    const fadeSamples = Math.min(Math.floor(float32Data.length / 4), Math.round(rate * 0.003));
    for (let i = 0; i < fadeSamples; i++) {
      const ramp = i / Math.max(1, fadeSamples);
      float32Data[i] *= ramp;
      float32Data[float32Data.length - 1 - i] *= ramp;
    }

    const buffer = this.audioCtx.createBuffer(1, float32Data.length, rate);
    buffer.getChannelData(0).set(float32Data);

    const src = this.audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.analyser);
    this.wholePcmSource = src;

    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.ttsTimeline = spokenText ? buildVisemeTimeline(spokenText) : null;
    this.ttsStartPerfMs = nowPerf;
    this.ttsDurationMs = Math.max(120, buffer.duration * 1000);
    this.playingUntilPerfMs = nowPerf + buffer.duration * 1000;
    this.echoGuardUntilPerfMs = Math.max(this.echoGuardUntilPerfMs, this.playingUntilPerfMs + 520);
    src.onended = () => {
      if (this.wholePcmSource === src) {
        const endNow = typeof performance !== "undefined" ? performance.now() : Date.now();
        this.wholePcmSource = null;
        this.ttsTimeline = null;
        this.ttsDurationMs = 0;
        this.playingUntilPerfMs = 0;
        this.echoGuardUntilPerfMs = Math.max(this.echoGuardUntilPerfMs, endNow + 480);
        this.notifySpeakingListeners();
        onEnded?.();
      }
    };
    this.notifySpeakingListeners();
    src.start(0);
    return true;
  }

  // Play incoming 24kHz 16-bit PCM base64 audio via continuous AudioWorklet ring buffer (zero gap/stutter!)
  public playPcmChunk(base64Pcm: string, sampleRate = 24000) {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;
    if (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted") {
      this.audioCtx.resume().catch(() => {});
    }
    // Single-voice mutual exclusion: stop legacy Speaker, full-clip TTS, & browser TTS so 2 voices NEVER overlap
    if (this.wholePcmSource || !this.activeTurnMode) {
      this.stopWholePcmPlayback();
      try {
        speaker?.stop?.(false);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }

    const float32Data = this.decodeBase64Pcm16(base64Pcm);
    if (!float32Data) return;

    const durMs = (float32Data.length / Math.max(8000, sampleRate)) * 1000;
    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!this.isSpeaking() && this.activeSources.length === 0 && this.pendingWorkletChunks.length === 0) {
      this.activeTurnMode = null;
    }
    if (!this.activeTurnMode) {
      this.activeTurnMode = !this.playerFailed && this.audioCtx?.audioWorklet ? "worklet" : "fallback";
      if (this.activeTurnMode === "worklet" && this.activeSources.length > 0) {
        this.activeSources.forEach((src) => {
          try {
            src.stop();
            src.disconnect();
          } catch {}
        });
        this.activeSources = [];
      }
    }

    const baseMs = Math.max(nowPerf + 40, this.playingUntilPerfMs);
    this.playingUntilPerfMs = Math.min(nowPerf + 45000, baseMs + durMs);
    this.echoGuardUntilPerfMs = Math.max(this.echoGuardUntilPerfMs, this.playingUntilPerfMs + 520);

    if (this.playerReady && this.playerNode) {
      this.playerNode.port.postMessage(
        { type: "push", pcm: float32Data.buffer, rate: sampleRate },
        [float32Data.buffer]
      );
      this.notifySpeakingListeners();
      return;
    }

    if (!this.playerFailed && this.playerInitPromise) {
      this.pendingWorkletChunks.push({ pcm: float32Data, rate: sampleRate });
      this.notifySpeakingListeners();
      return;
    }

    this.scheduleFallbackFloatPcm(float32Data, sampleRate);
    this.notifySpeakingListeners();
  }

  private scheduleFallbackFloatPcm(float32Data: Float32Array, sampleRate = 24000) {
    if (!this.audioCtx || !this.analyser || float32Data.length === 0) return;
    const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    const currentTime = this.audioCtx.currentTime;
    if (this.nextPlayTime < currentTime - 0.01 || this.nextPlayTime > currentTime + 60.0) {
      this.nextPlayTime = currentTime + 0.14;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.activeSources.push(source);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0 && !this.isSpeaking()) {
        this.activeTurnMode = null;
      }
      this.notifySpeakingListeners();
    };
  }

  public flushAudioPlayer() {
    if (this.playerReady && this.playerNode) {
      this.playerNode.port.postMessage({ type: "drain" });
    } else if (!this.playerFailed && this.playerInitPromise) {
      this.pendingDrain = true;
    }
  }

  // Returns true while DAS is actively playing or draining audio (prevents mid-sentence speaker echo cuts)
  public isSpeaking(): boolean {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      return false;
    }
    if (this.wholePcmSource || this.workletPlaying || this.pendingWorkletChunks.length > 0) {
      return true;
    }
    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (nowPerf < this.playingUntilPerfMs + 90) {
      return true;
    }
    if (!this.audioCtx) return false;
    if (this.audioCtx.currentTime > this.nextPlayTime + 0.12) {
      this.activeSources = [];
      return false;
    }
    return this.activeSources.length > 0 && this.nextPlayTime > this.audioCtx.currentTime;
  }

  // Clear audio queue immediately when user genuinely interrupts DAS or starts a new turn
  public clearAudioQueue() {
    this.ttsSpeakSeq++;
    this.activeTurnMode = null;
    this.workletPlaying = false;
    this.pendingWorkletChunks = [];
    this.pendingDrain = false;
    const prevWhole = this.wholePcmSource;
    this.wholePcmSource = null;
    this.ttsTimeline = null;
    this.ttsDurationMs = 0;
    if (prevWhole) {
      prevWhole.onended = null;
      try {
        prevWhole.stop();
        prevWhole.disconnect();
      } catch {}
    }
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
    this.echoGuardUntilPerfMs = 0;
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
    this.notifySpeakingListeners();
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

    // Bi-directional adaptive ambient noise floor with tight ceiling so normal/soft mics stay unclipped
    if (rms > 0.0001) {
      if (rms < this.noiseFloor) {
        this.noiseFloor = Math.max(0.0006, this.noiseFloor * 0.85 + rms * 0.15);
      } else if (rms < 0.012 && this.gateHoldMs <= 0) {
        this.noiseFloor = Math.min(0.0045, this.noiseFloor * 0.992 + rms * 0.008);
      }
    }
    const speechThreshold = Math.min(0.0065, Math.max(0.0022, this.noiseFloor * 1.65));
    if (rms >= speechThreshold) {
      this.speechOnsetFrames = Math.min(10, this.speechOnsetFrames + 1);
      if (this.inUtterance || this.speechOnsetFrames >= 1 || rms >= speechThreshold * 1.15) {
        this.gateHoldMs = 520;
      }
    } else {
      this.speechOnsetFrames = Math.max(0, this.speechOnsetFrames - 1);
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
      options?.onVoiceHealthAlert?.({
        issue: "dead_accessory_mic",
        deviceLabel: this.activeMicLabel || "Audio Input",
        volumePercent: 0,
      });
      this.switchAwayFromDeadMic(onPcmChunk, options);
      return;
    }

    // Track very faint / low-volume input (~20% volume on earphones, buds, or headphones)
    if (rms >= 0.0004 && rms < 0.011 && !this.isSpeaking()) {
      this.weakSignalMs += frameMs;
      const nowAlert = Date.now();
      const cooldownOk = nowAlert - this.lastHealthAlertAt > 25000;
      const thresholdMs = this.hadHealthySignal ? 2200 : 4200;
      if (this.weakSignalMs > thresholdMs && cooldownOk) {
        this.lastHealthAlertAt = nowAlert;
        this.weakSignalMs = 0;
        const estPct = Math.max(5, Math.min(25, Math.round((rms / 0.05) * 100)));
        options?.onVoiceHealthAlert?.({
          issue: "low_volume",
          deviceLabel: this.activeMicLabel || "Connected Headset/Earphones",
          volumePercent: estPct,
        });
      }
    } else if (rms >= 0.014 && !this.isSpeaking()) {
      this.weakSignalMs = 0;
      this.hadHealthySignal = true;
    }

    // Ironclad Echo & Keyboard-Click Shield: keep trailing speaker echo suppressed across mobile/tablet speakers
    const echoActive =
      this.isSpeaking() ||
      now < this.echoGuardUntilPerfMs ||
      (options?.shouldSuppressEcho?.() ?? false);
    const typingSuppressed = now < this.typingSuppressUntilMs && !this.inUtterance;
    if (echoActive || typingSuppressed) {
      this.speechOnsetFrames = 0;
      this.gateHoldMs = 0;
      this.inUtterance = false;
      this.tailSilenceSentMs = 0;
      this.preRollChunks = [];
      return;
    }

    // Stream continuous 16kHz PCM whenever mic is live & not echo-suppressed so Gemini Live neural VAD handles speech & silence cleanly
    const pcm16 = downsampleTo16k(filtered, inputSampleRate, gateOpen ? this.softGain : 1.0, true);
    if (pcm16.length === 0) return;

    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = "";
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = window.btoa(binary);

    if (!this.inUtterance) {
      this.inUtterance = true;
      this.tailSilenceSentMs = 0;
      for (const pre of this.preRollChunks) {
        onPcmChunk(pre);
      }
      this.preRollChunks = [];
    }
    onPcmChunk(b64);
  }

  // Start capturing 16kHz PCM audio across all hardware (Bluetooth buds, headphones, earphones, built-in mic)
  public async startMicCapture(
    onPcmChunk: (base64Pcm: string) => void,
    options?: MicCaptureOptions
  ) {
    this.stopMicCapture();
    const token = ++this.captureToken;
    this.zeroSignalMs = 0;
    this.weakSignalMs = 0;
    this.softGain = 1.0;
    this.dcPrevX = 0;
    this.dcPrevY = 0;
    this.noiseFloor = 0.0022;
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

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    // Create & unlock AudioContext synchronously inside the tap handler BEFORE async getUserMedia (critical for iOS Safari / iPadOS / Android)
    let preMicCtx: AudioContext | null = null;
    try {
      preMicCtx = new AudioContextClass({ latencyHint: "interactive" });
      if (preMicCtx.state === "suspended") {
        void preMicCtx.resume().catch(() => {});
      }
    } catch {}

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
      } catch (err) {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (finalErr) {
          try {
            preMicCtx?.close();
          } catch {}
          throw finalErr ?? err;
        }
      }
    }

    // Re-init playback context AFTER Bluetooth HFP/microphone acquisition so output routing stays active
    this.initContext();
    if (this.audioCtx && (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted")) {
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

    if (this.captureToken !== token) {
      try {
        preMicCtx?.close();
      } catch {}
      return;
    }

    this.micCtx = preMicCtx || new AudioContextClass({ latencyHint: "interactive" });
    if (this.micCtx.state === "suspended" || (this.micCtx.state as string) === "interrupted") {
      await this.micCtx.resume().catch(() => {});
    }

    const inputSampleRate = this.micCtx.sampleRate;
    const source = this.micCtx.createMediaStreamSource(this.micStream);
    this.micSource = source;

    // Watchdog keeps both mic and speaker contexts awake across Windows/MacBook/iOS BT transitions
    this.keepaliveTimer = window.setInterval(() => {
      if (this.micCtx && (this.micCtx.state === "suspended" || (this.micCtx.state as string) === "interrupted")) {
        this.micCtx.resume().catch(() => {});
      }
      if (this.audioCtx && (this.audioCtx.state === "suspended" || (this.audioCtx.state as string) === "interrupted")) {
        this.audioCtx.resume().catch(() => {});
      }
    }, 1200);

    // Primary path: AudioWorkletNode (modern, zero deprecation/culling across Chromium & WebKit)
    let workletReady = false;
    if (this.micCtx.audioWorklet && typeof Blob !== "undefined") {
      try {
        try {
          await this.micCtx.audioWorklet.addModule("/worklets/das-mic-processor.js");
        } catch {
          const blob = new Blob([MIC_WORKLET_CODE], { type: "application/javascript" });
          this.workletBlobUrl = URL.createObjectURL(blob);
          await this.micCtx.audioWorklet.addModule(this.workletBlobUrl);
        }
        if (this.captureToken !== token || !this.micCtx) return;

        this.workletNode = new AudioWorkletNode(this.micCtx, "das-mic-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          channelCountMode: "explicit",
        });
        this.workletNode.port.onmessage = (evt) => {
          const mono = new Float32Array(evt.data);
          this.processCapturedFloatFrame(mono, inputSampleRate, onPcmChunk, options, token);
        };
        const silentSink = this.micCtx.createGain();
        silentSink.gain.value = 0;
        source.connect(this.workletNode);
        this.workletNode.connect(silentSink);
        silentSink.connect(this.micCtx.destination);
        workletReady = true;
      } catch (err) {
        console.warn("AudioWorklet fallback to ScriptProcessor:", err);
      }
    }

    if (!workletReady) {
      const bufferSize = 2048;
      this.processor = this.micCtx.createScriptProcessor(bufferSize, 1, 1);
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
      const silentSink = this.micCtx.createGain();
      silentSink.gain.value = 0;
      source.connect(this.processor);
      this.processor.connect(silentSink);
      silentSink.connect(this.micCtx.destination);
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
clearAudioEngineHook = () => audioEngine.clearAudioQueue();
audioEngineSpeakingHook = () => audioEngine.isSpeaking();
export { AudioEngine as BrowserAudioLoop };
export function getLiveAudioVolume(): number {
  return getUnifiedSpeechFormants().volume;
}

/**
 * Unifies live WebAudio PCM output (Gemini Live / Puck TTS) and browser SpeechSynthesis
 * fallback into normalized 60fps vocal formants + phonetic visemes so 3D hologram lip-sync
 * opens, rounds, widens, and closes in exact sync with speech.
 */
export function getUnifiedSpeechFormants(_nowSec?: number): {
  volume: number;
  low: number;
  mid: number;
  high: number;
  zcr: number;
  isSpeaking: boolean;
  viseme?: VisemeWeights | null;
} {
  const f = audioEngine.getSpeechFormants();
  if (f.isSpeaking && f.volume > 0.01) {
    return {
      volume: f.volume,
      low: f.low,
      mid: f.mid,
      high: f.high,
      zcr: f.zcr,
      isSpeaking: true,
      viseme: f.viseme ?? null,
    };
  }

  // Browser speechSynthesis fallback: return phonetic timeline viseme (not flat sine oscillation)
  const synthSpeaking =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    Boolean(window.speechSynthesis.speaking);
  if (speaker.isSpeaking && (synthSpeaking || speaker.getSpeechViseme() !== null)) {
    const sv = speaker.getSpeechViseme();
    if (sv) {
      return {
        volume: sv.volume,
        low: sv.weights.pucker + sv.weights.jawOpen * 0.5,
        mid: sv.weights.stretch + sv.weights.upperUp * 0.5,
        high: sv.weights.funnel * 0.5 + (sv.weights.stretch > 0.3 ? 0.18 : 0),
        zcr: 0.08,
        isSpeaking: true,
        viseme: sv.weights,
      };
    }
  }

  return { volume: 0, low: 0, mid: 0, high: 0, zcr: 0, isSpeaking: false, viseme: null };
}
