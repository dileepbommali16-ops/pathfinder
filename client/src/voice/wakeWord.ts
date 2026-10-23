/**
 * Hands-Free Wake Word Detector for Pathfinder DAS (client/src/voice/wakeWord.ts)
 * Continuously listens in low-power browser recognition loop for "Hey Pathfinder" or "Hey DAS".
 * Automatically triggers active voice session when recognized without requiring mouse/touch input.
 */

export interface WakeWordOptions {
  onWake: (detectedPhrase: string) => void;
  onError?: (err: any) => void;
  enabled?: boolean;
}

export class WakeWordDetector {
  private recognition: any = null;
  private isRunning: boolean = false;
  private onWake: (detectedPhrase: string) => void;
  private onError?: (err: any) => void;
  private enabled: boolean = false;
  private wakePhrases = [
    "hey pathfinder",
    "pathfinder",
    "hey das",
    "das agent",
    "hi pathfinder",
    "hello pathfinder",
    "ok pathfinder",
  ];

  constructor(options: WakeWordOptions) {
    this.onWake = options.onWake;
    this.onError = options.onError;
    this.enabled = options.enabled ?? false;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public start() {
    if (this.isRunning || !this.enabled) return;
    if (typeof window === "undefined") return;

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript.toLowerCase();
        }

        for (const phrase of this.wakePhrases) {
          if (text.includes(phrase)) {
            // Trigger futuristic chime
            this.playWakeChime();
            this.stop();
            this.onWake(phrase);
            break;
          }
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          if (this.onError) this.onError(e);
        }
      };

      rec.onend = () => {
        this.isRunning = false;
        // Soft loop restart if still enabled
        if (this.enabled) {
          setTimeout(() => {
            if (this.enabled && !this.isRunning) {
              this.start();
            }
          }, 600);
        }
      };

      rec.start();
      this.recognition = rec;
      this.isRunning = true;
    } catch (err) {
      this.isRunning = false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.recognition) {
      const rec = this.recognition;
      this.recognition = null;
      // Detach handlers first so the onend soft-restart loop cannot revive this
      // listener while the main microphone session owns the speech engine.
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {}
    }
  }

  private playWakeChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }
}
