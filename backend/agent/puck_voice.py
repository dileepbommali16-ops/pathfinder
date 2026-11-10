import base64
from google.genai import types

PUCK_SAMPLE_RATE = 24000
MIC_INPUT_SAMPLE_RATE = 16000

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

def encode_pcm_24khz(raw_pcm_bytes: bytes) -> dict:
    """
    Packages raw 24kHz 16-bit PCM bytes from Gemini Puck voice into a JSON payload
    for the frontend Web Audio FFT lip-sync engine.
    """
    return {
        "type": "audio",
        "voice": "Puck",
        "sample_rate": PUCK_SAMPLE_RATE,
        "pcm_base64": base64.b64encode(raw_pcm_bytes).decode("utf-8")
    }
