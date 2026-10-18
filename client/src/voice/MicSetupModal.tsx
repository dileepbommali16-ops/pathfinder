/**
 * MicSetupModal.tsx - In-Browser Microphone & Speaker Diagnostic Suite
 * Allows students and judges to verify audio hardware before starting voice sessions:
 * 1. "Say something, see waveform move" - Live WebAudio canvas visualizer
 * 2. "Hear test reply" - Multi-frequency chime + SpeechSynthesis test phrase
 * 3. Clear user-friendly error diagnostics for permission denial or missing microphone
 */

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, CheckCircle2, AlertTriangle, X, Play, RefreshCw, Radio } from "lucide-react";

interface MicSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MicSetupModal: React.FC<MicSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [micState, setMicState] = useState<"idle" | "listening" | "success" | "denied" | "notfound">("idle");
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);
  const [speakerState, setSpeakerState] = useState<"idle" | "playing" | "success" | "error">("idle");
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanupAudio();
    }
    return () => {
      cleanupAudio();
    };
  }, [isOpen]);

  const cleanupAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicState("idle");
    setSpeakerState("idle");
    setAudioLevel(0);
  };

  const startMicTest = async () => {
    cleanupAudio();
    setMicErrorMsg(null);
    setMicState("listening");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported on this browser or connection is unencrypted (HTTPS required).");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err: any) {
      console.error("[MicSetup] Access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicState("denied");
        setMicErrorMsg("Microphone access denied. Please click the camera/lock icon in your browser address bar and choose 'Allow'.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setMicState("notfound");
        setMicErrorMsg("No microphone hardware found. Please connect a headset or microphone and try again.");
      } else {
        setMicState("denied");
        setMicErrorMsg(err.message || "Failed to access microphone. Please verify device permissions.");
      }
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setAudioLevel(Math.min(1.0, rms * 4));

      if (rms > 0.05 && micState === "listening") {
        setMicState("success");
      }

      ctx.fillStyle = "rgba(6, 10, 20, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(56, 189, 248, 0.6)";

      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  };

  const testSpeaker = () => {
    setSpeakerState("playing");
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // 3-tone harmonic chime
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.12);
        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      });

      // Browser Speech test utterance
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utter = new SpeechSynthesisUtterance("Microphone and speaker test passed. Pathfinder AI agent is ready.");
        utter.rate = 1.0;
        utter.pitch = 1.0;

        utter.onend = () => {
          setSpeakerState("success");
        };
        utter.onerror = () => {
          setSpeakerState("success");
        };

        window.speechSynthesis.speak(utter);
      } else {
        setTimeout(() => setSpeakerState("success"), 800);
      }
    } catch (e) {
      console.error("[SpeakerTest] Error:", e);
      setSpeakerState("error");
    }
  };

  if (!isOpen) return null;

  const isReady = micState === "success" && speakerState === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#060a14] p-6 sm:p-8 shadow-2xl text-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Audio Setup & Verification</h2>
            <p className="text-xs text-slate-400">Verify microphone and speakers before beginning your voice session.</p>
          </div>
        </div>

        {/* Step 1: Microphone Test */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">1. Microphone Test</span>
            </div>
            {micState === "success" && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Working
              </span>
            )}
            {micState === "denied" && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Denied
              </span>
            )}
          </div>

          {/* Live Waveform Canvas */}
          <div className="relative h-20 w-full rounded-xl overflow-hidden border border-cyan-500/20 bg-[#030712] mb-3 flex items-center justify-center">
            <canvas ref={canvasRef} width={420} height={80} className="w-full h-full" />
            {micState === "idle" && (
              <span className="absolute text-xs text-slate-500 pointer-events-none">Click 'Test Microphone' and speak</span>
            )}
            {micState === "listening" && (
              <span className="absolute text-xs text-cyan-400 animate-pulse pointer-events-none">Listening... Speak now</span>
            )}
          </div>

          {/* Error Banner */}
          {micErrorMsg && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{micErrorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={startMicTest}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
              micState === "listening"
                ? "bg-cyan-500/20 border border-cyan-400 text-cyan-300"
                : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${micState === "listening" ? "animate-spin" : ""}`} />
            <span>{micState === "idle" ? "Test Microphone" : micState === "listening" ? "Listening to Voice..." : "Re-test Microphone"}</span>
          </button>
        </div>

        {/* Step 2: Speaker Test */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">2. Speaker Test</span>
            </div>
            {speakerState === "success" && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Working
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Click to play a 3-tone diagnostic chime and speech phrase to confirm your speaker volume.
          </p>

          <button
            type="button"
            onClick={testSpeaker}
            disabled={speakerState === "playing"}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 py-2 text-xs font-bold text-cyan-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{speakerState === "playing" ? "Playing Audio Chime..." : "Play Test Audio"}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            Skip & Close
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSuccess) onSuccess();
              onClose();
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
              isReady
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25"
                : "bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-600/40"
            }`}
          >
            {isReady ? "Ready to Launch Agent" : "Continue to Agent"}
          </button>
        </div>
      </div>
    </div>
  );
};
