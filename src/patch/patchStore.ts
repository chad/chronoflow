import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Patch, PatchNode, PatchConnection, PatchNodeType, PatchGroup, ExposedPort } from './types';
import { createEmptyPatch } from './types';
import { computeAutoLayout } from '../layout/autoLayout';
import { detectExposedPorts, calculateGroupCenter, generatePortAlias } from '../layout/groupUtils';

interface PatchState {
  patch: Patch;
  isAudioEnabled: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // Multi-select for grouping
  focusedGroupId: string | null; // Currently focused group for dive-in

  // Actions
  setAudioEnabled: (enabled: boolean) => void;
  setPatch: (patch: Patch) => void;
  resetPatch: () => void;

  // Node operations
  addNode: (type: PatchNodeType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeParam: (id: string, param: string, value: number | string | boolean) => void;
  selectNode: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  toggleNodeSelection: (id: string) => void;
  clearSelection: () => void;

  // Connection operations
  addConnection: (
    fromNodeId: string,
    fromPort: string,
    toNodeId: string,
    toPort: string
  ) => string | null;
  removeConnection: (id: string) => void;

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
};

export const usePatchStore = create<PatchState>((set, get) => ({
  patch: createEmptyPatch(),
  isAudioEnabled: false,
  selectedNodeId: null,
  selectedNodeIds: [],
  focusedGroupId: null,

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
}));
