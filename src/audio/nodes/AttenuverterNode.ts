import type { SynthNode, AudioNodeParams } from './types';

export interface AttenuverterParams {
  amount: number; // -1 to +1 (inverts when negative)
}

const DEFAULT_PARAMS: AttenuverterParams = {
  amount: 1,
};

export class SynthAttenuverterNode implements SynthNode {
  id: string;
  type = 'attenuverter';

  private inputGain: GainNode;
  private outputGain: GainNode;
  private context: AudioContext;
  private params: AttenuverterParams;

  constructor(context: AudioContext, id: string, params?: Partial<AttenuverterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create gain nodes
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();

    // Set initial amount
    this.outputGain.gain.value = this.params.amount;

    // Connect input to output through the gain
    this.inputGain.connect(this.outputGain);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    return null;
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
      case 'amount':
        this.params.amount = value as number;
        this.outputGain.gain.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.inputGain.disconnect();
    this.outputGain.disconnect();
  }
}
