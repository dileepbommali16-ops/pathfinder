"""
Pathfinder DAS Agent: Core Avatar Controller
Manages 3D avatar lifecycle, animation loop, audio-to-morph dispatch, and state machine.
"""

import time
import math
import asyncio
from typing import Dict, Any, Optional, Callable, List

from core.avatar_mesh import AvatarMesh
from core.viseme import VisemeEngine, VisemeWeights, viseme_engine


class AvatarController:
    """
    Central controller driving the 3D Holographic DAS Face in the viewport.
    """

    def __init__(self, obj_path: Optional[str] = None):
        self.mesh = AvatarMesh(obj_path=obj_path)
        self.viseme_engine = viseme_engine
        self.state: str = "idle"  # "idle" | "listening" | "thinking" | "speaking"
        self.is_speaking: bool = False
        self.current_spoken_text: str = ""
        self.last_update_time: float = time.time()

        # Listeners for real-time frame broadcasts (e.g. WebSocket clients)
        self._frame_listeners: List[Callable[[Dict[str, Any]], None]] = []

    def add_frame_listener(self, listener: Callable[[Dict[str, Any]], None]):
        """Registers a listener callback for real-time mesh update frames."""
        self._frame_listeners.append(listener)

    def set_state(self, new_state: str):
        """Updates agent conversational state."""
        if new_state in ("idle", "listening", "thinking", "speaking"):
            self.state = new_state
            self.is_speaking = (new_state == "speaking")

    def on_audio_pcm_received(self, pcm_bytes: bytes) -> VisemeWeights:
        """
        Feeds raw 24kHz PCM from Gemini Live directly into the viseme engine
        and updates avatar mouth morphing.
        """
        self.set_state("speaking")
        visemes = self.viseme_engine.process_pcm_chunk(pcm_bytes)
        return visemes

    def on_audio_stream_complete(self):
        """Invoked when Gemini Live turns finish playing audio."""
        self.viseme_engine.decay()
        self.set_state("idle")

    def get_current_frame(self) -> Dict[str, Any]:
        """Calculates current 3D frame telemetry."""
        now = time.time()
        visemes = self.viseme_engine.current_weights if self.is_speaking else self.viseme_engine.decay()
        frame_data = self.mesh.update_frame(now, visemes)
        frame_data["agent_state"] = self.state
        frame_data["is_speaking"] = self.is_speaking
        frame_data["spoken_text"] = self.current_spoken_text
        return frame_data

    def notify_frame(self):
        """Pushes current frame to all connected listeners."""
        frame = self.get_current_frame()
        for listener in self._frame_listeners:
            try:
                listener(frame)
            except Exception:
                pass


# Global singleton instance
avatar_controller = AvatarController()
