// BitcrusherProcessor - Reduces bit depth and sample rate for lo-fi effects
// Classic digital degradation effect

class BitcrusherProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.bits = 16;           // Bit depth (1-16)
    this.sampleRateReduction = 1; // Sample rate divisor (1-40)
    this.mix = 1.0;
    this.holdSample = 0;
    this.holdCounter = 0;

    this.port.onmessage = (e) => {
      if (e.data.type === 'setParam') {
        switch (e.data.name) {
          case 'bits':
            this.bits = Math.max(1, Math.min(16, e.data.value));
            break;
          case 'sampleRateReduction':
            this.sampleRateReduction = Math.max(1, Math.min(40, Math.floor(e.data.value)));
            break;
          case 'mix':
            this.mix = e.data.value;
            break;
        }
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    const inputChannel = input[0];
    const outputChannel = output[0];

    const step = Math.pow(0.5, this.bits);
    const invStep = 1 / step;

    for (let i = 0; i < inputChannel.length; i++) {
      // Sample rate reduction: hold sample for N frames
      this.holdCounter++;
      if (this.holdCounter >= this.sampleRateReduction) {
        this.holdCounter = 0;
        // Bit depth reduction: quantize to fewer bits
        this.holdSample = Math.round(inputChannel[i] * invStep) * step;
      }

      // Mix dry/wet
      outputChannel[i] = inputChannel[i] * (1 - this.mix) + this.holdSample * this.mix;
    }

    return true;
  }
}

registerProcessor('bitcrusher-processor', BitcrusherProcessor);
