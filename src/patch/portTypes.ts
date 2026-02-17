// Port type definitions for connection validation and color coding

import type { PortSignalType } from './types';

interface PortDef {
  id: string;
  label: string;
  direction: 'input' | 'output';
  signal: PortSignalType;
}

// Port definitions per node type
const PORT_DEFS: Record<string, PortDef[]> = {
  oscillator: [
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'freq_mod', label: 'Freq Mod', direction: 'input', signal: 'cv' },
    { id: 'detune_mod', label: 'Detune Mod', direction: 'input', signal: 'cv' },
  ],
  filter: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'cutoff_mod', label: 'Cutoff Mod', direction: 'input', signal: 'cv' },
    { id: 'resonance_mod', label: 'Resonance Mod', direction: 'input', signal: 'cv' },
  ],
  vca: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'gain_mod', label: 'Gain Mod (ADSR)', direction: 'input', signal: 'cv' },
  ],
  lfo: [
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  adsr: [
    { id: 'output', label: 'Envelope Out', direction: 'output', signal: 'cv' },
    { id: 'trigger', label: 'Trigger In', direction: 'input', signal: 'trigger' },
  ],
  delay: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  reverb: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  mixer: [
    { id: 'input1', label: 'Ch 1', direction: 'input', signal: 'audio' },
    { id: 'input2', label: 'Ch 2', direction: 'input', signal: 'audio' },
    { id: 'input3', label: 'Ch 3', direction: 'input', signal: 'audio' },
    { id: 'input4', label: 'Ch 4', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  sequencer: [
    { id: 'input', label: 'Clock In', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'Trigger Out', direction: 'output', signal: 'trigger' },
  ],
  clock: [
    { id: 'output', label: 'Clock Out', direction: 'output', signal: 'trigger' },
  ],
  clockdiv: [
    { id: 'input', label: 'Clock In', direction: 'input', signal: 'trigger' },
    { id: 'div1', label: '÷1', direction: 'output', signal: 'trigger' },
    { id: 'div2', label: '÷2', direction: 'output', signal: 'trigger' },
    { id: 'div4', label: '÷4', direction: 'output', signal: 'trigger' },
    { id: 'div8', label: '÷8', direction: 'output', signal: 'trigger' },
  ],
  noise: [
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  output: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
  ],
  attenuverter: [
    { id: 'input', label: 'CV In', direction: 'input', signal: 'cv' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  samplehold: [
    { id: 'input', label: 'Signal In', direction: 'input', signal: 'cv' },
    { id: 'trigger', label: 'Trigger', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  wavefolder: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  ringmod: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  quantizer: [
    { id: 'input', label: 'CV In', direction: 'input', signal: 'cv' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  smoothrandom: [
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  karplusstrong: [
    { id: 'trigger', label: 'Trigger', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  granular: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
  ],
  euclidean: [
    { id: 'input', label: 'Clock In', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'Gate Out', direction: 'output', signal: 'gate' },
  ],
  slewlimiter: [
    { id: 'input', label: 'CV In', direction: 'input', signal: 'cv' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  turing: [
    { id: 'input', label: 'Clock In', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  envfollower: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
  ],
  probgate: [
    { id: 'input', label: 'Gate In', direction: 'input', signal: 'gate' },
    { id: 'output', label: 'Gate Out', direction: 'output', signal: 'gate' },
  ],
  logic: [
    { id: 'input', label: 'Gate In A', direction: 'input', signal: 'gate' },
    { id: 'input2', label: 'Gate In B', direction: 'input', signal: 'gate' },
    { id: 'output', label: 'Gate Out', direction: 'output', signal: 'gate' },
  ],
  macro: [
    { id: 'out1', label: 'Out 1', direction: 'output', signal: 'cv' },
    { id: 'out2', label: 'Out 2', direction: 'output', signal: 'cv' },
    { id: 'out3', label: 'Out 3', direction: 'output', signal: 'cv' },
    { id: 'out4', label: 'Out 4', direction: 'output', signal: 'cv' },
  ],
  counter: [
    { id: 'trigger', label: 'Trigger In', direction: 'input', signal: 'trigger' },
    { id: 'reset', label: 'Reset', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'Gate Out', direction: 'output', signal: 'gate' },
    { id: 'count', label: 'Count CV', direction: 'output', signal: 'cv' },
  ],
  comparator: [
    { id: 'input', label: 'CV In', direction: 'input', signal: 'cv' },
    { id: 'threshold', label: 'Threshold', direction: 'input', signal: 'cv' },
    { id: 'output', label: 'Gate Out', direction: 'output', signal: 'gate' },
    { id: 'inverted', label: 'Inverted', direction: 'output', signal: 'gate' },
    { id: 'trigger', label: 'Trigger', direction: 'output', signal: 'trigger' },
  ],
  switch: [
    { id: 'input1', label: 'In 1', direction: 'input', signal: 'audio' },
    { id: 'input2', label: 'In 2', direction: 'input', signal: 'audio' },
    { id: 'input3', label: 'In 3', direction: 'input', signal: 'audio' },
    { id: 'input4', label: 'In 4', direction: 'input', signal: 'audio' },
    { id: 'cv', label: 'CV', direction: 'input', signal: 'cv' },
    { id: 'trigger', label: 'Trigger', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'Out', direction: 'output', signal: 'audio' },
  ],
  crossfader: [
    { id: 'inputA', label: 'In A', direction: 'input', signal: 'audio' },
    { id: 'inputB', label: 'In B', direction: 'input', signal: 'audio' },
    { id: 'cv', label: 'CV', direction: 'input', signal: 'cv' },
    { id: 'output', label: 'Out', direction: 'output', signal: 'audio' },
  ],
  sequencechain: [
    { id: 'clock', label: 'Clock In', direction: 'input', signal: 'trigger' },
    { id: 'reset', label: 'Reset', direction: 'input', signal: 'trigger' },
    { id: 'output', label: 'CV Out', direction: 'output', signal: 'cv' },
    { id: 'trigger', label: 'Trigger', direction: 'output', signal: 'trigger' },
  ],
  send: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Thru Out', direction: 'output', signal: 'audio' },
    { id: 'amount_mod', label: 'Amount Mod', direction: 'input', signal: 'cv' },
  ],
  return: [
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'gain_mod', label: 'Gain Mod', direction: 'input', signal: 'cv' },
  ],
  stereofield: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'pan_mod', label: 'Pan Mod', direction: 'input', signal: 'cv' },
  ],
  tapedelay: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'time_mod', label: 'Time Mod', direction: 'input', signal: 'cv' },
    { id: 'feedback_mod', label: 'Feedback Mod', direction: 'input', signal: 'cv' },
    { id: 'mix_mod', label: 'Mix Mod', direction: 'input', signal: 'cv' },
  ],
  droneosc: [
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'freq_mod', label: 'Freq Mod', direction: 'input', signal: 'cv' },
    { id: 'level_mod', label: 'Level Mod', direction: 'input', signal: 'cv' },
  ],
  spectralfreeze: [
    { id: 'input', label: 'Audio In', direction: 'input', signal: 'audio' },
    { id: 'output', label: 'Audio Out', direction: 'output', signal: 'audio' },
    { id: 'mix_mod', label: 'Mix Mod', direction: 'input', signal: 'cv' },
    { id: 'feedback_mod', label: 'Feedback Mod', direction: 'input', signal: 'cv' },
    { id: 'trigger', label: 'Freeze Toggle', direction: 'input', signal: 'trigger' },
  ],
};

export function getPortDefs(nodeType: string): PortDef[] {
  return PORT_DEFS[nodeType] || [];
}

export function getPortSignalType(nodeType: string, portId: string): PortSignalType {
  const defs = PORT_DEFS[nodeType];
  if (defs) {
    const port = defs.find((p) => p.id === portId);
    if (port) return port.signal;
  }
  // Default: modulation ports are CV, everything else is audio
  if (portId.endsWith('_mod')) return 'cv';
  return 'audio';
}

export function getPortLabel(nodeType: string, portId: string): string {
  const defs = PORT_DEFS[nodeType];
  if (defs) {
    const port = defs.find((p) => p.id === portId);
    if (port) return port.label;
  }
  return portId;
}

// Colors for signal types
export const SIGNAL_COLORS: Record<PortSignalType, string> = {
  audio: '#f97316',   // orange
  cv: '#a855f7',      // purple
  trigger: '#22d3ee', // cyan
  gate: '#22c55e',    // green
};

// Whether two signal types are compatible for connection
export function arePortsCompatible(
  _fromType: PortSignalType,
  _toType: PortSignalType
): boolean {
  // Permissive - we show warnings, not blocks
  return true;
}

export function isPortMismatch(
  fromType: PortSignalType,
  toType: PortSignalType
): boolean {
  if (fromType === toType) return false;
  // Audio↔CV is fine (common in modular)
  if ((fromType === 'audio' && toType === 'cv') || (fromType === 'cv' && toType === 'audio')) return false;
  // Trigger↔Gate is fine
  if ((fromType === 'trigger' && toType === 'gate') || (fromType === 'gate' && toType === 'trigger')) return false;
  // Audio→Trigger or CV→Gate etc. is a mismatch
  return true;
}
