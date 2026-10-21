import React, { useState } from 'react';
import { useVoiceAgent } from '../context/VoiceAgentContext';

export default function DasAiWidget() {
  const { messages, isOpen, setIsOpen, sendMessageToDAS } = useVoiceAgent();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Voice Input Handler (Speech-To-Text via Web Speech API)
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        if (sendMessageToDAS) {
          sendMessageToDAS(transcript); // Auto-send spoken message
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (sendMessageToDAS) {
      sendMessageToDAS(input.trim());
    }
    setInput('');
  };

  return (
    <div className="flex gap-2 p-3 border-t border-slate-700 bg-slate-800/90 backdrop-blur-md rounded-b-xl shadow-lg">
      <button
        type="button"
        onClick={startListening}
        className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
          isListening
            ? 'bg-red-500 animate-pulse text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
            : 'bg-slate-700 hover:bg-slate-600 text-cyan-400'
        }`}
        title="Speak via Microphone"
      >
        <span>🎙️</span>
        <span>{isListening ? 'Listening...' : 'Mic'}</span>
      </button>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Ask DAS AI anything..."
        className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
      />

      <button
        type="button"
        onClick={handleSend}
        className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
      >
        Send
      </button>
    </div>
  );
}
