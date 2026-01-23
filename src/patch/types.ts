// Patch JSON types - the source of truth for synth state

export type PatchNodeType = 'oscillator' | 'filter' | 'vca' | 'lfo' | 'adsr' | 'delay' | 'reverb' | 'mixer' | 'output';

export interface PatchNodeParams {
  [key: string]: number | string | boolean;
}

export interface PatchNode {
  id: string;
  type: PatchNodeType;
  position: { x: number; y: number };
  params: PatchNodeParams;
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

export interface Patch {
  version: string;
  meta: PatchMeta;
  nodes: PatchNode[];
  connections: PatchConnection[];
  groups: PatchGroup[];
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
