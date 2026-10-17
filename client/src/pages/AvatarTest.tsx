import React, { useState, useRef, useEffect } from "react";
import { AvatarCanvas } from "@/avatar/AvatarCanvas";
import { AvatarState } from "@/avatar/visemeMapper";
import { Play, Square, RefreshCw, Volume2 } from "lucide-react";

const SAMPLE_SENTENCES = {
  english: "Hello Dileep! I am Pathfinder, your AI placement mentor. Let's solve Kadane's algorithm together.",
  telugu: "నమస్కారం దిలీప్ గారూ! నేను మీ పాత్‌ఫైండర్ AI వాయిస్ మెంటార్‌ని. మీ ప్లేస్‌మెంట్ ప్రిపరేషన్ మొదలుపెడదాం.",
  hindi: "नमस्ते दिलीप जी! मैं आपका पाथफाइंडर एआई प्लेसमेंट मेंटर हूँ। चलिए आज का मॉक इंटरव्यू शुरू करते हैं।",
};

export const AvatarTest: React.FC = () => {
  const [state, setState] = useState<AvatarState>("idle");
  const [spokenText, setSpokenText] = useState<string>(SAMPLE_SENTENCES.english);
  const [selectedLang, setSelectedLang] = useState<"english" | "telugu" | "hindi">("english");
  const [fps, setFps] = useState<number>(60);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const handleSpeak = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utter = new SpeechSynthesisUtterance(spokenText);
    utter.rate = 1.0;

    if (selectedLang === "telugu") {
      utter.lang = "te-IN";
    } else if (selectedLang === "hindi") {
      utter.lang = "hi-IN";
    } else {
      utter.lang = "en-IN";
    }

    utter.onstart = () => {
      setState("speaking");
      setIsSpeaking(true);
    };

    utter.onend = () => {
      setState("idle");
      setIsSpeaking(false);
    };

    utter.onerror = () => {
      setState("idle");
      setIsSpeaking(false);
    };

    synthRef.current.speak(utter);
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setState("idle");
    setIsSpeaking(false);
  };

  return (
    <div className="min-h-screen bg-[#07080f] text-white p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Avatar Lip-Sync Test Playground
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Verify real-time facial deformation, viseme lip-syncing across languages, and FPS.
            </p>
          </div>
          {/* FPS Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d0e17] px-3 py-1.5">
            <span className="text-[11px] text-zinc-400">Rendering:</span>
            <span
              className={`text-sm font-bold font-mono ${
                fps >= 45 ? "text-emerald-400" : fps >= 25 ? "text-amber-400" : "text-rose-400"
              }`}
            >
              {fps} FPS
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Avatar Canvas */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-[#0a0b12] shadow-2xl">
            <AvatarCanvas
              state={state}
              spokenText={spokenText}
              isSpeaking={isSpeaking}
              width={220}
              height={265}
              onFpsUpdate={setFps}
            />

            {/* State Switcher Buttons */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {(["idle", "listening", "thinking", "speaking"] as AvatarState[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setState(st);
                    if (st === "speaking") setIsSpeaking(true);
                    else setIsSpeaking(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    state === st
                      ? "bg-violet-600 text-white shadow-md font-bold"
                      : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Controls & Test Sentences */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0e17] p-6">
            <h2 className="text-sm font-bold text-zinc-200">Test Multi-Lingual Lip-Sync</h2>

            {/* Language Chips */}
            <div className="flex gap-2">
              {(["english", "telugu", "hindi"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setSelectedLang(lang);
                    setSpokenText(SAMPLE_SENTENCES[lang]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    selectedLang === lang
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  {lang === "telugu" ? "తెలుగు" : lang === "hindi" ? "हिंदी" : "English"}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={spokenText}
              onChange={(e) => setSpokenText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-[#07080f] p-3 text-xs text-zinc-200 focus:border-violet-500 focus:outline-hidden"
              placeholder="Enter text to speak and test lip-sync..."
            />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSpeak}
                disabled={isSpeaking}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white" />
                Speak & Sync Lips
              </button>
              <button
                onClick={handleStop}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/50 px-4 py-2.5 text-xs font-bold text-rose-300 transition-all cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-rose-300" />
                Stop
              </button>
            </div>

            <div className="mt-2 text-[11px] text-zinc-500">
              Tip: The mouth smoothly shapes visemes based on phonetic syllables (vowels, bilabials, labiodentals) with natural blinking and micro-sway.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarTest;
