import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Patch, PatchNode, PatchConnection, PatchNodeType } from './types';
import { createEmptyPatch } from './types';

interface PatchState {
  patch: Patch;
  isAudioEnabled: boolean;
  selectedNodeId: string | null;

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

  // Connection operations
  addConnection: (
    fromNodeId: string,
    fromPort: string,
    toNodeId: string,
    toPort: string
  ) => string | null;
  removeConnection: (id: string) => void;

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
  output: { gain: 0.7 },
};

export const usePatchStore = create<PatchState>((set, get) => ({
  patch: createEmptyPatch(),
  isAudioEnabled: false,
  selectedNodeId: null,

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
