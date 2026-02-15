// Node Presets - save/load parameter presets for individual node types

import type { PatchNodeType, PatchNodeParams } from './types';

const STORAGE_KEY = 'chronoflow-node-presets';

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

// Factory presets shipped with ChronoFlow
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
};
