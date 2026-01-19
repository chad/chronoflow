import type { SynthNode, AudioNodeParams } from './types';

export interface OutputParams {
  gain: number;
}

const DEFAULT_PARAMS: OutputParams = {
  gain: 0.7,
};

export class SynthOutputNode implements SynthNode {
  id: string;
  type = 'output';

  private gainNode: GainNode;
  private analyser: AnalyserNode;
  private context: AudioContext;
  private params: OutputParams;
  private destination: AudioNode;

  constructor(context: AudioContext, id: string, destination: AudioNode, params?: Partial<OutputParams>) {
    this.context = context;
    this.id = id;
    this.destination = destination;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.gainNode = context.createGain();
    this.gainNode.gain.value = this.params.gain;

    // Analyser for visualization
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;

    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.destination);
  }

  getOutputNode(): AudioNode | null {
    return null; // Output is the end of the chain
  }

  getInputNode(): AudioNode {
    return this.gainNode;
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  connect(): void {
    // Output node is always connected to destination
  }

  disconnect(): void {
    this.analyser.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'gain':
        this.params.gain = value as number;
        this.gainNode.gain.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.gainNode.disconnect();
    this.analyser.disconnect();
  }
}
