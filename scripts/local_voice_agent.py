"""
Autonomous 5-Component Local Voice Agent
---------------------------------------
Stack:
  1. Microphone Input (sounddevice + scipy)
  2. Speech to Text (faster-whisper)
  3. LLM Reasoning (ollama - llama3.2)
  4. Tool Calling (Function dispatching)
  5. Text to Speech (piper-tts + sounddevice playback)

Prerequisites:
  pip install faster-whisper sounddevice scipy ollama piper-tts
  ollama pull llama3.2
"""

import os
import sys
import json
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

# Core Audio & SciPy
import sounddevice as sd
from scipy.io.wavfile import write, read

# Optional fast whisper loader
try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

# Optional Ollama loader
try:
    import ollama
except ImportError:
    ollama = None


# ==============================================================================
# 1. TOOL CALLING DEFINITIONS (TOOLS REPOSITORY)
# ==============================================================================

def get_current_time() -> str:
    """Returns the current date, day, and time."""
    now = datetime.now()
    return now.strftime("%A, %B %d, %Y at %I:%M %p")


def get_placement_stats(branch: str = "ALL") -> str:
    """Returns placement benchmark statistics for engineering departments."""
    branch = branch.upper().strip()
    stats = {
        "CSE": {"highest_lpa": 44.0, "avg_lpa": 8.5, "rate_pct": 84.2},
        "CSM": {"highest_lpa": 44.6, "avg_lpa": 9.1, "rate_pct": 86.5},
        "AIML": {"highest_lpa": 44.6, "avg_lpa": 9.0, "rate_pct": 85.8},
        "ECE": {"highest_lpa": 32.0, "avg_lpa": 7.2, "rate_pct": 78.4},
        "EEE": {"highest_lpa": 24.5, "avg_lpa": 6.8, "rate_pct": 72.1},
        "MECH": {"highest_lpa": 18.0, "avg_lpa": 5.9, "rate_pct": 69.4},
    }
    if branch in stats:
        s = stats[branch]
        return f"Branch {branch}: Highest package {s['highest_lpa']} LPA, Average {s['avg_lpa']} LPA, Placement rate {s['rate_pct']}%."
    return "Overall platform record: Highest package 44.6 LPA (CSM/AIML), 79.4% overall campus placement clearance rate across 972 candidates."


def calculate_readiness_score(cgpa: float, backlogs: int, internships: int) -> str:
    """Calculates placement screening readiness score."""
    score = int(cgpa * 6.5 + max(0, 3 - backlogs) * 6 + min(internships, 3) * 8)
    clamped = max(15, min(96, score))
    tier = "Tier-1 Product" if clamped >= 80 else ("Service & Core" if clamped >= 60 else "Foundation Building")
    return f"Calculated Readiness Score is {clamped}%. Profile is qualified for {tier} campus drives."


# Mapping of callable tools
AVAILABLE_TOOLS = {
    "get_current_time": get_current_time,
    "get_placement_stats": get_placement_stats,
    "calculate_readiness_score": calculate_readiness_score,
}

# Ollama-compliant tool schema definitions
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Get the current day, date, and local time.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_placement_stats",
            "description": "Fetch placement statistics and highest LPA package for a specific engineering branch.",
            "parameters": {
                "type": "object",
                "properties": {
                    "branch": {
                        "type": "string",
                        "description": "Engineering department code, such as CSE, CSM, AIML, ECE, EEE, MECH.",
                    }
                },
                "required": ["branch"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_readiness_score",
            "description": "Calculate placement readiness score based on CGPA, backlogs, and internships.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cgpa": {"type": "number", "description": "Candidate CGPA out of 10.0"},
                    "backlogs": {"type": "integer", "description": "Number of active academic backlogs"},
                    "internships": {"type": "integer", "description": "Number of internships completed"},
                },
                "required": ["cgpa", "backlogs", "internships"],
            },
        },
    },
]


# ==============================================================================
# COMPONENT 1: MICROPHONE INPUT (RECORD AUDIO)
# ==============================================================================

def record_audio(filename: str = "audio.wav", duration: int = 5, sample_rate: int = 16000) -> str:
    """
    Component 1: Captures audio from the default microphone and saves to a WAV file.
    """
    print(f"\n[1. MIC] Recording {duration}s of audio... Speak now!")
    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="int16"
    )
    sd.wait()
    write(filename, sample_rate, audio)
    print(f"[1. MIC] Recording completed -> saved to {filename}")
    return filename


# ==============================================================================
# COMPONENT 2: SPEECH TO TEXT (FASTER-WHISPER)
# ==============================================================================

_whisper_instance = None

def get_whisper_model(model_size: str = "base"):
    global _whisper_instance
    if _whisper_instance is None:
        if WhisperModel is None:
            raise ImportError("faster-whisper is not installed. Run: pip install faster-whisper")
        print(f"[2. STT] Loading Whisper ({model_size}) model into memory...")
        _whisper_instance = WhisperModel(model_size, device="cpu", compute_type="int8")
    return _whisper_instance


def speech_to_text(audio_path: str = "audio.wav") -> str:
    """
    Component 2: Converts recorded WAV audio file into transcribed text using faster-whisper.
    """
    print(f"[2. STT] Transcribing audio from {audio_path}...")
    model = get_whisper_model("base")
    segments, info = model.transcribe(audio_path, beam_size=5)

    transcription = " ".join([seg.text.strip() for seg in segments]).strip()
    print(f"[2. STT] Detected language: {info.language} ({info.language_probability:.2f})")
    print(f"[2. STT] Transcribed: \"{transcription}\"")
    return transcription


# ==============================================================================
# COMPONENT 3 & 4: LLM REASONING & TOOL CALLING (OLLAMA LLAMA 3.2)
# ==============================================================================

def llm_reasoning_and_tool_calling(
    user_prompt: str,
    messages_history: List[Dict[str, Any]] = None,
    model_name: str = "llama3.2"
) -> str:
    """
    Components 3 & 4:
    - Sends conversation history and available tool definitions to Ollama (llama3.2).
    - If the LLM requests a tool call, executes the tool function and passes result back.
    - Produces the final spoken natural answer.
    """
    if ollama is None:
        raise ImportError("ollama python package not installed. Run: pip install ollama")

    if messages_history is None:
        messages_history = []

    # System instruction ensuring short, clear, speech-optimized outputs
    system_message = {
        "role": "system",
        "content": (
            "You are a friendly, intelligent voice assistant. "
            "Keep answers concise, direct, and conversational (strictly 1 to 3 sentences maximum) "
            "so it sounds natural when spoken aloud. Use available tools whenever you need verified facts."
        )
    }

    current_turn = {"role": "user", "content": user_prompt}
    messages = [system_message] + messages_history + [current_turn]

    print(f"\n[3. LLM] Sending prompt to Ollama ({model_name})...")
    response = ollama.chat(
        model=model_name,
        messages=messages,
        tools=TOOLS_SCHEMA,
    )

    response_message = response.get("message", {})

    # Check if the model triggered Tool Calling (Component 4)
    tool_calls = response_message.get("tool_calls")
    if tool_calls:
        print(f"[4. TOOLS] Model requested {len(tool_calls)} tool execution(s)...")
        messages.append(response_message)

        for call in tool_calls:
            function_name = call.get("function", {}).get("name")
            function_args = call.get("function", {}).get("arguments", {})

            print(f"[4. TOOLS] Executing: {function_name}({function_args})")
            if function_name in AVAILABLE_TOOLS:
                tool_output = AVAILABLE_TOOLS[function_name](**function_args)
            else:
                tool_output = f"Error: Tool '{function_name}' not found."

            print(f"[4. TOOLS] Result: {tool_output}")
            messages.append({
                "role": "tool",
                "content": str(tool_output),
            })

        # Request second pass from Ollama with tool observations
        print(f"[3. LLM] Synthesizing final answer with tool data...")
        final_response = ollama.chat(
            model=model_name,
            messages=messages,
        )
        final_text = final_response.get("message", {}).get("content", "").strip()
    else:
        final_text = response_message.get("content", "").strip()

    print(f"[3. LLM] Final Response: \"{final_text}\"")
    return final_text


# ==============================================================================
# COMPONENT 5: TEXT TO SPEECH (PIPER-TTS & PLAYBACK)
# ==============================================================================

def text_to_speech_piper(text: str, output_wav: str = "reply.wav") -> str:
    """
    Component 5: Converts text into audio speech using piper-tts and plays it.
    Falls back gracefully to platform speech if piper executable is not in path.
    """
    print(f"\n[5. TTS] Synthesizing speech for: \"{text}\"")

    clean_text = text.replace('"', "'").replace("\n", " ").strip()

    # Try Piper CLI synthesis
    piper_success = False
    try:
        cmd = f'echo "{clean_text}" | piper --output_file {output_wav}'
        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=8)
        if result.returncode == 0 and os.path.exists(output_wav):
            piper_success = True
    except Exception as e:
        piper_success = False

    # If Piper binary not in CLI PATH, use Windows SAPI voice fallback to guarantee sound
    if not piper_success or not os.path.exists(output_wav):
        print("[5. TTS] Using Windows SAPI voice playback...")
        try:
            ps_script = f"""
            Add-Type -AssemblyName System.Speech;
            $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $speak.Rate = 1;
            $speak.Speak('{clean_text}');
            """
            subprocess.run(["powershell", "-Command", ps_script], timeout=15)
            return ""
        except Exception as ps_err:
            print(f"[5. TTS] Playback warning: {ps_err}")
            return ""

    # Play generated WAV via sounddevice
    try:
        sr, data = read(output_wav)
        sd.play(data, sr)
        sd.wait()
    except Exception as play_err:
        print(f"[5. TTS] Audio play warning: {play_err}")

    return output_wav


# ==============================================================================
# COMPLETE PIPELINE LOOP
# ==============================================================================

def run_voice_agent_cycle(duration: int = 5):
    """Executes one complete end-to-end 5-component voice agent cycle."""
    print("=" * 65)
    print("        STARTING 5-COMPONENT LOCAL VOICE AGENT CYCLE")
    print("=" * 65)

    audio_file = "audio.wav"

    # 1. Microphone Input
    record_audio(filename=audio_file, duration=duration)

    # 2. Speech to Text
    user_text = speech_to_text(audio_path=audio_file)
    if not user_text:
        print("[AGENT] No speech detected. Try speaking closer to microphone.")
        return

    # 3 & 4. LLM Reasoning & Tool Calling
    reply_text = llm_reasoning_and_tool_calling(user_text)

    # 5. Text to Speech Playback
    text_to_speech_piper(reply_text)

    print("\n[AGENT] Cycle completed successfully!")


if __name__ == "__main__":
    duration = 5
    if len(sys.argv) > 1:
        try:
            duration = int(sys.argv[1])
        except ValueError:
            duration = 5

    print(f"\nPathfinder 5-Component Local Voice Agent initialized.")
    print(f"Record duration set to: {duration} seconds.")
    print("To trigger: run 'python scripts/local_voice_agent.py [duration_seconds]'\n")

    try:
        run_voice_agent_cycle(duration=duration)
    except KeyboardInterrupt:
        print("\nVoice agent exited.")
    except Exception as err:
        print(f"\n[ERROR] Pipeline exception: {err}")
