import type { SynthNode, AudioNodeParams } from './types';

export interface NoiseParams {
  type: 'white' | 'pink';
  level: number;
}

const DEFAULT_PARAMS: NoiseParams = {
  type: 'white',
  level: 1,
};

export class SynthNoiseNode implements SynthNode {
  id: string;
  type = 'noise';

  private context: AudioContext;
  private params: NoiseParams;
  private noiseSource: AudioBufferSourceNode | null = null;
  private outputGain: GainNode;
  private whiteBuffer: AudioBuffer;
  private pinkBuffer: AudioBuffer;

  constructor(context: AudioContext, id: string, params?: Partial<NoiseParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create output gain
    this.outputGain = context.createGain();
    this.outputGain.gain.value = this.params.level;

    // Pre-generate noise buffers (2 seconds of noise)
    const bufferSize = context.sampleRate * 2;

    // White noise buffer
    this.whiteBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const whiteData = this.whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Pink noise buffer (using Paul Kellet's approximation)
    this.pinkBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const pinkData = this.pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this.start();
  }

  private createNoiseSource(): void {
    if (this.noiseSource) {
      this.noiseSource.stop();
      this.noiseSource.disconnect();
    }

    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = this.params.type === 'white' ? this.whiteBuffer : this.pinkBuffer;
    this.noiseSource.loop = true;
    this.noiseSource.connect(this.outputGain);
  }

  start(): void {
    this.createNoiseSource();
    this.noiseSource?.start();
  }

  stop(): void {
    if (this.noiseSource) {
      this.noiseSource.stop();
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode | null {
    return null; // Noise is a source, no input
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'level_mod':
        return this.outputGain.gain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.outputGain.connect(input);
      }
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'type':
        this.params.type = value as 'white' | 'pink';
        // Recreate noise source with new type
        this.stop();
        this.start();
        break;
      case 'level':
        this.params.level = value as number;
        this.outputGain.gain.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.stop();
    this.outputGain.disconnect();
  }
}
