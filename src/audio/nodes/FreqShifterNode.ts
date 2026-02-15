// FreqShifterNode - Frequency shifter (Bode shifter)
// Shifts all frequencies by a fixed Hz amount (not a ratio like pitch shifting).
// 100Hz shift on a 440Hz voice turns it into 540Hz — harmonics become inharmonic.
// Creates alien, metallic, barberpole, and otherworldly textures.
//
// Small shifts (1-10Hz): phasing/chorus-like movement
// Medium shifts (10-100Hz): metallic, robotic detuning
// Large shifts (100+Hz): alien, completely inhuman

import type { SynthNode, AudioNodeParams } from './types';

export type FreqShifterMode = 'up' | 'down' | 'both';

export interface FreqShifterParams {
  shiftHz: number;     // Shift amount in Hz (-1000 to 1000)
  mode: FreqShifterMode; // up = upper sideband, down = lower, both = ring-mod-like
  mix: number;         // Dry/wet (0-1)
}

const DEFAULT_PARAMS: FreqShifterParams = {
  shiftHz: 0,
  mode: 'up',
  mix: 1.0,
};

const MODE_MAP: Record<FreqShifterMode, number> = { up: 0, down: 1, both: 2 };

let workletRegistered = false;
let workletRegistrationPromise: Promise<void> | null = null;

async function registerFreqShifterWorklet(context: AudioContext): Promise<void> {
  if (workletRegistered) return;
  if (workletRegistrationPromise) return workletRegistrationPromise;

  workletRegistrationPromise = context.audioWorklet.addModule('/worklets/freq-shifter-processor.js');
  try {
    await workletRegistrationPromise;
    workletRegistered = true;
  } catch (error) {
    workletRegistrationPromise = null;
    throw error;
  }
}

export class SynthFreqShifterNode implements SynthNode {
  id: string;
  type = 'freqshifter';

  private context: AudioContext;
  private params: FreqShifterParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private workletNode: AudioWorkletNode | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<FreqShifterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    this.updateMix();
    this.initWorklet();
  }

  private async initWorklet(): Promise<void> {
    try {
      await registerFreqShifterWorklet(this.context);

      this.workletNode = new AudioWorkletNode(this.context, 'freq-shifter-processor');

      this.inputGain.connect(this.workletNode);
      this.workletNode.connect(this.wetGain);
      this.wetGain.connect(this.outputGain);

      // Send initial params — worklet handles its own mix as 1.0, we mix externally
      this.workletNode.port.postMessage({ type: 'setParam', name: 'shiftHz', value: this.params.shiftHz });
      this.workletNode.port.postMessage({ type: 'setParam', name: 'mode', value: MODE_MAP[this.params.mode] });
      this.workletNode.port.postMessage({ type: 'setParam', name: 'mix', value: 1.0 });
    } catch (err) {
      console.error('FreqShifterNode: Failed to init worklet', err);
      // Fallback: pass-through on wet path
      this.inputGain.connect(this.wetGain);
      this.wetGain.connect(this.outputGain);
    }
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
      case 'shiftHz':
        this.params.shiftHz = Math.max(-1000, Math.min(1000, value as number));
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setParam', name: 'shiftHz', value: this.params.shiftHz });
        }
        break;
      case 'mode':
        this.params.mode = value as FreqShifterMode;
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setParam', name: 'mode', value: MODE_MAP[this.params.mode] });
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
    if (this.workletNode) this.workletNode.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }
}
