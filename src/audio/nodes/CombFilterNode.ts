// CombFilterNode - Resonant comb filter for metallic/robotic timbres
// A short delay with feedback that resonates at harmonics of 1/delayTime.
// Tunable to a pitch — makes any input sound metallic and synthetic.
//
// Feedforward comb: adds a delayed copy (cancellation notches)
// Feedback comb: recirculates (sharp resonance peaks)
// Combined mode: both, for more complex coloring

import type { SynthNode, AudioNodeParams } from './types';

export type CombFilterMode = 'feedback' | 'feedforward' | 'both';

export interface CombFilterParams {
  frequency: number;    // Resonant frequency in Hz (20-5000) — sets delay time as 1/freq
  feedback: number;     // Feedback amount (-0.99 to 0.99, negative = inverted)
  damping: number;      // High frequency damping in feedback loop (0-1)
  mode: CombFilterMode; // Filter topology
  mix: number;          // Dry/wet (0-1)
}

const DEFAULT_PARAMS: CombFilterParams = {
  frequency: 200,
  feedback: 0.8,
  damping: 0.3,
  mode: 'feedback',
  mix: 0.5,
};

export class SynthCombFilterNode implements SynthNode {
  id: string;
  type = 'combfilter';

  private context: AudioContext;
  private params: CombFilterParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Feedback comb path
  private fbDelay: DelayNode;
  private fbGain: GainNode;
  private fbDamping: BiquadFilterNode;

  // Feedforward comb path
  private ffDelay: DelayNode;
  private ffGain: GainNode;

  // Wet summing
  private wetSum: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<CombFilterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.wetSum = context.createGain();
    this.wetSum.gain.value = 1;

    const delayTime = 1 / this.params.frequency;

    // Feedback comb: input → delay → [damping →] feedback → delay (loop), delay → output
    this.fbDelay = context.createDelay(0.1); // Max ~10Hz fundamental
    this.fbDelay.delayTime.value = Math.min(0.1, delayTime);

    this.fbGain = context.createGain();
    this.fbGain.gain.value = this.params.feedback;

    this.fbDamping = context.createBiquadFilter();
    this.fbDamping.type = 'lowpass';
    this.fbDamping.frequency.value = this.getDampingFrequency();
    this.fbDamping.Q.value = 0.5;

    // Feedback loop
    this.inputGain.connect(this.fbDelay);
    this.fbDelay.connect(this.fbDamping);
    this.fbDamping.connect(this.fbGain);
    this.fbGain.connect(this.fbDelay); // Feedback loop
    this.fbDelay.connect(this.wetSum);

    // Feedforward comb: input → delay → gain → output (summed with direct)
    this.ffDelay = context.createDelay(0.1);
    this.ffDelay.delayTime.value = Math.min(0.1, delayTime);

    this.ffGain = context.createGain();
    this.ffGain.gain.value = this.params.feedback;

    this.inputGain.connect(this.ffDelay);
    this.ffDelay.connect(this.ffGain);
    this.ffGain.connect(this.wetSum);
    // Also sum direct input for feedforward
    this.inputGain.connect(this.wetSum);

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path
    this.wetSum.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    this.updateMix();
    this.updateMode();
  }

  private getDampingFrequency(): number {
    // Map damping 0-1 to 20000-200 Hz
    return 20000 * Math.pow(0.01, this.params.damping);
  }

  private updateMode(): void {
    // Enable/disable paths based on mode
    // We do this by setting gain to 0 on disabled paths
    const now = this.context.currentTime;

    switch (this.params.mode) {
      case 'feedback':
        // Feedback on, feedforward off
        this.fbGain.gain.setTargetAtTime(this.params.feedback, now, 0.01);
        this.ffGain.gain.setTargetAtTime(0, now, 0.01);
        break;
      case 'feedforward':
        // Feedforward on, feedback off
        this.fbGain.gain.setTargetAtTime(0, now, 0.01);
        this.ffGain.gain.setTargetAtTime(this.params.feedback, now, 0.01);
        break;
      case 'both':
        this.fbGain.gain.setTargetAtTime(this.params.feedback, now, 0.01);
        this.ffGain.gain.setTargetAtTime(this.params.feedback * 0.5, now, 0.01);
        break;
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
      case 'frequency_mod':
        return this.fbDelay.delayTime; // Modulate delay time = modulate resonant freq
      case 'feedback_mod':
        return this.fbGain.gain;
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
      case 'frequency': {
        this.params.frequency = Math.max(20, Math.min(5000, value as number));
        const delayTime = Math.min(0.1, 1 / this.params.frequency);
        this.fbDelay.delayTime.setTargetAtTime(delayTime, now, 0.01);
        this.ffDelay.delayTime.setTargetAtTime(delayTime, now, 0.01);
        break;
      }
      case 'feedback':
        this.params.feedback = Math.max(-0.99, Math.min(0.99, value as number));
        this.updateMode();
        break;
      case 'damping':
        this.params.damping = Math.max(0, Math.min(1, value as number));
        this.fbDamping.frequency.setTargetAtTime(this.getDampingFrequency(), now, 0.02);
        break;
      case 'mode':
        this.params.mode = value as CombFilterMode;
        this.updateMode();
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
    this.wetSum.disconnect();
    this.fbDelay.disconnect();
    this.fbGain.disconnect();
    this.fbDamping.disconnect();
    this.ffDelay.disconnect();
    this.ffGain.disconnect();
  }
}
