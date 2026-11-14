class DasMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch0 = input[0];
    if (!ch0) return true;
    const numChannels = input.length;
    for (let i = 0; i < ch0.length; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += (input[ch] && input[ch][i]) || 0;
      }
      this._buffer[this._offset++] = sum / numChannels;
      if (this._offset >= this._buffer.length) {
        const copy = new Float32Array(this._buffer);
        this.port.postMessage(copy.buffer, [copy.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("das-mic-processor", DasMicProcessor);
