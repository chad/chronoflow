// VocoderProcessor - Analysis/synthesis vocoder in a single worklet
// Input 0: Modulator (voice), Input 1: Carrier (synth)
// Analyzes modulator envelope per band, applies to carrier bands

class VocoderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.numBands = 16;
    this.attack = 0.005;  // Envelope follower attack (seconds)
    this.release = 0.02;  // Envelope follower release (seconds)
    this.shift = 0;       // Band shift (integer: -8 to +8)
    this.mix = 1.0;

    // Per-band envelope followers (current level)
    this.envelopes = new Float32Array(this.numBands);

    // Band-pass filter coefficients (2nd order biquad per band)
    // We'll compute simple resonant bandpass per band
    this.modulatorStates = [];
    this.carrierStates = [];

    for (let i = 0; i < this.numBands; i++) {
      this.modulatorStates.push({ x1: 0, x2: 0, y1: 0, y2: 0 });
      this.carrierStates.push({ x1: 0, x2: 0, y1: 0, y2: 0 });
    }

    this.port.onmessage = (e) => {
      if (e.data.type === 'setParam') {
        switch (e.data.name) {
          case 'bands':
            this.numBands = Math.max(4, Math.min(32, Math.floor(e.data.value)));
            this.envelopes = new Float32Array(this.numBands);
            this.modulatorStates = [];
            this.carrierStates = [];
            for (let i = 0; i < this.numBands; i++) {
              this.modulatorStates.push({ x1: 0, x2: 0, y1: 0, y2: 0 });
              this.carrierStates.push({ x1: 0, x2: 0, y1: 0, y2: 0 });
            }
            break;
          case 'attack':
            this.attack = Math.max(0.001, e.data.value);
            break;
          case 'release':
            this.release = Math.max(0.001, e.data.value);
            break;
          case 'shift':
            this.shift = Math.round(e.data.value);
            break;
          case 'mix':
            this.mix = e.data.value;
            break;
        }
      }
    };
  }

  // Simple 2nd-order bandpass filter
  bandpass(sample, freq, q, state, sr) {
    const w0 = 2 * Math.PI * freq / sr;
    const alpha = Math.sin(w0) / (2 * q);

    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;

    const y = (b0 / a0) * sample + (b1 / a0) * state.x1 + (b2 / a0) * state.x2
            - (a1 / a0) * state.y1 - (a2 / a0) * state.y2;

    state.x2 = state.x1;
    state.x1 = sample;
    state.y2 = state.y1;
    state.y1 = y;

    return y;
  }

  getBandFrequency(bandIndex) {
    // Logarithmically spaced from ~80Hz to ~12000Hz
    const minFreq = 80;
    const maxFreq = 12000;
    const t = bandIndex / (this.numBands - 1);
    return minFreq * Math.pow(maxFreq / minFreq, t);
  }

  process(inputs, outputs) {
    const modulator = inputs[0];
    const carrier = inputs[1];
    const output = outputs[0];

    if (!output || !output[0]) return true;

    const outChannel = output[0];
    const modChannel = modulator && modulator[0] ? modulator[0] : null;
    const carChannel = carrier && carrier[0] ? carrier[0] : null;

    if (!modChannel || !carChannel) {
      // Pass through silence or modulator dry
      if (modChannel) {
        for (let i = 0; i < outChannel.length; i++) {
          outChannel[i] = modChannel[i] * (1 - this.mix);
        }
      }
      return true;
    }

    const sr = sampleRate;
    const q = 8; // Band Q factor

    // Attack/release coefficients
    const attackCoeff = Math.exp(-1 / (this.attack * sr));
    const releaseCoeff = Math.exp(-1 / (this.release * sr));

    for (let i = 0; i < outChannel.length; i++) {
      let wet = 0;

      for (let b = 0; b < this.numBands; b++) {
        const freq = this.getBandFrequency(b);

        // Filter modulator through this band
        const modFiltered = this.bandpass(modChannel[i], freq, q, this.modulatorStates[b], sr);

        // Envelope follow the modulator band
        const level = Math.abs(modFiltered);
        if (level > this.envelopes[b]) {
          this.envelopes[b] = attackCoeff * this.envelopes[b] + (1 - attackCoeff) * level;
        } else {
          this.envelopes[b] = releaseCoeff * this.envelopes[b] + (1 - releaseCoeff) * level;
        }

        // Determine which carrier band to use (with shift)
        const carrierBand = Math.max(0, Math.min(this.numBands - 1, b + this.shift));
        const carrierFreq = this.getBandFrequency(carrierBand);

        // Filter carrier through the (possibly shifted) band
        const carFiltered = this.bandpass(carChannel[i], carrierFreq, q, this.carrierStates[b], sr);

        // Apply modulator envelope to carrier band
        wet += carFiltered * this.envelopes[b] * 4; // Gain compensation
      }

      // Mix
      outChannel[i] = modChannel[i] * (1 - this.mix) + wet * this.mix;
    }

    return true;
  }
}

registerProcessor('vocoder-processor', VocoderProcessor);
