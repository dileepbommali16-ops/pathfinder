/**
 * Echo Cancellation & Half-Duplex Barge-in Gating (client/src/voice/echo.ts)
 * Pathfinder DAS Browser Audio Gating:
 * 1. Self-calibrating loudness threshold so agent does not re-hear its own speech.
 * 2. Clean voice barge-in trigger.
 * 3. One-time headphone hint if feedback/echo is detected.
 */

export interface EchoOptions {
  onBargeIn?: () => void;
  onHeadphonesHint?: () => void;
}

export class EchoGateManager {
  private isAgentSpeaking: boolean = false;
  private noiseBaseline: number = 0.05;
  private calibrationSamples: number[] = [];
  private echoCount: number = 0;
  private hasShownHeadphonesHint: boolean = false;
  private onBargeIn?: () => void;
  private onHeadphonesHint?: () => void;

  constructor(options: EchoOptions = {}) {
    this.onBargeIn = options.onBargeIn;
    this.onHeadphonesHint = options.onHeadphonesHint;
  }

  public setAgentSpeaking(speaking: boolean) {
    this.isAgentSpeaking = speaking;
  }

  /**
   * Evaluates an incoming audio frame RMS from the microphone.
   * Returns: true if the mic frame should be transmitted to the agent, false if gated out.
   */
  public evaluateMicFrame(micRMS: number): boolean {
    // 1. Dynamic calibration when agent is idle
    if (!this.isAgentSpeaking) {
      this.calibrationSamples.push(micRMS);
      if (this.calibrationSamples.length > 50) {
        this.calibrationSamples.shift();
      }
      const avg = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
      this.noiseBaseline = Math.max(0.02, avg);
      return micRMS > this.noiseBaseline * 1.2;
    }

    // 2. Half-duplex gating while agent is speaking:
    // Requires loudness significantly higher than the calibrated speaker reflection
    const bargeInThreshold = Math.max(0.25, this.noiseBaseline * 3.5);

    if (micRMS > bargeInThreshold) {
      // User is deliberately speaking over the agent -> Trigger Clean Barge-in
      if (this.onBargeIn) {
        this.onBargeIn();
      }
      return true;
    } else if (micRMS > this.noiseBaseline * 1.5) {
      // Possible speaker echo feedback loop detected
      this.echoCount++;
      if (this.echoCount > 8 && !this.hasShownHeadphonesHint) {
        this.hasShownHeadphonesHint = true;
        if (this.onHeadphonesHint) {
          this.onHeadphonesHint();
        }
      }
      return false; // Gated out so agent does not hear itself
    }

    return false;
  }
}
