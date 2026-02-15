// ChorusNode - Multi-voice chorus/ensemble effect
// Creates richness by summing multiple detuned, modulated delay lines
// Useful for thickening vocals, pads, or any mono source

import type { SynthNode, AudioNodeParams } from './types';

export interface ChorusParams {
  rate: number;      // LFO rate in Hz (0.1-10)
  depth: number;     // Modulation depth (0-1)
  voices: number;    // Number of chorus voices (2-6)
  spread: number;    // Stereo spread (0-1)
  mix: number;       // Dry/wet (0-1)
  feedback: number;  // Feedback amount (0-0.8) — adds flanging character
}

const DEFAULT_PARAMS: ChorusParams = {
  rate: 1.5,
  depth: 0.5,
  voices: 3,
  spread: 0.5,
  mix: 0.5,
  feedback: 0,
};

const MAX_VOICES = 6;
const BASE_DELAY = 0.007; // 7ms base delay
const DELAY_SPREAD = 0.015; // 15ms spread between voices

export class SynthChorusNode implements SynthNode {
  id: string;
  type = 'chorus';

  private context: AudioContext;
  private params: ChorusParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Per-voice: delay, LFO, LFO gain, feedback
  private delays: DelayNode[];
  private lfos: OscillatorNode[];
  private lfoGains: GainNode[];
  private voiceGains: GainNode[];
  private feedbackGains: GainNode[];
  private wetSum: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<ChorusParams>) {
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

    this.delays = [];
    this.lfos = [];
    this.lfoGains = [];
    this.voiceGains = [];
    this.feedbackGains = [];

    // Create max voices (enable/disable via gain)
    for (let i = 0; i < MAX_VOICES; i++) {
      const delay = context.createDelay(0.1);
      delay.delayTime.value = BASE_DELAY + (i * DELAY_SPREAD / MAX_VOICES);

      const lfo = context.createOscillator();
      lfo.type = 'sine';
      // Slightly different rate per voice for natural feel
      lfo.frequency.value = this.params.rate * (1 + i * 0.12);

      const lfoGain = context.createGain();
      lfoGain.gain.value = this.getDepthInSeconds();

      const voiceGain = context.createGain();
      voiceGain.gain.value = i < this.params.voices ? 1.0 / this.params.voices : 0;

      const feedbackGain = context.createGain();
      feedbackGain.gain.value = this.params.feedback;

      // LFO → delay time modulation
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);

      // Input → delay → voice gain → wet sum
      this.inputGain.connect(delay);
      delay.connect(voiceGain);
      voiceGain.connect(this.wetSum);

      // Feedback: delay → feedback gain → delay
      delay.connect(feedbackGain);
      feedbackGain.connect(delay);

      lfo.start();

      this.delays.push(delay);
      this.lfos.push(lfo);
      this.lfoGains.push(lfoGain);
      this.voiceGains.push(voiceGain);
      this.feedbackGains.push(feedbackGain);
    }

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path
    this.wetSum.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    this.updateMix();
  }

  private getDepthInSeconds(): number {
    // Map 0-1 depth to delay modulation in seconds
    return this.params.depth * 0.003; // Max 3ms modulation
  }

  private updateVoiceGains(): void {
    const now = this.context.currentTime;
    const activeVoices = Math.floor(this.params.voices);
    const gainPerVoice = activeVoices > 0 ? 1.0 / activeVoices : 0;

    for (let i = 0; i < MAX_VOICES; i++) {
      const target = i < activeVoices ? gainPerVoice : 0;
      this.voiceGains[i].gain.setTargetAtTime(target, now, 0.02);
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
      case 'rate_mod':
        return this.lfos[0]?.frequency ?? null;
      case 'depth_mod':
        return this.lfoGains[0]?.gain ?? null;
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
      case 'rate':
        this.params.rate = Math.max(0.1, Math.min(10, value as number));
        for (let i = 0; i < MAX_VOICES; i++) {
          this.lfos[i].frequency.setTargetAtTime(
            this.params.rate * (1 + i * 0.12),
            now,
            0.02
          );
        }
        break;
      case 'depth':
        this.params.depth = Math.max(0, Math.min(1, value as number));
        for (const lg of this.lfoGains) {
          lg.gain.setTargetAtTime(this.getDepthInSeconds(), now, 0.02);
        }
        break;
      case 'voices':
        this.params.voices = Math.max(2, Math.min(MAX_VOICES, Math.floor(value as number)));
        this.updateVoiceGains();
        break;
      case 'spread':
        this.params.spread = Math.max(0, Math.min(1, value as number));
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'feedback':
        this.params.feedback = Math.max(0, Math.min(0.8, value as number));
        for (const fg of this.feedbackGains) {
          fg.gain.setTargetAtTime(this.params.feedback, now, 0.02);
        }
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    for (const lfo of this.lfos) lfo.stop();
    for (const d of this.delays) d.disconnect();
    for (const l of this.lfos) l.disconnect();
    for (const lg of this.lfoGains) lg.disconnect();
    for (const vg of this.voiceGains) vg.disconnect();
    for (const fg of this.feedbackGains) fg.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.wetSum.disconnect();
  }
}
