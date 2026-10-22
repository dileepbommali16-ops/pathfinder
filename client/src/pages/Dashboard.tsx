import React, { useContext, useEffect } from 'react';
import { DasVoiceContext } from '../context/DasVoiceContext';
import DasAi3DFace from '../components/DasAi3DFace';

export default function Dashboard() {
  const { audioLevel, isSpeaking, speakText, stopSpeaking } = useContext(DasVoiceContext);

  // Proactive automatic greeting upon entering the dashboard
  useEffect(() => {
    const timer = setTimeout(() => {
      speakText("System online. Hello! I am DAS AI, your Pathfinder Autonomous Career Intelligence lead. How can I assist your placement preparation today?");
    }, 800);
    return () => clearTimeout(timer);
  }, [speakText]);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white font-mono flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[140px] rounded-full" />

      <div className="w-full max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-cyan-400">
              PATHFINDER <span className="text-white">DAS 3D VISION MATRIX</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Autonomous Voice Agent & Cybernetic Real-Time Core</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isSpeaking ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
              {isSpeaking ? 'SPEAKING' : 'IDLE / LISTENING'}
            </span>
          </div>
        </div>

        {/* 3D Wireframe Face Canvas Widget */}
        <DasAi3DFace audioLevel={audioLevel} />

        {/* Quick Voice Controls & Triggers */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-cyan-500/20 backdrop-blur-md">
          <div className="flex flex-wrap gap-3">
            <button 
              type="button"
              onClick={() => speakText("System online. Hello! I am DAS AI. Your candidate profile is fully synced and placement readiness is at 84 percent.")}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition shadow-lg shadow-cyan-900/50 cursor-pointer flex items-center gap-2"
            >
              <span>Test JARVIS 3D Voice</span>
              <span>🎙️</span>
            </button>

            <button 
              type="button"
              onClick={() => speakText("నమస్కారం! నేను మీ పాత్‌ఫైండర్ AI కెరీర్ అసిస్టెంట్‌ని. మీ క్యాంపస్ ప్లేస్‌మెంట్స్, ప్రాజెక్ట్స్, లేదా రెజ్యూమ్ కోసం నేను సిద్ధంగా ఉన్నాను.")}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold transition border border-cyan-500/30 cursor-pointer"
            >
              తెలుగు వాయిస్ టెస్ట్ 🇮🇳
            </button>
          </div>

          <button
            type="button"
            onClick={stopSpeaking}
            className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-xl text-xs font-bold transition border border-red-500/30 cursor-pointer"
          >
            Interrupt [ESC]
          </button>
        </div>

      </div>
    </div>
  );
}
