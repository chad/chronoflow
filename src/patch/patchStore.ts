import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { Patch, PatchNode, PatchConnection, PatchNodeType, PatchGroup, ExposedPort } from './types';
import { createEmptyPatch } from './types';
import { computeAutoLayout } from '../layout/autoLayout';
import { detectExposedPorts, calculateGroupCenter, generatePortAlias } from '../layout/groupUtils';
import { copyNodes, pasteNodes } from './clipboard';


interface PatchState {
  patch: Patch;
  isAudioEnabled: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // Multi-select for grouping
  focusedGroupId: string | null; // Currently focused group for dive-in
  tracingNodeId: string | null; // Signal path tracing

  // Actions
  setAudioEnabled: (enabled: boolean) => void;
  setPatch: (patch: Patch) => void;
  resetPatch: () => void;

  // Node operations
  addNode: (type: PatchNodeType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeParam: (id: string, param: string, value: number | string | boolean) => void;
  batchUpdateParams: (updates: { nodeId: string; param: string; value: number | string | boolean }[]) => void;
  selectNode: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  toggleNodeSelection: (id: string) => void;
  clearSelection: () => void;

  // Mute / bypass
  toggleMute: (id: string) => void;
  toggleBypass: (id: string) => void;

  // Copy / paste
  copySelected: () => void;
  pasteAtPosition: (position: { x: number; y: number }) => void;
  duplicateSelected: () => void;

  // Signal tracing
  setTracingNode: (id: string | null) => void;
  getUpstreamNodes: (id: string) => Set<string>;
  getDownstreamNodes: (id: string) => Set<string>;

  // Connection operations
  addConnection: (
    fromNodeId: string,
    fromPort: string,
    toNodeId: string,
    toPort: string
  ) => string | null;
  removeConnection: (id: string) => void;
  removeAllConnections: (nodeId: string) => void;

  // Layout operations
  autoLayoutNodes: () => void;

  // Group operations
  createGroup: (name: string, nodeIds: string[]) => string | null;
  deleteGroup: (groupId: string) => void;
  collapseGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  diveIntoGroup: (groupId: string) => void;
  exitGroup: () => void;
  exposePort: (
    groupId: string,
    nodeId: string,
    port: string,
    direction: 'input' | 'output',
    alias: string
  ) => void;
  unexposePort: (groupId: string, alias: string) => void;
  duplicateGroup: (groupId: string, position: { x: number; y: number }) => string | null;

  // Persistence
  savePatch: () => void;
  loadPatch: () => boolean;
  exportPatch: () => string;
  importPatch: (json: string) => boolean;
}

const DEFAULT_PARAMS: Record<PatchNodeType, Record<string, number | string | boolean>> = {
  oscillator: { frequency: 440, detune: 0, waveform: 'sawtooth' },
  filter: { mode: 'lowpass', cutoff: 2000, resonance: 1 },
  vca: { gain: 0.5 },
  lfo: { rate: 1, depth: 100, waveform: 'sine' },
  adsr: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
  delay: { time: 0.3, feedback: 0.4, mix: 0.5 },
  reverb: { decay: 2, mix: 0.3 },
  mixer: { level1: 1, level2: 1, level3: 1, level4: 1, master: 1 },
  sequencer: {
    bpm: 120,
    steps: 8,
    gate: 0.5,
    swing: 50,
    patternA: 'C-4 D-4 E-4 F-4 G-4 A-4 B-4 C-5',
    patternB: '',
    patternC: '',
    patternD: '',
    chain: 'A',
    running: true,
    extClock: false,
  },
  attenuverter: { amount: 1 },
  noise: { type: 'white', level: 1 },
  samplehold: { rate: 4, smooth: 0 },
  wavefolder: { drive: 1, folds: 2, mix: 1 },
  ringmod: { carrierFreq: 440, carrierType: 'sine', mix: 1, useExternal: false },
  quantizer: { scale: 'minor', root: 0, octaves: 2 },
  clock: { bpm: 120, running: true, swing: 0 },
  clockdiv: {},
  output: { gain: 0.7 },
  smoothrandom: { rate: 0.1, range: 1, smooth: 0.8 },
  karplusstrong: { frequency: 220, damping: 0.5, feedback: 0.99, brightness: 0.7, pluck: 0.5 },
  granular: { grainSize: 100, density: 10, spray: 0.1, pitch: 1.0, position: 0.5, freeze: false, mix: 1.0, reverse: 0 },
  euclidean: { steps: 16, hits: 4, rotation: 0, running: true },
  slewlimiter: { rise: 0.1, fall: 0.1, shape: 'exponential' },
  turing: { probability: 0.5, length: 8, scale: 1, locked: false },
  envfollower: { attack: 10, release: 100, gain: 1, offset: 0 },
  probgate: { probability: 0.5, mode: 'gate' },
  logic: { operation: 'and' },
  macro: { value: 0.5, out1Min: 0, out1Max: 1, out2Min: 0, out2Max: 1, out3Min: 0, out3Max: 1, out4Min: 0, out4Max: 1, smooth: 0.1 },
  counter: { count: 8, mode: 'up', autoReset: true },
  comparator: { threshold: 0.5, mode: 'greater', windowSize: 0.1, hysteresis: 0.05 },
  switch: { channels: 2, mode: 'cv', position: 0, smooth: 10 },
  crossfader: { position: 0.5, curve: 'equal_power' },
  sequencechain: { scenes: 4, stepsPerScene: 16, mode: 'forward', loop: true },
  audioinput: { gain: 1.0, monitoring: false, source: 'microphone' },
  pitchshifter: { semitones: 0, cents: 0, grainSize: 2048, mix: 1.0 },
  formantshifter: { shift: 0, mix: 1.0, bandwidth: 8, vowel: 'auto' },
  shimmerreverb: { decay: 4, shimmer: 0.5, pitchShift: 12, damping: 0.3, mix: 0.5, diffusion: 0.7 },
  chorus: { rate: 1.5, depth: 0.5, voices: 3, spread: 0.5, mix: 0.5, feedback: 0 },
  compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 10, makeupGain: 0, mix: 1.0 },
  eq: { lowFreq: 100, lowGain: 0, midFreq: 1000, midGain: 0, midQ: 1, highFreq: 8000, highGain: 0 },
  bitcrusher: { bits: 8, sampleRateReduction: 1, mix: 1.0 },
  vocoder: { bands: 16, attack: 0.005, release: 0.02, shift: 0, mix: 1.0 },
  glitch: { rate: 8, size: 0.05, pitch: 1.0, pitchRamp: 0, reverse: false, probability: 1.0, mix: 1.0, active: false },
  freqshifter: { shiftHz: 0, mode: 'up', mix: 1.0 },
  combfilter: { frequency: 200, feedback: 0.8, damping: 0.3, mode: 'feedback', mix: 0.5 },
};

export const usePatchStore = create<PatchState>()(
  temporal(
    (set, get) => ({
  patch: createEmptyPatch(),
  isAudioEnabled: false,
  selectedNodeId: null,
  selectedNodeIds: [],
  focusedGroupId: null,
  tracingNodeId: null,

  setAudioEnabled: (enabled) => set({ isAudioEnabled: enabled }),

  setPatch: (patch) =>
    set({
      patch: {
        ...patch,
        meta: { ...patch.meta, modified: new Date().toISOString() },
      },
    }),

  resetPatch: () => set({ patch: createEmptyPatch(), selectedNodeId: null }),

  addNode: (type, position) => {
    const id = nanoid(8);
    const newNode: PatchNode = {
      id,
      type,
      position,
      params: { ...DEFAULT_PARAMS[type] },
    };

    set((state) => ({
      patch: {
        ...state.patch,
        nodes: [...state.patch.nodes, newNode],
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));

    return id;
  },

  removeNode: (id) => {
    if (id === 'output') return; // Can't remove output node

    set((state) => ({
      patch: {
        ...state.patch,
        nodes: state.patch.nodes.filter((n) => n.id !== id),
        connections: state.patch.connections.filter(
          (c) => c.from.nodeId !== id && c.to.nodeId !== id
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      patch: {
        ...state.patch,
        nodes: state.patch.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      },
    }));
  },

  updateNodeParam: (id, param, value) => {
    // Validate value to prevent NaN/undefined from corrupting state
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      console.warn(`[patchStore] Rejecting invalid value for ${id}.${param}:`, value);
      return;
    }
    set((state) => ({
      patch: {
        ...state.patch,
        nodes: state.patch.nodes.map((n) =>
          n.id === id ? { ...n, params: { ...n.params, [param]: value } } : n
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  toggleNodeSelection: (id) => {
    set((state) => {
      const current = state.selectedNodeIds;
      if (current.includes(id)) {
        return { selectedNodeIds: current.filter((nid) => nid !== id) };
      } else {
        return { selectedNodeIds: [...current, id] };
      }
    });
  },

  clearSelection: () => set({ selectedNodeIds: [], selectedNodeId: null }),

  // Batch param updates (from ParamScheduler)
  batchUpdateParams: (updates) => {
    set((state) => {
      let nodes = state.patch.nodes;
      for (const { nodeId, param, value } of updates) {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) continue;
        nodes = nodes.map((n) =>
          n.id === nodeId ? { ...n, params: { ...n.params, [param]: value } } : n
        );
      }
      return {
        patch: {
          ...state.patch,
          nodes,
          meta: { ...state.patch.meta, modified: new Date().toISOString() },
        },
      };
    });
  },

  // Mute / bypass
  toggleMute: (id) => {
    set((state) => ({
      patch: {
        ...state.patch,
        nodes: state.patch.nodes.map((n) =>
          n.id === id ? { ...n, muted: !n.muted } : n
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  toggleBypass: (id) => {
    set((state) => ({
      patch: {
        ...state.patch,
        nodes: state.patch.nodes.map((n) =>
          n.id === id ? { ...n, bypassed: !n.bypassed } : n
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  // Copy / paste
  copySelected: () => {
    const state = get();
    const ids = state.selectedNodeIds.length > 0
      ? state.selectedNodeIds
      : state.selectedNodeId ? [state.selectedNodeId] : [];
    if (ids.length === 0) return;
    copyNodes(ids.filter((id) => id !== 'output'), state.patch.nodes, state.patch.connections);
  },

  pasteAtPosition: (position) => {
    const result = pasteNodes(position);
    if (!result) return;
    set((state) => ({
      patch: {
        ...state.patch,
        nodes: [...state.patch.nodes, ...result.nodes],
        connections: [...state.patch.connections, ...result.connections],
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
      selectedNodeIds: result.nodes.map((n) => n.id),
    }));
  },

  duplicateSelected: () => {
    const state = get();
    const ids = state.selectedNodeIds.length > 0
      ? state.selectedNodeIds
      : state.selectedNodeId ? [state.selectedNodeId] : [];
    if (ids.length === 0) return;
    copyNodes(ids.filter((id) => id !== 'output'), state.patch.nodes, state.patch.connections);
    const result = pasteNodes({ x: 50, y: 50 }); // offset from center
    if (!result) return;
    // Place relative to original positions with offset
    const origNodes = state.patch.nodes.filter((n) => ids.includes(n.id));
    if (origNodes.length > 0) {
      let cx = 0, cy = 0;
      origNodes.forEach((n) => { cx += n.position.x; cy += n.position.y; });
      cx /= origNodes.length;
      cy /= origNodes.length;
      result.nodes.forEach((n) => {
        n.position.x += cx;
        n.position.y += cy;
      });
    }
    set((state) => ({
      patch: {
        ...state.patch,
        nodes: [...state.patch.nodes, ...result.nodes],
        connections: [...state.patch.connections, ...result.connections],
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
      selectedNodeIds: result.nodes.map((n) => n.id),
    }));
  },

  // Signal tracing
  setTracingNode: (id) => set({ tracingNodeId: id }),

  getUpstreamNodes: (id) => {
    const state = get();
    const visited = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      state.patch.connections
        .filter((c) => c.to.nodeId === current)
        .forEach((c) => queue.push(c.from.nodeId));
    }
    visited.delete(id); // Don't include self
    return visited;
  },

  getDownstreamNodes: (id) => {
    const state = get();
    const visited = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      state.patch.connections
        .filter((c) => c.from.nodeId === current)
        .forEach((c) => queue.push(c.to.nodeId));
    }
    visited.delete(id);
    return visited;
  },

  addConnection: (fromNodeId, fromPort, toNodeId, toPort) => {
    const state = get();

    // Check if connection already exists
    const exists = state.patch.connections.some(
      (c) =>
        c.from.nodeId === fromNodeId &&
        c.from.port === fromPort &&
        c.to.nodeId === toNodeId &&
        c.to.port === toPort
    );

    if (exists) return null;

    // Check if input is already connected (only one connection per input)
    const inputConnected = state.patch.connections.some(
      (c) => c.to.nodeId === toNodeId && c.to.port === toPort
    );

    if (inputConnected) {
      // Remove existing connection to this input
      set((state) => ({
        patch: {
          ...state.patch,
          connections: state.patch.connections.filter(
            (c) => !(c.to.nodeId === toNodeId && c.to.port === toPort)
          ),
        },
      }));
    }

    const id = nanoid(8);
    const newConnection: PatchConnection = {
      id,
      from: { nodeId: fromNodeId, port: fromPort },
      to: { nodeId: toNodeId, port: toPort },
    };

    set((state) => ({
      patch: {
        ...state.patch,
        connections: [...state.patch.connections, newConnection],
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));

    return id;
  },

  removeConnection: (id) => {
    set((state) => ({
      patch: {
        ...state.patch,
        connections: state.patch.connections.filter((c) => c.id !== id),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  removeAllConnections: (nodeId) => {
    set((state) => ({
      patch: {
        ...state.patch,
        connections: state.patch.connections.filter(
          (c) => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  // Layout operations
  autoLayoutNodes: () => {
    const state = get();
    const positions = computeAutoLayout(state.patch.nodes, state.patch.connections);

    set((state) => ({
      patch: {
        ...state.patch,
        nodes: state.patch.nodes.map((node) => {
          const newPos = positions.get(node.id);
          return newPos ? { ...node, position: newPos } : node;
        }),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  // Group operations
  createGroup: (name, nodeIds) => {
    if (nodeIds.length < 2) return null; // Need at least 2 nodes

    const state = get();
    const groupId = `group_${nanoid(8)}`;
    const nodeIdSet = new Set(nodeIds);

    // Detect exposed ports
    const { inputs, outputs } = detectExposedPorts(nodeIdSet, state.patch.connections);
    const existingAliases = new Set<string>();
    const exposedPorts: ExposedPort[] = [];

    inputs.forEach(({ nodeId, port }) => {
      const alias = generatePortAlias(port, existingAliases);
      existingAliases.add(alias);
      exposedPorts.push({ nodeId, port, alias, direction: 'input' });
    });

    outputs.forEach(({ nodeId, port }) => {
      const alias = generatePortAlias(port, existingAliases);
      existingAliases.add(alias);
      exposedPorts.push({ nodeId, port, alias, direction: 'output' });
    });

    // Calculate collapsed position
    const collapsedPosition = calculateGroupCenter(nodeIds, state.patch.nodes);

    const newGroup: PatchGroup = {
      id: groupId,
      name,
      nodeIds,
      exposedParams: [],
      exposedPorts,
      collapsed: false,
      collapsedPosition,
      color: '#6366f1', // Default indigo color
    };

    set((state) => ({
      patch: {
        ...state.patch,
        groups: [...state.patch.groups, newGroup],
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
      selectedNodeIds: [], // Clear selection after grouping
    }));

    return groupId;
  },

  deleteGroup: (groupId) => {
    set((state) => ({
      patch: {
        ...state.patch,
        groups: state.patch.groups.filter((g) => g.id !== groupId),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
      focusedGroupId: state.focusedGroupId === groupId ? null : state.focusedGroupId,
    }));
  },

  collapseGroup: (groupId) => {
    set((state) => ({
      patch: {
        ...state.patch,
        groups: state.patch.groups.map((g) =>
          g.id === groupId ? { ...g, collapsed: true } : g
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  expandGroup: (groupId) => {
    set((state) => ({
      patch: {
        ...state.patch,
        groups: state.patch.groups.map((g) =>
          g.id === groupId ? { ...g, collapsed: false } : g
        ),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  diveIntoGroup: (groupId) => {
    const state = get();
    const group = state.patch.groups.find((g) => g.id === groupId);
    if (group) {
      set({ focusedGroupId: groupId });
    }
  },

  exitGroup: () => {
    set({ focusedGroupId: null });
  },

  exposePort: (groupId, nodeId, port, direction, alias) => {
    set((state) => ({
      patch: {
        ...state.patch,
        groups: state.patch.groups.map((g) => {
          if (g.id !== groupId) return g;
          // Check if port is already exposed
          const exists = g.exposedPorts.some(
            (p) => p.nodeId === nodeId && p.port === port && p.direction === direction
          );
          if (exists) return g;
          return {
            ...g,
            exposedPorts: [...g.exposedPorts, { nodeId, port, alias, direction }],
          };
        }),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  unexposePort: (groupId, alias) => {
    set((state) => ({
      patch: {
        ...state.patch,
        groups: state.patch.groups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            exposedPorts: g.exposedPorts.filter((p) => p.alias !== alias),
          };
        }),
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));
  },

  duplicateGroup: (groupId, position) => {
    const state = get();
    const group = state.patch.groups.find((g) => g.id === groupId);
    if (!group) return null;

    const newGroupId = `group_${nanoid(8)}`;
    const nodeIdMap = new Map<string, string>(); // old id -> new id

    // Create copies of all nodes in the group
    const newNodes: PatchNode[] = [];
    const groupNodes = state.patch.nodes.filter((n) => group.nodeIds.includes(n.id));

    // Calculate offset from original group center
    const originalCenter = calculateGroupCenter(group.nodeIds, state.patch.nodes);
    const offsetX = position.x - originalCenter.x;
    const offsetY = position.y - originalCenter.y;

    groupNodes.forEach((node) => {
      const newId = nanoid(8);
      nodeIdMap.set(node.id, newId);
      newNodes.push({
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      });
    });

    // Copy internal connections with remapped IDs
    const groupNodeIds = new Set(group.nodeIds);
    const internalConnections = state.patch.connections.filter(
      (c) => groupNodeIds.has(c.from.nodeId) && groupNodeIds.has(c.to.nodeId)
    );

    const newConnections: PatchConnection[] = internalConnections.map((conn) => ({
      id: nanoid(8),
      from: {
        nodeId: nodeIdMap.get(conn.from.nodeId) || conn.from.nodeId,
        port: conn.from.port,
      },
      to: {
        nodeId: nodeIdMap.get(conn.to.nodeId) || conn.to.nodeId,
        port: conn.to.port,
      },
    }));

    // Create new group with remapped node IDs
    const newGroup: PatchGroup = {
      ...group,
      id: newGroupId,
      name: `${group.name} (copy)`,
      nodeIds: group.nodeIds.map((id) => nodeIdMap.get(id) || id),
      exposedPorts: group.exposedPorts.map((p) => ({
        ...p,
        nodeId: nodeIdMap.get(p.nodeId) || p.nodeId,
      })),
      collapsedPosition: position,
    };

    set((state) => ({
      patch: {
        ...state.patch,
        nodes: [...state.patch.nodes, ...newNodes],
        connections: [...state.patch.connections, ...newConnections],
        groups: [...state.patch.groups, newGroup],
        meta: { ...state.patch.meta, modified: new Date().toISOString() },
      },
    }));

    return newGroupId;
  },

  savePatch: () => {
    const state = get();
    localStorage.setItem('chronoflow-patch', JSON.stringify(state.patch));
  },

  loadPatch: () => {
    const saved = localStorage.getItem('chronoflow-patch');
    if (saved) {
      try {
        const patch = JSON.parse(saved) as Patch;
        set({ patch });
        return true;
      } catch {
        console.error('Failed to load patch');
        return false;
      }
    }
    return false;
  },

  exportPatch: () => {
    const state = get();
    return JSON.stringify(state.patch, null, 2);
  },

  importPatch: (json) => {
    try {
      const patch = JSON.parse(json) as Patch;
      if (!patch.version || !patch.nodes) {
        throw new Error('Invalid patch format');
      }
      set({ patch, selectedNodeId: null });
      return true;
    } catch {
      console.error('Failed to import patch');
      return false;
    }
  },
}),
    {
      // Only track patch state for undo/redo
      // Skip: selection, audio enabled, focused group
      partialize: (state) => ({
        patch: state.patch,
      }),
      // Limit history to 100 entries
      limit: 100,
      // Equality function to prevent duplicate history entries
      equality: (pastState, currentState) =>
        JSON.stringify(pastState.patch) === JSON.stringify(currentState.patch),
    }
  )
);
