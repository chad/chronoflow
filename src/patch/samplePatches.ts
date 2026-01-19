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
