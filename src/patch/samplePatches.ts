import type { Patch } from './types';

export const DEMO_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Demo Patch',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Oscillator
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 150 },
      params: { frequency: 440, detune: 0, waveform: 'sawtooth' },
    },
    // Filter
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 250, y: 150 },
      params: { mode: 'lowpass', cutoff: 1500, resonance: 2 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 450, y: 150 },
      params: { gain: 0 },
    },
    // ADSR for amplitude
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 250, y: 20 },
      params: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
    },
    // LFO for filter modulation
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 50, y: 20 },
      params: { rate: 0.5, depth: 500, waveform: 'sine' },
    },
    // Delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 600, y: 100 },
      params: { time: 0.3, feedback: 0.4, mix: 0.3 },
    },
    // Reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 600, y: 250 },
      params: { decay: 2, mix: 0.25 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 800, y: 175 },
      params: { gain: 0.7 },
    },
  ],
  connections: [
    // Audio chain: Osc -> Filter -> VCA -> Delay -> Reverb -> Output
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'c4', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA gain modulation
    { id: 'c6', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
    // LFO -> Filter cutoff modulation
    { id: 'c7', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'filter1', port: 'cutoff_mod' } },
  ],
  groups: [],
};

export const SIMPLE_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Simple Synth',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 100, y: 150 },
      params: { frequency: 440, detune: 0, waveform: 'sawtooth' },
    },
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 300, y: 150 },
      params: { mode: 'lowpass', cutoff: 2000, resonance: 1 },
    },
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 500, y: 150 },
      params: { gain: 0 },
    },
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 300, y: 30 },
      params: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 700, y: 150 },
      params: { gain: 0.7 },
    },
  ],
  connections: [
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    { id: 'c4', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
  ],
  groups: [],
};

export const MIXER_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Triple Oscillator',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Three oscillators with different waveforms
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 50 },
      params: { frequency: 440, detune: 0, waveform: 'sawtooth' },
    },
    {
      id: 'osc2',
      type: 'oscillator',
      position: { x: 50, y: 180 },
      params: { frequency: 440, detune: -5, waveform: 'square' },
    },
    {
      id: 'osc3',
      type: 'oscillator',
      position: { x: 50, y: 310 },
      params: { frequency: 440, detune: 7, waveform: 'sine' },
    },
    // Mixer to combine oscillators
    {
      id: 'mixer1',
      type: 'mixer',
      position: { x: 250, y: 150 },
      params: { level1: 0.7, level2: 0.5, level3: 0.4, level4: 0, master: 1 },
    },
    // Filter
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 450, y: 150 },
      params: { mode: 'lowpass', cutoff: 1800, resonance: 1.5 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 600, y: 150 },
      params: { gain: 0 },
    },
    // ADSR
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 450, y: 20 },
      params: { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.4 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 750, y: 150 },
      params: { gain: 0.7 },
    },
  ],
  connections: [
    // Oscillators to mixer channels
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'mixer1', port: 'input1' } },
    { id: 'c2', from: { nodeId: 'osc2', port: 'output' }, to: { nodeId: 'mixer1', port: 'input2' } },
    { id: 'c3', from: { nodeId: 'osc3', port: 'output' }, to: { nodeId: 'mixer1', port: 'input3' } },
    // Mixer -> Filter -> VCA -> Output
    { id: 'c4', from: { nodeId: 'mixer1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c6', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA gain modulation
    { id: 'c7', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
  ],
  groups: [],
};

// Sequencer patch - musical arpeggio
export const SEQUENCER_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Arpeggio Sequence',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Sequencer - C minor arpeggio pattern
    {
      id: 'seq1',
      type: 'sequencer',
      position: { x: 50, y: 20 },
      params: {
        bpm: 140,
        steps: 8,
        gate: 0.4,
        swing: 50,
        // C minor 7 arpeggio: C, Eb, G, Bb, C+, Bb, G, Eb
        patternA: 'C-4 D#4 G-4 A#4 C-5 A#4 G-4 D#4',
        patternB: '',
        patternC: '',
        patternD: '',
        chain: 'A',
        running: true,
        extClock: false,
      },
    },
    // Oscillator 1 - main
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 180 },
      params: { frequency: 440, detune: 0, waveform: 'sawtooth' },
    },
    // Oscillator 2 - detuned for richness
    {
      id: 'osc2',
      type: 'oscillator',
      position: { x: 50, y: 310 },
      params: { frequency: 440, detune: 7, waveform: 'sawtooth' },
    },
    // Mixer
    {
      id: 'mixer1',
      type: 'mixer',
      position: { x: 220, y: 220 },
      params: { level1: 0.6, level2: 0.4, level3: 0, level4: 0, master: 1 },
    },
    // Filter with resonance for plucky sound
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 420, y: 180 },
      params: { mode: 'lowpass', cutoff: 2500, resonance: 3 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 600, y: 180 },
      params: { gain: 0 },
    },
    // Snappy ADSR for plucky envelope
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 420, y: 50 },
      params: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.2 },
    },
    // LFO for subtle filter movement
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 220, y: 50 },
      params: { rate: 0.25, depth: 400, waveform: 'sine' },
    },
    // Delay for rhythmic echo
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 750, y: 120 },
      params: { time: 0.214, feedback: 0.45, mix: 0.35 }, // ~1/8 note at 140 BPM
    },
    // Reverb for space
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 750, y: 260 },
      params: { decay: 2.5, mix: 0.3 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 920, y: 180 },
      params: { gain: 0.6 },
    },
  ],
  connections: [
    // Sequencer triggers notes (connect to ADSR to indicate it's controlling the envelope)
    { id: 'c0', from: { nodeId: 'seq1', port: 'output' }, to: { nodeId: 'adsr1', port: 'trigger' } },
    // Oscillators to mixer
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'mixer1', port: 'input1' } },
    { id: 'c2', from: { nodeId: 'osc2', port: 'output' }, to: { nodeId: 'mixer1', port: 'input2' } },
    // Mixer -> Filter -> VCA
    { id: 'c3', from: { nodeId: 'mixer1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c4', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    // VCA -> Effects -> Output
    { id: 'c5', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'c6', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'c7', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA gain modulation
    { id: 'c8', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
    // LFO -> Filter cutoff modulation
    { id: 'c9', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'filter1', port: 'cutoff_mod' } },
  ],
  groups: [],
};

// Random Melody - Noise through S&H and Quantizer creates generative melodies
export const RANDOM_MELODY_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Random Melody',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Noise source for randomness
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 50 },
      params: { type: 'white', level: 1 },
    },
    // Sample & Hold to capture random values
    {
      id: 'sh1',
      type: 'samplehold',
      position: { x: 200, y: 50 },
      params: { rate: 4, smooth: 0.1 },
    },
    // Quantizer to snap to musical scale
    {
      id: 'quant1',
      type: 'quantizer',
      position: { x: 350, y: 50 },
      params: { scale: 'pentatonic', root: 0, octaves: 2 },
    },
    // Main oscillator
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 200 },
      params: { frequency: 440, detune: 0, waveform: 'triangle' },
    },
    // Filter
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 250, y: 200 },
      params: { mode: 'lowpass', cutoff: 3000, resonance: 2 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 450, y: 200 },
      params: { gain: 0 },
    },
    // ADSR
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 250, y: 350 },
      params: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
    },
    // Delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 600, y: 150 },
      params: { time: 0.375, feedback: 0.5, mix: 0.4 },
    },
    // Reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 600, y: 280 },
      params: { decay: 3, mix: 0.4 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 780, y: 200 },
      params: { gain: 0.6 },
    },
  ],
  connections: [
    // Random CV chain: Noise -> S&H -> Quantizer -> Osc frequency
    { id: 'c1', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'sh1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'sh1', port: 'output' }, to: { nodeId: 'quant1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'quant1', port: 'output' }, to: { nodeId: 'osc1', port: 'freq_mod' } },
    // Audio chain
    { id: 'c4', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c6', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'c7', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'c8', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA
    { id: 'c9', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
  ],
  groups: [],
};

// West Coast Lead - Wavefolder for aggressive harmonic content
export const WESTCOAST_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'West Coast Lead',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Sine oscillator (wavefolding works best with simple waves)
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 150 },
      params: { frequency: 440, detune: 0, waveform: 'sine' },
    },
    // Wavefolder for harmonic richness
    {
      id: 'fold1',
      type: 'wavefolder',
      position: { x: 220, y: 150 },
      params: { drive: 3, folds: 3, mix: 0.8 },
    },
    // Filter to tame harshness
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 420, y: 150 },
      params: { mode: 'lowpass', cutoff: 4000, resonance: 1 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 600, y: 150 },
      params: { gain: 0 },
    },
    // ADSR
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 420, y: 20 },
      params: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.5 },
    },
    // LFO to modulate wavefolder drive
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 50, y: 20 },
      params: { rate: 2, depth: 2, waveform: 'triangle' },
    },
    // Delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 750, y: 100 },
      params: { time: 0.2, feedback: 0.3, mix: 0.25 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 900, y: 150 },
      params: { gain: 0.5 },
    },
  ],
  connections: [
    // Audio: Osc -> Wavefolder -> Filter -> VCA -> Delay -> Output
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'fold1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'fold1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c4', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA
    { id: 'c6', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
    // LFO -> Wavefolder drive for movement
    { id: 'c7', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'fold1', port: 'drive_mod' } },
  ],
  groups: [],
};

// Metallic Bells - Ring modulator for bell-like inharmonic tones
export const BELLS_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Metallic Bells',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Main oscillator (signal to modulate)
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 150 },
      params: { frequency: 440, detune: 0, waveform: 'sine' },
    },
    // Ring modulator with high carrier frequency
    {
      id: 'ring1',
      type: 'ringmod',
      position: { x: 250, y: 150 },
      params: { carrierFreq: 880, carrierType: 'sine', mix: 0.7, useExternal: false },
    },
    // Filter
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 450, y: 150 },
      params: { mode: 'lowpass', cutoff: 6000, resonance: 0.5 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 620, y: 150 },
      params: { gain: 0 },
    },
    // Bell-like ADSR (fast attack, long decay)
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 450, y: 20 },
      params: { attack: 0.001, decay: 1.5, sustain: 0, release: 1 },
    },
    // LFO for subtle carrier frequency modulation
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 50, y: 20 },
      params: { rate: 0.3, depth: 50, waveform: 'sine' },
    },
    // Big reverb for bell ambience
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 780, y: 150 },
      params: { decay: 4, mix: 0.5 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 950, y: 150 },
      params: { gain: 0.5 },
    },
  ],
  connections: [
    // Audio: Osc -> Ring Mod -> Filter -> VCA -> Reverb -> Output
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'ring1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'ring1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c4', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA
    { id: 'c6', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
    // LFO -> Ring mod carrier frequency
    { id: 'c7', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'ring1', port: 'freq_mod' } },
  ],
  groups: [],
};

// Noise Drums - Filtered noise for percussion
export const NOISE_DRUMS_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Noise Drums',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Sequencer for rhythm
    {
      id: 'seq1',
      type: 'sequencer',
      position: { x: 50, y: 20 },
      params: {
        bpm: 120,
        steps: 8,
        gate: 0.1,
        swing: 55,
        // Trigger on every step for hi-hat rhythm with velocity variation
        patternA: 'C-4:127 C-4:60 C-4:90 C-4:50 C-4:127 C-4:60 C-4:90 C-4:50',
        patternB: '',
        patternC: '',
        patternD: '',
        chain: 'A',
        running: true,
        extClock: false,
      },
    },
    // White noise source
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 180 },
      params: { type: 'white', level: 1 },
    },
    // Highpass filter for hi-hat character
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 220, y: 180 },
      params: { mode: 'highpass', cutoff: 8000, resonance: 1 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 400, y: 180 },
      params: { gain: 0 },
    },
    // Very snappy ADSR for percussion
    {
      id: 'adsr1',
      type: 'adsr',
      position: { x: 220, y: 50 },
      params: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
    },
    // Subtle delay for rhythm interest
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 550, y: 130 },
      params: { time: 0.125, feedback: 0.3, mix: 0.2 },
    },
    // Small reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 550, y: 260 },
      params: { decay: 0.8, mix: 0.2 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 720, y: 180 },
      params: { gain: 0.7 },
    },
  ],
  connections: [
    // Sequencer triggers ADSR
    { id: 'c0', from: { nodeId: 'seq1', port: 'output' }, to: { nodeId: 'adsr1', port: 'trigger' } },
    // Audio: Noise -> Filter -> VCA -> Effects -> Output
    { id: 'c1', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'c4', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // ADSR -> VCA
    { id: 'c6', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
  ],
  groups: [],
};

// Generative Ambient - Combines multiple new modules for evolving textures
export const AMBIENT_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Generative Ambient',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // Pink noise for S&H source
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 20 },
      params: { type: 'pink', level: 0.5 },
    },
    // Slow S&H for evolving pitch
    {
      id: 'sh1',
      type: 'samplehold',
      position: { x: 180, y: 20 },
      params: { rate: 0.5, smooth: 0.8 },
    },
    // Quantizer for musical results
    {
      id: 'quant1',
      type: 'quantizer',
      position: { x: 310, y: 20 },
      params: { scale: 'minor', root: 0, octaves: 2 },
    },
    // Main oscillator
    {
      id: 'osc1',
      type: 'oscillator',
      position: { x: 50, y: 180 },
      params: { frequency: 220, detune: 0, waveform: 'sine' },
    },
    // Wavefolder for subtle harmonics
    {
      id: 'fold1',
      type: 'wavefolder',
      position: { x: 200, y: 180 },
      params: { drive: 1.5, folds: 2, mix: 0.4 },
    },
    // Ring mod for shimmer
    {
      id: 'ring1',
      type: 'ringmod',
      position: { x: 380, y: 180 },
      params: { carrierFreq: 660, carrierType: 'sine', mix: 0.2, useExternal: false },
    },
    // Filter
    {
      id: 'filter1',
      type: 'filter',
      position: { x: 550, y: 180 },
      params: { mode: 'lowpass', cutoff: 2000, resonance: 2 },
    },
    // VCA
    {
      id: 'vca1',
      type: 'vca',
      position: { x: 720, y: 180 },
      params: { gain: 0.3 },
    },
    // Slow LFO for filter
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 380, y: 50 },
      params: { rate: 0.1, depth: 800, waveform: 'sine' },
    },
    // Slow LFO for ring mod
    {
      id: 'lfo2',
      type: 'lfo',
      position: { x: 200, y: 50 },
      params: { rate: 0.07, depth: 100, waveform: 'triangle' },
    },
    // Long delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 870, y: 120 },
      params: { time: 0.7, feedback: 0.6, mix: 0.5 },
    },
    // Big reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 870, y: 260 },
      params: { decay: 5, mix: 0.6 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1050, y: 180 },
      params: { gain: 0.5 },
    },
  ],
  connections: [
    // Generative pitch: Noise -> S&H -> Quantizer -> Osc
    { id: 'c1', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'sh1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'sh1', port: 'output' }, to: { nodeId: 'quant1', port: 'input' } },
    { id: 'c3', from: { nodeId: 'quant1', port: 'output' }, to: { nodeId: 'osc1', port: 'freq_mod' } },
    // Audio: Osc -> Wavefolder -> Ring Mod -> Filter -> VCA -> Effects
    { id: 'c4', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'fold1', port: 'input' } },
    { id: 'c5', from: { nodeId: 'fold1', port: 'output' }, to: { nodeId: 'ring1', port: 'input' } },
    { id: 'c6', from: { nodeId: 'ring1', port: 'output' }, to: { nodeId: 'filter1', port: 'input' } },
    { id: 'c7', from: { nodeId: 'filter1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c8', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'c9', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'c10', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    // LFO modulations
    { id: 'c11', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'filter1', port: 'cutoff_mod' } },
    { id: 'c12', from: { nodeId: 'lfo2', port: 'output' }, to: { nodeId: 'ring1', port: 'freq_mod' } },
  ],
  groups: [],
};

// Polyrhythmic Voices - Master Clock + Clock Divider with multiple sequencers
export const POLYRHYTHM_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Polyrhythmic Voices',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // === CLOCK SECTION ===
    // Master Clock - controls everything
    {
      id: 'clock1',
      type: 'clock',
      position: { x: 50, y: 20 },
      params: { bpm: 120, running: true, swing: 0 },
    },
    // Clock Divider - splits clock into different rhythms
    {
      id: 'clockdiv1',
      type: 'clockdiv',
      position: { x: 200, y: 20 },
      params: {},
    },

    // === LEAD VOICE (fast - /1 division) ===
    // Sequencer - arpeggiated lead melody
    {
      id: 'seq_lead',
      type: 'sequencer',
      position: { x: 400, y: 20 },
      params: {
        bpm: 120,
        steps: 8,
        gate: 0.3,
        swing: 50,
        // C minor pentatonic melody with velocity accents
        patternA: 'C-4:127 D#4:80 G-4:100 C-5:127 A#4:80 G-4:100 D#4:80 F-4:90',
        patternB: '',
        patternC: '',
        patternD: '',
        chain: 'A',
        running: true,
        extClock: true,
      },
    },
    // Lead oscillator - bright sawtooth
    {
      id: 'osc_lead',
      type: 'oscillator',
      position: { x: 400, y: 180 },
      params: { frequency: 440, detune: 0, waveform: 'sawtooth' },
    },
    // Lead filter
    {
      id: 'filter_lead',
      type: 'filter',
      position: { x: 550, y: 180 },
      params: { mode: 'lowpass', cutoff: 3000, resonance: 2 },
    },
    // Lead VCA
    {
      id: 'vca_lead',
      type: 'vca',
      position: { x: 700, y: 180 },
      params: { gain: 0 },
    },
    // Lead ADSR - plucky
    {
      id: 'adsr_lead',
      type: 'adsr',
      position: { x: 550, y: 50 },
      params: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.15 },
    },

    // === BASS VOICE (slow - /4 division) ===
    // Sequencer - slow bass line
    {
      id: 'seq_bass',
      type: 'sequencer',
      position: { x: 400, y: 350 },
      params: {
        bpm: 120,
        steps: 4,
        gate: 0.6,
        swing: 50,
        // Simple bass root movement
        patternA: 'C-3:127 C-3:100 D#3:110 F-3:120',
        patternB: '',
        patternC: '',
        patternD: '',
        chain: 'A',
        running: true,
        extClock: true,
      },
    },
    // Bass oscillator - sub square
    {
      id: 'osc_bass',
      type: 'oscillator',
      position: { x: 400, y: 500 },
      params: { frequency: 110, detune: 0, waveform: 'square' },
    },
    // Bass filter - warm lowpass
    {
      id: 'filter_bass',
      type: 'filter',
      position: { x: 550, y: 500 },
      params: { mode: 'lowpass', cutoff: 800, resonance: 1 },
    },
    // Bass VCA
    {
      id: 'vca_bass',
      type: 'vca',
      position: { x: 700, y: 500 },
      params: { gain: 0 },
    },
    // Bass ADSR - longer, rounder
    {
      id: 'adsr_bass',
      type: 'adsr',
      position: { x: 550, y: 380 },
      params: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
    },

    // === MIX SECTION ===
    // Mixer to combine voices
    {
      id: 'mixer1',
      type: 'mixer',
      position: { x: 870, y: 300 },
      params: { level1: 0.6, level2: 0.7, level3: 0, level4: 0, master: 1 },
    },
    // Delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 1050, y: 250 },
      params: { time: 0.25, feedback: 0.4, mix: 0.3 },
    },
    // Reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 1050, y: 380 },
      params: { decay: 2.5, mix: 0.3 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1220, y: 300 },
      params: { gain: 0.6 },
    },
  ],
  connections: [
    // === CLOCK ROUTING ===
    // Master clock -> Clock divider
    { id: 'clk1', from: { nodeId: 'clock1', port: 'output' }, to: { nodeId: 'clockdiv1', port: 'input' } },
    // Clock divider /1 -> Lead sequencer (fast)
    { id: 'clk2', from: { nodeId: 'clockdiv1', port: 'div1' }, to: { nodeId: 'seq_lead', port: 'input' } },
    // Clock divider /4 -> Bass sequencer (slow)
    { id: 'clk3', from: { nodeId: 'clockdiv1', port: 'div4' }, to: { nodeId: 'seq_bass', port: 'input' } },

    // === LEAD VOICE CHAIN ===
    // Sequencer -> ADSR trigger
    { id: 'l1', from: { nodeId: 'seq_lead', port: 'output' }, to: { nodeId: 'adsr_lead', port: 'trigger' } },
    // Osc -> Filter -> VCA
    { id: 'l2', from: { nodeId: 'osc_lead', port: 'output' }, to: { nodeId: 'filter_lead', port: 'input' } },
    { id: 'l3', from: { nodeId: 'filter_lead', port: 'output' }, to: { nodeId: 'vca_lead', port: 'input' } },
    // ADSR -> VCA gain
    { id: 'l4', from: { nodeId: 'adsr_lead', port: 'output' }, to: { nodeId: 'vca_lead', port: 'gain_mod' } },
    // Lead -> Mixer channel 1
    { id: 'l5', from: { nodeId: 'vca_lead', port: 'output' }, to: { nodeId: 'mixer1', port: 'input1' } },

    // === BASS VOICE CHAIN ===
    // Sequencer -> ADSR trigger
    { id: 'b1', from: { nodeId: 'seq_bass', port: 'output' }, to: { nodeId: 'adsr_bass', port: 'trigger' } },
    // Osc -> Filter -> VCA
    { id: 'b2', from: { nodeId: 'osc_bass', port: 'output' }, to: { nodeId: 'filter_bass', port: 'input' } },
    { id: 'b3', from: { nodeId: 'filter_bass', port: 'output' }, to: { nodeId: 'vca_bass', port: 'input' } },
    // ADSR -> VCA gain
    { id: 'b4', from: { nodeId: 'adsr_bass', port: 'output' }, to: { nodeId: 'vca_bass', port: 'gain_mod' } },
    // Bass -> Mixer channel 2
    { id: 'b5', from: { nodeId: 'vca_bass', port: 'output' }, to: { nodeId: 'mixer1', port: 'input2' } },

    // === OUTPUT CHAIN ===
    // Mixer -> Delay -> Reverb -> Output
    { id: 'm1', from: { nodeId: 'mixer1', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'm2', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'm3', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};

// Tracker Showcase - Full demonstration of sequencer features
// Features: velocity dynamics, probability, 4 patterns, chain sequencing, swing, dual voices
export const TRACKER_DEMO_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Tracker Showcase',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // ═══════════════════════════════════════════════════════════════
    // LEAD SEQUENCER - Demonstrates all tracker features
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_lead',
      type: 'sequencer',
      position: { x: 50, y: 20 },
      params: {
        bpm: 115,
        steps: 16,
        gate: 0.4,
        swing: 62, // Subtle swing for groove
        // Pattern A: Main hook - strong velocity dynamics (accents on 1 & 9)
        patternA: 'G-4:127 --- D-4:70 G-4:90 --- D-4:60 A-4:100 --- G-4:127 --- D-4:70 G-4:80 --- B-4:110 A-4:90 ---',
        // Pattern B: Response phrase with probability (ghost notes)
        patternB: 'D-5:127 --- B-4:80?70 A-4:70 --- G-4:90?60 --- D-4:60?50 D-5:110 --- B-4:70?65 --- A-4:100 G-4:80?55 --- ---',
        // Pattern C: Breakdown - sparse with high probability variation
        patternC: 'G-4:127 --- --- --- D-5:100?40 --- --- --- G-4:110 --- --- --- A-4:90?50 --- --- ---',
        // Pattern D: Build/climax - dense 16th notes with velocity ramp
        patternD: 'G-4:90 A-4:95 B-4:100 D-5:105 G-4:95 A-4:100 B-4:110 D-5:115 G-4:100 A-4:110 B-4:115 D-5:120 G-4:110 A-4:115 B-4:120 D-5:127',
        // Chain: Intro(A) -> Call/Response(AB) -> Breakdown(C) -> Build(D) -> Reprise
        chain: 'AABABACDAB',
        running: true,
        extClock: false,
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // BASS SEQUENCER - Complementary patterns with own chain
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_bass',
      type: 'sequencer',
      position: { x: 50, y: 380 },
      params: {
        bpm: 115,
        steps: 8,
        gate: 0.7,
        swing: 58,
        // Pattern A: Solid root
        patternA: 'G-2:127 --- --- G-2:80 --- --- G-2:90 ---',
        // Pattern B: Walking bass
        patternB: 'G-2:127 --- A-2:90 --- B-2:100 --- D-3:110 ---',
        // Pattern C: Sparse for breakdown
        patternC: 'G-2:127 --- --- --- --- --- --- ---',
        // Pattern D: Driving 8ths for build
        patternD: 'G-2:127 G-2:90 G-2:100 G-2:85 G-2:110 G-2:90 G-2:100 G-2:95',
        // Bass chain complements lead (2 bars per lead bar due to 8 vs 16 steps)
        chain: 'AAAABBBBAAAABBBBCCCCDDDDAABB',
        running: true,
        extClock: false,
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAD SYNTH VOICE
    // ═══════════════════════════════════════════════════════════════
    // Lead oscillator 1 - main
    {
      id: 'osc_lead1',
      type: 'oscillator',
      position: { x: 300, y: 20 },
      params: { frequency: 440, detune: 0, waveform: 'sawtooth' },
    },
    // Lead oscillator 2 - detuned for thickness
    {
      id: 'osc_lead2',
      type: 'oscillator',
      position: { x: 300, y: 120 },
      params: { frequency: 440, detune: 8, waveform: 'sawtooth' },
    },
    // Lead mixer
    {
      id: 'mixer_lead',
      type: 'mixer',
      position: { x: 470, y: 50 },
      params: { level1: 0.6, level2: 0.4, level3: 0, level4: 0, master: 1 },
    },
    // Lead filter - resonant for pluck character
    {
      id: 'filter_lead',
      type: 'filter',
      position: { x: 640, y: 50 },
      params: { mode: 'lowpass', cutoff: 4000, resonance: 3 },
    },
    // Lead VCA
    {
      id: 'vca_lead',
      type: 'vca',
      position: { x: 810, y: 50 },
      params: { gain: 0 },
    },
    // Lead ADSR - snappy for rhythmic clarity
    {
      id: 'adsr_lead',
      type: 'adsr',
      position: { x: 640, y: 180 },
      params: { attack: 0.003, decay: 0.12, sustain: 0.25, release: 0.18 },
    },
    // Filter envelope - adds pluck brightness
    {
      id: 'adsr_filter',
      type: 'adsr',
      position: { x: 470, y: 180 },
      params: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.1 },
    },

    // ═══════════════════════════════════════════════════════════════
    // BASS SYNTH VOICE
    // ═══════════════════════════════════════════════════════════════
    // Bass oscillator - sub square
    {
      id: 'osc_bass',
      type: 'oscillator',
      position: { x: 300, y: 380 },
      params: { frequency: 110, detune: 0, waveform: 'square' },
    },
    // Bass filter - warm lowpass
    {
      id: 'filter_bass',
      type: 'filter',
      position: { x: 470, y: 380 },
      params: { mode: 'lowpass', cutoff: 600, resonance: 1.5 },
    },
    // Bass VCA
    {
      id: 'vca_bass',
      type: 'vca',
      position: { x: 640, y: 380 },
      params: { gain: 0 },
    },
    // Bass ADSR - rounded for warmth
    {
      id: 'adsr_bass',
      type: 'adsr',
      position: { x: 470, y: 500 },
      params: { attack: 0.008, decay: 0.25, sustain: 0.6, release: 0.25 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MIX & EFFECTS
    // ═══════════════════════════════════════════════════════════════
    // Main mixer
    {
      id: 'mixer_main',
      type: 'mixer',
      position: { x: 980, y: 200 },
      params: { level1: 0.55, level2: 0.7, level3: 0, level4: 0, master: 1 },
    },
    // Delay - synced to tempo (~1/8 note at 115 BPM)
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 1150, y: 140 },
      params: { time: 0.26, feedback: 0.4, mix: 0.3 },
    },
    // Reverb - medium space
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 1150, y: 280 },
      params: { decay: 2.2, mix: 0.28 },
    },
    // LFO for subtle filter movement on lead
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 810, y: 180 },
      params: { rate: 0.15, depth: 300, waveform: 'sine' },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1320, y: 200 },
      params: { gain: 0.6 },
    },
  ],
  connections: [
    // ═══ LEAD SEQUENCER -> LEAD VOICE ═══
    { id: 'sl1', from: { nodeId: 'seq_lead', port: 'output' }, to: { nodeId: 'adsr_lead', port: 'trigger' } },
    { id: 'sl2', from: { nodeId: 'seq_lead', port: 'output' }, to: { nodeId: 'adsr_filter', port: 'trigger' } },

    // ═══ LEAD AUDIO CHAIN ═══
    { id: 'la1', from: { nodeId: 'osc_lead1', port: 'output' }, to: { nodeId: 'mixer_lead', port: 'input1' } },
    { id: 'la2', from: { nodeId: 'osc_lead2', port: 'output' }, to: { nodeId: 'mixer_lead', port: 'input2' } },
    { id: 'la3', from: { nodeId: 'mixer_lead', port: 'output' }, to: { nodeId: 'filter_lead', port: 'input' } },
    { id: 'la4', from: { nodeId: 'filter_lead', port: 'output' }, to: { nodeId: 'vca_lead', port: 'input' } },
    { id: 'la5', from: { nodeId: 'adsr_lead', port: 'output' }, to: { nodeId: 'vca_lead', port: 'gain_mod' } },
    { id: 'la6', from: { nodeId: 'adsr_filter', port: 'output' }, to: { nodeId: 'filter_lead', port: 'cutoff_mod' } },
    { id: 'la7', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'filter_lead', port: 'cutoff_mod' } },

    // ═══ BASS SEQUENCER -> BASS VOICE ═══
    { id: 'sb1', from: { nodeId: 'seq_bass', port: 'output' }, to: { nodeId: 'adsr_bass', port: 'trigger' } },

    // ═══ BASS AUDIO CHAIN ═══
    { id: 'ba1', from: { nodeId: 'osc_bass', port: 'output' }, to: { nodeId: 'filter_bass', port: 'input' } },
    { id: 'ba2', from: { nodeId: 'filter_bass', port: 'output' }, to: { nodeId: 'vca_bass', port: 'input' } },
    { id: 'ba3', from: { nodeId: 'adsr_bass', port: 'output' }, to: { nodeId: 'vca_bass', port: 'gain_mod' } },

    // ═══ VOICES -> MAIN MIXER ═══
    { id: 'mx1', from: { nodeId: 'vca_lead', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input1' } },
    { id: 'mx2', from: { nodeId: 'vca_bass', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input2' } },

    // ═══ EFFECTS -> OUTPUT ═══
    { id: 'fx1', from: { nodeId: 'mixer_main', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'fx2', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'fx3', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};

// Ambient Generative - Evolving textures using probability, S&H, and slow modulation
// Two generative voices: sequencer with probability + noise->S&H->quantizer
export const AMBIENT_GENERATIVE_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Ambient Generative',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // ═══════════════════════════════════════════════════════════════
    // SEQUENCER VOICE - Probability-based evolving melody
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq1',
      type: 'sequencer',
      position: { x: 50, y: 20 },
      params: {
        bpm: 40, // Very slow for ambient feel
        steps: 16,
        gate: 0.8, // Long gates for pads
        swing: 50,
        // Pattern A: Sparse melody - most notes have probability, creating variation
        patternA: 'E-4:90?60 --- G-4:80?40 --- B-4:100?55 --- D-5:70?35 --- E-5:85?45 --- G-4:75?50 --- B-4:90?40 ---',
        // Pattern B: Different register, different probabilities
        patternB: 'B-3:85?50 --- E-4:90?45 --- G-4:70?60 --- B-4:80?35 --- E-4:75?55 --- D-4:85?40 --- B-3:90?50 ---',
        // Pattern C: Higher, more sparse
        patternC: 'E-5:70?30 --- --- --- B-4:80?40 --- --- --- G-5:75?25 --- --- --- D-5:85?35 --- --- ---',
        // Pattern D: Lower drone-like, more certain
        patternD: 'E-3:100?80 --- --- --- E-3:90?70 --- --- --- B-3:85?75 --- --- --- E-3:95?80 --- --- ---',
        // Long chain for slow evolution over time
        chain: 'AABBCCDDAABBDDCCAABBCCAADDBB',
        running: true,
        extClock: false,
      },
    },
    // Sequencer voice oscillator - warm triangle
    {
      id: 'osc_seq',
      type: 'oscillator',
      position: { x: 300, y: 20 },
      params: { frequency: 440, detune: 0, waveform: 'triangle' },
    },
    // Second oscillator - slightly detuned sine for warmth
    {
      id: 'osc_seq2',
      type: 'oscillator',
      position: { x: 300, y: 120 },
      params: { frequency: 440, detune: -7, waveform: 'sine' },
    },
    // Mixer for seq oscillators
    {
      id: 'mixer_seq',
      type: 'mixer',
      position: { x: 470, y: 50 },
      params: { level1: 0.6, level2: 0.5, level3: 0, level4: 0, master: 1 },
    },
    // Wavefolder for subtle harmonic shimmer
    {
      id: 'fold_seq',
      type: 'wavefolder',
      position: { x: 620, y: 50 },
      params: { drive: 1.3, folds: 2, mix: 0.25 },
    },
    // Gentle filter
    {
      id: 'filter_seq',
      type: 'filter',
      position: { x: 770, y: 50 },
      params: { mode: 'lowpass', cutoff: 2500, resonance: 1.5 },
    },
    // VCA
    {
      id: 'vca_seq',
      type: 'vca',
      position: { x: 920, y: 50 },
      params: { gain: 0 },
    },
    // Slow pad envelope
    {
      id: 'adsr_seq',
      type: 'adsr',
      position: { x: 770, y: 180 },
      params: { attack: 0.8, decay: 0.5, sustain: 0.7, release: 2.0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // GENERATIVE VOICE - Noise -> S&H -> Quantizer -> Oscillator
    // ═══════════════════════════════════════════════════════════════
    // Pink noise source for smooth random
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 320 },
      params: { type: 'pink', level: 0.8 },
    },
    // Slow sample & hold with smoothing
    {
      id: 'sh1',
      type: 'samplehold',
      position: { x: 180, y: 320 },
      params: { rate: 0.3, smooth: 0.7 }, // Very slow, very smooth
    },
    // Quantizer to musical scale
    {
      id: 'quant1',
      type: 'quantizer',
      position: { x: 310, y: 320 },
      params: { scale: 'minor', root: 4, octaves: 2 }, // E minor to match sequencer
    },
    // Generative voice oscillator
    {
      id: 'osc_gen',
      type: 'oscillator',
      position: { x: 470, y: 320 },
      params: { frequency: 330, detune: 0, waveform: 'sine' },
    },
    // Ring mod for bell-like tones
    {
      id: 'ring1',
      type: 'ringmod',
      position: { x: 620, y: 320 },
      params: { carrierFreq: 660, carrierType: 'sine', mix: 0.3, useExternal: false },
    },
    // Filter for gen voice
    {
      id: 'filter_gen',
      type: 'filter',
      position: { x: 770, y: 320 },
      params: { mode: 'lowpass', cutoff: 3500, resonance: 2 },
    },
    // VCA for gen voice (constant level, modulated by LFO)
    {
      id: 'vca_gen',
      type: 'vca',
      position: { x: 920, y: 320 },
      params: { gain: 0.25 },
    },

    // ═══════════════════════════════════════════════════════════════
    // DRONE LAYER - Constant evolving pad
    // ═══════════════════════════════════════════════════════════════
    // Drone oscillator - low E
    {
      id: 'osc_drone',
      type: 'oscillator',
      position: { x: 50, y: 500 },
      params: { frequency: 82.41, detune: 0, waveform: 'sawtooth' }, // E2
    },
    // Drone filter - very dark
    {
      id: 'filter_drone',
      type: 'filter',
      position: { x: 200, y: 500 },
      params: { mode: 'lowpass', cutoff: 400, resonance: 2 },
    },
    // Drone VCA
    {
      id: 'vca_drone',
      type: 'vca',
      position: { x: 350, y: 500 },
      params: { gain: 0.15 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MODULATION - Slow LFOs for movement
    // ═══════════════════════════════════════════════════════════════
    // LFO 1 - Filter modulation for seq voice
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 620, y: 180 },
      params: { rate: 0.08, depth: 600, waveform: 'sine' },
    },
    // LFO 2 - Ring mod frequency
    {
      id: 'lfo2',
      type: 'lfo',
      position: { x: 470, y: 440 },
      params: { rate: 0.05, depth: 80, waveform: 'triangle' },
    },
    // LFO 3 - Drone filter
    {
      id: 'lfo3',
      type: 'lfo',
      position: { x: 50, y: 600 },
      params: { rate: 0.03, depth: 150, waveform: 'sine' },
    },
    // LFO 4 - Gen voice amplitude (slow swell)
    {
      id: 'lfo4',
      type: 'lfo',
      position: { x: 770, y: 440 },
      params: { rate: 0.1, depth: 0.15, waveform: 'sine' },
    },

    // ═══════════════════════════════════════════════════════════════
    // MIX & EFFECTS
    // ═══════════════════════════════════════════════════════════════
    // Main mixer
    {
      id: 'mixer_main',
      type: 'mixer',
      position: { x: 1070, y: 200 },
      params: { level1: 0.7, level2: 0.5, level3: 0.4, level4: 0, master: 1 },
    },
    // Long delay for ambient echoes
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 1220, y: 140 },
      params: { time: 0.75, feedback: 0.55, mix: 0.4 },
    },
    // Second delay for rhythmic interest
    {
      id: 'delay2',
      type: 'delay',
      position: { x: 1220, y: 260 },
      params: { time: 1.1, feedback: 0.45, mix: 0.3 },
    },
    // Large reverb for space
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 1370, y: 200 },
      params: { decay: 6, mix: 0.55 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1520, y: 200 },
      params: { gain: 0.5 },
    },
  ],
  connections: [
    // ═══ SEQUENCER VOICE ═══
    { id: 's1', from: { nodeId: 'seq1', port: 'output' }, to: { nodeId: 'adsr_seq', port: 'trigger' } },
    { id: 's2', from: { nodeId: 'osc_seq', port: 'output' }, to: { nodeId: 'mixer_seq', port: 'input1' } },
    { id: 's3', from: { nodeId: 'osc_seq2', port: 'output' }, to: { nodeId: 'mixer_seq', port: 'input2' } },
    { id: 's4', from: { nodeId: 'mixer_seq', port: 'output' }, to: { nodeId: 'fold_seq', port: 'input' } },
    { id: 's5', from: { nodeId: 'fold_seq', port: 'output' }, to: { nodeId: 'filter_seq', port: 'input' } },
    { id: 's6', from: { nodeId: 'filter_seq', port: 'output' }, to: { nodeId: 'vca_seq', port: 'input' } },
    { id: 's7', from: { nodeId: 'adsr_seq', port: 'output' }, to: { nodeId: 'vca_seq', port: 'gain_mod' } },
    { id: 's8', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'filter_seq', port: 'cutoff_mod' } },

    // ═══ GENERATIVE VOICE ═══
    { id: 'g1', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'sh1', port: 'input' } },
    { id: 'g2', from: { nodeId: 'sh1', port: 'output' }, to: { nodeId: 'quant1', port: 'input' } },
    { id: 'g3', from: { nodeId: 'quant1', port: 'output' }, to: { nodeId: 'osc_gen', port: 'freq_mod' } },
    { id: 'g4', from: { nodeId: 'osc_gen', port: 'output' }, to: { nodeId: 'ring1', port: 'input' } },
    { id: 'g5', from: { nodeId: 'ring1', port: 'output' }, to: { nodeId: 'filter_gen', port: 'input' } },
    { id: 'g6', from: { nodeId: 'filter_gen', port: 'output' }, to: { nodeId: 'vca_gen', port: 'input' } },
    { id: 'g7', from: { nodeId: 'lfo2', port: 'output' }, to: { nodeId: 'ring1', port: 'freq_mod' } },
    { id: 'g8', from: { nodeId: 'lfo4', port: 'output' }, to: { nodeId: 'vca_gen', port: 'gain_mod' } },

    // ═══ DRONE LAYER ═══
    { id: 'd1', from: { nodeId: 'osc_drone', port: 'output' }, to: { nodeId: 'filter_drone', port: 'input' } },
    { id: 'd2', from: { nodeId: 'filter_drone', port: 'output' }, to: { nodeId: 'vca_drone', port: 'input' } },
    { id: 'd3', from: { nodeId: 'lfo3', port: 'output' }, to: { nodeId: 'filter_drone', port: 'cutoff_mod' } },

    // ═══ VOICES -> MAIN MIXER ═══
    { id: 'm1', from: { nodeId: 'vca_seq', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input1' } },
    { id: 'm2', from: { nodeId: 'vca_gen', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input2' } },
    { id: 'm3', from: { nodeId: 'vca_drone', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input3' } },

    // ═══ EFFECTS CHAIN ═══
    { id: 'e1', from: { nodeId: 'mixer_main', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'e2', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'delay2', port: 'input' } },
    { id: 'e3', from: { nodeId: 'delay2', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'e4', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};
