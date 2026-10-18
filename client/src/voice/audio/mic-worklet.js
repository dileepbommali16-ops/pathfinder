/**
 * AudioWorkletProcessor: MicResamplerProcessor (mic-worklet.js)
 * Downsamples browser microphone audio to 16 kHz 16-bit PCM for Gemini Live.
 */

class MicResamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.buffer = [];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputData = input[0]; // Float32 mono samples (-1.0 to 1.0)
    const ratio = sampleRate / this.targetSampleRate;

    // Linear downsampling to 16 kHz
    for (let i = 0; i < inputData.length; i += ratio) {
      const idx = Math.floor(i);
      const sample = Math.max(-1.0, Math.min(1.0, inputData[idx]));
      // Convert to 16-bit PCM integer (-32768 to 32767)
      const pcm16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      this.buffer.push(Math.round(pcm16));
    }

    // Flush every 512 samples (~32ms chunks)
    if (this.buffer.length >= 512) {
      const pcmChunk = new Int16Array(this.buffer.splice(0, 512));
      this.port.postMessage(pcmChunk.buffer, [pcmChunk.buffer]);
    }

    return true;
  }
}

registerProcessor("mic-resampler-processor", MicResamplerProcessor);
