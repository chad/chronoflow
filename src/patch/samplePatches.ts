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

// Pentatonic Dreams - Gentle, consonant ambient using C major pentatonic
// No dissonance, pure timbres, lush reverb - Brian Eno inspired
export const PENTATONIC_DREAMS_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Pentatonic Dreams',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // ═══════════════════════════════════════════════════════════════
    // HIGH VOICE - Gentle melody in upper register
    // C major pentatonic: C, D, E, G, A (no dissonance possible)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_high',
      type: 'sequencer',
      position: { x: 50, y: 20 },
      params: {
        bpm: 32, // Very slow, meditative
        steps: 12,
        gate: 0.9, // Long, overlapping notes
        swing: 50,
        // Pattern A: Ascending gesture, high probability on roots
        patternA: 'C-5:80?85 --- E-5:70?60 --- G-5:85?90 --- --- A-5:75?50 --- ---',
        // Pattern B: Descending response
        patternB: 'G-5:75?80 --- E-5:70?65 --- D-5:80?70 --- C-5:85?85 --- --- ---',
        // Pattern C: Octave jumps - very spacious
        patternC: 'C-5:90?90 --- --- --- G-5:80?60 --- --- --- C-6:70?45 --- --- ---',
        // Pattern D: Gentle movement around the 5th
        patternD: 'G-5:85?85 --- A-5:70?55 --- G-5:80?80 --- E-5:75?65 --- D-5:70?50 ---',
        chain: 'AABBCCDDAACCBBDD',
        running: true,
        extClock: false,
      },
    },
    // High voice oscillator - pure sine for bell-like clarity
    {
      id: 'osc_high',
      type: 'oscillator',
      position: { x: 280, y: 20 },
      params: { frequency: 523, detune: 0, waveform: 'sine' },
    },
    // Gentle filter for warmth
    {
      id: 'filter_high',
      type: 'filter',
      position: { x: 430, y: 20 },
      params: { mode: 'lowpass', cutoff: 4000, resonance: 0.5 },
    },
    // VCA
    {
      id: 'vca_high',
      type: 'vca',
      position: { x: 580, y: 20 },
      params: { gain: 0 },
    },
    // Soft, slow envelope
    {
      id: 'adsr_high',
      type: 'adsr',
      position: { x: 430, y: 130 },
      params: { attack: 1.5, decay: 0.8, sustain: 0.6, release: 3.0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MID VOICE - Warm pad in middle register
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_mid',
      type: 'sequencer',
      position: { x: 50, y: 250 },
      params: {
        bpm: 32,
        steps: 8,
        gate: 0.95,
        swing: 50,
        // Slower harmonic movement - mostly 5ths and octaves
        patternA: 'C-4:90?90 --- --- --- G-4:80?75 --- --- ---',
        patternB: 'G-4:85?85 --- --- --- E-4:75?70 --- --- ---',
        patternC: 'A-4:80?80 --- --- --- E-4:85?85 --- --- ---',
        patternD: 'D-4:85?80 --- --- --- G-4:80?75 --- --- ---',
        chain: 'AAAABBBBCCCCDDDDAAAABBBB',
        running: true,
        extClock: false,
      },
    },
    // Mid voice - triangle for warmth
    {
      id: 'osc_mid1',
      type: 'oscillator',
      position: { x: 280, y: 250 },
      params: { frequency: 262, detune: 0, waveform: 'triangle' },
    },
    // Second oscillator - slightly detuned for chorus
    {
      id: 'osc_mid2',
      type: 'oscillator',
      position: { x: 280, y: 350 },
      params: { frequency: 262, detune: 6, waveform: 'sine' },
    },
    // Mixer for mid oscillators
    {
      id: 'mixer_mid',
      type: 'mixer',
      position: { x: 430, y: 280 },
      params: { level1: 0.6, level2: 0.4, level3: 0, level4: 0, master: 1 },
    },
    // Warm filter
    {
      id: 'filter_mid',
      type: 'filter',
      position: { x: 580, y: 280 },
      params: { mode: 'lowpass', cutoff: 1800, resonance: 1 },
    },
    // VCA
    {
      id: 'vca_mid',
      type: 'vca',
      position: { x: 730, y: 280 },
      params: { gain: 0 },
    },
    // Very slow, pad-like envelope
    {
      id: 'adsr_mid',
      type: 'adsr',
      position: { x: 580, y: 400 },
      params: { attack: 2.0, decay: 1.0, sustain: 0.7, release: 4.0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // GENERATIVE VOICE - S&H quantized to pentatonic
    // ═══════════════════════════════════════════════════════════════
    // Pink noise for smooth random
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 500 },
      params: { type: 'pink', level: 0.6 },
    },
    // Very slow S&H with heavy smoothing
    {
      id: 'sh1',
      type: 'samplehold',
      position: { x: 180, y: 500 },
      params: { rate: 0.15, smooth: 0.85 }, // Glacial, very smooth
    },
    // Quantizer to pentatonic - always consonant
    {
      id: 'quant1',
      type: 'quantizer',
      position: { x: 310, y: 500 },
      params: { scale: 'pentatonic', root: 0, octaves: 2 }, // C pentatonic
    },
    // Generative oscillator - pure sine
    {
      id: 'osc_gen',
      type: 'oscillator',
      position: { x: 460, y: 500 },
      params: { frequency: 440, detune: 0, waveform: 'sine' },
    },
    // Gentle filter
    {
      id: 'filter_gen',
      type: 'filter',
      position: { x: 610, y: 500 },
      params: { mode: 'lowpass', cutoff: 2500, resonance: 0.8 },
    },
    // VCA with constant level + LFO swell
    {
      id: 'vca_gen',
      type: 'vca',
      position: { x: 760, y: 500 },
      params: { gain: 0.2 },
    },

    // ═══════════════════════════════════════════════════════════════
    // DRONE - Sustained fifth (C + G) for harmonic foundation
    // ═══════════════════════════════════════════════════════════════
    // Root drone - C2
    {
      id: 'osc_drone_root',
      type: 'oscillator',
      position: { x: 50, y: 650 },
      params: { frequency: 65.41, detune: 0, waveform: 'sine' }, // C2
    },
    // Fifth drone - G2
    {
      id: 'osc_drone_fifth',
      type: 'oscillator',
      position: { x: 50, y: 750 },
      params: { frequency: 98.0, detune: 0, waveform: 'sine' }, // G2
    },
    // Drone mixer
    {
      id: 'mixer_drone',
      type: 'mixer',
      position: { x: 200, y: 680 },
      params: { level1: 0.5, level2: 0.35, level3: 0, level4: 0, master: 1 },
    },
    // Very dark filter for sub-bass warmth
    {
      id: 'filter_drone',
      type: 'filter',
      position: { x: 350, y: 680 },
      params: { mode: 'lowpass', cutoff: 300, resonance: 1.5 },
    },
    // Drone VCA
    {
      id: 'vca_drone',
      type: 'vca',
      position: { x: 500, y: 680 },
      params: { gain: 0.18 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MODULATION - Gentle, slow LFOs
    // ═══════════════════════════════════════════════════════════════
    // LFO 1 - Filter for high voice (very subtle)
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 280, y: 130 },
      params: { rate: 0.06, depth: 400, waveform: 'sine' },
    },
    // LFO 2 - Filter for mid voice
    {
      id: 'lfo2',
      type: 'lfo',
      position: { x: 430, y: 400 },
      params: { rate: 0.04, depth: 300, waveform: 'sine' },
    },
    // LFO 3 - Gen voice amplitude swell
    {
      id: 'lfo3',
      type: 'lfo',
      position: { x: 610, y: 620 },
      params: { rate: 0.08, depth: 0.12, waveform: 'sine' },
    },
    // LFO 4 - Drone filter breathing
    {
      id: 'lfo4',
      type: 'lfo',
      position: { x: 200, y: 780 },
      params: { rate: 0.025, depth: 100, waveform: 'sine' },
    },

    // ═══════════════════════════════════════════════════════════════
    // MIX & EFFECTS - Lush, spacious
    // ═══════════════════════════════════════════════════════════════
    // Main mixer
    {
      id: 'mixer_main',
      type: 'mixer',
      position: { x: 900, y: 300 },
      params: { level1: 0.6, level2: 0.7, level3: 0.5, level4: 0.6, master: 1 },
    },
    // Long, diffuse delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 1050, y: 240 },
      params: { time: 0.9, feedback: 0.5, mix: 0.35 },
    },
    // Second delay - golden ratio timing
    {
      id: 'delay2',
      type: 'delay',
      position: { x: 1050, y: 360 },
      params: { time: 1.45, feedback: 0.4, mix: 0.3 },
    },
    // Large, lush reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 1200, y: 300 },
      params: { decay: 8, mix: 0.6 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1350, y: 300 },
      params: { gain: 0.45 },
    },
  ],
  connections: [
    // ═══ HIGH VOICE ═══
    { id: 'h1', from: { nodeId: 'seq_high', port: 'output' }, to: { nodeId: 'adsr_high', port: 'trigger' } },
    { id: 'h2', from: { nodeId: 'osc_high', port: 'output' }, to: { nodeId: 'filter_high', port: 'input' } },
    { id: 'h3', from: { nodeId: 'filter_high', port: 'output' }, to: { nodeId: 'vca_high', port: 'input' } },
    { id: 'h4', from: { nodeId: 'adsr_high', port: 'output' }, to: { nodeId: 'vca_high', port: 'gain_mod' } },
    { id: 'h5', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'filter_high', port: 'cutoff_mod' } },

    // ═══ MID VOICE ═══
    { id: 'm1', from: { nodeId: 'seq_mid', port: 'output' }, to: { nodeId: 'adsr_mid', port: 'trigger' } },
    { id: 'm2', from: { nodeId: 'osc_mid1', port: 'output' }, to: { nodeId: 'mixer_mid', port: 'input1' } },
    { id: 'm3', from: { nodeId: 'osc_mid2', port: 'output' }, to: { nodeId: 'mixer_mid', port: 'input2' } },
    { id: 'm4', from: { nodeId: 'mixer_mid', port: 'output' }, to: { nodeId: 'filter_mid', port: 'input' } },
    { id: 'm5', from: { nodeId: 'filter_mid', port: 'output' }, to: { nodeId: 'vca_mid', port: 'input' } },
    { id: 'm6', from: { nodeId: 'adsr_mid', port: 'output' }, to: { nodeId: 'vca_mid', port: 'gain_mod' } },
    { id: 'm7', from: { nodeId: 'lfo2', port: 'output' }, to: { nodeId: 'filter_mid', port: 'cutoff_mod' } },

    // ═══ GENERATIVE VOICE ═══
    { id: 'g1', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'sh1', port: 'input' } },
    { id: 'g2', from: { nodeId: 'sh1', port: 'output' }, to: { nodeId: 'quant1', port: 'input' } },
    { id: 'g3', from: { nodeId: 'quant1', port: 'output' }, to: { nodeId: 'osc_gen', port: 'freq_mod' } },
    { id: 'g4', from: { nodeId: 'osc_gen', port: 'output' }, to: { nodeId: 'filter_gen', port: 'input' } },
    { id: 'g5', from: { nodeId: 'filter_gen', port: 'output' }, to: { nodeId: 'vca_gen', port: 'input' } },
    { id: 'g6', from: { nodeId: 'lfo3', port: 'output' }, to: { nodeId: 'vca_gen', port: 'gain_mod' } },

    // ═══ DRONE ═══
    { id: 'd1', from: { nodeId: 'osc_drone_root', port: 'output' }, to: { nodeId: 'mixer_drone', port: 'input1' } },
    { id: 'd2', from: { nodeId: 'osc_drone_fifth', port: 'output' }, to: { nodeId: 'mixer_drone', port: 'input2' } },
    { id: 'd3', from: { nodeId: 'mixer_drone', port: 'output' }, to: { nodeId: 'filter_drone', port: 'input' } },
    { id: 'd4', from: { nodeId: 'filter_drone', port: 'output' }, to: { nodeId: 'vca_drone', port: 'input' } },
    { id: 'd5', from: { nodeId: 'lfo4', port: 'output' }, to: { nodeId: 'filter_drone', port: 'cutoff_mod' } },

    // ═══ ALL VOICES -> MAIN MIXER ═══
    { id: 'x1', from: { nodeId: 'vca_high', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input1' } },
    { id: 'x2', from: { nodeId: 'vca_mid', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input2' } },
    { id: 'x3', from: { nodeId: 'vca_gen', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input3' } },
    { id: 'x4', from: { nodeId: 'vca_drone', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input4' } },

    // ═══ EFFECTS -> OUTPUT ═══
    { id: 'e1', from: { nodeId: 'mixer_main', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'e2', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'delay2', port: 'input' } },
    { id: 'e3', from: { nodeId: 'delay2', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'e4', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};

// Crystal Bells - Round, bell-like ambient with harmonic ring modulation
// Instant attack, long decay envelopes, pentatonic, massive reverb
export const CRYSTAL_BELLS_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Crystal Bells',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // ═══════════════════════════════════════════════════════════════
    // HIGH BELLS - Bright, chiming tones
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_high',
      type: 'sequencer',
      position: { x: 50, y: 20 },
      params: {
        bpm: 28, // Very slow for spacious bells
        steps: 12,
        gate: 0.3, // Short gate, envelope does the work
        swing: 50,
        // Sparse high bells - pentatonic (C, D, E, G, A)
        patternA: 'C-6:90?70 --- --- E-6:80?55 --- --- G-6:85?60 --- --- --- --- ---',
        patternB: 'G-5:85?65 --- --- --- C-6:90?70 --- --- --- E-6:80?50 --- --- ---',
        patternC: 'E-6:80?55 --- --- G-6:85?60 --- --- C-7:75?40 --- --- --- --- ---',
        patternD: 'A-5:90?75 --- --- --- --- --- E-6:80?55 --- --- --- --- ---',
        chain: 'AABBCCDDAADDBBCC',
        running: true,
        extClock: false,
      },
    },
    // High bell oscillator - pure sine
    {
      id: 'osc_high',
      type: 'oscillator',
      position: { x: 280, y: 20 },
      params: { frequency: 1047, detune: 0, waveform: 'sine' }, // C6
    },
    // Ring mod with octave ratio (2:1) for harmonic bell tone
    {
      id: 'ring_high',
      type: 'ringmod',
      position: { x: 430, y: 20 },
      params: { carrierFreq: 2093, carrierType: 'sine', mix: 0.35, useExternal: false }, // Octave above
    },
    // Gentle highpass to remove mud
    {
      id: 'filter_high',
      type: 'filter',
      position: { x: 580, y: 20 },
      params: { mode: 'highpass', cutoff: 800, resonance: 0.3 },
    },
    // VCA
    {
      id: 'vca_high',
      type: 'vca',
      position: { x: 730, y: 20 },
      params: { gain: 0 },
    },
    // Bell envelope - instant attack, very long decay, no sustain
    {
      id: 'adsr_high',
      type: 'adsr',
      position: { x: 580, y: 130 },
      params: { attack: 0.001, decay: 4.0, sustain: 0, release: 3.0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MID BELLS - Warm, round tones
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_mid',
      type: 'sequencer',
      position: { x: 50, y: 250 },
      params: {
        bpm: 28,
        steps: 8,
        gate: 0.3,
        swing: 50,
        // Mid register bells
        patternA: 'G-4:95?80 --- --- --- C-5:90?70 --- --- ---',
        patternB: 'E-4:90?75 --- --- --- G-4:85?65 --- --- ---',
        patternC: 'C-5:95?85 --- --- --- E-5:85?60 --- --- ---',
        patternD: 'D-5:90?70 --- --- --- A-4:85?65 --- --- ---',
        chain: 'AAAABBBBCCCCDDDDAAAABBBB',
        running: true,
        extClock: false,
      },
    },
    // Mid bell oscillator
    {
      id: 'osc_mid',
      type: 'oscillator',
      position: { x: 280, y: 250 },
      params: { frequency: 392, detune: 0, waveform: 'sine' }, // G4
    },
    // Ring mod with perfect fifth ratio (3:2) - warm bell character
    {
      id: 'ring_mid',
      type: 'ringmod',
      position: { x: 430, y: 250 },
      params: { carrierFreq: 588, carrierType: 'sine', mix: 0.25, useExternal: false }, // ~fifth above
    },
    // Lowpass for warmth
    {
      id: 'filter_mid',
      type: 'filter',
      position: { x: 580, y: 250 },
      params: { mode: 'lowpass', cutoff: 3000, resonance: 0.5 },
    },
    // VCA
    {
      id: 'vca_mid',
      type: 'vca',
      position: { x: 730, y: 250 },
      params: { gain: 0 },
    },
    // Longer bell envelope
    {
      id: 'adsr_mid',
      type: 'adsr',
      position: { x: 580, y: 360 },
      params: { attack: 0.002, decay: 5.0, sustain: 0, release: 4.0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // GENERATIVE BELLS - S&H driven random bells
    // ═══════════════════════════════════════════════════════════════
    // Pink noise for smooth random
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 480 },
      params: { type: 'pink', level: 0.5 },
    },
    // Slow S&H
    {
      id: 'sh1',
      type: 'samplehold',
      position: { x: 180, y: 480 },
      params: { rate: 0.2, smooth: 0.6 },
    },
    // Quantizer to pentatonic
    {
      id: 'quant1',
      type: 'quantizer',
      position: { x: 310, y: 480 },
      params: { scale: 'pentatonic', root: 0, octaves: 3 },
    },
    // Gen bell oscillator
    {
      id: 'osc_gen',
      type: 'oscillator',
      position: { x: 460, y: 480 },
      params: { frequency: 523, detune: 0, waveform: 'sine' },
    },
    // Subtle ring mod for shimmer
    {
      id: 'ring_gen',
      type: 'ringmod',
      position: { x: 610, y: 480 },
      params: { carrierFreq: 784, carrierType: 'sine', mix: 0.2, useExternal: false }, // ~fifth
    },
    // Filter
    {
      id: 'filter_gen',
      type: 'filter',
      position: { x: 760, y: 480 },
      params: { mode: 'lowpass', cutoff: 4000, resonance: 0.3 },
    },
    // VCA with LFO swell
    {
      id: 'vca_gen',
      type: 'vca',
      position: { x: 910, y: 480 },
      params: { gain: 0.15 },
    },

    // ═══════════════════════════════════════════════════════════════
    // LOW BELLS - Deep, gong-like foundation
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_low',
      type: 'sequencer',
      position: { x: 50, y: 680 },
      params: {
        bpm: 28,
        steps: 16,
        gate: 0.2,
        swing: 50,
        // Very sparse low bells/gongs
        patternA: 'C-3:100?90 --- --- --- --- --- --- --- G-3:90?70 --- --- --- --- --- --- ---',
        patternB: 'G-2:100?85 --- --- --- --- --- --- --- --- --- --- --- C-3:95?80 --- --- ---',
        patternC: 'E-3:95?80 --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---',
        patternD: 'C-3:100?95 --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---',
        chain: 'AABBCCDD',
        running: true,
        extClock: false,
      },
    },
    // Low bell oscillator
    {
      id: 'osc_low',
      type: 'oscillator',
      position: { x: 280, y: 680 },
      params: { frequency: 131, detune: 0, waveform: 'sine' }, // C3
    },
    // Ring mod at octave for gong-like depth
    {
      id: 'ring_low',
      type: 'ringmod',
      position: { x: 430, y: 680 },
      params: { carrierFreq: 262, carrierType: 'sine', mix: 0.15, useExternal: false },
    },
    // Dark filter
    {
      id: 'filter_low',
      type: 'filter',
      position: { x: 580, y: 680 },
      params: { mode: 'lowpass', cutoff: 800, resonance: 1 },
    },
    // VCA
    {
      id: 'vca_low',
      type: 'vca',
      position: { x: 730, y: 680 },
      params: { gain: 0 },
    },
    // Very long gong envelope
    {
      id: 'adsr_low',
      type: 'adsr',
      position: { x: 580, y: 790 },
      params: { attack: 0.005, decay: 8.0, sustain: 0, release: 6.0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MODULATION
    // ═══════════════════════════════════════════════════════════════
    // LFO for gen voice swell
    {
      id: 'lfo1',
      type: 'lfo',
      position: { x: 760, y: 590 },
      params: { rate: 0.07, depth: 0.1, waveform: 'sine' },
    },
    // LFO for high ring mod - subtle shimmer
    {
      id: 'lfo2',
      type: 'lfo',
      position: { x: 430, y: 130 },
      params: { rate: 0.03, depth: 30, waveform: 'sine' },
    },

    // ═══════════════════════════════════════════════════════════════
    // MIX & EFFECTS - Cathedral reverb
    // ═══════════════════════════════════════════════════════════════
    // Main mixer
    {
      id: 'mixer_main',
      type: 'mixer',
      position: { x: 900, y: 300 },
      params: { level1: 0.5, level2: 0.6, level3: 0.4, level4: 0.7, master: 1 },
    },
    // Long, diffuse delay
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 1050, y: 240 },
      params: { time: 1.2, feedback: 0.45, mix: 0.35 },
    },
    // Second delay - prime number ratio for non-repeating echoes
    {
      id: 'delay2',
      type: 'delay',
      position: { x: 1050, y: 360 },
      params: { time: 1.7, feedback: 0.35, mix: 0.25 },
    },
    // Massive cathedral reverb
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 1200, y: 300 },
      params: { decay: 10, mix: 0.7 },
    },
    // Output
    {
      id: 'output',
      type: 'output',
      position: { x: 1350, y: 300 },
      params: { gain: 0.4 },
    },
  ],
  connections: [
    // ═══ HIGH BELLS ═══
    { id: 'h1', from: { nodeId: 'seq_high', port: 'output' }, to: { nodeId: 'adsr_high', port: 'trigger' } },
    { id: 'h2', from: { nodeId: 'osc_high', port: 'output' }, to: { nodeId: 'ring_high', port: 'input' } },
    { id: 'h3', from: { nodeId: 'ring_high', port: 'output' }, to: { nodeId: 'filter_high', port: 'input' } },
    { id: 'h4', from: { nodeId: 'filter_high', port: 'output' }, to: { nodeId: 'vca_high', port: 'input' } },
    { id: 'h5', from: { nodeId: 'adsr_high', port: 'output' }, to: { nodeId: 'vca_high', port: 'gain_mod' } },
    { id: 'h6', from: { nodeId: 'lfo2', port: 'output' }, to: { nodeId: 'ring_high', port: 'freq_mod' } },

    // ═══ MID BELLS ═══
    { id: 'm1', from: { nodeId: 'seq_mid', port: 'output' }, to: { nodeId: 'adsr_mid', port: 'trigger' } },
    { id: 'm2', from: { nodeId: 'osc_mid', port: 'output' }, to: { nodeId: 'ring_mid', port: 'input' } },
    { id: 'm3', from: { nodeId: 'ring_mid', port: 'output' }, to: { nodeId: 'filter_mid', port: 'input' } },
    { id: 'm4', from: { nodeId: 'filter_mid', port: 'output' }, to: { nodeId: 'vca_mid', port: 'input' } },
    { id: 'm5', from: { nodeId: 'adsr_mid', port: 'output' }, to: { nodeId: 'vca_mid', port: 'gain_mod' } },

    // ═══ GENERATIVE BELLS ═══
    { id: 'g1', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'sh1', port: 'input' } },
    { id: 'g2', from: { nodeId: 'sh1', port: 'output' }, to: { nodeId: 'quant1', port: 'input' } },
    { id: 'g3', from: { nodeId: 'quant1', port: 'output' }, to: { nodeId: 'osc_gen', port: 'freq_mod' } },
    { id: 'g4', from: { nodeId: 'osc_gen', port: 'output' }, to: { nodeId: 'ring_gen', port: 'input' } },
    { id: 'g5', from: { nodeId: 'ring_gen', port: 'output' }, to: { nodeId: 'filter_gen', port: 'input' } },
    { id: 'g6', from: { nodeId: 'filter_gen', port: 'output' }, to: { nodeId: 'vca_gen', port: 'input' } },
    { id: 'g7', from: { nodeId: 'lfo1', port: 'output' }, to: { nodeId: 'vca_gen', port: 'gain_mod' } },

    // ═══ LOW BELLS ═══
    { id: 'l1', from: { nodeId: 'seq_low', port: 'output' }, to: { nodeId: 'adsr_low', port: 'trigger' } },
    { id: 'l2', from: { nodeId: 'osc_low', port: 'output' }, to: { nodeId: 'ring_low', port: 'input' } },
    { id: 'l3', from: { nodeId: 'ring_low', port: 'output' }, to: { nodeId: 'filter_low', port: 'input' } },
    { id: 'l4', from: { nodeId: 'filter_low', port: 'output' }, to: { nodeId: 'vca_low', port: 'input' } },
    { id: 'l5', from: { nodeId: 'adsr_low', port: 'output' }, to: { nodeId: 'vca_low', port: 'gain_mod' } },

    // ═══ ALL VOICES -> MAIN MIXER ═══
    { id: 'x1', from: { nodeId: 'vca_high', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input1' } },
    { id: 'x2', from: { nodeId: 'vca_mid', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input2' } },
    { id: 'x3', from: { nodeId: 'vca_gen', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input3' } },
    { id: 'x4', from: { nodeId: 'vca_low', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input4' } },

    // ═══ EFFECTS -> OUTPUT ═══
    { id: 'e1', from: { nodeId: 'mixer_main', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'e2', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'delay2', port: 'input' } },
    { id: 'e3', from: { nodeId: 'delay2', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'e4', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// MIDNIGHT DRIVE - Epic head-bobbing groove
// Dark, driving electronic track with layered synths and punchy bass
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// MIDNIGHT MACHINE - Epic generative groove
// Driving bass, generative melodies, evolving textures
// ═══════════════════════════════════════════════════════════════════════════
export const MIDNIGHT_DRIVE_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Midnight Machine',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // ═══════════════════════════════════════════════════════════════
    // BASS - Driving foundation with probability hits
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'seq_bass',
      type: 'sequencer',
      position: { x: 50, y: 50 },
      params: {
        bpm: 124,
        steps: 16,
        gate: 0.4,
        swing: 55,
        patternA: 'E-2:127 --- E-2:80?70 --- G-2:100 --- E-2:90?60 --- E-2:127 --- G-2:70?50 A-2:110 G-2:90?65 --- E-2:100 ---',
        patternB: 'E-2:127 --- --- E-2:90 G-2:100?70 --- A-2:110 --- E-2:127 A-2:80?55 G-2:95 --- E-2:100 --- G-2:85?60 ---',
        chain: 'AABBABBA',
        running: true,
        extClock: false,
      },
    },
    {
      id: 'osc_bass1',
      type: 'oscillator',
      position: { x: 220, y: 20 },
      params: { frequency: 82.41, detune: 0, waveform: 'sawtooth' },
    },
    {
      id: 'osc_bass2',
      type: 'oscillator',
      position: { x: 220, y: 100 },
      params: { frequency: 82.41, detune: 7, waveform: 'square' },
    },
    {
      id: 'mixer_bass',
      type: 'mixer',
      position: { x: 370, y: 50 },
      params: { level1: 0.7, level2: 0.3, level3: 0, level4: 0, master: 1 },
    },
    {
      id: 'filter_bass',
      type: 'filter',
      position: { x: 520, y: 50 },
      params: { mode: 'lowpass', cutoff: 350, resonance: 5 },
    },
    {
      id: 'adsr_bass',
      type: 'adsr',
      position: { x: 370, y: 160 },
      params: { attack: 0.003, decay: 0.12, sustain: 0.4, release: 0.08 },
    },
    {
      id: 'adsr_bass_filt',
      type: 'adsr',
      position: { x: 520, y: 160 },
      params: { attack: 0.001, decay: 0.18, sustain: 0.15, release: 0.1 },
    },
    {
      id: 'vca_bass',
      type: 'vca',
      position: { x: 670, y: 50 },
      params: { gain: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // GENERATIVE LEAD - Noise → S&H → Quantizer → Oscillator
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock_lead',
      type: 'clock',
      position: { x: 50, y: 280 },
      params: { bpm: 124, division: 4, swing: 55 },
    },
    {
      id: 'noise_lead',
      type: 'noise',
      position: { x: 50, y: 360 },
      params: { type: 'white', level: 1 },
    },
    {
      id: 'sh_lead',
      type: 'samplehold',
      position: { x: 180, y: 320 },
      params: { rate: 2, smooth: 0.15 },
    },
    {
      id: 'quant_lead',
      type: 'quantizer',
      position: { x: 310, y: 320 },
      params: { scale: 'minor', root: 4, octaves: 2 },
    },
    {
      id: 'osc_lead1',
      type: 'oscillator',
      position: { x: 460, y: 280 },
      params: { frequency: 330, detune: 5, waveform: 'sawtooth' },
    },
    {
      id: 'osc_lead2',
      type: 'oscillator',
      position: { x: 460, y: 370 },
      params: { frequency: 330, detune: -5, waveform: 'sawtooth' },
    },
    {
      id: 'mixer_lead',
      type: 'mixer',
      position: { x: 610, y: 320 },
      params: { level1: 0.5, level2: 0.5, level3: 0, level4: 0, master: 1 },
    },
    {
      id: 'filter_lead',
      type: 'filter',
      position: { x: 760, y: 320 },
      params: { mode: 'lowpass', cutoff: 2000, resonance: 4 },
    },
    {
      id: 'adsr_lead',
      type: 'adsr',
      position: { x: 610, y: 440 },
      params: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.25 },
    },
    {
      id: 'adsr_lead_filt',
      type: 'adsr',
      position: { x: 760, y: 440 },
      params: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.15 },
    },
    {
      id: 'vca_lead',
      type: 'vca',
      position: { x: 910, y: 320 },
      params: { gain: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // GENERATIVE ARP - Fast S&H for rhythmic movement
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock_arp',
      type: 'clock',
      position: { x: 50, y: 550 },
      params: { bpm: 124, division: 16, swing: 0 },
    },
    {
      id: 'noise_arp',
      type: 'noise',
      position: { x: 50, y: 630 },
      params: { type: 'white', level: 1 },
    },
    {
      id: 'sh_arp',
      type: 'samplehold',
      position: { x: 180, y: 590 },
      params: { rate: 8, smooth: 0 },
    },
    {
      id: 'quant_arp',
      type: 'quantizer',
      position: { x: 310, y: 590 },
      params: { scale: 'minor_pent', root: 4, octaves: 3 },
    },
    {
      id: 'osc_arp',
      type: 'oscillator',
      position: { x: 460, y: 590 },
      params: { frequency: 660, detune: 0, waveform: 'square' },
    },
    {
      id: 'filter_arp',
      type: 'filter',
      position: { x: 610, y: 590 },
      params: { mode: 'lowpass', cutoff: 3500, resonance: 6 },
    },
    {
      id: 'adsr_arp',
      type: 'adsr',
      position: { x: 460, y: 710 },
      params: { attack: 0.001, decay: 0.06, sustain: 0.1, release: 0.04 },
    },
    {
      id: 'vca_arp',
      type: 'vca',
      position: { x: 760, y: 590 },
      params: { gain: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // PAD - Slow evolving drone via generative
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'noise_pad',
      type: 'noise',
      position: { x: 50, y: 820 },
      params: { type: 'pink', level: 0.8 },
    },
    {
      id: 'sh_pad',
      type: 'samplehold',
      position: { x: 180, y: 820 },
      params: { rate: 0.1, smooth: 0.9 },
    },
    {
      id: 'quant_pad',
      type: 'quantizer',
      position: { x: 310, y: 820 },
      params: { scale: 'minor', root: 4, octaves: 1 },
    },
    {
      id: 'osc_pad1',
      type: 'oscillator',
      position: { x: 460, y: 780 },
      params: { frequency: 165, detune: 3, waveform: 'sine' },
    },
    {
      id: 'osc_pad2',
      type: 'oscillator',
      position: { x: 460, y: 860 },
      params: { frequency: 165, detune: -3, waveform: 'triangle' },
    },
    {
      id: 'mixer_pad',
      type: 'mixer',
      position: { x: 610, y: 820 },
      params: { level1: 0.6, level2: 0.4, level3: 0, level4: 0, master: 1 },
    },
    {
      id: 'filter_pad',
      type: 'filter',
      position: { x: 760, y: 820 },
      params: { mode: 'lowpass', cutoff: 600, resonance: 1 },
    },
    {
      id: 'vca_pad',
      type: 'vca',
      position: { x: 910, y: 820 },
      params: { gain: 0.35 },
    },

    // ═══════════════════════════════════════════════════════════════
    // MODULATION
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'lfo_lead',
      type: 'lfo',
      position: { x: 910, y: 440 },
      params: { rate: 0.2, depth: 600, waveform: 'sine' },
    },
    {
      id: 'lfo_arp',
      type: 'lfo',
      position: { x: 610, y: 710 },
      params: { rate: 0.08, depth: 2000, waveform: 'triangle' },
    },
    {
      id: 'lfo_pad',
      type: 'lfo',
      position: { x: 760, y: 930 },
      params: { rate: 0.04, depth: 200, waveform: 'sine' },
    },

    // ═══════════════════════════════════════════════════════════════
    // MIX & EFFECTS
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'mixer_main',
      type: 'mixer',
      position: { x: 1060, y: 400 },
      params: { level1: 0.85, level2: 0.5, level3: 0.3, level4: 0.45, master: 1 },
    },
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 1210, y: 340 },
      params: { time: 0.242, feedback: 0.4, mix: 0.3 },
    },
    {
      id: 'delay2',
      type: 'delay',
      position: { x: 1210, y: 460 },
      params: { time: 0.484, feedback: 0.3, mix: 0.2 },
    },
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 1360, y: 400 },
      params: { decay: 2.2, mix: 0.3 },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 1510, y: 400 },
      params: { gain: 0.55 },
    },
  ],
  connections: [
    // ═══ BASS ═══
    { id: 'b1', from: { nodeId: 'seq_bass', port: 'output' }, to: { nodeId: 'osc_bass1', port: 'freq_mod' } },
    { id: 'b2', from: { nodeId: 'seq_bass', port: 'output' }, to: { nodeId: 'osc_bass2', port: 'freq_mod' } },
    { id: 'b3', from: { nodeId: 'seq_bass', port: 'output' }, to: { nodeId: 'adsr_bass', port: 'trigger' } },
    { id: 'b4', from: { nodeId: 'seq_bass', port: 'output' }, to: { nodeId: 'adsr_bass_filt', port: 'trigger' } },
    { id: 'b5', from: { nodeId: 'osc_bass1', port: 'output' }, to: { nodeId: 'mixer_bass', port: 'input1' } },
    { id: 'b6', from: { nodeId: 'osc_bass2', port: 'output' }, to: { nodeId: 'mixer_bass', port: 'input2' } },
    { id: 'b7', from: { nodeId: 'mixer_bass', port: 'output' }, to: { nodeId: 'filter_bass', port: 'input' } },
    { id: 'b8', from: { nodeId: 'adsr_bass_filt', port: 'output' }, to: { nodeId: 'filter_bass', port: 'cutoff_mod' } },
    { id: 'b9', from: { nodeId: 'filter_bass', port: 'output' }, to: { nodeId: 'vca_bass', port: 'input' } },
    { id: 'b10', from: { nodeId: 'adsr_bass', port: 'output' }, to: { nodeId: 'vca_bass', port: 'gain_mod' } },

    // ═══ GENERATIVE LEAD ═══
    { id: 'gl1', from: { nodeId: 'clock_lead', port: 'output' }, to: { nodeId: 'sh_lead', port: 'trigger' } },
    { id: 'gl2', from: { nodeId: 'clock_lead', port: 'output' }, to: { nodeId: 'adsr_lead', port: 'trigger' } },
    { id: 'gl3', from: { nodeId: 'clock_lead', port: 'output' }, to: { nodeId: 'adsr_lead_filt', port: 'trigger' } },
    { id: 'gl4', from: { nodeId: 'noise_lead', port: 'output' }, to: { nodeId: 'sh_lead', port: 'input' } },
    { id: 'gl5', from: { nodeId: 'sh_lead', port: 'output' }, to: { nodeId: 'quant_lead', port: 'input' } },
    { id: 'gl6', from: { nodeId: 'quant_lead', port: 'output' }, to: { nodeId: 'osc_lead1', port: 'freq_mod' } },
    { id: 'gl7', from: { nodeId: 'quant_lead', port: 'output' }, to: { nodeId: 'osc_lead2', port: 'freq_mod' } },
    { id: 'gl8', from: { nodeId: 'osc_lead1', port: 'output' }, to: { nodeId: 'mixer_lead', port: 'input1' } },
    { id: 'gl9', from: { nodeId: 'osc_lead2', port: 'output' }, to: { nodeId: 'mixer_lead', port: 'input2' } },
    { id: 'gl10', from: { nodeId: 'mixer_lead', port: 'output' }, to: { nodeId: 'filter_lead', port: 'input' } },
    { id: 'gl11', from: { nodeId: 'adsr_lead_filt', port: 'output' }, to: { nodeId: 'filter_lead', port: 'cutoff_mod' } },
    { id: 'gl12', from: { nodeId: 'lfo_lead', port: 'output' }, to: { nodeId: 'filter_lead', port: 'cutoff_mod' } },
    { id: 'gl13', from: { nodeId: 'filter_lead', port: 'output' }, to: { nodeId: 'vca_lead', port: 'input' } },
    { id: 'gl14', from: { nodeId: 'adsr_lead', port: 'output' }, to: { nodeId: 'vca_lead', port: 'gain_mod' } },

    // ═══ GENERATIVE ARP ═══
    { id: 'ga1', from: { nodeId: 'clock_arp', port: 'output' }, to: { nodeId: 'sh_arp', port: 'trigger' } },
    { id: 'ga2', from: { nodeId: 'clock_arp', port: 'output' }, to: { nodeId: 'adsr_arp', port: 'trigger' } },
    { id: 'ga3', from: { nodeId: 'noise_arp', port: 'output' }, to: { nodeId: 'sh_arp', port: 'input' } },
    { id: 'ga4', from: { nodeId: 'sh_arp', port: 'output' }, to: { nodeId: 'quant_arp', port: 'input' } },
    { id: 'ga5', from: { nodeId: 'quant_arp', port: 'output' }, to: { nodeId: 'osc_arp', port: 'freq_mod' } },
    { id: 'ga6', from: { nodeId: 'osc_arp', port: 'output' }, to: { nodeId: 'filter_arp', port: 'input' } },
    { id: 'ga7', from: { nodeId: 'lfo_arp', port: 'output' }, to: { nodeId: 'filter_arp', port: 'cutoff_mod' } },
    { id: 'ga8', from: { nodeId: 'filter_arp', port: 'output' }, to: { nodeId: 'vca_arp', port: 'input' } },
    { id: 'ga9', from: { nodeId: 'adsr_arp', port: 'output' }, to: { nodeId: 'vca_arp', port: 'gain_mod' } },

    // ═══ GENERATIVE PAD ═══
    { id: 'gp1', from: { nodeId: 'noise_pad', port: 'output' }, to: { nodeId: 'sh_pad', port: 'input' } },
    { id: 'gp2', from: { nodeId: 'sh_pad', port: 'output' }, to: { nodeId: 'quant_pad', port: 'input' } },
    { id: 'gp3', from: { nodeId: 'quant_pad', port: 'output' }, to: { nodeId: 'osc_pad1', port: 'freq_mod' } },
    { id: 'gp4', from: { nodeId: 'quant_pad', port: 'output' }, to: { nodeId: 'osc_pad2', port: 'freq_mod' } },
    { id: 'gp5', from: { nodeId: 'osc_pad1', port: 'output' }, to: { nodeId: 'mixer_pad', port: 'input1' } },
    { id: 'gp6', from: { nodeId: 'osc_pad2', port: 'output' }, to: { nodeId: 'mixer_pad', port: 'input2' } },
    { id: 'gp7', from: { nodeId: 'mixer_pad', port: 'output' }, to: { nodeId: 'filter_pad', port: 'input' } },
    { id: 'gp8', from: { nodeId: 'lfo_pad', port: 'output' }, to: { nodeId: 'filter_pad', port: 'cutoff_mod' } },
    { id: 'gp9', from: { nodeId: 'filter_pad', port: 'output' }, to: { nodeId: 'vca_pad', port: 'input' } },

    // ═══ MIX ═══
    { id: 'm1', from: { nodeId: 'vca_bass', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input1' } },
    { id: 'm2', from: { nodeId: 'vca_lead', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input2' } },
    { id: 'm3', from: { nodeId: 'vca_arp', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input3' } },
    { id: 'm4', from: { nodeId: 'vca_pad', port: 'output' }, to: { nodeId: 'mixer_main', port: 'input4' } },

    // ═══ EFFECTS ═══
    { id: 'e1', from: { nodeId: 'mixer_main', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },
    { id: 'e2', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'delay2', port: 'input' } },
    { id: 'e3', from: { nodeId: 'delay2', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'e4', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// ETHEREAL DRIFT - Lush generative ambient with round, warm tones
// Soft plucked strings with heavy filtering, layered reverbs, subtle texture
// ═══════════════════════════════════════════════════════════════════════════
export const ETHEREAL_DRIFT_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Ethereal Drift',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // ═══════════════════════════════════════════════════════════════
    // LAYER 1 - Sub bass foundation (E1) - felt more than heard
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock1',
      type: 'clock',
      position: { x: 50, y: 50 },
      params: { bpm: 3, running: true, swing: 0 },
    },
    {
      id: 'string1',
      type: 'karplusstrong',
      position: { x: 180, y: 50 },
      params: {
        frequency: 41.20, // E1 - very deep
        damping: 0.6,     // High damping = very round, no highs
        feedback: 0.998,
        brightness: 0.1,  // Very soft attack
        pluck: 0.3,
      },
    },
    {
      id: 'atten1',
      type: 'attenuverter',
      position: { x: 340, y: 50 },
      params: { amount: 0.8, offset: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYER 2 - Warm bass (E2) - the body
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock2',
      type: 'clock',
      position: { x: 50, y: 130 },
      params: { bpm: 5, running: true, swing: 0.2 },
    },
    {
      id: 'string2',
      type: 'karplusstrong',
      position: { x: 180, y: 130 },
      params: {
        frequency: 82.41, // E2
        damping: 0.55,
        feedback: 0.997,
        brightness: 0.15,
        pluck: 0.35,
      },
    },
    {
      id: 'atten2',
      type: 'attenuverter',
      position: { x: 340, y: 130 },
      params: { amount: 0.6, offset: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYER 3 - Mid warmth (B2) - fifth harmony
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock3',
      type: 'clock',
      position: { x: 50, y: 210 },
      params: { bpm: 7, running: true, swing: 0.3 },
    },
    {
      id: 'div3',
      type: 'clockdiv',
      position: { x: 120, y: 210 },
      params: { divisor: 2 },
    },
    {
      id: 'string3',
      type: 'karplusstrong',
      position: { x: 200, y: 210 },
      params: {
        frequency: 123.47, // B2
        damping: 0.5,
        feedback: 0.996,
        brightness: 0.2,
        pluck: 0.4,
      },
    },
    {
      id: 'atten3',
      type: 'attenuverter',
      position: { x: 360, y: 210 },
      params: { amount: 0.5, offset: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYER 4 - Soft mid (G3) - minor color
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock4',
      type: 'clock',
      position: { x: 50, y: 290 },
      params: { bpm: 9, running: true, swing: 0.4 },
    },
    {
      id: 'div4',
      type: 'clockdiv',
      position: { x: 120, y: 290 },
      params: { divisor: 3 },
    },
    {
      id: 'string4',
      type: 'karplusstrong',
      position: { x: 200, y: 290 },
      params: {
        frequency: 196.00, // G3
        damping: 0.45,
        feedback: 0.995,
        brightness: 0.25,
        pluck: 0.45,
      },
    },
    {
      id: 'atten4',
      type: 'attenuverter',
      position: { x: 360, y: 290 },
      params: { amount: 0.4, offset: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYER 5 - Gentle upper (E4) - soft presence
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock5',
      type: 'clock',
      position: { x: 50, y: 370 },
      params: { bpm: 11, running: true, swing: 0.5 },
    },
    {
      id: 'div5',
      type: 'clockdiv',
      position: { x: 120, y: 370 },
      params: { divisor: 5 },
    },
    {
      id: 'string5',
      type: 'karplusstrong',
      position: { x: 200, y: 370 },
      params: {
        frequency: 329.63, // E4
        damping: 0.5,
        feedback: 0.993,
        brightness: 0.2,  // Still soft
        pluck: 0.5,
      },
    },
    {
      id: 'atten5',
      type: 'attenuverter',
      position: { x: 360, y: 370 },
      params: { amount: 0.25, offset: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // LAYER 6 - Rare high octave (E5) - occasional shimmer
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'clock6',
      type: 'clock',
      position: { x: 50, y: 450 },
      params: { bpm: 13, running: true, swing: 0.6 },
    },
    {
      id: 'div6',
      type: 'clockdiv',
      position: { x: 120, y: 450 },
      params: { divisor: 11 }, // Very rare
    },
    {
      id: 'string6',
      type: 'karplusstrong',
      position: { x: 200, y: 450 },
      params: {
        frequency: 659.25, // E5
        damping: 0.55,     // Round even at high pitch
        feedback: 0.988,
        brightness: 0.15,  // Very soft
        pluck: 0.4,
      },
    },
    {
      id: 'atten6',
      type: 'attenuverter',
      position: { x: 360, y: 450 },
      params: { amount: 0.15, offset: 0 },
    },

    // ═══════════════════════════════════════════════════════════════
    // TEXTURE - Filtered noise bed for warmth
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'noise1',
      type: 'noise',
      position: { x: 50, y: 550 },
      params: { type: 'pink' }, // Pink noise = warmer
    },
    {
      id: 'noiseAtten',
      type: 'attenuverter',
      position: { x: 180, y: 550 },
      params: { amount: 0.03, offset: 0 }, // Very subtle
    },

    // ═══════════════════════════════════════════════════════════════
    // EFFECTS - Dual delays into massive reverb
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'delay1',
      type: 'delay',
      position: { x: 520, y: 150 },
      params: { time: 0.5, feedback: 0.4, mix: 0.35 },
    },
    {
      id: 'delay2',
      type: 'delay',
      position: { x: 520, y: 350 },
      params: { time: 0.75, feedback: 0.35, mix: 0.3 },
    },
    {
      id: 'reverb1',
      type: 'reverb',
      position: { x: 700, y: 180 },
      params: { decay: 12, mix: 0.7 }, // Very long, very wet
    },
    {
      id: 'reverb2',
      type: 'reverb',
      position: { x: 700, y: 320 },
      params: { decay: 15, mix: 0.8 }, // Even longer for depth
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 880, y: 250 },
      params: { gain: 0.55 },
    },
  ],
  connections: [
    // Layer 1 (sub) - direct to first reverb (no delay, keeps it solid)
    { id: 'l1a', from: { nodeId: 'clock1', port: 'output' }, to: { nodeId: 'string1', port: 'trigger' } },
    { id: 'l1b', from: { nodeId: 'string1', port: 'output' }, to: { nodeId: 'atten1', port: 'input' } },
    { id: 'l1c', from: { nodeId: 'atten1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },

    // Layer 2 (warm bass) - to first delay
    { id: 'l2a', from: { nodeId: 'clock2', port: 'output' }, to: { nodeId: 'string2', port: 'trigger' } },
    { id: 'l2b', from: { nodeId: 'string2', port: 'output' }, to: { nodeId: 'atten2', port: 'input' } },
    { id: 'l2c', from: { nodeId: 'atten2', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },

    // Layer 3 (mid warmth) - through divider to second delay
    { id: 'l3a', from: { nodeId: 'clock3', port: 'output' }, to: { nodeId: 'div3', port: 'input' } },
    { id: 'l3b', from: { nodeId: 'div3', port: 'output' }, to: { nodeId: 'string3', port: 'trigger' } },
    { id: 'l3c', from: { nodeId: 'string3', port: 'output' }, to: { nodeId: 'atten3', port: 'input' } },
    { id: 'l3d', from: { nodeId: 'atten3', port: 'output' }, to: { nodeId: 'delay2', port: 'input' } },

    // Layer 4 (soft mid) - to first delay
    { id: 'l4a', from: { nodeId: 'clock4', port: 'output' }, to: { nodeId: 'div4', port: 'input' } },
    { id: 'l4b', from: { nodeId: 'div4', port: 'output' }, to: { nodeId: 'string4', port: 'trigger' } },
    { id: 'l4c', from: { nodeId: 'string4', port: 'output' }, to: { nodeId: 'atten4', port: 'input' } },
    { id: 'l4d', from: { nodeId: 'atten4', port: 'output' }, to: { nodeId: 'delay1', port: 'input' } },

    // Layer 5 (gentle upper) - to second delay
    { id: 'l5a', from: { nodeId: 'clock5', port: 'output' }, to: { nodeId: 'div5', port: 'input' } },
    { id: 'l5b', from: { nodeId: 'div5', port: 'output' }, to: { nodeId: 'string5', port: 'trigger' } },
    { id: 'l5c', from: { nodeId: 'string5', port: 'output' }, to: { nodeId: 'atten5', port: 'input' } },
    { id: 'l5d', from: { nodeId: 'atten5', port: 'output' }, to: { nodeId: 'delay2', port: 'input' } },

    // Layer 6 (rare shimmer) - direct to second reverb
    { id: 'l6a', from: { nodeId: 'clock6', port: 'output' }, to: { nodeId: 'div6', port: 'input' } },
    { id: 'l6b', from: { nodeId: 'div6', port: 'output' }, to: { nodeId: 'string6', port: 'trigger' } },
    { id: 'l6c', from: { nodeId: 'string6', port: 'output' }, to: { nodeId: 'atten6', port: 'input' } },
    { id: 'l6d', from: { nodeId: 'atten6', port: 'output' }, to: { nodeId: 'reverb2', port: 'input' } },

    // Noise bed - direct to second reverb for atmosphere
    { id: 'n1a', from: { nodeId: 'noise1', port: 'output' }, to: { nodeId: 'noiseAtten', port: 'input' } },
    { id: 'n1b', from: { nodeId: 'noiseAtten', port: 'output' }, to: { nodeId: 'reverb2', port: 'input' } },

    // Delays feed into reverbs
    { id: 'fx1', from: { nodeId: 'delay1', port: 'output' }, to: { nodeId: 'reverb1', port: 'input' } },
    { id: 'fx2', from: { nodeId: 'delay2', port: 'output' }, to: { nodeId: 'reverb2', port: 'input' } },

    // Both reverbs to output
    { id: 'fx3', from: { nodeId: 'reverb1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
    { id: 'fx4', from: { nodeId: 'reverb2', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};
