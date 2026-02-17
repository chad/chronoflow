// New demo patches showcasing the latest modules
// Each patch is designed to produce beautiful ambient/generative music immediately

import type { Patch } from './types';

// =============================================================================
// PATCH 1: "Submerged Cathedral"
// =============================================================================
// A lush, evolving ambient piece using:
//   - Drone Oscillator (deep foundation with drifting voices)
//   - Wavetable Oscillator (morphing melodic texture, slowly modulated)
//   - Resonator Bank (struck bell tones from Euclidean rhythms)
//   - Shimmer Reverb + Tape Delay (shared via Send/Return buses)
//   - Stereo Field (wide spatial placement)
//   - Spectral Freeze (captures and holds evolving texture)
//
// The architecture uses send/return for parallel effects:
//   All voices → Send to "reverb" bus → Return → Shimmer Reverb
//   All voices → Send to "delay" bus → Return → Tape Delay
//   Both effect returns → Stereo Field → Output

export const SUBMERGED_CATHEDRAL_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Submerged Cathedral',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // === LAYER 1: Deep Drone Foundation ===
    {
      id: 'drone1',
      type: 'droneosc',
      position: { x: 50, y: 100 },
      params: {
        frequency: 55, voices: 6, spread: 20, drift: 0.4, driftRate: 0.05,
        waveform: 'sawtooth', mode: 'octaves', subLevel: 0.5, subWaveform: 'sine',
        attack: 5, level: 0.25,
      },
    },
    {
      id: 'droneFilter',
      type: 'filter',
      position: { x: 250, y: 100 },
      params: { mode: 'lowpass', cutoff: 600, resonance: 2 },
    },
    {
      id: 'droneLFO',
      type: 'lfo',
      position: { x: 50, y: 0 },
      params: { rate: 0.07, depth: 300, waveform: 'sine' },
    },
    {
      id: 'droneSend',
      type: 'send',
      position: { x: 420, y: 100 },
      params: { bus: 'reverb', amount: 0.6, preFader: false },
    },

    // === LAYER 2: Morphing Wavetable Pad ===
    {
      id: 'wt1',
      type: 'wavetableosc',
      position: { x: 50, y: 280 },
      params: { frequency: 165, detune: 5, morph: 0.3, level: 0.3 },
    },
    {
      id: 'wtMorphLFO',
      type: 'lfo',
      position: { x: 50, y: 380 },
      params: { rate: 0.03, depth: 0.5, waveform: 'triangle' },
    },
    {
      id: 'wtFilter',
      type: 'filter',
      position: { x: 250, y: 280 },
      params: { mode: 'lowpass', cutoff: 2000, resonance: 3 },
    },
    {
      id: 'wtSendRev',
      type: 'send',
      position: { x: 420, y: 280 },
      params: { bus: 'reverb', amount: 0.7, preFader: false },
    },
    {
      id: 'wtSendDly',
      type: 'send',
      position: { x: 420, y: 360 },
      params: { bus: 'delay', amount: 0.4, preFader: false },
    },

    // === LAYER 3: Resonator Bells ===
    {
      id: 'bellClock',
      type: 'clock',
      position: { x: 50, y: 500 },
      params: { bpm: 40, swing: 0 },
    },
    {
      id: 'bellEuclid',
      type: 'euclidean',
      position: { x: 200, y: 500 },
      params: { steps: 16, pulses: 3, rotation: 0 },
    },
    {
      id: 'bellProb',
      type: 'probgate',
      position: { x: 350, y: 500 },
      params: { probability: 0.6 },
    },
    {
      id: 'bellNoise',
      type: 'noise',
      position: { x: 200, y: 600 },
      params: { type: 'white', level: 0.8 },
    },
    {
      id: 'resonator1',
      type: 'resonator',
      position: { x: 500, y: 550 },
      params: {
        frequency: 440, resonance: 45, mode: 'inharm', partials: 8,
        spread: 0.3, brightness: 0.7, decay: 0.8, mix: 0.95,
      },
    },
    {
      id: 'bellVCA',
      type: 'vca',
      position: { x: 660, y: 550 },
      params: { gain: 0.3 },
    },
    {
      id: 'bellSend',
      type: 'send',
      position: { x: 800, y: 550 },
      params: { bus: 'reverb', amount: 0.8, preFader: false },
    },

    // === LAYER 4: Spectral Freeze Texture ===
    {
      id: 'freezeSource',
      type: 'noise',
      position: { x: 50, y: 720 },
      params: { type: 'pink', level: 0.4 },
    },
    {
      id: 'freezeFilter',
      type: 'filter',
      position: { x: 200, y: 720 },
      params: { mode: 'bandpass', cutoff: 800, resonance: 5 },
    },
    {
      id: 'freeze1',
      type: 'spectralfreeze',
      position: { x: 400, y: 720 },
      params: {
        freeze: true, blur: 0.7, shift: 0, brightness: 0.6,
        feedback: 0.35, mix: 0.85, grainSize: 250,
      },
    },
    {
      id: 'freezeVCA',
      type: 'vca',
      position: { x: 600, y: 720 },
      params: { gain: 0.2 },
    },
    {
      id: 'freezeSend',
      type: 'send',
      position: { x: 750, y: 720 },
      params: { bus: 'delay', amount: 0.5, preFader: false },
    },

    // === EFFECTS BUS: Reverb ===
    {
      id: 'reverbReturn',
      type: 'return',
      position: { x: 700, y: 0 },
      params: { bus: 'reverb', gain: 1 },
    },
    {
      id: 'shimmerReverb',
      type: 'shimmerreverb',
      position: { x: 850, y: 0 },
      params: {
        decay: 8, shimmer: 0.6, pitchShift: 12, damping: 0.3,
        mix: 0.85, diffusion: 0.8,
      },
    },

    // === EFFECTS BUS: Tape Delay ===
    {
      id: 'delayReturn',
      type: 'return',
      position: { x: 700, y: 150 },
      params: { bus: 'delay', gain: 0.8 },
    },
    {
      id: 'tapeDelay1',
      type: 'tapedelay',
      position: { x: 850, y: 150 },
      params: {
        time: 0.666, feedback: 0.55, mix: 0.7, wow: 0.2, flutter: 0.1,
        saturation: 0.35, degradation: 0.5, tapeSpeed: 1, pingPong: false,
      },
    },

    // === MASTER: Stereo + Output ===
    {
      id: 'stereo1',
      type: 'stereofield',
      position: { x: 1050, y: 100 },
      params: { pan: 0, width: 1.6, midSide: -0.1, haasDelay: 8, haasAmount: 0.3 },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 1200, y: 100 },
      params: { gain: 0.55 },
    },
  ],
  connections: [
    // Drone path
    { id: 'd1', from: { nodeId: 'drone1', port: 'output' }, to: { nodeId: 'droneFilter', port: 'input' } },
    { id: 'd2', from: { nodeId: 'droneLFO', port: 'output' }, to: { nodeId: 'droneFilter', port: 'cutoff_mod' } },
    { id: 'd3', from: { nodeId: 'droneFilter', port: 'output' }, to: { nodeId: 'droneSend', port: 'input' } },
    { id: 'd4', from: { nodeId: 'droneSend', port: 'output' }, to: { nodeId: 'stereo1', port: 'input' } },

    // Wavetable path
    { id: 'w1', from: { nodeId: 'wt1', port: 'output' }, to: { nodeId: 'wtFilter', port: 'input' } },
    { id: 'w2', from: { nodeId: 'wtFilter', port: 'output' }, to: { nodeId: 'wtSendRev', port: 'input' } },
    { id: 'w3', from: { nodeId: 'wtSendRev', port: 'output' }, to: { nodeId: 'wtSendDly', port: 'input' } },
    { id: 'w4', from: { nodeId: 'wtSendDly', port: 'output' }, to: { nodeId: 'stereo1', port: 'input' } },

    // Bell resonator path
    { id: 'b1', from: { nodeId: 'bellClock', port: 'output' }, to: { nodeId: 'bellEuclid', port: 'input' } },
    { id: 'b2', from: { nodeId: 'bellEuclid', port: 'output' }, to: { nodeId: 'bellProb', port: 'input' } },
    { id: 'b3', from: { nodeId: 'bellNoise', port: 'output' }, to: { nodeId: 'resonator1', port: 'input' } },
    { id: 'b4', from: { nodeId: 'bellProb', port: 'output' }, to: { nodeId: 'resonator1', port: 'trigger' } },
    { id: 'b5', from: { nodeId: 'resonator1', port: 'output' }, to: { nodeId: 'bellVCA', port: 'input' } },
    { id: 'b6', from: { nodeId: 'bellVCA', port: 'output' }, to: { nodeId: 'bellSend', port: 'input' } },
    { id: 'b7', from: { nodeId: 'bellSend', port: 'output' }, to: { nodeId: 'stereo1', port: 'input' } },

    // Spectral freeze path
    { id: 'f1', from: { nodeId: 'freezeSource', port: 'output' }, to: { nodeId: 'freezeFilter', port: 'input' } },
    { id: 'f2', from: { nodeId: 'freezeFilter', port: 'output' }, to: { nodeId: 'freeze1', port: 'input' } },
    { id: 'f3', from: { nodeId: 'freeze1', port: 'output' }, to: { nodeId: 'freezeVCA', port: 'input' } },
    { id: 'f4', from: { nodeId: 'freezeVCA', port: 'output' }, to: { nodeId: 'freezeSend', port: 'input' } },
    { id: 'f5', from: { nodeId: 'freezeSend', port: 'output' }, to: { nodeId: 'stereo1', port: 'input' } },

    // Effects buses
    { id: 'fx1', from: { nodeId: 'reverbReturn', port: 'output' }, to: { nodeId: 'shimmerReverb', port: 'input' } },
    { id: 'fx2', from: { nodeId: 'shimmerReverb', port: 'output' }, to: { nodeId: 'stereo1', port: 'input' } },
    { id: 'fx3', from: { nodeId: 'delayReturn', port: 'output' }, to: { nodeId: 'tapeDelay1', port: 'input' } },
    { id: 'fx4', from: { nodeId: 'tapeDelay1', port: 'output' }, to: { nodeId: 'stereo1', port: 'input' } },

    // Master
    { id: 'mx1', from: { nodeId: 'stereo1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};


// =============================================================================
// PATCH 2: "Glass Rain"
// =============================================================================
// Generative piece focusing on:
//   - Karplus-Strong strings triggered by interlocking Euclidean rhythms
//   - Resonator bank adding harmonic shimmer
//   - Wavetable oscillator providing a slowly morphing harmonic bed
//   - Turing Machine → Quantizer for generative melodies
//   - Tape Delay with heavy degradation for lo-fi texture
//   - Everything through shimmer reverb for endless space

export const GLASS_RAIN_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Glass Rain',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // === Clock System ===
    {
      id: 'masterClock',
      type: 'clock',
      position: { x: 50, y: 50 },
      params: { bpm: 72, swing: 0 },
    },
    {
      id: 'clockDiv',
      type: 'clockdiv',
      position: { x: 200, y: 50 },
      params: {},
    },

    // === Voice A: High Plucks ===
    {
      id: 'euclidA',
      type: 'euclidean',
      position: { x: 50, y: 200 },
      params: { steps: 16, pulses: 5, rotation: 2 },
    },
    {
      id: 'turingA',
      type: 'turing',
      position: { x: 200, y: 200 },
      params: { probability: 0.15, length: 8 },
    },
    {
      id: 'slewA',
      type: 'slewlimiter',
      position: { x: 350, y: 200 },
      params: { riseTime: 0.02, fallTime: 0.05 },
    },
    {
      id: 'quantA',
      type: 'quantizer',
      position: { x: 500, y: 200 },
      params: { scale: 'pentatonic', rootNote: 'D' },
    },
    {
      id: 'stringA',
      type: 'karplusstrong',
      position: { x: 650, y: 200 },
      params: { frequency: 440, damping: 0.3, feedback: 0.995, brightness: 0.8, pluck: 0.5 },
    },
    {
      id: 'attenA',
      type: 'attenuverter',
      position: { x: 800, y: 200 },
      params: { gain: 0.4, offset: 0 },
    },

    // === Voice B: Low Plucks ===
    {
      id: 'euclidB',
      type: 'euclidean',
      position: { x: 50, y: 380 },
      params: { steps: 12, pulses: 3, rotation: 0 },
    },
    {
      id: 'turingB',
      type: 'turing',
      position: { x: 200, y: 380 },
      params: { probability: 0.1, length: 6 },
    },
    {
      id: 'slewB',
      type: 'slewlimiter',
      position: { x: 350, y: 380 },
      params: { riseTime: 0.05, fallTime: 0.1 },
    },
    {
      id: 'quantB',
      type: 'quantizer',
      position: { x: 500, y: 380 },
      params: { scale: 'pentatonic', rootNote: 'D' },
    },
    {
      id: 'stringB',
      type: 'karplusstrong',
      position: { x: 650, y: 380 },
      params: { frequency: 110, damping: 0.5, feedback: 0.998, brightness: 0.5, pluck: 0.3 },
    },
    {
      id: 'attenB',
      type: 'attenuverter',
      position: { x: 800, y: 380 },
      params: { gain: 0.35, offset: 0 },
    },

    // === Voice C: Resonator shimmer ===
    {
      id: 'euclidC',
      type: 'euclidean',
      position: { x: 50, y: 560 },
      params: { steps: 8, pulses: 2, rotation: 1 },
    },
    {
      id: 'noiseC',
      type: 'noise',
      position: { x: 200, y: 640 },
      params: { type: 'pink', level: 0.5 },
    },
    {
      id: 'resonatorC',
      type: 'resonator',
      position: { x: 350, y: 560 },
      params: {
        frequency: 880, resonance: 55, mode: 'chord', partials: 8,
        spread: 0.3, brightness: 0.75, decay: 0.85, mix: 0.95,
      },
    },
    {
      id: 'attenC',
      type: 'attenuverter',
      position: { x: 530, y: 560 },
      params: { gain: 0.25, offset: 0 },
    },

    // === Harmonic Bed: Wavetable ===
    {
      id: 'wtBed',
      type: 'wavetableosc',
      position: { x: 50, y: 750 },
      params: { frequency: 146.83, detune: 3, morph: 0.4, level: 0.15 },
    },
    {
      id: 'wtMorphLFO',
      type: 'lfo',
      position: { x: 50, y: 850 },
      params: { rate: 0.02, depth: 0.4, waveform: 'sine' },
    },
    {
      id: 'wtBedFilter',
      type: 'filter',
      position: { x: 250, y: 750 },
      params: { mode: 'lowpass', cutoff: 1200, resonance: 2 },
    },

    // === Effects ===
    {
      id: 'mixer1',
      type: 'mixer',
      position: { x: 900, y: 300 },
      params: { ch1: 0.8, ch2: 0.8, ch3: 0.7, ch4: 0.6 },
    },
    {
      id: 'tapeDelay',
      type: 'tapedelay',
      position: { x: 1050, y: 200 },
      params: {
        time: 0.416, feedback: 0.6, mix: 0.35, wow: 0.25, flutter: 0.15,
        saturation: 0.4, degradation: 0.55, tapeSpeed: 0.9, pingPong: false,
      },
    },
    {
      id: 'shimmer',
      type: 'shimmerreverb',
      position: { x: 1050, y: 380 },
      params: {
        decay: 10, shimmer: 0.65, pitchShift: 12, damping: 0.25,
        mix: 0.7, diffusion: 0.85,
      },
    },
    {
      id: 'stereo',
      type: 'stereofield',
      position: { x: 1200, y: 300 },
      params: { pan: 0, width: 1.4, midSide: 0, haasDelay: 6, haasAmount: 0.25 },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 1370, y: 300 },
      params: { gain: 0.5 },
    },
  ],
  connections: [
    // Clock routing
    { id: 'c1', from: { nodeId: 'masterClock', port: 'output' }, to: { nodeId: 'clockDiv', port: 'input' } },
    { id: 'c2', from: { nodeId: 'clockDiv', port: 'div1' }, to: { nodeId: 'euclidA', port: 'input' } },
    { id: 'c3', from: { nodeId: 'clockDiv', port: 'div1' }, to: { nodeId: 'euclidB', port: 'input' } },
    { id: 'c4', from: { nodeId: 'clockDiv', port: 'div2' }, to: { nodeId: 'euclidC', port: 'input' } },
    { id: 'c5', from: { nodeId: 'clockDiv', port: 'div1' }, to: { nodeId: 'turingA', port: 'input' } },
    { id: 'c6', from: { nodeId: 'clockDiv', port: 'div1' }, to: { nodeId: 'turingB', port: 'input' } },

    // Voice A
    { id: 'a1', from: { nodeId: 'euclidA', port: 'output' }, to: { nodeId: 'stringA', port: 'trigger' } },
    { id: 'a2', from: { nodeId: 'turingA', port: 'output' }, to: { nodeId: 'slewA', port: 'input' } },
    { id: 'a3', from: { nodeId: 'slewA', port: 'output' }, to: { nodeId: 'quantA', port: 'input' } },
    { id: 'a4', from: { nodeId: 'quantA', port: 'output' }, to: { nodeId: 'stringA', port: 'freq_mod' } },
    { id: 'a5', from: { nodeId: 'stringA', port: 'output' }, to: { nodeId: 'attenA', port: 'input' } },
    { id: 'a6', from: { nodeId: 'attenA', port: 'output' }, to: { nodeId: 'mixer1', port: 'input1' } },

    // Voice B
    { id: 'b1', from: { nodeId: 'euclidB', port: 'output' }, to: { nodeId: 'stringB', port: 'trigger' } },
    { id: 'b2', from: { nodeId: 'turingB', port: 'output' }, to: { nodeId: 'slewB', port: 'input' } },
    { id: 'b3', from: { nodeId: 'slewB', port: 'output' }, to: { nodeId: 'quantB', port: 'input' } },
    { id: 'b4', from: { nodeId: 'quantB', port: 'output' }, to: { nodeId: 'stringB', port: 'freq_mod' } },
    { id: 'b5', from: { nodeId: 'stringB', port: 'output' }, to: { nodeId: 'attenB', port: 'input' } },
    { id: 'b6', from: { nodeId: 'attenB', port: 'output' }, to: { nodeId: 'mixer1', port: 'input2' } },

    // Voice C (resonator)
    { id: 'r1', from: { nodeId: 'noiseC', port: 'output' }, to: { nodeId: 'resonatorC', port: 'input' } },
    { id: 'r2', from: { nodeId: 'euclidC', port: 'output' }, to: { nodeId: 'resonatorC', port: 'trigger' } },
    { id: 'r3', from: { nodeId: 'resonatorC', port: 'output' }, to: { nodeId: 'attenC', port: 'input' } },
    { id: 'r4', from: { nodeId: 'attenC', port: 'output' }, to: { nodeId: 'mixer1', port: 'input3' } },

    // Wavetable bed
    { id: 'wt1', from: { nodeId: 'wtBed', port: 'output' }, to: { nodeId: 'wtBedFilter', port: 'input' } },
    { id: 'wt2', from: { nodeId: 'wtBedFilter', port: 'output' }, to: { nodeId: 'mixer1', port: 'input4' } },

    // Effects chain
    { id: 'fx1', from: { nodeId: 'mixer1', port: 'output' }, to: { nodeId: 'tapeDelay', port: 'input' } },
    { id: 'fx2', from: { nodeId: 'tapeDelay', port: 'output' }, to: { nodeId: 'shimmer', port: 'input' } },
    { id: 'fx3', from: { nodeId: 'shimmer', port: 'output' }, to: { nodeId: 'stereo', port: 'input' } },
    { id: 'fx4', from: { nodeId: 'stereo', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};


// =============================================================================
// PATCH 3: "Tidal Memories"
// =============================================================================
// A slowly evolving generative ambient piece that demonstrates the full
// power of the new modules working together:
//   - Two Drone Oscillators in different modes creating harmonic tension
//   - Smooth Random modulating drone parameters for organic movement
//   - Granular processing of a wavetable creating particle textures
//   - Spectral Freeze capturing and evolving frozen moments
//   - Scene Chain progressing through 4 mood stages
//   - Send/Return buses for shared shimmer reverb + chorus
//   - Tape Delay with heavy degradation feeding back into reverb
//   - Stereo Field widening the entire piece

export const TIDAL_MEMORIES_PATCH: Patch = {
  version: '1.0',
  meta: {
    name: 'Tidal Memories',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  nodes: [
    // === Timing ===
    {
      id: 'slowClock',
      type: 'clock',
      position: { x: 50, y: 0 },
      params: { bpm: 30, swing: 0 },
    },

    // === Layer 1: Primary Drone (fifths mode, triangle) ===
    {
      id: 'droneA',
      type: 'droneosc',
      position: { x: 50, y: 130 },
      params: {
        frequency: 82.41, voices: 5, spread: 12, drift: 0.35, driftRate: 0.06,
        waveform: 'triangle', mode: 'fifths', subLevel: 0.4, subWaveform: 'sine',
        attack: 6, level: 0.25,
      },
    },
    {
      id: 'droneAFilter',
      type: 'filter',
      position: { x: 280, y: 130 },
      params: { mode: 'lowpass', cutoff: 800, resonance: 3 },
    },
    {
      id: 'droneMod',
      type: 'smoothrandom',
      position: { x: 50, y: 50 },
      params: { rate: 0.05, range: 400, smooth: 0.9 },
    },
    {
      id: 'droneASend',
      type: 'send',
      position: { x: 440, y: 130 },
      params: { bus: 'reverb', amount: 0.5, preFader: false },
    },

    // === Layer 2: Secondary Drone (harmonics mode, sawtooth) ===
    {
      id: 'droneB',
      type: 'droneosc',
      position: { x: 50, y: 300 },
      params: {
        frequency: 123.47, voices: 4, spread: 18, drift: 0.5, driftRate: 0.04,
        waveform: 'sawtooth', mode: 'harmonics', subLevel: 0.2, subWaveform: 'triangle',
        attack: 8, level: 0.15,
      },
    },
    {
      id: 'droneBFilter',
      type: 'filter',
      position: { x: 280, y: 300 },
      params: { mode: 'lowpass', cutoff: 1200, resonance: 2 },
    },
    {
      id: 'droneBLFO',
      type: 'lfo',
      position: { x: 50, y: 390 },
      params: { rate: 0.04, depth: 500, waveform: 'sine' },
    },
    {
      id: 'droneBSend',
      type: 'send',
      position: { x: 440, y: 300 },
      params: { bus: 'reverb', amount: 0.6, preFader: false },
    },

    // === Layer 3: Wavetable → Granular Particle Texture ===
    {
      id: 'wtSource',
      type: 'wavetableosc',
      position: { x: 50, y: 500 },
      params: { frequency: 220, detune: 0, morph: 0.57, level: 0.3 },
    },
    {
      id: 'wtMorphLFO',
      type: 'lfo',
      position: { x: 50, y: 600 },
      params: { rate: 0.015, depth: 0.3, waveform: 'triangle' },
    },
    {
      id: 'granular1',
      type: 'granular',
      position: { x: 280, y: 500 },
      params: {
        grainSize: 120, density: 8, spray: 0.3, pitch: 1.0,
        position: 0.5, freeze: false, mix: 0.8, reverse: 0.15,
      },
    },
    {
      id: 'granVCA',
      type: 'vca',
      position: { x: 440, y: 500 },
      params: { gain: 0.2 },
    },
    {
      id: 'granSendRev',
      type: 'send',
      position: { x: 580, y: 500 },
      params: { bus: 'reverb', amount: 0.7, preFader: false },
    },
    {
      id: 'granSendChorus',
      type: 'send',
      position: { x: 580, y: 580 },
      params: { bus: 'chorus', amount: 0.5, preFader: false },
    },

    // === Layer 4: Spectral Freeze (captures the drone texture) ===
    {
      id: 'freezeInput',
      type: 'mixer',
      position: { x: 50, y: 720 },
      params: { ch1: 0.5, ch2: 0.5, ch3: 0, ch4: 0 },
    },
    {
      id: 'spectralFreeze',
      type: 'spectralfreeze',
      position: { x: 250, y: 720 },
      params: {
        freeze: true, blur: 0.8, shift: 7, brightness: 0.5,
        feedback: 0.4, mix: 0.9, grainSize: 300,
      },
    },
    {
      id: 'freezeVCA',
      type: 'vca',
      position: { x: 450, y: 720 },
      params: { gain: 0.15 },
    },
    {
      id: 'freezeSend',
      type: 'send',
      position: { x: 580, y: 720 },
      params: { bus: 'reverb', amount: 0.8, preFader: false },
    },

    // === EFFECTS BUSES ===
    // Reverb bus
    {
      id: 'reverbReturn',
      type: 'return',
      position: { x: 750, y: 50 },
      params: { bus: 'reverb', gain: 1 },
    },
    {
      id: 'shimmerReverb',
      type: 'shimmerreverb',
      position: { x: 900, y: 50 },
      params: {
        decay: 12, shimmer: 0.55, pitchShift: 12, damping: 0.35,
        mix: 0.8, diffusion: 0.9,
      },
    },

    // Chorus bus
    {
      id: 'chorusReturn',
      type: 'return',
      position: { x: 750, y: 200 },
      params: { bus: 'chorus', gain: 0.7 },
    },
    {
      id: 'chorus1',
      type: 'chorus',
      position: { x: 900, y: 200 },
      params: { rate: 0.3, depth: 5, mix: 0.6 },
    },

    // Tape delay (on the reverb output for extra depth)
    {
      id: 'tapeDelay',
      type: 'tapedelay',
      position: { x: 1070, y: 120 },
      params: {
        time: 1.0, feedback: 0.45, mix: 0.3, wow: 0.3, flutter: 0.15,
        saturation: 0.5, degradation: 0.65, tapeSpeed: 0.75, pingPong: false,
      },
    },

    // === MASTER ===
    {
      id: 'masterMix',
      type: 'mixer',
      position: { x: 750, y: 400 },
      params: { ch1: 0.8, ch2: 0.7, ch3: 0.6, ch4: 0.5 },
    },
    {
      id: 'stereo',
      type: 'stereofield',
      position: { x: 1200, y: 300 },
      params: { pan: 0, width: 1.7, midSide: -0.15, haasDelay: 10, haasAmount: 0.35 },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 1370, y: 300 },
      params: { gain: 0.45 },
    },
  ],
  connections: [
    // Drone A path
    { id: 'da1', from: { nodeId: 'droneA', port: 'output' }, to: { nodeId: 'droneAFilter', port: 'input' } },
    { id: 'da2', from: { nodeId: 'droneMod', port: 'output' }, to: { nodeId: 'droneAFilter', port: 'cutoff_mod' } },
    { id: 'da3', from: { nodeId: 'droneAFilter', port: 'output' }, to: { nodeId: 'droneASend', port: 'input' } },
    { id: 'da4', from: { nodeId: 'droneASend', port: 'output' }, to: { nodeId: 'masterMix', port: 'input1' } },

    // Drone B path
    { id: 'db1', from: { nodeId: 'droneB', port: 'output' }, to: { nodeId: 'droneBFilter', port: 'input' } },
    { id: 'db2', from: { nodeId: 'droneBLFO', port: 'output' }, to: { nodeId: 'droneBFilter', port: 'cutoff_mod' } },
    { id: 'db3', from: { nodeId: 'droneBFilter', port: 'output' }, to: { nodeId: 'droneBSend', port: 'input' } },
    { id: 'db4', from: { nodeId: 'droneBSend', port: 'output' }, to: { nodeId: 'masterMix', port: 'input2' } },

    // Granular texture path
    { id: 'g1', from: { nodeId: 'wtSource', port: 'output' }, to: { nodeId: 'granular1', port: 'input' } },
    { id: 'g2', from: { nodeId: 'granular1', port: 'output' }, to: { nodeId: 'granVCA', port: 'input' } },
    { id: 'g3', from: { nodeId: 'granVCA', port: 'output' }, to: { nodeId: 'granSendRev', port: 'input' } },
    { id: 'g4', from: { nodeId: 'granSendRev', port: 'output' }, to: { nodeId: 'granSendChorus', port: 'input' } },
    { id: 'g5', from: { nodeId: 'granSendChorus', port: 'output' }, to: { nodeId: 'masterMix', port: 'input3' } },

    // Spectral freeze (captures drone texture)
    { id: 'sf1', from: { nodeId: 'droneAFilter', port: 'output' }, to: { nodeId: 'freezeInput', port: 'input1' } },
    { id: 'sf2', from: { nodeId: 'droneBFilter', port: 'output' }, to: { nodeId: 'freezeInput', port: 'input2' } },
    { id: 'sf3', from: { nodeId: 'freezeInput', port: 'output' }, to: { nodeId: 'spectralFreeze', port: 'input' } },
    { id: 'sf4', from: { nodeId: 'spectralFreeze', port: 'output' }, to: { nodeId: 'freezeVCA', port: 'input' } },
    { id: 'sf5', from: { nodeId: 'freezeVCA', port: 'output' }, to: { nodeId: 'freezeSend', port: 'input' } },
    { id: 'sf6', from: { nodeId: 'freezeSend', port: 'output' }, to: { nodeId: 'masterMix', port: 'input4' } },

    // Effects buses
    { id: 'fx1', from: { nodeId: 'reverbReturn', port: 'output' }, to: { nodeId: 'shimmerReverb', port: 'input' } },
    { id: 'fx2', from: { nodeId: 'shimmerReverb', port: 'output' }, to: { nodeId: 'tapeDelay', port: 'input' } },
    { id: 'fx3', from: { nodeId: 'tapeDelay', port: 'output' }, to: { nodeId: 'stereo', port: 'input' } },
    { id: 'fx4', from: { nodeId: 'chorusReturn', port: 'output' }, to: { nodeId: 'chorus1', port: 'input' } },
    { id: 'fx5', from: { nodeId: 'chorus1', port: 'output' }, to: { nodeId: 'stereo', port: 'input' } },

    // Master
    { id: 'mx1', from: { nodeId: 'masterMix', port: 'output' }, to: { nodeId: 'stereo', port: 'input' } },
    { id: 'mx2', from: { nodeId: 'stereo', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
  groups: [],
};
