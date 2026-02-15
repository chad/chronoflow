// PitchShifterProcessor - Granular pitch shifting AudioWorklet
// Uses overlapping grains with Hann windowing for smooth pitch shifting

class PitchShifterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Circular buffer (2 seconds at 44.1kHz)
    this.bufferSize = 88200;
    this.buffer = new Float32Array(this.bufferSize);
    this.writePos = 0;

    // Grain parameters
    this.grainSize = 2048;  // ~46ms at 44.1kHz
    this.pitch = 1.0;
    this.mix = 1.0;

    // Two overlapping grains for crossfading
    this.grain0ReadPos = 0;
    this.grain0Phase = 0;
    this.grain1ReadPos = 0;
    this.grain1Phase = 0.5; // Offset by half a grain

    this.port.onmessage = (e) => {
      if (e.data.type === 'setParam') {
        switch (e.data.name) {
          case 'pitch':
            this.pitch = e.data.value;
            break;
          case 'grainSize':
            this.grainSize = Math.max(256, Math.min(8192, Math.floor(e.data.value)));
            break;
          case 'mix':
            this.mix = e.data.value;
            break;
        }
      }
    };
  }

  // Hann window function
  hannWindow(phase) {
    return 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    const inputChannel = input[0];
    const outputChannel = output[0];
    const len = inputChannel.length;

    for (let i = 0; i < len; i++) {
      // Write input to circular buffer
      this.buffer[this.writePos] = inputChannel[i];
      const dry = inputChannel[i];

      // Advance grain phases
      const phaseIncrement = 1.0 / this.grainSize;

      // Grain 0
      this.grain0Phase += phaseIncrement;
      if (this.grain0Phase >= 1.0) {
        this.grain0Phase -= 1.0;
        // Reset grain read position relative to write position
        this.grain0ReadPos = (this.writePos - this.grainSize + this.bufferSize) % this.bufferSize;
      }
      const readIdx0 = (this.grain0ReadPos + Math.floor(this.grain0Phase * this.grainSize * this.pitch)) % this.bufferSize;
      const window0 = this.hannWindow(this.grain0Phase);
      const sample0 = this.buffer[readIdx0 >= 0 ? readIdx0 : readIdx0 + this.bufferSize] * window0;

      // Grain 1 (offset by 0.5)
      this.grain1Phase += phaseIncrement;
      if (this.grain1Phase >= 1.0) {
        this.grain1Phase -= 1.0;
        this.grain1ReadPos = (this.writePos - this.grainSize + this.bufferSize) % this.bufferSize;
      }
      const readIdx1 = (this.grain1ReadPos + Math.floor(this.grain1Phase * this.grainSize * this.pitch)) % this.bufferSize;
      const window1 = this.hannWindow(this.grain1Phase);
      const sample1 = this.buffer[readIdx1 >= 0 ? readIdx1 : readIdx1 + this.bufferSize] * window1;

      // Sum grains
      const wet = sample0 + sample1;

      // Mix dry/wet
      outputChannel[i] = dry * (1 - this.mix) + wet * this.mix;

      // Advance write position
      this.writePos = (this.writePos + 1) % this.bufferSize;
    }

    return true;
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
