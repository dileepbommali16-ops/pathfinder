"""
Pathfinder DAS Agent: Real-Time Audio Viseme Engine
Converts Gemini Live 24kHz PCM audio streams into synchronized 3D lip-sync morph targets.
"""

import math
import numpy as np
from dataclasses import dataclass
from typing import Dict, Any, List, Optional


@dataclass
class VisemeWeights:
    jaw_open: float = 0.0        # 0.0 (closed) -> 1.0 (fully open)
    mouth_wide: float = 0.0      # 0.0 -> 1.0 (spread lips: 'ee')
    mouth_round: float = 0.0     # 0.0 -> 1.0 (puckered lips: 'oo')
    upper_lip_raise: float = 0.0 # 0.0 -> 1.0
    volume: float = 0.0          # RMS energy [0.0, 1.0]

    def to_dict(self) -> Dict[str, float]:
        return {
            "jawOpen": round(self.jaw_open, 3),
            "mouthWide": round(self.mouth_wide, 3),
            "mouthRound": round(self.mouth_round, 3),
            "upperLipRaise": round(self.upper_lip_raise, 3),
            "volume": round(self.volume, 3),
        }


class VisemeEngine:
    """
    Sub-50ms latency audio-to-viseme processor.
    Accepts raw 16-bit PCM (e.g., 24000Hz from Gemini Live BidiGenerateContent)
    and computes continuous mouth morph targets.
    """

    def __init__(self, sample_rate: int = 24000):
        self.sample_rate = sample_rate
        self.current_weights = VisemeWeights()
        self.smoothing = 0.35  # Damped spring smoothing factor
        self._last_jaw = 0.0
        self._last_wide = 0.0
        self._last_round = 0.0

    def process_pcm_chunk(self, pcm_bytes: bytes) -> VisemeWeights:
        """
        Processes a raw PCM 16-bit little-endian byte buffer and returns smoothed visemes.
        """
        if not pcm_bytes or len(pcm_bytes) < 2:
            return self.decay()

        try:
            # Convert raw bytes to normalized int16 -> float32 [-1.0, 1.0]
            samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        except Exception:
            return self.decay()

        if len(samples) == 0:
            return self.decay()

        # 1. Root Mean Square (RMS) energy / volume
        rms = float(np.sqrt(np.mean(samples ** 2)))
        # Normalize and apply noise gate
        volume = max(0.0, min(1.0, (rms - 0.015) * 4.5))

        # 2. Spectral Analysis (FFT for vowel/consonant formant detection)
        jaw_target = 0.0
        wide_target = 0.0
        round_target = 0.0

        if volume > 0.02:
            try:
                # 256-point windowed FFT
                n_fft = min(len(samples), 512)
                window = np.hanning(n_fft)
                fft_vals = np.abs(np.fft.rfft(samples[:n_fft] * window))
                freqs = np.fft.rfftfreq(n_fft, d=1.0 / self.sample_rate)

                # Formant band energy filters
                # F1 (250 - 750 Hz): Low vowels 'aa', 'ah' -> drives jaw open
                f1_mask = (freqs >= 250) & (freqs <= 750)
                f1_energy = float(np.mean(fft_vals[f1_mask])) if np.any(f1_mask) else 0.0

                # F2 (1200 - 2400 Hz): Front vowels 'ee', 'ae' -> drives mouth wide
                f2_mask = (freqs >= 1200) & (freqs <= 2400)
                f2_energy = float(np.mean(fft_vals[f2_mask])) if np.any(f2_mask) else 0.0

                # Rounding / Nasal band (400 - 1100 Hz): 'oh', 'oo'
                round_mask = (freqs >= 400) & (freqs <= 1100)
                round_energy = float(np.mean(fft_vals[round_mask])) if np.any(round_mask) else 0.0

                # Formant weighting scaled by overall volume
                jaw_target = min(1.0, volume * 1.6 + f1_energy * 0.15)
                wide_target = min(0.9, f2_energy * 0.25 * volume)
                round_target = min(0.85, round_energy * 0.22 * volume)
            except Exception:
                jaw_target = min(1.0, volume * 1.8)

        # 3. Temporal Spring Smoothing for natural anatomical motion
        jaw_open = self._last_jaw + (jaw_target - self._last_jaw) * self.smoothing
        mouth_wide = self._last_wide + (wide_target - self._last_wide) * self.smoothing
        mouth_round = self._last_round + (round_target - self._last_round) * self.smoothing

        self._last_jaw = jaw_open
        self._last_wide = mouth_wide
        self._last_round = mouth_round

        self.current_weights = VisemeWeights(
            jaw_open=jaw_open,
            mouth_wide=mouth_wide,
            mouth_round=mouth_round,
            upper_lip_raise=jaw_open * 0.18,
            volume=volume
        )
        return self.current_weights

    def decay(self) -> VisemeWeights:
        """Smoothly returns visemes toward resting neutral posture."""
        self._last_jaw *= 0.65
        self._last_wide *= 0.65
        self._last_round *= 0.65
        self.current_weights = VisemeWeights(
            jaw_open=max(0.0, self._last_jaw),
            mouth_wide=max(0.0, self._last_wide),
            mouth_round=max(0.0, self._last_round),
            upper_lip_raise=0.0,
            volume=0.0
        )
        return self.current_weights


# Global singleton instance
viseme_engine = VisemeEngine(sample_rate=24000)
