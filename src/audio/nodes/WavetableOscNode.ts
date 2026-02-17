// WavetableOscNode - Morphable wavetable oscillator for evolving ambient sounds
//
// Contains multiple built-in wavetables that can be morphed between continuously.
// Each wavetable is a single cycle waveform stored as samples.
// Morphing crossfades between adjacent tables for smooth timbral transitions.
//
// Built-in tables:
//   0: Sine (pure)
//   1: Warm Saw (band-limited, slightly softened)
//   2: Soft Square (rounded square)
//   3: Formant (vowel-like)
//   4: Organ (additive harmonics)
//   5: Glass (inharmonic partials)
//   6: Choir (breathy, wide harmonics)
//   7: Digital (sharp, metallic)

import type { SynthNode, AudioNodeParams } from './types';

export interface WavetableOscParams {
  frequency: number;    // Hz
  detune: number;       // cents
  morph: number;        // 0-1 position through the wavetable set
  level: number;        // Output level (0-1)
}

const DEFAULT_PARAMS: WavetableOscParams = {
  frequency: 220,
  detune: 0,
  morph: 0,
  level: 0.5,
};

const TABLE_SIZE = 2048;
const NUM_TABLES = 8;

function generateWavetables(sampleRate: number): Float32Array[] {
  const tables: Float32Array[] = [];

  // 0: Sine
  const sine = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    sine[i] = Math.sin(2 * Math.PI * i / TABLE_SIZE);
  }
  tables.push(sine);

  // 1: Warm Saw (band-limited with rolloff)
  const saw = new Float32Array(TABLE_SIZE);
  const maxHarmonics = Math.min(64, Math.floor(sampleRate / 2 / 440));
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 1; h <= maxHarmonics; h++) {
      const rolloff = 1 / (h * (1 + h * 0.02)); // Gentle high-harmonic rolloff
      val += rolloff * Math.sin(2 * Math.PI * h * i / TABLE_SIZE) * (h % 2 === 0 ? -1 : 1);
    }
    saw[i] = val * 0.6;
  }
  tables.push(saw);

  // 2: Soft Square (odd harmonics with Gibbs suppression)
  const square = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 1; h <= maxHarmonics; h += 2) {
      const sigma = Math.sin(Math.PI * h / maxHarmonics) / (Math.PI * h / maxHarmonics);
      val += (1 / h) * sigma * Math.sin(2 * Math.PI * h * i / TABLE_SIZE);
    }
    square[i] = val * 0.7;
  }
  tables.push(square);

  // 3: Formant (vowel 'ah' shape - emphasize harmonics 1,3,5,8,10)
  const formant = new Float32Array(TABLE_SIZE);
  const formantWeights = [1, 0.3, 0.8, 0.2, 0.6, 0.1, 0.1, 0.5, 0.1, 0.4];
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 0; h < formantWeights.length; h++) {
      val += formantWeights[h] * Math.sin(2 * Math.PI * (h + 1) * i / TABLE_SIZE);
    }
    formant[i] = val * 0.4;
  }
  tables.push(formant);

  // 4: Organ (drawbar-style additive)
  const organ = new Float32Array(TABLE_SIZE);
  const drawbars = [1, 0.8, 0, 0.6, 0, 0.4, 0, 0.2, 0.1]; // 8', 4', etc.
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 0; h < drawbars.length; h++) {
      if (drawbars[h] > 0) {
        val += drawbars[h] * Math.sin(2 * Math.PI * (h + 1) * i / TABLE_SIZE);
      }
    }
    organ[i] = val * 0.4;
  }
  tables.push(organ);

  // 5: Glass (inharmonic partials - stretched harmonics)
  const glass = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 1; h <= 12; h++) {
      // Stretch factor makes harmonics slightly sharp (like a stiff string/bar)
      const stretchedH = h * Math.pow(1.002, h * h);
      const amp = 1 / (h * 1.5);
      val += amp * Math.sin(2 * Math.PI * stretchedH * i / TABLE_SIZE);
    }
    glass[i] = val * 0.5;
  }
  tables.push(glass);

  // 6: Choir (breathy, many harmonics with random-ish amplitude modulation)
  const choir = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 1; h <= 20; h++) {
      // Pseudo-random amplitude per harmonic (deterministic from h)
      const amp = (1 / h) * (0.5 + 0.5 * Math.sin(h * 2.718));
      val += amp * Math.sin(2 * Math.PI * h * i / TABLE_SIZE);
    }
    choir[i] = val * 0.4;
  }
  tables.push(choir);

  // 7: Digital (sharp, every-other-harmonic emphasis with phase offsets)
  const digital = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    let val = 0;
    for (let h = 1; h <= 16; h++) {
      const amp = h % 3 === 0 ? 0.8 / h : 0.3 / h;
      const phase = h * 0.5; // Phase offset creates asymmetric waveform
      val += amp * Math.sin(2 * Math.PI * h * i / TABLE_SIZE + phase);
    }
    digital[i] = val * 0.5;
  }
  tables.push(digital);

  return tables;
}

export class SynthWavetableOscNode implements SynthNode {
  id: string;
  type = 'wavetableosc';

  private context: AudioContext;
  private params: WavetableOscParams;
  private tables: Float32Array[];

  // We use two PeriodicWave oscillators and crossfade between them
  // to achieve smooth morphing
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private gainA: GainNode;
  private gainB: GainNode;
  private outputGain: GainNode;
  private isPlaying = false;

  // Which tables oscA and oscB are currently using
  private tableIdxA = 0;
  private tableIdxB = 1;

  // Modulation inputs
  private freqModGain: GainNode;
  private morphModGain: GainNode; // Morph is driven via JS, but we accept CV

  // Morph animation
  private morphInterval: number | null = null;

  // Cached PeriodicWaves
  private periodicWaves: PeriodicWave[] = [];

  constructor(context: AudioContext, id: string, params?: Partial<WavetableOscParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.tables = generateWavetables(context.sampleRate);

    // Pre-compute PeriodicWaves from tables
    for (let t = 0; t < this.tables.length; t++) {
      const table = this.tables[t];
      // FFT the table to get real/imag components for PeriodicWave
      const real = new Float32Array(TABLE_SIZE / 2);
      const imag = new Float32Array(TABLE_SIZE / 2);
      real[0] = 0;
      imag[0] = 0;
      for (let k = 1; k < TABLE_SIZE / 2; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < TABLE_SIZE; n++) {
          const angle = 2 * Math.PI * k * n / TABLE_SIZE;
          re += table[n] * Math.cos(angle);
          im -= table[n] * Math.sin(angle);
        }
        real[k] = re / TABLE_SIZE * 2;
        imag[k] = im / TABLE_SIZE * 2;
      }
      this.periodicWaves.push(
        context.createPeriodicWave(real, imag, { disableNormalization: false })
      );
    }

    // Output
    this.outputGain = context.createGain();
    this.outputGain.gain.value = this.params.level;

    // Crossfade gains
    this.gainA = context.createGain();
    this.gainB = context.createGain();
    this.gainA.connect(this.outputGain);
    this.gainB.connect(this.outputGain);

    // Modulation
    this.freqModGain = context.createGain();
    this.freqModGain.gain.value = 1;
    this.morphModGain = context.createGain();
    this.morphModGain.gain.value = 1;
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updateMorph();
    this.startMorphTracking();
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.stopMorphTracking();

    if (this.oscA) { this.oscA.stop(); this.oscA.disconnect(); this.oscA = null; }
    if (this.oscB) { this.oscB.stop(); this.oscB.disconnect(); this.oscB = null; }
    this.isPlaying = false;
  }

  private createOscWithTable(tableIdx: number): OscillatorNode {
    const osc = this.context.createOscillator();
    osc.setPeriodicWave(this.periodicWaves[tableIdx]);
    osc.frequency.value = this.params.frequency;
    osc.detune.value = this.params.detune;
    this.freqModGain.connect(osc.frequency);
    osc.start();
    return osc;
  }

  private updateMorph(): void {
    const morph = this.params.morph;
    const totalTables = NUM_TABLES;

    // Map morph 0-1 to table range
    const position = morph * (totalTables - 1);
    const idxA = Math.floor(position);
    const idxB = Math.min(idxA + 1, totalTables - 1);
    const crossfade = position - idxA; // 0 = all A, 1 = all B

    const now = this.context.currentTime;

    // Only recreate oscillators if table indices changed
    if (idxA !== this.tableIdxA || !this.oscA) {
      if (this.oscA) { this.oscA.stop(); this.oscA.disconnect(); }
      this.oscA = this.createOscWithTable(idxA);
      this.oscA.connect(this.gainA);
      this.tableIdxA = idxA;
    }

    if (idxB !== this.tableIdxB || !this.oscB) {
      if (this.oscB) { this.oscB.stop(); this.oscB.disconnect(); }
      this.oscB = this.createOscWithTable(idxB);
      this.oscB.connect(this.gainB);
      this.tableIdxB = idxB;
    }

    // Crossfade with equal power
    this.gainA.gain.setTargetAtTime(Math.cos(crossfade * Math.PI / 2), now, 0.02);
    this.gainB.gain.setTargetAtTime(Math.sin(crossfade * Math.PI / 2), now, 0.02);
  }

  private startMorphTracking(): void {
    this.stopMorphTracking();
    // Track morph changes at 30fps
    this.morphInterval = window.setInterval(() => {
      if (this.isPlaying) this.updateMorph();
    }, 33);
  }

  private stopMorphTracking(): void {
    if (this.morphInterval !== null) {
      window.clearInterval(this.morphInterval);
      this.morphInterval = null;
    }
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode | null { return null; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'freq_mod': return this.oscA?.frequency ?? null;
      case 'level_mod': return this.outputGain.gain;
      default: return null;
    }
  }

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
        this.params.frequency = Math.max(20, Math.min(8000, value as number));
        if (this.oscA) this.oscA.frequency.setTargetAtTime(this.params.frequency, now, 0.01);
        if (this.oscB) this.oscB.frequency.setTargetAtTime(this.params.frequency, now, 0.01);
        break;
      case 'detune':
        this.params.detune = value as number;
        if (this.oscA) this.oscA.detune.setTargetAtTime(this.params.detune, now, 0.01);
        if (this.oscB) this.oscB.detune.setTargetAtTime(this.params.detune, now, 0.01);
        break;
      case 'morph':
        this.params.morph = Math.max(0, Math.min(1, value as number));
        if (this.isPlaying) this.updateMorph();
        break;
      case 'level':
        this.params.level = Math.max(0, Math.min(1, value as number));
        this.outputGain.gain.setTargetAtTime(this.params.level, now, 0.02);
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    this.stop();
    this.outputGain.disconnect();
    this.gainA.disconnect();
    this.gainB.disconnect();
    this.freqModGain.disconnect();
    this.morphModGain.disconnect();
  }
}
