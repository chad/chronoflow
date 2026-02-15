// FormantShifterNode - Shifts vocal formants independently of pitch
// Uses a bank of bandpass filters to isolate and resynthesize formant regions
// Shifting formants up makes voices sound smaller/younger, down sounds larger/deeper

import type { SynthNode, AudioNodeParams } from './types';

export interface FormantShifterParams {
  shift: number;       // Formant shift in semitones (-12 to +12)
  mix: number;         // Dry/wet (0-1)
  bandwidth: number;   // Filter bandwidth Q (1-20), controls formant selectivity
  vowel: 'auto' | 'a' | 'e' | 'i' | 'o' | 'u'; // Manual vowel override or auto
}

const DEFAULT_PARAMS: FormantShifterParams = {
  shift: 0,
  mix: 1.0,
  bandwidth: 8,
  vowel: 'auto',
};

// Standard formant center frequencies (Hz) for 5 formant bands
// These approximate adult vocal formants F1-F5
const BASE_FORMANT_FREQUENCIES = [500, 1500, 2500, 3500, 4500];

// Vowel-specific formant frequencies (F1, F2, F3)
const VOWEL_FORMANTS: Record<string, number[]> = {
  a: [730, 1090, 2440, 3500, 4500],
  e: [530, 1840, 2480, 3500, 4500],
  i: [270, 2290, 3010, 3500, 4500],
  o: [570, 840, 2410, 3500, 4500],
  u: [300, 870, 2240, 3500, 4500],
};

// Number of formant bands
const NUM_BANDS = 5;

export class SynthFormantShifterNode implements SynthNode {
  id: string;
  type = 'formantshifter';

  private context: AudioContext;
  private params: FormantShifterParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Analysis filters (extract formant energy from input)
  private analysisFilters: BiquadFilterNode[];
  // Synthesis filters (place formant energy at shifted frequencies)
  private synthesisFilters: BiquadFilterNode[];
  // Per-band gain nodes for matching energy
  private bandGains: GainNode[];
  // Wet summing bus
  private wetSum: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<FormantShifterParams>) {
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

    // Build filter bank
    this.analysisFilters = [];
    this.synthesisFilters = [];
    this.bandGains = [];

    const formants = this.getFormantFrequencies();

    for (let i = 0; i < NUM_BANDS; i++) {
      // Analysis: extract energy at original formant frequency
      const analysis = context.createBiquadFilter();
      analysis.type = 'bandpass';
      analysis.frequency.value = formants[i];
      analysis.Q.value = this.params.bandwidth;
      this.analysisFilters.push(analysis);

      // Per-band gain
      const bandGain = context.createGain();
      bandGain.gain.value = 1.0;
      this.bandGains.push(bandGain);

      // Synthesis: reposition at shifted frequency
      const synthesis = context.createBiquadFilter();
      synthesis.type = 'bandpass';
      synthesis.frequency.value = this.shiftFrequency(formants[i]);
      synthesis.Q.value = this.params.bandwidth;
      this.synthesisFilters.push(synthesis);

      // Connect: input -> analysis -> gain -> synthesis -> wetSum
      this.inputGain.connect(analysis);
      analysis.connect(bandGain);
      bandGain.connect(synthesis);
      synthesis.connect(this.wetSum);
    }

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path
    this.wetSum.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    this.updateMix();
  }

  private getFormantFrequencies(): number[] {
    if (this.params.vowel !== 'auto' && VOWEL_FORMANTS[this.params.vowel]) {
      return VOWEL_FORMANTS[this.params.vowel];
    }
    return BASE_FORMANT_FREQUENCIES;
  }

  private shiftFrequency(freq: number): number {
    // Shift by semitones (frequency ratio)
    const ratio = Math.pow(2, this.params.shift / 12);
    return Math.max(20, Math.min(20000, freq * ratio));
  }

  private updateFilters(): void {
    const formants = this.getFormantFrequencies();
    const now = this.context.currentTime;

    for (let i = 0; i < NUM_BANDS; i++) {
      // Analysis stays at original formant frequencies
      this.analysisFilters[i].frequency.setTargetAtTime(formants[i], now, 0.02);
      this.analysisFilters[i].Q.setTargetAtTime(this.params.bandwidth, now, 0.02);

      // Synthesis shifts to new formant frequencies
      this.synthesisFilters[i].frequency.setTargetAtTime(
        this.shiftFrequency(formants[i]),
        now,
        0.02
      );
      this.synthesisFilters[i].Q.setTargetAtTime(this.params.bandwidth, now, 0.02);
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
      case 'shift':
        this.params.shift = Math.max(-12, Math.min(12, value as number));
        this.updateFilters();
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'bandwidth':
        this.params.bandwidth = Math.max(1, Math.min(20, value as number));
        this.updateFilters();
        break;
      case 'vowel':
        this.params.vowel = value as FormantShifterParams['vowel'];
        this.updateFilters();
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.analysisFilters.forEach((f) => f.disconnect());
    this.synthesisFilters.forEach((f) => f.disconnect());
    this.bandGains.forEach((g) => g.disconnect());
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.wetSum.disconnect();
  }
}
