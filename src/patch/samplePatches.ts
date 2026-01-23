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
        // C minor 7 arpeggio: C, Eb, G, Bb, C+, Bb, G, Eb
        step1: 0,   // C4
        step2: 3,   // Eb4
        step3: 7,   // G4
        step4: 10,  // Bb4
        step5: 12,  // C5
        step6: 10,  // Bb4
        step7: 7,   // G4
        step8: 3,   // Eb4
        running: true,
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
