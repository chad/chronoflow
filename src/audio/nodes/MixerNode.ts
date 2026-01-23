import type { SynthNode, AudioNodeParams } from './types';

export interface MixerParams {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  master: number;
}

const DEFAULT_PARAMS: MixerParams = {
  level1: 1,
  level2: 1,
  level3: 1,
  level4: 1,
  master: 1,
};

export class SynthMixerNode implements SynthNode {
  id: string;
  type = 'mixer';

  private inputGains: GainNode[];
  private masterGain: GainNode;
  private context: AudioContext;
  private params: MixerParams;

  constructor(context: AudioContext, id: string, params?: Partial<MixerParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create 4 input channels with individual gain control
    this.inputGains = [];
    for (let i = 0; i < 4; i++) {
      const gain = context.createGain();
      gain.gain.value = this.params[`level${i + 1}` as keyof MixerParams] as number;
      this.inputGains.push(gain);
    }

    // Master output gain
    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.params.master;

    // Connect all inputs to master
    this.inputGains.forEach((g) => g.connect(this.masterGain));
  }

  getOutputNode(): AudioNode {
    return this.masterGain;
  }

  getInputNode(): AudioNode {
    // Default input is channel 1
    return this.inputGains[0];
  }

  // Get specific input channel
  getInputChannel(channel: number): AudioNode | null {
    if (channel >= 1 && channel <= 4) {
      return this.inputGains[channel - 1];
    }
    return null;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'level1_mod':
        return this.inputGains[0].gain;
      case 'level2_mod':
        return this.inputGains[1].gain;
      case 'level3_mod':
        return this.inputGains[2].gain;
      case 'level4_mod':
        return this.inputGains[3].gain;
      case 'master_mod':
        return this.masterGain.gain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.masterGain.connect(input);
      }
    } else {
      this.masterGain.connect(destination);
    }
  }

  disconnect(): void {
    this.masterGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    const numValue = value as number;
    switch (name) {
      case 'level1':
        this.params.level1 = numValue;
        this.inputGains[0].gain.setTargetAtTime(numValue, this.context.currentTime, 0.01);
        break;
      case 'level2':
        this.params.level2 = numValue;
        this.inputGains[1].gain.setTargetAtTime(numValue, this.context.currentTime, 0.01);
        break;
      case 'level3':
        this.params.level3 = numValue;
        this.inputGains[2].gain.setTargetAtTime(numValue, this.context.currentTime, 0.01);
        break;
      case 'level4':
        this.params.level4 = numValue;
        this.inputGains[3].gain.setTargetAtTime(numValue, this.context.currentTime, 0.01);
        break;
      case 'master':
        this.params.master = numValue;
        this.masterGain.gain.setTargetAtTime(numValue, this.context.currentTime, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.inputGains.forEach((g) => g.disconnect());
    this.masterGain.disconnect();
  }
}
