// Patch JSON types - the source of truth for synth state

export type PatchNodeType = 'oscillator' | 'filter' | 'vca' | 'lfo' | 'adsr' | 'delay' | 'reverb' | 'mixer' | 'sequencer' | 'attenuverter' | 'noise' | 'samplehold' | 'wavefolder' | 'ringmod' | 'quantizer' | 'clock' | 'clockdiv' | 'output' | 'smoothrandom' | 'karplusstrong' | 'granular' | 'euclidean' | 'slewlimiter' | 'turing' | 'envfollower' | 'probgate' | 'logic' | 'macro' | 'counter' | 'comparator' | 'switch' | 'crossfader' | 'sequencechain' | 'audioinput' | 'pitchshifter' | 'formantshifter' | 'shimmerreverb' | 'chorus' | 'compressor' | 'eq' | 'bitcrusher' | 'vocoder' | 'glitch' | 'freqshifter' | 'combfilter' | 'send' | 'return' | 'stereofield' | 'tapedelay' | 'droneosc' | 'spectralfreeze' | 'wavetableosc' | 'resonator';

// Signal types for port validation / coloring
export type PortSignalType = 'audio' | 'cv' | 'trigger' | 'gate';

export interface PatchNodeParams {
  [key: string]: number | string | boolean;
}

export interface PatchNode {
  id: string;
  type: PatchNodeType;
  position: { x: number; y: number };
  params: PatchNodeParams;
  muted?: boolean;
  bypassed?: boolean;
}

export interface PatchConnection {
  id: string;
  from: {
    nodeId: string;
    port: string;
  };
  to: {
    nodeId: string;
    port: string;
  };
}

export interface ExposedPort {
  nodeId: string;
  port: string;
  alias: string;
  direction: 'input' | 'output';
}

export interface PatchGroup {
  id: string;
  name: string;
  nodeIds: string[];
  exposedParams: {
    nodeId: string;
    param: string;
    alias: string;
  }[];
  exposedPorts: ExposedPort[];
  collapsed: boolean;
  collapsedPosition: { x: number; y: number };
  color?: string;
}

export interface PatchMeta {
  name: string;
  created: string;
  modified: string;
}

// ── Macro Board types ──

export type MacroBoardControlType = 'knob' | 'fader' | 'button' | 'xypad' | 'ribbon';
export type MacroBoardButtonMode = 'momentary' | 'toggle';

export interface MacroMapping {
  nodeId: string;
  param: string;
  min: number;
  max: number;
}

interface MacroBoardControlBase {
  id: string;
  type: MacroBoardControlType;
  label: string;
  color: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
}

export interface MacroBoardKnob extends MacroBoardControlBase {
  type: 'knob';
  value: number;
  mappings: MacroMapping[];
}

export interface MacroBoardFader extends MacroBoardControlBase {
  type: 'fader';
  value: number;
  mappings: MacroMapping[];
}

export interface MacroBoardButton extends MacroBoardControlBase {
  type: 'button';
  mode: MacroBoardButtonMode;
  pressed: boolean;
  onValue: number;
  offValue: number;
  mappings: MacroMapping[];
}

export interface MacroBoardXYPad extends MacroBoardControlBase {
  type: 'xypad';
  x: number;
  y: number;
  xMappings: MacroMapping[];
  yMappings: MacroMapping[];
}

export interface MacroBoardRibbon extends MacroBoardControlBase {
  type: 'ribbon';
  value: number;
  springBack: boolean;
  centerValue: number;
  mappings: MacroMapping[];
}

export type MacroBoardControl =
  | MacroBoardKnob
  | MacroBoardFader
  | MacroBoardButton
  | MacroBoardXYPad
  | MacroBoardRibbon;

export interface MacroBoard {
  cols: number;
  rows: number;
  controls: MacroBoardControl[];
}

export interface Patch {
  version: string;
  meta: PatchMeta;
  nodes: PatchNode[];
  connections: PatchConnection[];
  groups: PatchGroup[];
  macroBoard?: MacroBoard;
}

export function createEmptyPatch(name: string = 'Untitled'): Patch {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    meta: {
      name,
      created: now,
      modified: now,
    },
    nodes: [
      {
        id: 'output',
        type: 'output',
        position: { x: 600, y: 200 },
        params: { gain: 0.7 },
      },
    ],
    connections: [],
    groups: [],
  };
}
