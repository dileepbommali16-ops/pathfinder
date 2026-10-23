/**
 * Avatar Deformation Rig (client/src/voice/avatar/rig.ts)
 * Applies idle skeletal transforms, eyelid blink scaling (0 to 1), and mouth morphing.
 */

import { MeshParts } from "./faceMesh";
import { IdleTransform } from "./idle";
import { VisemeMorphWeights } from "./visemes";

export class AvatarRig {
  private parts: MeshParts;

  constructor(parts: MeshParts) {
    this.parts = parts;
  }

  public applyTransform(idle: IdleTransform, visemes: VisemeMorphWeights, audioRMS: number) {
    const {
      headGroup,
      leftEye,
      rightEye,
      leftEyelid,
      rightEyelid,
      mouthMesh,
      upperLip,
      lowerLip,
    } = this.parts;

    // 1. Skeletal Micro-motion
    headGroup.position.y = idle.positionY;
    headGroup.rotation.x = idle.rotationX;
    headGroup.rotation.y = idle.rotationY;
    headGroup.rotation.z = idle.rotationZ;

    // 2. Gaze Shift
    leftEye.position.x = -0.35 + idle.gazeX * 0.05;
    leftEye.position.y = 0.22 + idle.gazeY * 0.04;
    rightEye.position.x = 0.35 + idle.gazeX * 0.05;
    rightEye.position.y = 0.22 + idle.gazeY * 0.04;

    // 3. Eyelid Blinking (Smooth parabolic shutter close & eye squash)
    const blinkAmount = Math.max(0.0, Math.min(1.0, idle.eyeBlinkProgress));
    const eyeScaleY = 0.72 * Math.max(0.05, 1.0 - blinkAmount * 0.95);
    leftEye.scale.y = eyeScaleY;
    rightEye.scale.y = eyeScaleY;

    // Eyelid Shutter Descends smoothly over the glowing red optical sockets
    const eyelidScaleY = 0.08 + blinkAmount * 1.35;
    leftEyelid.scale.y = eyelidScaleY;
    rightEyelid.scale.y = eyelidScaleY;
    leftEyelid.position.y = 0.28 - blinkAmount * 0.06;
    rightEyelid.position.y = 0.28 - blinkAmount * 0.06;

    // 4. Mouth Morphing & Jaw Drop (Zero-latency natural lip sync)
    // Blend phonetic viseme weights with live audio RMS loudness
    const speechActiveRMS = audioRMS > 0.02 ? audioRMS : (visemes.jawOpen > 0.05 ? 0.35 : 0.0);
    const jawDrop = Math.max(visemes.jawOpen * 1.2, speechActiveRMS * 0.95);
    const targetScaleY = 1.0 + jawDrop * 3.8;
    const targetScaleX = 1.0 + visemes.mouthWide * 0.5 - visemes.mouthRound * 0.35;

    mouthMesh.scale.y += (targetScaleY - mouthMesh.scale.y) * 0.45;
    mouthMesh.scale.x += (targetScaleX - mouthMesh.scale.x) * 0.45;

    lowerLip.position.y = -0.03 - jawDrop * 0.22;
    upperLip.position.y = 0.03 + (visemes.upperLipRaise * 0.06);
  }
}
