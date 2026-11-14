class DasPcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.cap = 24000 * 30;
    this.ring = new Float32Array(this.cap);
    this.readPos = 0;
    this.writePos = 0;
    this.avail = 0;
    this.srcRate = 24000;
    this.phase = 0;
    this.buffering = true;
    this.turnStarted = false;
    this.waitFrames = 0;
    this.wasActive = false;
    this.drain = false;
    this.gainEnv = 0;
    this.lastOut = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (!m) return;
      if (m.type === "clear") {
        this.readPos = 0;
        this.writePos = 0;
        this.avail = 0;
        this.phase = 0;
        this.buffering = true;
        this.turnStarted = false;
        this.waitFrames = 0;
        this.drain = false;
        this.gainEnv = 0;
        this.lastOut = 0;
        if (this.wasActive) {
          this.wasActive = false;
          this.port.postMessage({ type: "playing", active: false });
        }
      } else if (m.type === "drain") {
        this.drain = true;
      } else if (m.type === "push" && m.pcm) {
        const samples = new Float32Array(m.pcm);
        if (m.rate) this.srcRate = m.rate;
        this.drain = false;
        if (!this.wasActive && samples.length > 0) {
          this.wasActive = true;
          this.port.postMessage({ type: "playing", active: true });
        }
        for (let i = 0; i < samples.length; i++) {
          if (this.avail < this.cap - 1) {
            this.ring[this.writePos] = samples[i];
            this.writePos = (this.writePos + 1) % this.cap;
            this.avail++;
          }
        }
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    // Adaptive 0.90s turn prefill (or instant release on drain / 0.90s wait cap) absorbs multi-phrase Gemini Live pauses cleanly without mid-word freezes
    const prebuffer = Math.round(this.srcRate * (this.turnStarted ? 0.18 : 0.90));
    const waitCapFrames = Math.max(1, Math.round(0.90 * (sampleRate / out.length)));
    if (this.buffering) {
      if (!this.turnStarted && this.avail > 0) {
        this.waitFrames++;
      }
      if (
        this.avail >= prebuffer ||
        (this.drain && this.avail > 0) ||
        (!this.turnStarted && this.waitFrames >= waitCapFrames && this.avail >= Math.round(this.srcRate * 0.16))
      ) {
        this.buffering = false;
        this.turnStarted = true;
        this.waitFrames = 0;
      } else {
        if (this.drain && this.avail === 0) {
          this.drain = false;
          this.turnStarted = false;
          this.waitFrames = 0;
          this.gainEnv = 0;
          this.lastOut = 0;
          if (this.wasActive) {
            this.wasActive = false;
            this.port.postMessage({ type: "playing", active: false });
          }
        }
        out.fill(0);
        return true;
      }
    }
    const step = this.srcRate / sampleRate;
    for (let i = 0; i < out.length; i++) {
      if (this.avail >= 2) {
        const idx0 = (this.readPos + Math.floor(this.phase)) % this.cap;
        const idx1 = (idx0 + 1) % this.cap;
        const frac = this.phase - Math.floor(this.phase);
        const s = this.ring[idx0] + frac * (this.ring[idx1] - this.ring[idx0]);
        this.gainEnv = Math.min(1, this.gainEnv + 0.016);
        this.lastOut = s * this.gainEnv;
        out[i] = this.lastOut;
        this.phase += step;
        const adv = Math.floor(this.phase);
        if (adv > 0) {
          const take = Math.min(adv, this.avail - 1);
          this.readPos = (this.readPos + take) % this.cap;
          this.avail -= take;
          this.phase -= take;
        }
      } else if (this.avail === 1) {
        const s = this.ring[this.readPos];
        this.readPos = (this.readPos + 1) % this.cap;
        this.avail = 0;
        this.phase = 0;
        this.gainEnv = Math.min(1, this.gainEnv + 0.016);
        this.lastOut = s * this.gainEnv;
        out[i] = this.lastOut;
      } else {
        this.lastOut *= 0.90;
        out[i] = this.lastOut;
        if (Math.abs(this.lastOut) < 0.0005) {
          this.lastOut = 0;
          this.buffering = true;
          this.gainEnv = 0;
          if (this.drain) {
            this.drain = false;
            this.turnStarted = false;
            this.waitFrames = 0;
            if (this.wasActive) {
              this.wasActive = false;
              this.port.postMessage({ type: "playing", active: false });
            }
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("das-pcm-player", DasPcmPlayer);
