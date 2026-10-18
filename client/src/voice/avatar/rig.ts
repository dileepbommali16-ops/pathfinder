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
    leftEye.position.x = -0.36 + idle.gazeX * 0.05;
    leftEye.position.y = 0.19 + idle.gazeY * 0.05;
    rightEye.position.x = 0.36 + idle.gazeX * 0.05;
    rightEye.position.y = 0.19 + idle.gazeY * 0.05;

    // 3. Eyelid Blinking (Scale Y down to 0 for blink duration)
    const eyeScaleY = Math.max(0.0, 1.0 - idle.eyeBlinkProgress);
    leftEye.scale.y = eyeScaleY;
    rightEye.scale.y = eyeScaleY;

    // Eyelid coverage
    leftEyelid.scale.y = 1.0 + idle.eyeBlinkProgress * 1.5;
    rightEyelid.scale.y = 1.0 + idle.eyeBlinkProgress * 1.5;

    // 4. Mouth Morphing & Jaw Drop
    // Blend visemes + live RMS volume
    const jawDrop = Math.max(visemes.jawOpen, audioRMS * 0.7);
    const targetScaleY = 1.0 + jawDrop * 2.5;
    const targetScaleX = 1.0 + visemes.mouthWide * 0.4 - visemes.mouthRound * 0.3;

    mouthMesh.scale.y += (targetScaleY - mouthMesh.scale.y) * 0.4;
    mouthMesh.scale.x += (targetScaleX - mouthMesh.scale.x) * 0.4;

    lowerLip.position.y = -0.03 - jawDrop * 0.14;
    upperLip.position.y = 0.03 + visemes.upperLipRaise * 0.04;
  }
}
