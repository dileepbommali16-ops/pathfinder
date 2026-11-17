import os
import base64
from google.genai import types

SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
PUCK_SAMPLE_RATE = RECEIVE_SAMPLE_RATE
CHUNK_SIZE = 1024

# Production-grade Gemini Multimodal Live model locked to gemini-3.8-live with 'Puck' voice
DEFAULT_LIVE_MODEL = "gemini-3.8-live"
RAW_MODEL = os.getenv("GEMINI_LIVE_MODEL", DEFAULT_LIVE_MODEL).strip()
if not RAW_MODEL or "2.0-flash-exp" in RAW_MODEL:
    RAW_MODEL = DEFAULT_LIVE_MODEL
LIVE_MODEL = RAW_MODEL.replace("models/", "")

# Ensure google-genai WebSocket setup payload always serializes speechConfig in canonical camelCase
try:
    from google.genai import _live_converters as _lc

    _orig_live_cfg_to_mldev = getattr(_lc, "_LiveConnectConfig_to_mldev", None)
    if callable(_orig_live_cfg_to_mldev) and not getattr(_lc, "_puck_camel_patched", False):
        def _patched_live_cfg_to_mldev(api_client, from_object, parent_object=None):
            res = _orig_live_cfg_to_mldev(api_client, from_object, parent_object)
            if isinstance(parent_object, dict):
                setup_obj = parent_object.setdefault("setup", {})
                gen_cfg = setup_obj.setdefault("generationConfig", {})
                gen_cfg["speechConfig"] = {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": "Puck",
                        }
                    }
                }
            return res

        _lc._LiveConnectConfig_to_mldev = _patched_live_cfg_to_mldev
        _lc._puck_camel_patched = True
except Exception:
    pass


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
    LiveConnectConfig calibrated for ultra-responsive Multimodal Live streaming:
    - Voice: Puck (24kHz)
    - High-resolution video frame perception & full A/V turn coverage
    - Sliding-window context compression to avoid abrupt session drops
    - Tuned automatic VAD for reliable capture across headsets, buds, and laptop mics
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

    if hasattr(types, "MediaResolution"):
        kwargs["media_resolution"] = types.MediaResolution.MEDIA_RESOLUTION_HIGH

    if hasattr(types, "ContextWindowCompressionConfig") and hasattr(types, "SlidingWindow"):
        kwargs["context_window_compression"] = types.ContextWindowCompressionConfig(
            sliding_window=types.SlidingWindow()
        )

    if hasattr(types, "RealtimeInputConfig"):
        rt_kwargs = {}
        if hasattr(types, "TurnCoverage"):
            rt_kwargs["turn_coverage"] = (
                types.TurnCoverage.TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO
            )
        if (
            hasattr(types, "AutomaticActivityDetection")
            and hasattr(types, "StartSensitivity")
            and hasattr(types, "EndSensitivity")
        ):
            rt_kwargs["automatic_activity_detection"] = types.AutomaticActivityDetection(
                start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_HIGH,
                end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_HIGH,
                prefix_padding_ms=100,
                silence_duration_ms=340,
            )
        if rt_kwargs:
            kwargs["realtime_input_config"] = types.RealtimeInputConfig(**rt_kwargs)

    return types.LiveConnectConfig(**kwargs)

def format_audio_packet(pcm_bytes: bytes) -> dict:
    """
    Packages raw 24kHz 16-bit PCM bytes from Gemini Puck voice into a JSON payload
    for the frontend Web Audio FFT lip-sync engine.
    """
    return {
        "type": "audio",
        "voice": "DAS Neural",
        "sample_rate": RECEIVE_SAMPLE_RATE,
        "pcm_base64": base64.b64encode(pcm_bytes).decode("utf-8"),
    }

encode_pcm_24khz = format_audio_packet
