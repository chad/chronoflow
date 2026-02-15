// GlitchProcessor - Buffer capture, stutter, reverse, and pitch-ramp
// Captures audio into a small buffer and replays it with various glitch effects

class GlitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Circular capture buffer (~1 second at 44.1kHz)
    this.maxBufferSize = 44100;
    this.buffer = new Float32Array(this.maxBufferSize);
    this.writePos = 0;

    // Stutter state
    this.stuttering = false;
    this.stutterSize = 2048;       // Stutter grain size in samples
    this.stutterReadPos = 0;
    this.stutterPhase = 0;

    // Parameters
    this.rate = 8;                  // Stutter rate (retriggers per second)
    this.size = 0.05;               // Buffer capture size in seconds
    this.pitch = 1.0;               // Playback pitch (1.0 = normal)
    this.reverse = false;           // Play buffer backwards
    this.mix = 1.0;
    this.active = false;            // Whether glitch is currently active
    this.probability = 1.0;         // Probability of stutter on each retrigger

    // Pitch ramp (tape stop / speed up effect)
    this.pitchRamp = 0;            // -1 to 1: negative = slow down, positive = speed up
    this.currentPitch = 1.0;       // Current ramped pitch

    // Retrigger counter
    this.samplesPerRetrigger = 0;
    this.retriggerCounter = 0;
    this.updateRetriggerRate();

    this.port.onmessage = (e) => {
      if (e.data.type === 'setParam') {
        switch (e.data.name) {
          case 'rate':
            this.rate = Math.max(0.5, Math.min(50, e.data.value));
            this.updateRetriggerRate();
            break;
          case 'size':
            this.size = Math.max(0.005, Math.min(1.0, e.data.value));
            this.stutterSize = Math.floor(this.size * sampleRate);
            break;
          case 'pitch':
            this.pitch = Math.max(0.25, Math.min(4.0, e.data.value));
            this.currentPitch = this.pitch;
            break;
          case 'reverse':
            this.reverse = !!e.data.value;
            break;
          case 'mix':
            this.mix = e.data.value;
            break;
          case 'probability':
            this.probability = Math.max(0, Math.min(1, e.data.value));
            break;
          case 'pitchRamp':
            this.pitchRamp = Math.max(-1, Math.min(1, e.data.value));
            break;
        }
      } else if (e.data.type === 'trigger') {
        // Capture current buffer position and start stuttering
        this.active = true;
        this.stutterReadPos = (this.writePos - this.stutterSize + this.maxBufferSize) % this.maxBufferSize;
        this.stutterPhase = 0;
        this.retriggerCounter = 0;
        this.currentPitch = this.pitch;
      } else if (e.data.type === 'release') {
        this.active = false;
      } else if (e.data.type === 'toggle') {
        this.active = !this.active;
        if (this.active) {
          this.stutterReadPos = (this.writePos - this.stutterSize + this.maxBufferSize) % this.maxBufferSize;
          this.stutterPhase = 0;
          this.retriggerCounter = 0;
          this.currentPitch = this.pitch;
        }
      }
    };
  }

  updateRetriggerRate() {
    this.samplesPerRetrigger = Math.floor(sampleRate / this.rate);
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!output || !output[0]) return true;

    const inputChannel = input && input[0] ? input[0] : null;
    const outputChannel = output[0];

    for (let i = 0; i < outputChannel.length; i++) {
      const dry = inputChannel ? inputChannel[i] : 0;

      // Always write input to circular buffer
      if (inputChannel) {
        this.buffer[this.writePos] = inputChannel[i];
        this.writePos = (this.writePos + 1) % this.maxBufferSize;
      }

      if (this.active) {
        // Check for retrigger
        this.retriggerCounter++;
        if (this.retriggerCounter >= this.samplesPerRetrigger) {
          this.retriggerCounter = 0;

          // Probability gate
          if (Math.random() < this.probability) {
            this.stutterPhase = 0;

            // Apply pitch ramp on each retrigger
            if (this.pitchRamp !== 0) {
              this.currentPitch *= (1 + this.pitchRamp * 0.05);
              this.currentPitch = Math.max(0.1, Math.min(8.0, this.currentPitch));
            }
          }
        }

        // Read from stutter buffer
        let readIdx;
        const grainPos = this.stutterPhase * this.currentPitch;

        if (this.reverse) {
          readIdx = (this.stutterReadPos + this.stutterSize - 1 - Math.floor(grainPos)) % this.maxBufferSize;
        } else {
          readIdx = (this.stutterReadPos + Math.floor(grainPos)) % this.maxBufferSize;
        }

        // Wrap within stutter region
        if (grainPos >= this.stutterSize) {
          this.stutterPhase = 0;
        }

        readIdx = ((readIdx % this.maxBufferSize) + this.maxBufferSize) % this.maxBufferSize;
        const wet = this.buffer[readIdx];

        this.stutterPhase++;

        outputChannel[i] = dry * (1 - this.mix) + wet * this.mix;
      } else {
        outputChannel[i] = dry;
      }
    }

    return true;
  }
}

registerProcessor('glitch-processor', GlitchProcessor);
