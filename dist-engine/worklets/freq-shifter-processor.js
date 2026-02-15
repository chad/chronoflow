// FreqShifterProcessor - Single-sideband frequency shifting
// Shifts all frequencies by a fixed Hz amount (not a ratio).
// Uses a Hilbert transform approximation via allpass filter pairs
// to generate analytic signal, then modulates with a complex exponential.

class FreqShifterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.shiftHz = 0;
    this.mix = 1.0;
    this.mode = 0; // 0 = up, 1 = down, 2 = both (ring mod-like)

    // Hilbert transform approximation using cascaded allpass filters
    // Coefficients for ~20Hz-20kHz coverage
    // Two parallel allpass chains that produce 90° phase difference
    this.allpassCoeffsA = [0.6923878, 0.9360654322959, 0.9882295226860, 0.9987488452737];
    this.allpassCoeffsB = [0.4021921162426, 0.8561710882420, 0.9722909545651, 0.9952884791278];

    // Allpass filter states (each is a cascade of 1st order allpass sections)
    this.statesA = this.allpassCoeffsA.map(() => ({ x1: 0, y1: 0 }));
    this.statesB = this.allpassCoeffsB.map(() => ({ x1: 0, y1: 0 }));

    // Oscillator phase for frequency shifting
    this.phase = 0;

    this.port.onmessage = (e) => {
      if (e.data.type === 'setParam') {
        switch (e.data.name) {
          case 'shiftHz':
            this.shiftHz = e.data.value;
            break;
          case 'mix':
            this.mix = e.data.value;
            break;
          case 'mode':
            this.mode = e.data.value;
            break;
        }
      }
    };
  }

  // First-order allpass filter: y[n] = coeff * (x[n] - y[n-1]) + x[n-1]
  allpass1(sample, coeff, state) {
    const y = coeff * (sample - state.y1) + state.x1;
    state.x1 = sample;
    state.y1 = y;
    return y;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    const inCh = input[0];
    const outCh = output[0];
    const sr = sampleRate;
    const phaseInc = (2 * Math.PI * this.shiftHz) / sr;

    for (let i = 0; i < inCh.length; i++) {
      const dry = inCh[i];

      // Run input through both allpass chains to get Hilbert pair
      let sigA = dry;
      for (let j = 0; j < this.allpassCoeffsA.length; j++) {
        sigA = this.allpass1(sigA, this.allpassCoeffsA[j], this.statesA[j]);
      }

      let sigB = dry;
      for (let j = 0; j < this.allpassCoeffsB.length; j++) {
        sigB = this.allpass1(sigB, this.allpassCoeffsB[j], this.statesB[j]);
      }

      // sigA ≈ real part, sigB ≈ imaginary part (90° shifted)
      // Frequency shift via complex multiplication with e^(j*2*pi*f*t)
      const cosPhase = Math.cos(this.phase);
      const sinPhase = Math.sin(this.phase);

      let wet;
      switch (this.mode) {
        case 0: // Up shift (upper sideband)
          wet = sigA * cosPhase - sigB * sinPhase;
          break;
        case 1: // Down shift (lower sideband)
          wet = sigA * cosPhase + sigB * sinPhase;
          break;
        case 2: // Both sidebands (ring mod-like)
          wet = sigA * cosPhase;
          break;
        default:
          wet = sigA * cosPhase - sigB * sinPhase;
      }

      this.phase += phaseInc;
      if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
      if (this.phase < -2 * Math.PI) this.phase += 2 * Math.PI;

      outCh[i] = dry * (1 - this.mix) + wet * this.mix;
    }

    return true;
  }
}

registerProcessor('freq-shifter-processor', FreqShifterProcessor);
