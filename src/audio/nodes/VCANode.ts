import type { SynthNode, AudioNodeParams } from './types';

export interface VCAParams {
  gain: number;
}

const DEFAULT_PARAMS: VCAParams = {
  gain: 0.5,
};

export class SynthVCANode implements SynthNode {
  id: string;
  type = 'vca';

  private gainNode: GainNode;
  private context: AudioContext;
  private params: VCAParams;

  constructor(context: AudioContext, id: string, params?: Partial<VCAParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.gainNode = context.createGain();
    this.gainNode.gain.value = this.params.gain;
  }

  getOutputNode(): AudioNode {
    return this.gainNode;
  }

  getInputNode(): AudioNode {
    return this.gainNode;
  }

  getGainParam(): AudioParam {
    return this.gainNode.gain;
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.gainNode.connect(input);
      }
    } else {
      this.gainNode.connect(destination);
    }
  }

  disconnect(): void {
    this.gainNode.disconnect();
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
  }
}
