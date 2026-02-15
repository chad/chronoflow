// PitchShifterNode - Granular pitch shifting via AudioWorklet
// Shifts pitch independently of time using overlapping windowed grains

import type { SynthNode, AudioNodeParams } from './types';

export interface PitchShifterParams {
  semitones: number;   // Pitch shift in semitones (-24 to +24)
  cents: number;       // Fine pitch shift in cents (-100 to +100)
  grainSize: number;   // Grain size in samples (256-8192)
  mix: number;         // Dry/wet (0-1)
}

const DEFAULT_PARAMS: PitchShifterParams = {
  semitones: 0,
  cents: 0,
  grainSize: 2048,
  mix: 1.0,
};

let workletRegistered = false;
let workletRegistrationPromise: Promise<void> | null = null;

async function registerPitchShifterWorklet(context: AudioContext): Promise<void> {
  if (workletRegistered) return;
  if (workletRegistrationPromise) return workletRegistrationPromise;

  workletRegistrationPromise = context.audioWorklet.addModule('/worklets/pitch-shifter-processor.js');
  try {
    await workletRegistrationPromise;
    workletRegistered = true;
  } catch (error) {
    workletRegistrationPromise = null;
    throw error;
  }
}

export class SynthPitchShifterNode implements SynthNode {
  id: string;
  type = 'pitchshifter';

  private context: AudioContext;
  private params: PitchShifterParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private workletNode: AudioWorkletNode | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<PitchShifterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Dry path always works
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    this.updateMix();
    this.initWorklet();
  }

  private async initWorklet(): Promise<void> {
    try {
      await registerPitchShifterWorklet(this.context);

      this.workletNode = new AudioWorkletNode(this.context, 'pitch-shifter-processor');

      // Connect wet path through worklet
      this.inputGain.connect(this.workletNode);
      this.workletNode.connect(this.wetGain);
      this.wetGain.connect(this.outputGain);

      // Send current params
      this.sendPitchToWorklet();
      this.workletNode.port.postMessage({ type: 'setParam', name: 'grainSize', value: this.params.grainSize });
      this.workletNode.port.postMessage({ type: 'setParam', name: 'mix', value: 1.0 }); // Worklet always outputs wet; we handle mix externally
    } catch (err) {
      console.error('PitchShifterNode: Failed to init worklet', err);
    }
  }

  private semitonesToRatio(semitones: number, cents: number): number {
    return Math.pow(2, (semitones * 100 + cents) / 1200);
  }

  private sendPitchToWorklet(): void {
    if (!this.workletNode) return;
    const ratio = this.semitonesToRatio(this.params.semitones, this.params.cents);
    this.workletNode.port.postMessage({ type: 'setParam', name: 'pitch', value: ratio });
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'mix_mod':
        return this.wetGain.gain;
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
    switch (name) {
      case 'semitones':
        this.params.semitones = Math.max(-24, Math.min(24, value as number));
        this.sendPitchToWorklet();
        break;
      case 'cents':
        this.params.cents = Math.max(-100, Math.min(100, value as number));
        this.sendPitchToWorklet();
        break;
      case 'grainSize':
        this.params.grainSize = Math.max(256, Math.min(8192, value as number));
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setParam', name: 'grainSize', value: this.params.grainSize });
        }
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
    }
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }
}
