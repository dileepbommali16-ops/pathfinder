/**
 * Avatar Idle & Animation Controller (client/src/voice/avatar/idle.ts)
 * Manages procedural skeletal breathing sway, eye micro-saccades, blink scheduling (3-5s / 120-180ms),
 * state transitions (listening tilt, thinking gaze), and prefers-reduced-motion detection.
 */

export type AvatarState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface IdleTransform {
  positionY: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  eyeBlinkProgress: number; // 0 = open, 1 = closed
  gazeX: number;
  gazeY: number;
  browRaise: number;
  smile: number;
}

export class IdleController {
  private lastBlinkTime: number = performance.now();
  private nextBlinkInterval: number = 3200; // 3 to 5 seconds
  private isBlinking: boolean = false;
  private blinkStartTime: number = 0;
  private isDoubleBlink: boolean = false;
  private prefersReducedMotion: boolean = false;

  constructor() {
    if (typeof window !== "undefined" && window.matchMedia) {
      this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }

  public update(now: number, state: AvatarState, elapsedTime: number): IdleTransform {
    if (this.prefersReducedMotion) {
      return {
        positionY: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        eyeBlinkProgress: 0,
        gazeX: 0,
        gazeY: 0,
        browRaise: 0,
        smile: 0.05,
      };
    }

    // 1. Organic Breathing Sway (Sine waves)
    let posY = Math.sin(elapsedTime * 1.5) * 0.04;
    let rotX = Math.sin(elapsedTime * 0.8) * 0.015;
    let rotY = Math.cos(elapsedTime * 1.0) * 0.025;
    let rotZ = Math.sin(elapsedTime * 0.6) * 0.008;

    let gazeX = 0;
    let gazeY = 0;
    let browRaise = 0;
    let smile = 0.05;

    // 2. Behavioral State Modifications
    if (state === "listening") {
      // Attentive forward tilt & slight roll
      rotX += 0.04;
      rotZ += 0.02;
      browRaise = 0.15;
    } else if (state === "thinking") {
      // Eyes drift up and to the side, slight upward head tilt
      rotX -= 0.03;
      rotY += 0.04;
      gazeX = 0.15;
      gazeY = 0.12;
      browRaise = 0.08;
    } else if (state === "speaking") {
      // Dynamic conversational micro-nods
      rotX += Math.sin(elapsedTime * 3.5) * 0.02;
      smile = 0.12;
    }

    // 3. Procedural Eye Blinking (Every 3-5 seconds, 120-180ms smooth closure)
    if (!this.isBlinking && now - this.lastBlinkTime > this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkStartTime = now;
      this.isDoubleBlink = Math.random() < 0.22; // 22% chance of natural double blink
    }

    let eyeBlinkProgress = 0;
    if (this.isBlinking) {
      const blinkDuration = this.isDoubleBlink ? 300 : 150;
      const progress = (now - this.blinkStartTime) / blinkDuration;

      if (progress < 1.0) {
        if (this.isDoubleBlink) {
          // Double sine wave
          eyeBlinkProgress = Math.abs(Math.sin(progress * Math.PI * 2));
        } else {
          // Single parabolic closure 0 -> 1 -> 0
          eyeBlinkProgress = Math.sin(progress * Math.PI);
        }
      } else {
        this.isBlinking = false;
        this.lastBlinkTime = now;
        this.nextBlinkInterval = 3000 + Math.random() * 2000; // 3 to 5 seconds
        eyeBlinkProgress = 0;
      }
    }

    return {
      positionY: posY,
      rotationX: rotX,
      rotationY: rotY,
      rotationZ: rotZ,
      eyeBlinkProgress,
      gazeX,
      gazeY,
      browRaise,
      smile,
    };
  }
}
