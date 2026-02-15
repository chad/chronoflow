// EQNode - 3-band parametric EQ with low shelf, mid peak, and high shelf
// Essential for tonal shaping of any audio source

import type { SynthNode, AudioNodeParams } from './types';

export interface EQParams {
  lowFreq: number;     // Low shelf frequency (20-500 Hz)
  lowGain: number;     // Low shelf gain in dB (-18 to +18)
  midFreq: number;     // Mid peak frequency (200-8000 Hz)
  midGain: number;     // Mid peak gain in dB (-18 to +18)
  midQ: number;        // Mid bandwidth Q (0.1-10)
  highFreq: number;    // High shelf frequency (2000-20000 Hz)
  highGain: number;    // High shelf gain in dB (-18 to +18)
}

const DEFAULT_PARAMS: EQParams = {
  lowFreq: 100,
  lowGain: 0,
  midFreq: 1000,
  midGain: 0,
  midQ: 1,
  highFreq: 8000,
  highGain: 0,
};

export class SynthEQNode implements SynthNode {
  id: string;
  type = 'eq';

  private context: AudioContext;
  private params: EQParams;

  private inputGain: GainNode;
  private outputGain: GainNode;

  private lowShelf: BiquadFilterNode;
  private midPeak: BiquadFilterNode;
  private highShelf: BiquadFilterNode;

  constructor(context: AudioContext, id: string, params?: Partial<EQParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Low shelf
    this.lowShelf = context.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = this.params.lowFreq;
    this.lowShelf.gain.value = this.params.lowGain;

    // Mid parametric peak
    this.midPeak = context.createBiquadFilter();
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = this.params.midFreq;
    this.midPeak.gain.value = this.params.midGain;
    this.midPeak.Q.value = this.params.midQ;

    // High shelf
    this.highShelf = context.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = this.params.highFreq;
    this.highShelf.gain.value = this.params.highGain;

    // Chain: input → low → mid → high → output
    this.inputGain.connect(this.lowShelf);
    this.lowShelf.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
    this.highShelf.connect(this.outputGain);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'lowGain_mod':
        return this.lowShelf.gain;
      case 'midFreq_mod':
        return this.midPeak.frequency;
      case 'midGain_mod':
        return this.midPeak.gain;
      case 'highGain_mod':
        return this.highShelf.gain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) this.outputGain.connect(input);
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    const now = this.context.currentTime;
    switch (name) {
      case 'lowFreq':
        this.params.lowFreq = Math.max(20, Math.min(500, value as number));
        this.lowShelf.frequency.setTargetAtTime(this.params.lowFreq, now, 0.01);
        break;
      case 'lowGain':
        this.params.lowGain = Math.max(-18, Math.min(18, value as number));
        this.lowShelf.gain.setTargetAtTime(this.params.lowGain, now, 0.01);
        break;
      case 'midFreq':
        this.params.midFreq = Math.max(200, Math.min(8000, value as number));
        this.midPeak.frequency.setTargetAtTime(this.params.midFreq, now, 0.01);
        break;
      case 'midGain':
        this.params.midGain = Math.max(-18, Math.min(18, value as number));
        this.midPeak.gain.setTargetAtTime(this.params.midGain, now, 0.01);
        break;
      case 'midQ':
        this.params.midQ = Math.max(0.1, Math.min(10, value as number));
        this.midPeak.Q.setTargetAtTime(this.params.midQ, now, 0.01);
        break;
      case 'highFreq':
        this.params.highFreq = Math.max(2000, Math.min(20000, value as number));
        this.highShelf.frequency.setTargetAtTime(this.params.highFreq, now, 0.01);
        break;
      case 'highGain':
        this.params.highGain = Math.max(-18, Math.min(18, value as number));
        this.highShelf.gain.setTargetAtTime(this.params.highGain, now, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.lowShelf.disconnect();
    this.midPeak.disconnect();
    this.highShelf.disconnect();
  }
}
