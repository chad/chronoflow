// DroneOscNode - Purpose-built drone/pad oscillator with stacked unison voices
// Creates rich, slowly evolving textures perfect for ambient music
//
// Features:
// - Multiple stacked oscillators with spread detuning
// - Per-voice drift (slow random detuning for organic movement)
// - Harmonic series mode (partials at integer multiples of fundamental)
// - Built-in sub oscillator
// - Crossfadeable waveforms
// - Slow attack/release built in for smooth transitions

import type { SynthNode, AudioNodeParams } from './types';

export type DroneWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'pulse';
export type DroneMode = 'unison' | 'harmonics' | 'fifths' | 'octaves';

export interface DroneOscParams {
  frequency: number;    // Base frequency in Hz
  voices: number;       // Number of stacked voices (1-8)
  spread: number;       // Detune spread in cents (0-100)
  drift: number;        // Random drift amount (0-1, how much voices wander)
  driftRate: number;    // How fast drift changes (0.01-0.5 Hz)
  waveform: DroneWaveform;
  mode: DroneMode;      // Voice stacking mode
  subLevel: number;     // Sub-oscillator level (0-1, one octave below)
  subWaveform: DroneWaveform;
  attack: number;       // Built-in fade-in time (0-10 seconds)
  level: number;        // Output level (0-1)
}

const DEFAULT_PARAMS: DroneOscParams = {
  frequency: 110,
  voices: 4,
  spread: 15,
  drift: 0.3,
  driftRate: 0.08,
  waveform: 'sawtooth',
  mode: 'unison',
  subLevel: 0.3,
  subWaveform: 'sine',
  attack: 2,
  level: 0.5,
};

interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
  detuneTarget: number; // Current detune target (for drift)
  detuneBase: number;   // Base detune from spread
}

export class SynthDroneOscNode implements SynthNode {
  id: string;
  type = 'droneosc';

  private context: AudioContext;
  private params: DroneOscParams;

  private voices: Voice[] = [];
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode;
  private outputGain: GainNode;
  private masterGain: GainNode; // For attack envelope
  private isPlaying = false;

  // Drift animation
  private driftInterval: number | null = null;

  // Modulation inputs
  private freqModGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<DroneOscParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.outputGain = context.createGain();
    this.outputGain.gain.value = this.params.level;

    this.masterGain = context.createGain();
    this.masterGain.gain.value = 0; // Start silent, fade in on start

    this.subGain = context.createGain();
    this.subGain.gain.value = this.params.subLevel;
    this.subGain.connect(this.masterGain);

    this.masterGain.connect(this.outputGain);

    // Frequency modulation input
    this.freqModGain = context.createGain();
    this.freqModGain.gain.value = 1;
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    this.createVoices();
    this.createSubOscillator();

    // Fade in with attack time
    const now = this.context.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(1, now + this.params.attack);

    // Start drift animation
    this.startDrift();
  }

  stop(): void {
    if (!this.isPlaying) return;

    // Fade out gracefully
    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, 0.5);

    // Stop after fade
    setTimeout(() => {
      this.destroyVoices();
      this.isPlaying = false;
    }, 2000);

    this.stopDrift();
  }

  private createVoices(): void {
    this.destroyVoices();

    const numVoices = Math.max(1, Math.min(8, Math.round(this.params.voices)));

    for (let i = 0; i < numVoices; i++) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      // Calculate frequency and detune based on mode
      const { frequency, detune } = this.getVoiceFreqDetune(i, numVoices);

      osc.type = this.getOscType(this.params.waveform);
      osc.frequency.value = frequency;
      osc.detune.value = detune;

      // Equal gain per voice (normalized)
      gain.gain.value = 1 / Math.sqrt(numVoices);

      // Connect modulation input to each voice's frequency
      this.freqModGain.connect(osc.frequency);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();

      this.voices.push({
        oscillator: osc,
        gain,
        detuneTarget: detune,
        detuneBase: detune,
      });
    }
  }

  private getVoiceFreqDetune(index: number, total: number): { frequency: number; detune: number } {
    const base = this.params.frequency;
    const spread = this.params.spread;

    switch (this.params.mode) {
      case 'unison': {
        // Spread voices symmetrically around center
        const normalizedPos = total > 1 ? (index / (total - 1)) * 2 - 1 : 0; // -1 to +1
        return { frequency: base, detune: normalizedPos * spread };
      }
      case 'harmonics': {
        // Each voice is a harmonic partial (1st, 2nd, 3rd, etc.)
        const partial = index + 1;
        return { frequency: base * partial, detune: (Math.random() - 0.5) * spread * 0.2 };
      }
      case 'fifths': {
        // Stack in fifths (ratio 3:2)
        const fifthRatio = Math.pow(1.5, Math.floor(index / 2));
        const octaveUp = index % 2 === 1;
        const freq = base * fifthRatio * (octaveUp ? 2 : 1);
        return { frequency: freq, detune: (Math.random() - 0.5) * spread * 0.3 };
      }
      case 'octaves': {
        // Stack in octaves
        const octave = Math.floor(index / 2);
        const freq = base * Math.pow(2, octave);
        const detuneOffset = index % 2 === 0 ? -spread * 0.3 : spread * 0.3;
        return { frequency: freq, detune: detuneOffset };
      }
      default:
        return { frequency: base, detune: 0 };
    }
  }

  private getOscType(waveform: DroneWaveform): OscillatorType {
    if (waveform === 'pulse') return 'square'; // Approximate
    return waveform as OscillatorType;
  }

  private createSubOscillator(): void {
    if (this.subOsc) {
      this.subOsc.stop();
      this.subOsc.disconnect();
    }

    if (this.params.subLevel <= 0) return;

    this.subOsc = this.context.createOscillator();
    this.subOsc.type = this.getOscType(this.params.subWaveform);
    this.subOsc.frequency.value = this.params.frequency / 2; // One octave below

    this.freqModGain.connect(this.subOsc.frequency);

    this.subOsc.connect(this.subGain);
    this.subOsc.start();
  }

  private destroyVoices(): void {
    this.voices.forEach(v => {
      v.oscillator.stop();
      v.oscillator.disconnect();
      v.gain.disconnect();
    });
    this.voices = [];

    if (this.subOsc) {
      this.subOsc.stop();
      this.subOsc.disconnect();
      this.subOsc = null;
    }
  }

  private startDrift(): void {
    this.stopDrift();

    // Update drift at ~15fps (enough for slow organic movement)
    this.driftInterval = window.setInterval(() => {
      const now = this.context.currentTime;
      const driftAmount = this.params.drift * this.params.spread;

      this.voices.forEach(voice => {
        // Slowly wander the detune target
        if (Math.random() < this.params.driftRate * 2) {
          voice.detuneTarget = voice.detuneBase + (Math.random() - 0.5) * 2 * driftAmount;
        }

        // Smoothly approach target
        const currentDetune = voice.oscillator.detune.value || voice.detuneBase;
        const newDetune = currentDetune + (voice.detuneTarget - currentDetune) * 0.02;
        voice.oscillator.detune.setTargetAtTime(newDetune, now, 0.1);
      });
    }, 67); // ~15fps
  }

  private stopDrift(): void {
    if (this.driftInterval !== null) {
      window.clearInterval(this.driftInterval);
      this.driftInterval = null;
    }
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode | null { return null; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'freq_mod': return this.freqModGain.gain;
      case 'level_mod': return this.outputGain.gain;
      default: return null;
    }
  }

  // Allow connecting to frequency modulation input node
  getModulationInputNode(paramName: string): AudioNode | null {
    switch (paramName) {
      case 'freq_mod': return this.freqModGain;
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
    const now = this.context.currentTime;
    switch (name) {
      case 'frequency':
        this.params.frequency = Math.max(20, Math.min(2000, value as number));
        this.voices.forEach((v, i) => {
          const { frequency } = this.getVoiceFreqDetune(i, this.voices.length);
          v.oscillator.frequency.setTargetAtTime(frequency, now, 0.05);
        });
        if (this.subOsc) {
          this.subOsc.frequency.setTargetAtTime(this.params.frequency / 2, now, 0.05);
        }
        break;
      case 'voices':
        this.params.voices = Math.max(1, Math.min(8, Math.round(value as number)));
        if (this.isPlaying) { this.createVoices(); }
        break;
      case 'spread':
        this.params.spread = Math.max(0, Math.min(100, value as number));
        this.voices.forEach((v, i) => {
          const { detune } = this.getVoiceFreqDetune(i, this.voices.length);
          v.detuneBase = detune;
          v.detuneTarget = detune;
          v.oscillator.detune.setTargetAtTime(detune, now, 0.1);
        });
        break;
      case 'drift':
        this.params.drift = Math.max(0, Math.min(1, value as number));
        break;
      case 'driftRate':
        this.params.driftRate = Math.max(0.01, Math.min(0.5, value as number));
        break;
      case 'waveform':
        this.params.waveform = value as DroneWaveform;
        this.voices.forEach(v => {
          v.oscillator.type = this.getOscType(this.params.waveform);
        });
        break;
      case 'mode':
        this.params.mode = value as DroneMode;
        if (this.isPlaying) { this.createVoices(); }
        break;
      case 'subLevel':
        this.params.subLevel = Math.max(0, Math.min(1, value as number));
        this.subGain.gain.setTargetAtTime(this.params.subLevel, now, 0.02);
        break;
      case 'subWaveform':
        this.params.subWaveform = value as DroneWaveform;
        if (this.subOsc) {
          this.subOsc.type = this.getOscType(this.params.subWaveform);
        }
        break;
      case 'attack':
        this.params.attack = Math.max(0, Math.min(10, value as number));
        break;
      case 'level':
        this.params.level = Math.max(0, Math.min(1, value as number));
        this.outputGain.gain.setTargetAtTime(this.params.level, now, 0.02);
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    this.stopDrift();
    this.destroyVoices();
    this.outputGain.disconnect();
    this.masterGain.disconnect();
    this.subGain.disconnect();
    this.freqModGain.disconnect();
  }
}
