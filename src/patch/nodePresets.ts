// Node Presets - save/load parameter presets for individual node types

import type { PatchNodeType, PatchNodeParams } from './types';

const STORAGE_KEY = 'mosh-node-presets';

export interface NodePreset {
  name: string;
  params: PatchNodeParams;
}

type PresetStore = Record<string, NodePreset[]>; // keyed by node type

function loadStore(): PresetStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: PresetStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }
}

export function getPresetsForType(type: PatchNodeType): NodePreset[] {
  const store = loadStore();
  return [...(FACTORY_PRESETS[type] || []), ...(store[type] || [])];
}

export function savePreset(type: PatchNodeType, name: string, params: PatchNodeParams): void {
  const store = loadStore();
  if (!store[type]) store[type] = [];
  // Replace if same name exists
  const idx = store[type].findIndex((p) => p.name === name);
  if (idx >= 0) {
    store[type][idx] = { name, params: { ...params } };
  } else {
    store[type].push({ name, params: { ...params } });
  }
  saveStore(store);
}

export function deletePreset(type: PatchNodeType, name: string): void {
  const store = loadStore();
  if (store[type]) {
    store[type] = store[type].filter((p) => p.name !== name);
    saveStore(store);
  }
}

// Factory presets shipped with Mosh
const FACTORY_PRESETS: Partial<Record<PatchNodeType, NodePreset[]>> = {
  oscillator: [
    { name: '🏭 Sub Bass', params: { frequency: 55, detune: 0, waveform: 'sine' } },
    { name: '🏭 Fat Saw', params: { frequency: 220, detune: 12, waveform: 'sawtooth' } },
    { name: '🏭 Square Lead', params: { frequency: 440, detune: 0, waveform: 'square' } },
    { name: '🏭 High Tri', params: { frequency: 880, detune: 0, waveform: 'triangle' } },
  ],
  filter: [
    { name: '🏭 Warm LP', params: { mode: 'lowpass', cutoff: 800, resonance: 2 } },
    { name: '🏭 Telephone', params: { mode: 'bandpass', cutoff: 2000, resonance: 5 } },
    { name: '🏭 Bright HP', params: { mode: 'highpass', cutoff: 4000, resonance: 1 } },
    { name: '🏭 Acid Squelch', params: { mode: 'lowpass', cutoff: 400, resonance: 15 } },
  ],
  lfo: [
    { name: '🏭 Slow Drift', params: { rate: 0.1, depth: 50, waveform: 'sine' } },
    { name: '🏭 Wobble', params: { rate: 4, depth: 200, waveform: 'sine' } },
    { name: '🏭 Tremolo', params: { rate: 6, depth: 100, waveform: 'triangle' } },
    { name: '🏭 Fast S&H', params: { rate: 8, depth: 300, waveform: 'square' } },
  ],
  adsr: [
    { name: '🏭 Pluck', params: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } },
    { name: '🏭 Pad', params: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 } },
    { name: '🏭 Snappy', params: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.15 } },
    { name: '🏭 Swell', params: { attack: 2.0, decay: 0.5, sustain: 0.6, release: 0.5 } },
  ],
  delay: [
    { name: '🏭 Slapback', params: { time: 0.08, feedback: 0.1, mix: 0.4 } },
    { name: '🏭 Dub Echo', params: { time: 0.375, feedback: 0.65, mix: 0.35 } },
    { name: '🏭 Ping Pong', params: { time: 0.25, feedback: 0.5, mix: 0.5 } },
  ],
  reverb: [
    { name: '🏭 Room', params: { decay: 0.8, mix: 0.2 } },
    { name: '🏭 Hall', params: { decay: 3.0, mix: 0.35 } },
    { name: '🏭 Cathedral', params: { decay: 6.0, mix: 0.5 } },
  ],
  droneosc: [
    { name: '🏭 Warm Pad', params: { frequency: 110, voices: 4, spread: 15, drift: 0.3, driftRate: 0.08, waveform: 'sawtooth', mode: 'unison', subLevel: 0.3, subWaveform: 'sine', attack: 2, level: 0.4 } },
    { name: '🏭 Glass Harmonics', params: { frequency: 220, voices: 6, spread: 5, drift: 0.1, driftRate: 0.05, waveform: 'sine', mode: 'harmonics', subLevel: 0, subWaveform: 'sine', attack: 3, level: 0.3 } },
    { name: '🏭 Cathedral Fifths', params: { frequency: 65, voices: 5, spread: 8, drift: 0.4, driftRate: 0.06, waveform: 'triangle', mode: 'fifths', subLevel: 0.5, subWaveform: 'sine', attack: 4, level: 0.35 } },
    { name: '🏭 Deep Drone', params: { frequency: 55, voices: 6, spread: 25, drift: 0.5, driftRate: 0.03, waveform: 'sawtooth', mode: 'octaves', subLevel: 0.6, subWaveform: 'sine', attack: 5, level: 0.3 } },
  ],
  tapedelay: [
    { name: '🏭 Tape Echo', params: { time: 0.375, feedback: 0.55, mix: 0.4, wow: 0.15, flutter: 0.1, saturation: 0.3, degradation: 0.4, tapeSpeed: 1, pingPong: false } },
    { name: '🏭 Lo-Fi Space', params: { time: 0.5, feedback: 0.7, mix: 0.5, wow: 0.3, flutter: 0.2, saturation: 0.6, degradation: 0.7, tapeSpeed: 0.8, pingPong: false } },
    { name: '🏭 Clean Slapback', params: { time: 0.12, feedback: 0.2, mix: 0.35, wow: 0.05, flutter: 0.02, saturation: 0.1, degradation: 0.2, tapeSpeed: 1, pingPong: false } },
  ],
  spectralfreeze: [
    { name: '🏭 Frozen Pad', params: { freeze: true, blur: 0.6, shift: 0, brightness: 0.7, feedback: 0.3, mix: 0.9, grainSize: 200 } },
    { name: '🏭 Shimmer Cloud', params: { freeze: true, blur: 0.8, shift: 12, brightness: 0.8, feedback: 0.5, mix: 0.7, grainSize: 150 } },
    { name: '🏭 Dark Sustain', params: { freeze: true, blur: 0.9, shift: -12, brightness: 0.3, feedback: 0.4, mix: 0.8, grainSize: 300 } },
  ],
  wavetableosc: [
    { name: '🏭 Morphing Pad', params: { frequency: 110, detune: 0, morph: 0.3, level: 0.4 } },
    { name: '🏭 Glass Bell', params: { frequency: 440, detune: 0, morph: 0.71, level: 0.5 } },
    { name: '🏭 Digital Lead', params: { frequency: 330, detune: 7, morph: 1.0, level: 0.45 } },
    { name: '🏭 Choir Drone', params: { frequency: 65, detune: 0, morph: 0.86, level: 0.35 } },
  ],
  resonator: [
    { name: '🏭 Gamelan', params: { frequency: 440, resonance: 50, mode: 'inharm', partials: 8, spread: 0.4, brightness: 0.7, decay: 0.8, mix: 0.9 } },
    { name: '🏭 Struck Bar', params: { frequency: 220, resonance: 40, mode: 'inharm', partials: 6, spread: 0.6, brightness: 0.5, decay: 0.6, mix: 0.85 } },
    { name: '🏭 Sympathetic Strings', params: { frequency: 110, resonance: 60, mode: 'harmonic', partials: 10, spread: 0, brightness: 0.4, decay: 0.9, mix: 0.7 } },
    { name: '🏭 Chord Resonance', params: { frequency: 165, resonance: 35, mode: 'chord', partials: 8, spread: 0.5, brightness: 0.6, decay: 0.7, mix: 0.8 } },
  ],
};
