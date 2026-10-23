/**
 * Avatar Deformation Rig (client/src/voice/avatar/rig.ts)
 * Applies idle skeletal transforms, realistic eyelid rotation blinking (0 to 1),
 * ocular gaze saccades, and responsive lip-sync mouth morphing.
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
      leftPupil,
      rightPupil,
      leftEyelid,
      rightEyelid,
      mouthMesh,
      upperLip,
      lowerLip,
    } = this.parts;

    // 1. Skeletal Breathing Micro-motion & Natural Head Sway
    headGroup.position.y = idle.positionY;
    headGroup.rotation.x = idle.rotationX;
    headGroup.rotation.y = idle.rotationY;
    headGroup.rotation.z = idle.rotationZ;

    // 2. Ocular Gaze Tracking & Micro-Saccades
    const gazeOffsetX = idle.gazeX * 0.04;
    const gazeOffsetY = idle.gazeY * 0.035;

    leftEye.position.x = -0.35 + gazeOffsetX;
    leftEye.position.y = 0.22 + gazeOffsetY;
    rightEye.position.x = 0.35 + gazeOffsetX;
    rightEye.position.y = 0.22 + gazeOffsetY;

    if (leftPupil && rightPupil) {
      leftPupil.position.x = -0.35 + gazeOffsetX * 1.2;
      leftPupil.position.y = 0.22 + gazeOffsetY * 1.2;
      rightPupil.position.x = 0.35 + gazeOffsetX * 1.2;
      rightPupil.position.y = 0.22 + gazeOffsetY * 1.2;
    }

    // 3. Realistic Anatomical Eyelid Blinking (Shell Rotates Down Smoothly)
    const blinkAmount = Math.max(0.0, Math.min(1.0, idle.eyeBlinkProgress));
    
    // Rotate eyelid shell down over the sphere (from -Math.PI * 0.55 open down to 0 closed)
    const targetEyelidRotX = -Math.PI * 0.55 + blinkAmount * Math.PI * 0.55;
    leftEyelid.rotation.x = targetEyelidRotX;
    rightEyelid.rotation.x = targetEyelidRotX;

    // Subtle eye squash on blink
    const eyeScaleY = 0.72 * Math.max(0.12, 1.0 - blinkAmount * 0.88);
    leftEye.scale.y = eyeScaleY;
    rightEye.scale.y = eyeScaleY;

    // 4. Real-Time Lip-Sync & Jaw Morphing
    const speechActiveRMS = audioRMS > 0.02 ? audioRMS : (visemes.jawOpen > 0.04 ? 0.4 : 0.0);
    const jawDrop = Math.max(visemes.jawOpen * 1.35, speechActiveRMS * 1.15);

    // Expand oral cavity
    const targetScaleY = 1.0 + jawDrop * 4.2;
    const targetScaleX = 1.0 + visemes.mouthWide * 0.55 - visemes.mouthRound * 0.4;
    mouthMesh.scale.y += (targetScaleY - mouthMesh.scale.y) * 0.5;
    mouthMesh.scale.x += (targetScaleX - mouthMesh.scale.x) * 0.5;

    // Separate upper Cupid's bow and plump lower lip
    lowerLip.position.y = -0.04 - jawDrop * 0.28;
    upperLip.position.y = 0.04 + (visemes.upperLipRaise * 0.09);
    lowerLip.scale.x = 1.0 + visemes.mouthWide * 0.3;
    upperLip.scale.x = 1.0 + visemes.mouthWide * 0.3;
  }
}
