// granular-processor.js - AudioWorklet processor for granular synthesis
// This runs in a separate audio thread for better performance

const BUFFER_DURATION = 4; // seconds
const MAX_ACTIVE_GRAINS = 100;

class GranularProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Recording buffer (circular)
    this.recordBuffer = null;
    this.writePosition = 0;
    this.isRecording = true;

    // Parameters (will be updated via messages)
    this.params = {
      grainSize: 100,      // ms
      density: 10,         // grains per second
      spray: 0.1,          // position randomization
      pitch: 1.0,          // playback rate
      position: 0.5,       // position in buffer (0-1)
      freeze: false,       // stop recording
      mix: 1.0,            // dry/wet
      reverse: 0,          // probability of reverse grains
    };

    // Grain scheduling
    this.grains = [];
    this.nextGrainTime = 0;
    this.sampleRate = sampleRate;

    // Initialize recording buffer
    this.initBuffer();

    // Handle messages from main thread
    this.port.onmessage = (e) => this.handleMessage(e);
  }

  initBuffer() {
    const bufferLength = Math.floor(BUFFER_DURATION * this.sampleRate);
    this.recordBuffer = new Float32Array(bufferLength);
    this.bufferLength = bufferLength;
  }

  handleMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'setParam':
        if (data.name in this.params) {
          this.params[data.name] = data.value;
        }
        break;
      case 'setBuffer':
        // Receive audio buffer data from main thread
        if (data.buffer && data.buffer.length > 0) {
          this.recordBuffer = new Float32Array(data.buffer);
          this.bufferLength = this.recordBuffer.length;
        }
        break;
    }
  }

  // Create a new grain
  spawnGrain() {
    if (this.grains.length >= MAX_ACTIVE_GRAINS) {
      // Remove oldest grain if at limit
      this.grains.shift();
    }

    const grainDurationSec = this.params.grainSize / 1000;
    const grainSamples = Math.floor(grainDurationSec * this.sampleRate);

    // Calculate read position with spray
    const basePosition = this.params.position * this.bufferLength;
    const sprayAmount = this.params.spray * this.bufferLength * 0.5;
    const spray = (Math.random() - 0.5) * 2 * sprayAmount;
    let readPosition = Math.floor(basePosition + spray);

    // Wrap position
    readPosition = ((readPosition % this.bufferLength) + this.bufferLength) % this.bufferLength;

    // Determine if reverse
    const isReverse = Math.random() < this.params.reverse;

    this.grains.push({
      readPosition,
      length: grainSamples,
      progress: 0,
      pitch: this.params.pitch,
      isReverse,
    });
  }

  // Hann window function
  hannWindow(t) {
    return 0.5 * (1 - Math.cos(2 * Math.PI * t));
  }

  // Process audio
  process(inputs, outputs, _parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!output || output.length === 0) {
      return true;
    }

    const outputChannel = output[0];
    const inputChannel = input[0];
    const hasInput = inputChannel && inputChannel.length > 0;

    // Process each sample
    for (let i = 0; i < outputChannel.length; i++) {
      const inputSample = hasInput ? inputChannel[i] : 0;

      // Record to buffer if not frozen
      if (!this.params.freeze && this.isRecording && hasInput) {
        this.recordBuffer[this.writePosition] = inputSample;
        this.writePosition = (this.writePosition + 1) % this.bufferLength;
      }

      // Check if we should spawn a new grain
      const currentSample = currentFrame + i;
      const grainInterval = this.sampleRate / this.params.density;
      if (currentSample >= this.nextGrainTime) {
        this.spawnGrain();
        this.nextGrainTime = currentSample + grainInterval;
      }

      // Mix grains
      let grainOutput = 0;
      for (let g = this.grains.length - 1; g >= 0; g--) {
        const grain = this.grains[g];

        if (grain.progress >= grain.length) {
          // Grain finished
          this.grains.splice(g, 1);
          continue;
        }

        // Calculate window position (0-1)
        const windowPos = grain.progress / grain.length;
        const windowValue = this.hannWindow(windowPos);

        // Calculate read position (with pitch)
        let sampleIndex;
        const pitchedProgress = Math.floor(grain.progress * grain.pitch);

        if (grain.isReverse) {
          sampleIndex = (grain.readPosition + grain.length - pitchedProgress) % this.bufferLength;
        } else {
          sampleIndex = (grain.readPosition + pitchedProgress) % this.bufferLength;
        }

        // Ensure valid index
        sampleIndex = ((sampleIndex % this.bufferLength) + this.bufferLength) % this.bufferLength;

        // Read sample and apply window
        const sample = this.recordBuffer[sampleIndex] || 0;
        grainOutput += sample * windowValue;

        grain.progress++;
      }

      // Mix dry/wet
      const dryAmount = 1 - this.params.mix;
      const wetAmount = this.params.mix;

      outputChannel[i] = inputSample * dryAmount + grainOutput * wetAmount;
    }

    // Copy to other channels if stereo
    for (let channel = 1; channel < output.length; channel++) {
      output[channel].set(outputChannel);
    }

    return true;
  }

  static get parameterDescriptors() {
    return [
      { name: 'grainSize', defaultValue: 100, minValue: 10, maxValue: 500 },
      { name: 'density', defaultValue: 10, minValue: 1, maxValue: 50 },
      { name: 'spray', defaultValue: 0.1, minValue: 0, maxValue: 1 },
      { name: 'pitch', defaultValue: 1.0, minValue: 0.25, maxValue: 4 },
      { name: 'position', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1 },
      { name: 'reverse', defaultValue: 0, minValue: 0, maxValue: 1 },
    ];
  }
}

registerProcessor('granular-processor', GranularProcessor);
