// ChronoFlow Engine - Headless audio engine for running patches without UI
//
// Import this to use ChronoFlow's audio processing in any web project.
// No React, no UI framework — just Web Audio API.
//
// IMPORTANT: If your patch uses PitchShifter, Bitcrusher, or Granular nodes,
// copy the worklet files from chronoflow/public/worklets/ into your project's
// public directory at /worklets/. These are loaded at runtime by the AudioWorklet API.
//
// Example:
//   import { ChronoFlowEngine } from './engine';
//
//   const engine = new ChronoFlowEngine();
//   await engine.init();
//   engine.loadPatch(myPatch);
//   engine.setParam('delay-1', 'mix', 0.6);

export { ChronoFlowEngine } from './ChronoFlowEngine';
export type { ChronoFlowEngineOptions, EngineEvents } from './ChronoFlowEngine';

// Re-export types needed for working with the engine
export type { Patch, PatchNode, PatchConnection, PatchNodeType, PatchNodeParams } from '../patch/types';
export { createEmptyPatch } from '../patch/types';
export type { SynthNode, AudioNodeParams } from '../audio/nodes/types';

// Re-export concrete node types for typed access
export { SynthAudioInputNode } from '../audio/nodes/AudioInputNode';
export { SynthPitchShifterNode } from '../audio/nodes/PitchShifterNode';
export { SynthFormantShifterNode } from '../audio/nodes/FormantShifterNode';
export { SynthShimmerReverbNode } from '../audio/nodes/ShimmerReverbNode';
export { SynthChorusNode } from '../audio/nodes/ChorusNode';
export { SynthCompressorNode } from '../audio/nodes/CompressorNode';
export { SynthEQNode } from '../audio/nodes/EQNode';
export { SynthBitcrusherNode } from '../audio/nodes/BitcrusherNode';
export { SynthOscillatorNode } from '../audio/nodes/OscillatorNode';
export { SynthFilterNode } from '../audio/nodes/FilterNode';
export { SynthVCANode } from '../audio/nodes/VCANode';
export { SynthLFONode } from '../audio/nodes/LFONode';
export { SynthADSRNode } from '../audio/nodes/ADSRNode';
export { SynthDelayNode } from '../audio/nodes/DelayNode';
export { SynthReverbNode } from '../audio/nodes/ReverbNode';
export { SynthMixerNode } from '../audio/nodes/MixerNode';
export { SynthOutputNode } from '../audio/nodes/OutputNode';
export { SynthVocoderNode } from '../audio/nodes/VocoderNode';
export { SynthGlitchNode } from '../audio/nodes/GlitchNode';
export { SynthFreqShifterNode } from '../audio/nodes/FreqShifterNode';
export { SynthCombFilterNode } from '../audio/nodes/CombFilterNode';
export { SynthSendNode, SynthReturnNode } from '../audio/nodes/SendReturnNode';
export { SynthStereoFieldNode } from '../audio/nodes/StereoFieldNode';
export { SynthTapeDelayNode } from '../audio/nodes/TapeDelayNode';
export { SynthDroneOscNode } from '../audio/nodes/DroneOscNode';
export { SynthSpectralFreezeNode } from '../audio/nodes/SpectralFreezeNode';
export { SynthWavetableOscNode } from '../audio/nodes/WavetableOscNode';
export { SynthResonatorNode } from '../audio/nodes/ResonatorNode';

// Audio Analysis Bus - subscribe to real-time audio features for visuals
export { audioAnalysisBus } from '../audio/AudioAnalysisBus';
export type { SpectrumData } from '../audio/AudioAnalysisBus';
