"""
Pathfinder DAS Agent: 3D Holographic Cybernetic Avatar Mesh Engine
Loads core/face_model.obj and applies:
1. Split Shader Architecture: Left half cyan wireframe matrix, Right half solid glossy metallic blue.
2. Continuous idle breathing micro-motion & rhythmic rotation.
3. Natural procedural eye blinking every 3-5 seconds (150ms parabolic closure).
4. Real-time Viseme morph target jaw/mouth displacement.
"""

import os
import math
import time
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

from core.viseme import VisemeWeights


class AvatarMesh:
    """
    3D Cybernetic Face Mesh Manager with morph targets, blinking, and visemes.
    Loads and transforms core/face_model.obj in real-time.
    """

    def __init__(self, obj_path: Optional[str] = None):
        self.base_dir = Path(__file__).resolve().parent
        self.obj_path = Path(obj_path) if obj_path else self.base_dir / "face_model.obj"

        # Geometry arrays
        self.base_vertices: np.ndarray = np.zeros((0, 3), dtype=np.float32)
        self.current_vertices: np.ndarray = np.zeros((0, 3), dtype=np.float32)
        self.normals: np.ndarray = np.zeros((0, 3), dtype=np.float32)
        self.texcoords: np.ndarray = np.zeros((0, 2), dtype=np.float32)
        self.faces: List[List[int]] = []

        # Anatomical vertex index clusters
        self.jaw_indices: List[int] = []
        self.mouth_indices: List[int] = []
        self.left_eye_indices: List[int] = []
        self.right_eye_indices: List[int] = []
        self.brow_indices: List[int] = []

        # Material partition (Left wireframe vs Right solid)
        self.wireframe_face_indices: List[int] = []
        self.solid_face_indices: List[int] = []

        # Blinking state
        self.last_blink_time = time.time()
        self.next_blink_interval = 3.5  # 3 to 5 seconds
        self.is_blinking = False
        self.blink_start_time = 0.0

        # Load and parse model
        self.load_obj(self.obj_path)

    def load_obj(self, filepath: Path) -> bool:
        """Parses Wavefront .obj geometry and builds vertex clusters."""
        if not filepath.exists():
            return False

        verts, uvs, norms, faces = [], [], [], []

        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                tokens = line.split()
                prefix = tokens[0]

                if prefix == "v" and len(tokens) >= 4:
                    verts.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
                elif prefix == "vt" and len(tokens) >= 3:
                    uvs.append([float(tokens[1]), float(tokens[2])])
                elif prefix == "vn" and len(tokens) >= 4:
                    norms.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
                elif prefix == "f":
                    face_idx = []
                    for t in tokens[1:]:
                        v_idx = int(t.split("/")[0]) - 1
                        face_idx.append(v_idx)
                    faces.append(face_idx)

        self.base_vertices = np.array(verts, dtype=np.float32)
        self.current_vertices = self.base_vertices.copy()
        self.texcoords = np.array(uvs, dtype=np.float32) if uvs else np.zeros((len(verts), 2), dtype=np.float32)
        self.normals = np.array(norms, dtype=np.float32) if norms else np.zeros((len(verts), 3), dtype=np.float32)
        self.faces = faces

        # Categorize facial landmarks based on anatomical coordinate clusters
        for i, (x, y, z) in enumerate(self.base_vertices):
            # Mouth and jaw region
            if y < -0.28 and y > -0.65 and abs(x) < 0.28 and z > 0.0:
                self.mouth_indices.append(i)
            if y <= -0.45 and z > 0.0:
                self.jaw_indices.append(i)

            # Left eye region (anatomical x < 0 in mirror, or negative x)
            if abs(y - 0.25) < 0.12 and abs(x - 0.35) < 0.16 and z > 0.1:
                self.right_eye_indices.append(i)
            elif abs(y - 0.25) < 0.12 and abs(x + 0.35) < 0.16 and z > 0.1:
                self.left_eye_indices.append(i)

            # Eyebrow region
            if y > 0.38 and y < 0.60 and z > 0.2:
                self.brow_indices.append(i)

        # Split Shader assignment: Left half (x < 0) is Cyan Wireframe, Right half (x >= 0) is Solid Metallic Blue
        for f_idx, face in enumerate(self.faces):
            avg_x = sum(self.base_vertices[v][0] for v in face) / len(face)
            if avg_x < 0.0:
                self.wireframe_face_indices.append(f_idx)
            else:
                self.solid_face_indices.append(f_idx)

        return True

    def update_frame(self, current_time: float, visemes: VisemeWeights) -> Dict[str, Any]:
        """
        Updates mesh vertices for current frame with breathing sway, blinking, and visemes.
        Returns serialized payload for rendering.
        """
        # 1. Reset to base
        self.current_vertices = self.base_vertices.copy()

        # 2. Procedural Eye Blinking (Every 3-5 seconds, 150ms parabolic duration)
        blink_factor = 0.0
        if not self.is_blinking and (current_time - self.last_blink_time > self.next_blink_interval):
            self.is_blinking = True
            self.blink_start_time = current_time

        if self.is_blinking:
            elapsed = current_time - self.blink_start_time
            if elapsed < 0.150:
                # 0.0 -> 1.0 -> 0.0 smooth sine curve
                blink_factor = math.sin((elapsed / 0.150) * math.pi)
            else:
                self.is_blinking = False
                self.last_blink_time = current_time
                self.next_blink_interval = 3.0 + (math.sin(current_time) * 0.5 + 0.5) * 2.0  # 3-5s variation

        # Apply eye vertical compression to 0 during blink
        if blink_factor > 0.01:
            for idx in self.left_eye_indices:
                orig_y = self.base_vertices[idx][1]
                eye_center_y = 0.25
                self.current_vertices[idx][1] = eye_center_y + (orig_y - eye_center_y) * (1.0 - blink_factor * 0.95)

            for idx in self.right_eye_indices:
                orig_y = self.base_vertices[idx][1]
                eye_center_y = 0.25
                self.current_vertices[idx][1] = eye_center_y + (orig_y - eye_center_y) * (1.0 - blink_factor * 0.95)

        # 3. Viseme Morph Target Displacement (Lip-Syncing)
        jaw_open = visemes.jaw_open
        mouth_wide = visemes.mouth_wide

        if jaw_open > 0.01:
            # Drop jaw and lower mouth downward
            for idx in self.jaw_indices:
                weight = max(0.0, 1.0 - abs(self.base_vertices[idx][0]) / 0.35)
                self.current_vertices[idx][1] -= jaw_open * 0.18 * weight
                self.current_vertices[idx][2] += jaw_open * 0.04 * weight

            for idx in self.mouth_indices:
                weight = max(0.0, 1.0 - abs(self.base_vertices[idx][0]) / 0.25)
                # Lower lip drops
                if self.base_vertices[idx][1] < -0.42:
                    self.current_vertices[idx][1] -= jaw_open * 0.14 * weight
                else:
                    # Upper lip lifts slightly
                    self.current_vertices[idx][1] += jaw_open * 0.03 * weight

        if mouth_wide > 0.01:
            for idx in self.mouth_indices:
                x_val = self.base_vertices[idx][0]
                sign = 1.0 if x_val > 0 else -1.0
                self.current_vertices[idx][0] += sign * mouth_wide * 0.04

        # 4. Continuous Idle Breathing Micro-Motion
        # Sine-wave translation and rotation
        sway_y = math.sin(current_time * 1.5) * 0.05
        sway_rot_y = math.cos(current_time * 1.0) * 0.025
        sway_rot_x = math.sin(current_time * 0.8) * 0.015

        return {
            "time": current_time,
            "blink_factor": round(blink_factor, 3),
            "sway": {
                "translateY": round(sway_y, 4),
                "rotateY": round(sway_rot_y, 4),
                "rotateX": round(sway_rot_x, 4)
            },
            "visemes": visemes.to_dict(),
            "vertex_count": len(self.current_vertices),
            "face_count": len(self.faces)
        }

    def get_mesh_definition(self) -> Dict[str, Any]:
        """Exports base mesh topology, material groups, and indices for WebGL rendering."""
        return {
            "vertices": self.base_vertices.tolist(),
            "normals": self.normals.tolist(),
            "texcoords": self.texcoords.tolist(),
            "faces": self.faces,
            "wireframe_faces": self.wireframe_face_indices,
            "solid_faces": self.solid_face_indices,
            "mouth_indices": self.mouth_indices,
            "jaw_indices": self.jaw_indices,
            "left_eye_indices": self.left_eye_indices,
            "right_eye_indices": self.right_eye_indices,
        }
