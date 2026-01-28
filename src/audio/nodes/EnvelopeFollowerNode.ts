// EnvelopeFollowerNode - Extracts amplitude envelope from audio
// Perfect for audio-reactive modulation and sidechain-style effects

import type { SynthNode, AudioNodeParams } from './types';

export interface EnvelopeFollowerParams {
  attack: number;    // Attack/rise time in ms (1-500)
  release: number;   // Release/fall time in ms (1-2000)
  gain: number;      // Input gain/sensitivity (0.1-10)
  offset: number;    // Output offset (-1 to 1)
}

const DEFAULT_PARAMS: EnvelopeFollowerParams = {
  attack: 10,
  release: 100,
  gain: 1,
  offset: 0,
};

export class SynthEnvelopeFollowerNode implements SynthNode {
  id: string;
  type = 'envfollower';

  private context: AudioContext;
  private params: EnvelopeFollowerParams;

  // Input chain
  private inputGain: GainNode;

  // Envelope detection using Web Audio
  // Rectify -> Low-pass filter chain
  private rectifier: WaveShaperNode;
  private smoothingFilter: BiquadFilterNode;
  private outputGain: GainNode;
  private offsetNode: ConstantSourceNode;
  private offsetGain: GainNode;
  private sumGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<EnvelopeFollowerParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Input gain for sensitivity
    this.inputGain = context.createGain();
    this.inputGain.gain.value = this.params.gain;

    // Full-wave rectifier using waveshaper
    this.rectifier = context.createWaveShaper();
    this.rectifier.curve = this.makeRectifierCurve();
    this.rectifier.oversample = '2x';

    // Smoothing filter (lowpass for envelope)
    this.smoothingFilter = context.createBiquadFilter();
    this.smoothingFilter.type = 'lowpass';
    this.updateFilterFrequency();

    // Output gain
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Offset
    this.offsetNode = context.createConstantSource();
    this.offsetNode.offset.value = 1;
    this.offsetGain = context.createGain();
    this.offsetGain.gain.value = this.params.offset;
    this.offsetNode.connect(this.offsetGain);
    this.offsetNode.start();

    // Sum node
    this.sumGain = context.createGain();
    this.sumGain.gain.value = 1;

    // Connect chain: input -> gain -> rectifier -> filter -> output
    this.inputGain.connect(this.rectifier);
    this.rectifier.connect(this.smoothingFilter);
    this.smoothingFilter.connect(this.outputGain);
    this.outputGain.connect(this.sumGain);
    this.offsetGain.connect(this.sumGain);
  }

  private makeRectifierCurve(): Float32Array<ArrayBuffer> {
    // Full-wave rectifier: abs(x)
    const samples = 256;
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // -1 to 1
      curve[i] = Math.abs(x);
    }
    return curve;
  }

  private updateFilterFrequency(): void {
    // Use geometric mean of attack and release for filter frequency
    // Lower frequency = slower response
    const attackTime = this.params.attack / 1000;
    const releaseTime = this.params.release / 1000;
    const avgTime = (attackTime + releaseTime) / 2;

    // Convert time constant to frequency (approximately)
    // f = 1 / (2 * pi * tau)
    const frequency = 1 / (2 * Math.PI * avgTime);
    this.smoothingFilter.frequency.setValueAtTime(
      Math.max(0.1, Math.min(100, frequency)),
      this.context.currentTime
    );
  }

  getOutputNode(): AudioNode {
    return this.sumGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'gain_mod':
        return this.inputGain.gain;
      case 'offset_mod':
        return this.offsetGain.gain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.sumGain.connect(input);
      }
    } else {
      this.sumGain.connect(destination);
    }
  }

  disconnect(): void {
    this.sumGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'attack':
        this.params.attack = Math.max(1, Math.min(500, value as number));
        this.updateFilterFrequency();
        break;
      case 'release':
        this.params.release = Math.max(1, Math.min(2000, value as number));
        this.updateFilterFrequency();
        break;
      case 'gain':
        this.params.gain = Math.max(0.1, Math.min(10, value as number));
        this.inputGain.gain.setValueAtTime(this.params.gain, this.context.currentTime);
        break;
      case 'offset':
        this.params.offset = Math.max(-1, Math.min(1, value as number));
        this.offsetGain.gain.setValueAtTime(this.params.offset, this.context.currentTime);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.offsetNode.stop();
    this.offsetNode.disconnect();
    this.offsetGain.disconnect();
    this.inputGain.disconnect();
    this.rectifier.disconnect();
    this.smoothingFilter.disconnect();
    this.outputGain.disconnect();
    this.sumGain.disconnect();
  }
}
