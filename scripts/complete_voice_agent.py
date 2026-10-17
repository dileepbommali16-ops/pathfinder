"""
Complete 5-Component Local Voice Agent
-------------------------------------
Stack:
  pip install faster-whisper sounddevice scipy ollama piper-tts
  ollama pull llama3.2

Components:
  1. Microphone Input (sounddevice + scipy)
  2. Speech to Text (faster-whisper)
  3. Tools (safe math calculator & datetime)
  4. LLM Reasoning (ollama - llama3.2 with JSON tool calling)
  5. Execution + Speak (piper-tts / sounddevice / Windows SAPI fallback)
  6. Full Loop with graceful exit
"""

import os
import sys
import io
import time

# Ensure Windows terminal handles UTF-8 emojis without charmap encoding crashes
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import json
import ast
import operator
import subprocess
from datetime import datetime
from pathlib import Path

# Audio dependencies
import sounddevice as sd
from scipy.io.wavfile import write, read
from scipy import signal
import numpy as np

# Load environment variables (.env)
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

# AI & LLM dependencies
try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

try:
    import ollama
except ImportError:
    ollama = None


# ==============================================================================
# STEP 1: RECORD AUDIO (MICROPHONE INPUT & AUTO-GAIN)
# ==============================================================================

def get_input_devices():
    """Returns list of (index, name) for available MME microphone inputs."""
    devices = sd.query_devices()
    return [
        (idx, d['name'])
        for idx, d in enumerate(devices)
        if d['max_input_channels'] > 0 and d['hostapi'] == 0
    ]


def select_default_microphone() -> int:
    """
    Selects the best microphone device:
    Prioritizes headset microphone if headphones/headset are connected.
    """
    env_choice = os.environ.get("MIC_DEVICE")
    if env_choice is not None:
        try:
            return int(env_choice)
        except ValueError:
            pass

    inputs = get_input_devices()
    headset_idx = None
    default_idx = sd.default.device[0]

    for idx, name in inputs:
        if "headset" in name.lower():
            headset_idx = idx

    # If headset microphone is available and output is Realtek/Headphone, prioritize headset
    return headset_idx if headset_idx is not None else default_idx


def record_audio(filename: str = "audio.wav", duration: int = 6, device_index: int = None) -> str:
    """
    Captures microphone audio at device native sample rate,
    downmixes to mono, resamples to 16000Hz, applies dynamic auto-gain,
    and saves 16-bit PCM WAV.
    """
    if device_index is None:
        device_index = select_default_microphone()

    dev_info = sd.query_devices(device_index)
    native_sr = int(dev_info['default_samplerate'])
    ch = min(2, max(1, dev_info['max_input_channels']))

    print(f"3... 2... 1... 🎙️ SPEAK NOW! (Mic: [{device_index}] {dev_info['name']})")
    audio_raw = sd.rec(
        int(duration * native_sr),
        samplerate=native_sr,
        channels=ch,
        device=device_index,
        dtype="float32"
    )
    for i in range(duration, 0, -1):
        time.sleep(1)
        print(f"[{i}s left] ", end="", flush=True)
    sd.wait()
    print("\n[1. RECORD] Processing captured audio...")

    # Downmix stereo to mono
    if audio_raw.ndim > 1:
        mono = np.mean(audio_raw, axis=1)
    else:
        mono = audio_raw.flatten()

    # High-quality resampling to 16000Hz for Whisper
    target_sr = 16000
    if native_sr != target_sr:
        num_samples = int(round(len(mono) * target_sr / native_sr))
        resampled = signal.resample(mono, num_samples)
    else:
        resampled = mono

    # Dynamic Auto-Gain Normalization (Boosts quiet laptop and headset microphones)
    peak = float(np.max(np.abs(resampled)))
    int16_peak = int(peak * 32767)

    if peak > 0.0001:
        gain = min(0.85 / peak, 80.0)
        resampled = resampled * gain
        amplified_peak = int(np.max(np.abs(resampled)) * 32767)
        print(f"[1. RECORD] Audio amplified (raw peak: {int16_peak}, gain: {gain:.1f}x -> peak: {amplified_peak}) -> saved to {filename}")
    else:
        print(f"[1. RECORD] ⚠️ Microphone signal near zero (raw peak: {int16_peak}). Check headset wire or mic mute switch.")

    # Convert to standard 16-bit PCM WAV
    resampled_int16 = np.clip(resampled * 32767, -32768, 32767).astype(np.int16)
    write(filename, target_sr, resampled_int16)
    return filename


# ==============================================================================
# STEP 2: SPEECH-TO-TEXT (FASTER-WHISPER WITH 2-PASS VAD FALLBACK)
# ==============================================================================

_whisper_cache = None

def get_whisper():
    """Lazy loader for faster-whisper to keep initial startup fast."""
    global _whisper_cache
    if _whisper_cache is None:
        if WhisperModel is None:
            raise ImportError("faster-whisper is not installed. Run: pip install faster-whisper")
        print("[2. STT] Initializing faster-whisper ('base', int8 on CPU)...")
        _whisper_cache = WhisperModel("base", device="cpu", compute_type="int8")
    return _whisper_cache


def transcribe_audio(filename: str = "audio.wav") -> str:
    """Converts the recorded audio file into text using VAD silence filtering with 2nd-pass fallback."""
    if not os.path.exists(filename):
        return ""
    print(f"[2. STT] Transcribing audio with Voice Activity Detection (VAD)...")
    whisper = get_whisper()
    
    # Pass 1: Transcribe with VAD to filter background noise
    segments, info = whisper.transcribe(
        filename,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=300)
    )
    text = " ".join(s.text.strip() for s in segments).strip()

    clean_alpha = "".join(ch for ch in text if ch.isalnum())
    
    # Pass 2 Fallback: If VAD filtered short phrases (e.g. "hi", "hello"), transcribe directly
    if not clean_alpha:
        segments, info = whisper.transcribe(filename, beam_size=3, vad_filter=False)
        text = " ".join(s.text.strip() for s in segments).strip()
        clean_alpha = "".join(ch for ch in text if ch.isalnum())

    if not clean_alpha:
        print(f"[2. STT] Ignored background room noise/dots.")
        return ""

    print(f"[2. STT] Recognized ({info.language}): \"{text}\"")
    return text


# ==============================================================================
# STEP 3: TOOLS (SAFE CALCULATOR & TIME)
# ==============================================================================

def get_current_time() -> str:
    """Returns formatted 12-hour local time."""
    return datetime.now().strftime("%I:%M %p")


# Safe Math AST Evaluator (Replaces dangerous eval)
ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
}

def safe_eval_expr(node):
    if isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type in ALLOWED_OPERATORS:
            left = safe_eval_expr(node.left)
            right = safe_eval_expr(node.right)
            return ALLOWED_OPERATORS[op_type](left, right)
        raise ValueError(f"Unsupported operator: {op_type}")
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type in ALLOWED_OPERATORS:
            operand = safe_eval_expr(node.operand)
            return ALLOWED_OPERATORS[op_type](operand)
        raise ValueError(f"Unsupported operator: {op_type}")
    raise ValueError(f"Unsupported expression node: {type(node)}")


def calculate(expression: str) -> str:
    """Safely computes a mathematical expression without raw eval()."""
    clean_expr = expression.strip().replace("x", "*").replace("X", "*").replace("^", "**")
    try:
        parsed = ast.parse(clean_expr, mode="eval")
        result = safe_eval_expr(parsed.body)
        return str(round(result, 4) if isinstance(result, float) else result)
    except Exception:
        return "Unable to calculate."


TOOLS_DESCRIPTION = """
Available tools:
1. get_current_time() -> Returns current local time.
2. calculate(expression: str) -> Safely calculates a mathematical expression (e.g., '145 * 12 + 50').

INSTRUCTION:
- If the user asks for the time or asks to calculate a math problem, return ONLY a strict JSON object with this exact format:
  {"tool": "get_current_time"}
  OR
  {"tool": "calculate", "expression": "<math expression>"}
- If no tool is needed, respond directly with normal conversational text in 1 or 2 concise sentences.
- Do NOT wrap JSON in markdown backticks or commentary when invoking a tool.
"""


def load_user_profile() -> dict:
    """Loads user profile and assistant personality from user_profile.json."""
    profile_path = ROOT_DIR / "user_profile.json"
    if profile_path.exists():
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "user_name": "Dileep",
        "assistant_name": "Pathfinder",
        "role": "Software Developer / Engineer",
        "location": "India",
        "instructions": "Always address the user as Dileep. Be friendly, helpful, and answer concisely in 1 to 2 spoken sentences."
    }


# ==============================================================================
# STEP 4: LLM REASONING (OLLAMA LLAMA 3.2 WITH USER PROFILE CONTEXT)
# ==============================================================================

def ask_llm(user_text: str) -> str:
    """Sends the user input + tools prompt to Ollama running llama3.2 with user profile context."""
    if ollama is None:
        raise ImportError("ollama python package not installed. Run: pip install ollama")

    profile = load_user_profile()
    user_name = profile.get("user_name", "Dileep")
    asst_name = profile.get("assistant_name", "Pathfinder")
    role = profile.get("role", "Software Developer / Engineer")
    loc = profile.get("location", "India")
    inst = profile.get("instructions", "Be friendly, helpful, and answer concisely in 1 to 2 spoken sentences.")

    prompt = f"""You are {asst_name}, a friendly and intelligent personal Voice AI assistant.
Current User Profile:
- Name: {user_name}
- Role / Profession: {role}
- Location: {loc}
- Tone & Style: {inst}

{TOOLS_DESCRIPTION}

User request: {user_text}
Response:"""

    print("\n[3. LLM] Sending prompt to LLM (Ollama / OpenRouter)...")
    # 1. Try local Ollama if available
    if ollama:
        try:
            response = ollama.chat(
                model="llama3.2",
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.2}
            )
            content = response["message"]["content"].strip()
            print(f"[3. LLM] Output (Local Ollama): {content}")
            return content
        except Exception as exc:
            print(f"[3. LLM] Local Ollama daemon not running ({exc}).")

    # 2. Cloud Fallback using OpenRouter API Key configured in .env
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if openrouter_key:
        print("[3. LLM] Routing to OpenRouter (Llama 3.2 Cloud)...")
        try:
            import urllib.request
            payload = json.dumps({
                "model": os.getenv("OPENROUTER_MODEL", "openrouter/free"),
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 500
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=payload,
                headers={"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"].strip()
                print(f"[3. LLM] Output (OpenRouter Llama 3.2): {content}")
                return content
        except Exception as or_err:
            print(f"[3. LLM] OpenRouter error: {or_err}")

    # 3. Simple fallback
    return "I am ready to help, but no LLM connection is currently available."


# ==============================================================================
# STEP 5: EXECUTE TOOLS + SPEAK (PIPER TTS / SOUNDDEVICE)
# ==============================================================================

def process_response(response: str) -> str:
    """Parses LLM response, executes tools if requested, or returns the reply."""
    # Attempt to parse as a tool JSON call
    try:
        # Strip potential markdown fences if model included them
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.strip()

        tool_call = json.loads(clean)
        if isinstance(tool_call, dict) and "tool" in tool_call:
            tool_name = tool_call.get("tool")
            print(f"[4. TOOLS] Executing tool: '{tool_name}'...")

            if tool_name == "get_current_time":
                time_str = get_current_time()
                return f"The current time is {time_str}."

            if tool_name == "calculate":
                expr = tool_call.get("expression", "")
                result = calculate(expr)
                return f"The result of {expr} is {result}."

    except (json.JSONDecodeError, ValueError):
        # Normal conversational response from LLM (no tool needed)
        pass

    return response


def speak(text: str, output_wav: str = "reply.wav"):
    """
    Component 5: Converts text to speech using Piper-TTS,
    plays with sounddevice, and includes a fallback for Windows.
    """
    if not text or not text.strip():
        return

    print(f"\n[5. TTS] 🔊 Speaking: \"{text}\"")
    clean_speech = text.replace('"', "'").replace("\n", " ").strip()

    piper_success = False

    # 1. Try Piper TTS if piper is installed in PATH
    try:
        cmd = f'echo "{clean_speech}" | piper --output_file {output_wav}'
        res = subprocess.run(cmd, shell=True, capture_output=True, timeout=8)
        if res.returncode == 0 and os.path.exists(output_wav):
            piper_success = True
    except Exception:
        piper_success = False

    # 2. Play piper WAV with sounddevice if successful
    if piper_success and os.path.exists(output_wav):
        try:
            sr, data = read(output_wav)
            sd.play(data, sr)
            sd.wait()
            return
        except Exception:
            pass

    # 3. Robust Windows SAPI speech fallback (uses Base64 to safely handle all apostrophes, quotes, and punctuation)
    try:
        import base64
        b64_msg = base64.b64encode(clean_speech.encode("utf-8")).decode("ascii")
        ps_cmd = (
            f"$bytes = [System.Convert]::FromBase64String('{b64_msg}'); "
            f"$msg = [System.Text.Encoding]::UTF8.GetString($bytes); "
            f"Add-Type -AssemblyName System.Speech; "
            f"$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$synthesizer.Rate = 1; "
            f"$synthesizer.Speak($msg);"
        )
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], timeout=15)
    except Exception as e:
        print(f"[5. TTS] Playback warning: {e}")


# ==============================================================================
# STEP 6: FULL CONTINUOUS LOOP
# ==============================================================================

def run_voice_agent():
    """
    Continuous conversational loop:
    Listen -> Transcribe -> Reason -> Execute Tool -> Speak -> Repeat
    """
    print("=" * 65)
    print("       5-COMPONENT LOCAL VOICE AGENT READY (LLAMA 3.2)")
    print("=" * 65)
    print("Commands:")
    print(" - Speak your questions naturally (e.g. 'What time is it?', 'Calculate 45 times 8')")
    print(" - Say 'exit', 'quit', or 'stop' to end the session.")
    print(" - Press Ctrl + C to exit anytime.\n")

    # Select Microphone
    selected_mic = select_default_microphone()
    inputs = get_input_devices()
    print("Detected Microphones:")
    for idx, name in inputs:
        marker = " 👈 ACTIVE" if idx == selected_mic else ""
        print(f"  [{idx}] {name}{marker}")
    print(f"\nDefault active mic: [{selected_mic}].")
    print("Tip: If wearing earphones/headset, use [2]. For laptop built-in mic, use [1].")
    print("     You can switch mics at any prompt by typing 1 or 2 and pressing Enter.\n")

    audio_file = "audio.wav"

    while True:
        try:
            # 1. Record Audio
            dev_name = sd.query_devices(selected_mic)['name']
            prompt = input(f"\n👉 Press [ENTER] to speak (Mic [{selected_mic}]: {dev_name}) or type mic # to switch: ").strip()

            # Allow user to switch mic on the fly
            valid_indices = [i[0] for i in inputs]
            if prompt.isdigit() and int(prompt) in valid_indices:
                selected_mic = int(prompt)
                dev_name = sd.query_devices(selected_mic)['name']
                print(f"🔄 Switched microphone to [{selected_mic}] {dev_name}")
                continue

            record_audio(filename=audio_file, duration=6, device_index=selected_mic)

            # 2. Transcribe Audio
            user_text = transcribe_audio(filename=audio_file)
            if not user_text:
                print("⚠️ [AGENT] No speech recognized. Please speak into the mic.")
                continue

            # Check exit commands
            if user_text.lower().strip().rstrip(".!?") in ("exit", "quit", "stop", "bye", "goodbye"):
                speak("Goodbye! Have a great day.")
                print("\n[AGENT] Session ended by user request.")
                break

            # 3. LLM Reasoning
            llm_response = ask_llm(user_text)

            # 4. Process Tool or Reply
            final_response = process_response(llm_response)

            # 5. Speak Result
            speak(final_response)

        except KeyboardInterrupt:
            print("\n\n[AGENT] Voice agent stopped by user.")
            break
        except Exception as loop_err:
            print(f"\n[ERROR] Unexpected error in loop: {loop_err}")
            time.sleep(1)


if __name__ == "__main__":
    run_voice_agent()
