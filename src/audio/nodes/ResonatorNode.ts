// ResonatorNode - Bank of tuned resonant bandpass filters
// Creates bell-like, metallic, and struck-object textures
//
// Feed it noise, impulses, or any audio and it will ring at the tuned frequencies.
// Perfect for:
//   - Struck metal / gamelan sounds
//   - Sympathetic string resonance
//   - Body resonance simulation
//   - Ambient tonal beds from noise
//
// Modes:
//   harmonic: Partials at integer multiples of base frequency
//   inharm:   Slightly stretched partials (like a stiff bar/bell)
//   octaves:  Partials at octave intervals
//   chord:    Partials tuned to a chord (major/minor/sus)
//   free:     Each partial at a user-definable ratio

import type { SynthNode, AudioNodeParams } from './types';

export type ResonatorMode = 'harmonic' | 'inharm' | 'octaves' | 'chord' | 'free';

export interface ResonatorParams {
  frequency: number;  // Base frequency in Hz
  resonance: number;  // Q factor (1-100, higher = longer ring)
  mode: ResonatorMode;
  partials: number;   // Number of resonant bands (2-12)
  spread: number;     // Inharmonicity / chord spread (0-1)
  brightness: number; // Tilt — boost or cut high partials (0-1)
  decay: number;      // Overall decay envelope (0-1)
  mix: number;        // Dry/wet
}

const DEFAULT_PARAMS: ResonatorParams = {
  frequency: 220,
  resonance: 30,
  mode: 'harmonic',
  partials: 6,
  spread: 0.3,
  brightness: 0.6,
  decay: 0.7,
  mix: 0.8,
};

const MAX_PARTIALS = 12;

// Chord intervals in semitones from root
const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7, 12, 16, 19, 24, 28, 31, 36, 40, 43],
  minor: [0, 3, 7, 12, 15, 19, 24, 27, 31, 36, 39, 43],
  sus:   [0, 5, 7, 12, 17, 19, 24, 29, 31, 36, 41, 43],
};

export class SynthResonatorNode implements SynthNode {
  id: string;
  type = 'resonator';

  private context: AudioContext;
  private params: ResonatorParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Bank of bandpass filters
  private filters: BiquadFilterNode[];
  private filterGains: GainNode[]; // Per-partial amplitude

  // Sum of all resonators
  private resonatorSum: GainNode;

  // Optional built-in exciter (noise burst)
  private exciterGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<ResonatorParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // I/O
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Resonator sum
    this.resonatorSum = context.createGain();
    this.resonatorSum.gain.value = 1;

    // Create filter bank
    this.filters = [];
    this.filterGains = [];
    for (let i = 0; i < MAX_PARTIALS; i++) {
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = this.params.resonance;

      const gain = context.createGain();
      gain.gain.value = 0; // Will be set by updatePartials

      this.inputGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.resonatorSum);

      this.filters.push(filter);
      this.filterGains.push(gain);
    }

    // Exciter (internal noise burst for trigger)
    this.exciterGain = context.createGain();
    this.exciterGain.gain.value = 0;
    this.exciterGain.connect(this.inputGain);

    // Routing
    this.inputGain.connect(this.dryGain);
    this.resonatorSum.connect(this.wetGain);
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);

    this.updatePartials();
    this.updateMix();
  }

  private getPartialFrequency(index: number): number {
    const base = this.params.frequency;
    const spread = this.params.spread;

    switch (this.params.mode) {
      case 'harmonic': {
        return base * (index + 1);
      }
      case 'inharm': {
        // Stiff bar model: f_n = f_1 * n * sqrt(1 + B*n^2)
        const B = spread * 0.001; // Inharmonicity coefficient
        const n = index + 1;
        return base * n * Math.sqrt(1 + B * n * n);
      }
      case 'octaves': {
        return base * Math.pow(2, index);
      }
      case 'chord': {
        // Use spread to interpolate between major/minor/sus
        const intervals = spread < 0.33
          ? CHORD_INTERVALS.major
          : spread < 0.66
            ? CHORD_INTERVALS.minor
            : CHORD_INTERVALS.sus;
        const semitones = intervals[index % intervals.length];
        return base * Math.pow(2, semitones / 12);
      }
      case 'free': {
        // Free mode: spread controls how far partials deviate from harmonic
        const harmonic = base * (index + 1);
        const deviation = spread * harmonic * 0.2 * Math.sin(index * 1.618); // Golden ratio spacing
        return harmonic + deviation;
      }
      default:
        return base * (index + 1);
    }
  }

  private updatePartials(): void {
    const now = this.context.currentTime;
    const numActive = Math.min(Math.round(this.params.partials), MAX_PARTIALS);

    for (let i = 0; i < MAX_PARTIALS; i++) {
      if (i < numActive) {
        const freq = this.getPartialFrequency(i);
        // Clamp to Nyquist
        const clampedFreq = Math.min(freq, this.context.sampleRate / 2 - 100);

        this.filters[i].frequency.setTargetAtTime(Math.max(20, clampedFreq), now, 0.02);
        this.filters[i].Q.setTargetAtTime(this.params.resonance, now, 0.02);

        // Amplitude: brightness tilt + natural rolloff
        const rolloff = 1 / Math.pow(i + 1, 0.5 + (1 - this.params.brightness) * 1.5);
        const normalizedGain = rolloff / numActive * 3; // Normalize so total isn't too loud
        this.filterGains[i].gain.setTargetAtTime(normalizedGain, now, 0.02);
      } else {
        // Disable unused partials
        this.filterGains[i].gain.setTargetAtTime(0, now, 0.02);
      }
    }
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  // Trigger a noise burst to excite the resonators (like striking)
  trigger(velocity: number = 1): void {
    const now = this.context.currentTime;

    // Create a short noise burst
    const duration = 0.005 + (1 - this.params.brightness) * 0.02; // Brighter = shorter burst
    const bufferSize = Math.floor(duration * this.context.sampleRate);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Noise with exponential decay
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const burstGain = this.context.createGain();
    burstGain.gain.value = velocity * 2;

    source.connect(burstGain);
    burstGain.connect(this.inputGain);
    source.start(now);
    source.onended = () => {
      burstGain.disconnect();
    };
  }

  // Get trigger input (for connecting clock/euclidean etc.)
  getTriggerInput(): AudioNode {
    return this.exciterGain;
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'mix_mod': return this.wetGain.gain;
      case 'freq_mod': return this.filters[0]?.frequency ?? null;
      default: return null;
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

  disconnect(): void { this.outputGain.disconnect(); }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'frequency':
        this.params.frequency = Math.max(20, Math.min(8000, value as number));
        this.updatePartials();
        break;
      case 'resonance':
        this.params.resonance = Math.max(1, Math.min(100, value as number));
        this.updatePartials();
        break;
      case 'mode':
        this.params.mode = value as ResonatorMode;
        this.updatePartials();
        break;
      case 'partials':
        this.params.partials = Math.max(2, Math.min(MAX_PARTIALS, value as number));
        this.updatePartials();
        break;
      case 'spread':
        this.params.spread = Math.max(0, Math.min(1, value as number));
        this.updatePartials();
        break;
      case 'brightness':
        this.params.brightness = Math.max(0, Math.min(1, value as number));
        this.updatePartials();
        break;
      case 'decay':
        this.params.decay = Math.max(0, Math.min(1, value as number));
        // Decay affects Q
        const decayQ = this.params.resonance * (0.3 + this.params.decay * 0.7);
        this.filters.forEach(f => f.Q.setTargetAtTime(decayQ, this.context.currentTime, 0.02));
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.resonatorSum.disconnect();
    this.exciterGain.disconnect();
    this.filters.forEach(f => f.disconnect());
    this.filterGains.forEach(g => g.disconnect());
  }
}
