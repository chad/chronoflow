// BitcrusherNode - Bit depth and sample rate reduction for lo-fi effects
// Reduces resolution for digital degradation, retro sounds, and creative distortion

import type { SynthNode, AudioNodeParams } from './types';

export interface BitcrusherParams {
  bits: number;               // Bit depth (1-16)
  sampleRateReduction: number; // Sample rate divisor (1-40)
  mix: number;                // Dry/wet (0-1)
}

const DEFAULT_PARAMS: BitcrusherParams = {
  bits: 8,
  sampleRateReduction: 1,
  mix: 1.0,
};

let workletRegistered = false;
let workletRegistrationPromise: Promise<void> | null = null;

async function registerBitcrusherWorklet(context: AudioContext): Promise<void> {
  if (workletRegistered) return;
  if (workletRegistrationPromise) return workletRegistrationPromise;

  workletRegistrationPromise = context.audioWorklet.addModule('/worklets/bitcrusher-processor.js');
  try {
    await workletRegistrationPromise;
    workletRegistered = true;
  } catch (error) {
    workletRegistrationPromise = null;
    throw error;
  }
}

export class SynthBitcrusherNode implements SynthNode {
  id: string;
  type = 'bitcrusher';

  private context: AudioContext;
  private params: BitcrusherParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private workletNode: AudioWorkletNode | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<BitcrusherParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Dry path (always available)
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    this.updateMix();
    this.initWorklet();
  }

  private async initWorklet(): Promise<void> {
    try {
      await registerBitcrusherWorklet(this.context);

      this.workletNode = new AudioWorkletNode(this.context, 'bitcrusher-processor');

      // Connect wet path through worklet
      this.inputGain.connect(this.workletNode);
      this.workletNode.connect(this.wetGain);
      this.wetGain.connect(this.outputGain);

      // Send current params (worklet handles its own mix internally as 1.0)
      this.workletNode.port.postMessage({ type: 'setParam', name: 'bits', value: this.params.bits });
      this.workletNode.port.postMessage({ type: 'setParam', name: 'sampleRateReduction', value: this.params.sampleRateReduction });
      this.workletNode.port.postMessage({ type: 'setParam', name: 'mix', value: 1.0 }); // We handle mix externally
    } catch (err) {
      console.error('BitcrusherNode: Failed to init worklet', err);
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
      case 'bits':
        this.params.bits = Math.max(1, Math.min(16, value as number));
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setParam', name: 'bits', value: this.params.bits });
        }
        break;
      case 'sampleRateReduction':
        this.params.sampleRateReduction = Math.max(1, Math.min(40, Math.floor(value as number)));
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setParam', name: 'sampleRateReduction', value: this.params.sampleRateReduction });
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
