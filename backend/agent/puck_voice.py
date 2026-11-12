import os
import base64
from google.genai import types

SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
PUCK_SAMPLE_RATE = RECEIVE_SAMPLE_RATE
CHUNK_SIZE = 1024

# Production-grade Gemini Multimodal Live model locked to supported Gemini Live endpoint
RAW_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.0-flash-exp").strip()
if "3.8" in RAW_MODEL or not RAW_MODEL:
    RAW_MODEL = "gemini-2.0-flash-exp"
LIVE_MODEL = RAW_MODEL.replace("models/", "")

def get_puck_speech_config() -> types.SpeechConfig:
    """
    Returns Gemini Multimodal Live API speech configuration locked to the 'Puck' voice.
    """
    return types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Puck"
            )
        )
    )

def create_gemini_live_config(system_prompt: str, tools_list: list) -> types.LiveConnectConfig:
    """
    LiveConnectConfig from Google AI Studio settings:
    - Voice: Puck (24kHz)
    - Tools: Function Calling + Google Search Grounding
    - Real-time input & output speech transcription enabled
    """
    kwargs = {
        "response_modalities": ["AUDIO"],
        "speech_config": get_puck_speech_config(),
        "system_instruction": types.Content(
            parts=[types.Part.from_text(text=system_prompt)]
        ),
        "tools": tools_list,
        "temperature": 0.25,
    }

    if hasattr(types, "AudioTranscriptionConfig"):
        kwargs["input_audio_transcription"] = types.AudioTranscriptionConfig()
        kwargs["output_audio_transcription"] = types.AudioTranscriptionConfig()

    return types.LiveConnectConfig(**kwargs)

def format_audio_packet(pcm_bytes: bytes) -> dict:
    """
    Packages raw 24kHz 16-bit PCM bytes from Gemini Puck voice into a JSON payload
    for the frontend Web Audio FFT lip-sync engine.
    """
    return {
        "type": "audio",
        "voice": "Puck",
        "sample_rate": RECEIVE_SAMPLE_RATE,
        "pcm_base64": base64.b64encode(pcm_bytes).decode("utf-8"),
    }

encode_pcm_24khz = format_audio_packet
