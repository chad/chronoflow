import type { SynthNode, WaveformType, AudioNodeParams } from './types';

export interface LFOParams {
  rate: number;
  depth: number;
  waveform: WaveformType;
}

const DEFAULT_PARAMS: LFOParams = {
  rate: 1,
  depth: 100,
  waveform: 'sine',
};

export class SynthLFONode implements SynthNode {
  id: string;
  type = 'lfo';

  private oscillator: OscillatorNode | null = null;
  private depthGain: GainNode;
  private context: AudioContext;
  private params: LFOParams;
  private isRunning = false;

  constructor(context: AudioContext, id: string, params?: Partial<LFOParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Depth gain controls the modulation amount
    this.depthGain = context.createGain();
    this.depthGain.gain.value = this.params.depth;
  }

  private createOscillator(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = this.params.waveform;
    this.oscillator.frequency.value = this.params.rate;
    this.oscillator.connect(this.depthGain);
  }

  start(): void {
    if (this.isRunning) return;

    this.createOscillator();
    this.oscillator!.start();
    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning || !this.oscillator) return;

    this.oscillator.stop();
    this.oscillator.disconnect();
    this.oscillator = null;
    this.isRunning = false;
  }

  getOutputNode(): AudioNode {
    return this.depthGain;
  }

  getInputNode(): AudioNode | null {
    return null; // LFO has no audio input
  }

  // Connect LFO to an AudioParam for modulation
  connectToParam(param: AudioParam): void {
    this.depthGain.connect(param);
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.depthGain.connect(input);
      }
    } else {
      this.depthGain.connect(destination);
    }
  }

  disconnect(): void {
    this.depthGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'rate':
        this.params.rate = value as number;
        if (this.oscillator) {
          this.oscillator.frequency.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        }
        break;
      case 'depth':
        this.params.depth = value as number;
        this.depthGain.gain.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
      case 'waveform':
        this.params.waveform = value as WaveformType;
        if (this.oscillator) {
          this.oscillator.type = value as WaveformType;
        }
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.stop();
    this.depthGain.disconnect();
  }
}
