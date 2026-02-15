// CompressorNode - Dynamics compressor for controlling signal levels
// Essential for taming peaks, gluing mixes, and adding punch
// Uses the native DynamicsCompressorNode for low-latency operation

import type { SynthNode, AudioNodeParams } from './types';

export interface CompressorParams {
  threshold: number;  // dB (-60 to 0)
  ratio: number;      // Compression ratio (1-20)
  attack: number;     // Attack time in seconds (0.001-1)
  release: number;    // Release time in seconds (0.01-2)
  knee: number;       // Soft knee in dB (0-40)
  makeupGain: number; // Post-compression gain in dB (0-30)
  mix: number;        // Dry/wet for parallel compression (0-1)
}

const DEFAULT_PARAMS: CompressorParams = {
  threshold: -24,
  ratio: 4,
  attack: 0.003,
  release: 0.25,
  knee: 10,
  makeupGain: 0,
  mix: 1.0,
};

export class SynthCompressorNode implements SynthNode {
  id: string;
  type = 'compressor';

  private context: AudioContext;
  private params: CompressorParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private compressor: DynamicsCompressorNode;
  private makeupGainNode: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<CompressorParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Native compressor
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = this.params.threshold;
    this.compressor.ratio.value = this.params.ratio;
    this.compressor.attack.value = this.params.attack;
    this.compressor.release.value = this.params.release;
    this.compressor.knee.value = this.params.knee;

    // Makeup gain (convert dB to linear)
    this.makeupGainNode = context.createGain();
    this.makeupGainNode.gain.value = Math.pow(10, this.params.makeupGain / 20);

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path: input → compressor → makeup → wet → output
    this.inputGain.connect(this.compressor);
    this.compressor.connect(this.makeupGainNode);
    this.makeupGainNode.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    this.updateMix();
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  // Get current gain reduction in dB (useful for metering)
  getReduction(): number {
    return this.compressor.reduction;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  // Sidechain input — feed an external signal to control the compressor
  getSidechainInput(): AudioNode {
    return this.compressor;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'threshold_mod':
        return this.compressor.threshold;
      case 'ratio_mod':
        return this.compressor.ratio;
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
    const now = this.context.currentTime;
    switch (name) {
      case 'threshold':
        this.params.threshold = Math.max(-60, Math.min(0, value as number));
        this.compressor.threshold.setTargetAtTime(this.params.threshold, now, 0.01);
        break;
      case 'ratio':
        this.params.ratio = Math.max(1, Math.min(20, value as number));
        this.compressor.ratio.setTargetAtTime(this.params.ratio, now, 0.01);
        break;
      case 'attack':
        this.params.attack = Math.max(0.001, Math.min(1, value as number));
        this.compressor.attack.setTargetAtTime(this.params.attack, now, 0.01);
        break;
      case 'release':
        this.params.release = Math.max(0.01, Math.min(2, value as number));
        this.compressor.release.setTargetAtTime(this.params.release, now, 0.01);
        break;
      case 'knee':
        this.params.knee = Math.max(0, Math.min(40, value as number));
        this.compressor.knee.setTargetAtTime(this.params.knee, now, 0.01);
        break;
      case 'makeupGain':
        this.params.makeupGain = Math.max(0, Math.min(30, value as number));
        this.makeupGainNode.gain.setTargetAtTime(
          Math.pow(10, this.params.makeupGain / 20),
          now,
          0.01
        );
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
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.compressor.disconnect();
    this.makeupGainNode.disconnect();
  }
}
