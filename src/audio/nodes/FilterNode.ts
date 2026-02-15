import type { SynthNode, FilterMode, AudioNodeParams } from './types';

export interface FilterParams {
  mode: FilterMode;
  cutoff: number;
  resonance: number;
}

const DEFAULT_PARAMS: FilterParams = {
  mode: 'lowpass',
  cutoff: 2000,
  resonance: 1,
};

export class SynthFilterNode implements SynthNode {
  id: string;
  type = 'filter';

  private filter: BiquadFilterNode;
  private context: AudioContext;
  private params: FilterParams;

  // Performance controller offsets (added on top of user cutoff)
  private modWheelOffset: number = 0;
  private aftertouchOffset: number = 0;

  constructor(context: AudioContext, id: string, params?: Partial<FilterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.filter = context.createBiquadFilter();
    this.filter.type = this.params.mode;
    this.filter.frequency.value = this.params.cutoff;
    this.filter.Q.value = this.params.resonance;
  }

  getOutputNode(): AudioNode {
    return this.filter;
  }

  getInputNode(): AudioNode {
    return this.filter;
  }

  getCutoffParam(): AudioParam {
    return this.filter.frequency;
  }

  getResonanceParam(): AudioParam {
    return this.filter.Q;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'cutoff_mod':
        return this.filter.frequency;
      case 'resonance_mod':
        return this.filter.Q;
      default:
        return null;
    }
  }

  // Set mod wheel offset (Hz, added to cutoff)
  setModWheelOffset(hz: number): void {
    this.modWheelOffset = hz;
    this.applyEffectiveCutoff();
  }

  // Set aftertouch offset (Hz, added to cutoff)
  setAftertouchOffset(hz: number): void {
    this.aftertouchOffset = hz;
    this.applyEffectiveCutoff();
  }

  private applyEffectiveCutoff(): void {
    const effective = Math.max(20, Math.min(20000,
      this.params.cutoff + this.modWheelOffset + this.aftertouchOffset
    ));
    this.filter.frequency.setTargetAtTime(effective, this.context.currentTime, 0.01);
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.filter.connect(input);
      }
    } else {
      this.filter.connect(destination);
    }
  }

  disconnect(): void {
    this.filter.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'mode':
        this.params.mode = value as FilterMode;
        this.filter.type = value as FilterMode;
        break;
      case 'cutoff':
        this.params.cutoff = value as number;
        this.applyEffectiveCutoff();
        break;
      case 'resonance':
        this.params.resonance = value as number;
        this.filter.Q.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.filter.disconnect();
  }
}
