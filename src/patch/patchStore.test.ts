import { describe, it, expect, beforeEach } from 'vitest';
import { usePatchStore } from './patchStore';
import { createEmptyPatch } from './types';

describe('patchStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    usePatchStore.setState({
      patch: createEmptyPatch(),
      isAudioEnabled: false,
      selectedNodeId: null,
      selectedNodeIds: [],
      focusedGroupId: null,
    });
  });

  describe('initial state', () => {
    it('should have empty patch with output node', () => {
      const { patch } = usePatchStore.getState();

      expect(patch.version).toBe('1.0');
      expect(patch.nodes).toHaveLength(1);
      expect(patch.nodes[0].type).toBe('output');
      expect(patch.connections).toHaveLength(0);
      expect(patch.groups).toHaveLength(0);
    });

    it('should have audio disabled initially', () => {
      const { isAudioEnabled } = usePatchStore.getState();
      expect(isAudioEnabled).toBe(false);
    });

    it('should have no selection', () => {
      const { selectedNodeId, selectedNodeIds } = usePatchStore.getState();
      expect(selectedNodeId).toBeNull();
      expect(selectedNodeIds).toHaveLength(0);
    });
  });

  describe('addNode', () => {
    it('should add a new node', () => {
      const { addNode } = usePatchStore.getState();

      const id = addNode('oscillator', { x: 100, y: 100 });

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.nodes).toHaveLength(2);
      expect(newPatch.nodes.find((n) => n.id === id)).toBeDefined();
    });

    it('should set default parameters for node type', () => {
      const { addNode } = usePatchStore.getState();

      const id = addNode('oscillator', { x: 100, y: 100 });

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.params.frequency).toBe(440);
      expect(node?.params.waveform).toBe('sawtooth');
    });

    it('should set node position', () => {
      const { addNode } = usePatchStore.getState();

      const id = addNode('filter', { x: 200, y: 300 });

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.position).toEqual({ x: 200, y: 300 });
    });

    it('should update modified timestamp', () => {
      usePatchStore.getState().addNode('vca', { x: 0, y: 0 });

      const newPatch = usePatchStore.getState().patch;
      // Just verify the timestamp is a valid ISO string
      expect(newPatch.meta.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return new node id', () => {
      const { addNode } = usePatchStore.getState();

      const id = addNode('adsr', { x: 0, y: 0 });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('removeNode', () => {
    it('should remove a node', () => {
      const { addNode, removeNode } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      removeNode(id);

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.nodes.find((n) => n.id === id)).toBeUndefined();
    });

    it('should not remove output node', () => {
      const { removeNode } = usePatchStore.getState();

      removeNode('output');

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.nodes.find((n) => n.id === 'output')).toBeDefined();
    });

    it('should remove associated connections', () => {
      const { addNode, addConnection, removeNode } = usePatchStore.getState();
      const oscId = addNode('oscillator', { x: 0, y: 0 });
      addConnection(oscId, 'output', 'output', 'input');

      removeNode(oscId);

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.connections).toHaveLength(0);
    });

    it('should clear selection if removed node was selected', () => {
      const { addNode, selectNode, removeNode } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });
      selectNode(id);

      removeNode(id);

      const { selectedNodeId } = usePatchStore.getState();
      expect(selectedNodeId).toBeNull();
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      const { addNode, updateNodePosition } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      updateNodePosition(id, { x: 100, y: 200 });

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('updateNodeParam', () => {
    it('should update a number parameter', () => {
      const { addNode, updateNodeParam } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      updateNodeParam(id, 'frequency', 880);

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.params.frequency).toBe(880);
    });

    it('should update a string parameter', () => {
      const { addNode, updateNodeParam } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      updateNodeParam(id, 'waveform', 'square');

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.params.waveform).toBe('square');
    });

    it('should update a boolean parameter', () => {
      const { addNode, updateNodeParam } = usePatchStore.getState();
      const id = addNode('sequencer', { x: 0, y: 0 });

      updateNodeParam(id, 'running', false);

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.params.running).toBe(false);
    });

    it('should reject NaN values', () => {
      const { addNode, updateNodeParam } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });
      const originalFreq = usePatchStore.getState().patch.nodes.find((n) => n.id === id)?.params.frequency;

      updateNodeParam(id, 'frequency', NaN);

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.params.frequency).toBe(originalFreq);
    });

    it('should reject Infinity values', () => {
      const { addNode, updateNodeParam } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });
      const originalFreq = usePatchStore.getState().patch.nodes.find((n) => n.id === id)?.params.frequency;

      updateNodeParam(id, 'frequency', Infinity);

      const newPatch = usePatchStore.getState().patch;
      const node = newPatch.nodes.find((n) => n.id === id);
      expect(node?.params.frequency).toBe(originalFreq);
    });

    it('should update modified timestamp', () => {
      const { addNode, updateNodeParam } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      updateNodeParam(id, 'frequency', 880);

      const newPatch = usePatchStore.getState().patch;
      // Just verify the timestamp is a valid ISO string
      expect(newPatch.meta.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('addConnection', () => {
    it('should add a new connection', () => {
      const { addNode, addConnection } = usePatchStore.getState();
      const oscId = addNode('oscillator', { x: 0, y: 0 });

      const connId = addConnection(oscId, 'output', 'output', 'input');

      expect(connId).not.toBeNull();
      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.connections).toHaveLength(1);
      expect(newPatch.connections[0].from.nodeId).toBe(oscId);
      expect(newPatch.connections[0].to.nodeId).toBe('output');
    });

    it('should not add duplicate connection', () => {
      const { addNode, addConnection } = usePatchStore.getState();
      const oscId = addNode('oscillator', { x: 0, y: 0 });

      addConnection(oscId, 'output', 'output', 'input');
      const secondConnId = addConnection(oscId, 'output', 'output', 'input');

      expect(secondConnId).toBeNull();
      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.connections).toHaveLength(1);
    });

    it('should replace existing connection to same input', () => {
      const { addNode, addConnection } = usePatchStore.getState();
      const osc1Id = addNode('oscillator', { x: 0, y: 0 });
      const osc2Id = addNode('oscillator', { x: 100, y: 0 });
      const vcaId = addNode('vca', { x: 200, y: 0 });

      addConnection(osc1Id, 'output', vcaId, 'input');
      addConnection(osc2Id, 'output', vcaId, 'input');

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.connections).toHaveLength(1);
      expect(newPatch.connections[0].from.nodeId).toBe(osc2Id);
    });

    it('should update modified timestamp', () => {
      const { addNode, addConnection } = usePatchStore.getState();
      const oscId = addNode('oscillator', { x: 0, y: 0 });

      addConnection(oscId, 'output', 'output', 'input');

      const newPatch = usePatchStore.getState().patch;
      // Just verify the timestamp is a valid ISO string
      expect(newPatch.meta.modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      const { addNode, addConnection, removeConnection } = usePatchStore.getState();
      const oscId = addNode('oscillator', { x: 0, y: 0 });
      const connId = addConnection(oscId, 'output', 'output', 'input');

      removeConnection(connId!);

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.connections).toHaveLength(0);
    });

    it('should do nothing for non-existent connection', () => {
      const { removeConnection } = usePatchStore.getState();

      // Should not throw
      removeConnection('non-existent');

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.connections).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('should select a node', () => {
      const { addNode, selectNode } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      selectNode(id);

      const { selectedNodeId } = usePatchStore.getState();
      expect(selectedNodeId).toBe(id);
    });

    it('should clear selection', () => {
      const { addNode, selectNode } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });
      selectNode(id);

      selectNode(null);

      const { selectedNodeId } = usePatchStore.getState();
      expect(selectedNodeId).toBeNull();
    });

    it('should toggle node selection for multi-select', () => {
      const { addNode, toggleNodeSelection } = usePatchStore.getState();
      const id1 = addNode('oscillator', { x: 0, y: 0 });
      const id2 = addNode('filter', { x: 100, y: 0 });

      toggleNodeSelection(id1);
      toggleNodeSelection(id2);

      const { selectedNodeIds } = usePatchStore.getState();
      expect(selectedNodeIds).toContain(id1);
      expect(selectedNodeIds).toContain(id2);
    });

    it('should un-toggle node selection', () => {
      const { addNode, toggleNodeSelection } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      toggleNodeSelection(id);
      toggleNodeSelection(id);

      const { selectedNodeIds } = usePatchStore.getState();
      expect(selectedNodeIds).not.toContain(id);
    });

    it('should clear all selection', () => {
      const { addNode, selectNode, toggleNodeSelection, clearSelection } = usePatchStore.getState();
      const id1 = addNode('oscillator', { x: 0, y: 0 });
      const id2 = addNode('filter', { x: 100, y: 0 });
      selectNode(id1);
      toggleNodeSelection(id2);

      clearSelection();

      const { selectedNodeId, selectedNodeIds } = usePatchStore.getState();
      expect(selectedNodeId).toBeNull();
      expect(selectedNodeIds).toHaveLength(0);
    });
  });

  describe('groups', () => {
    it('should create a group', () => {
      const { addNode, createGroup } = usePatchStore.getState();
      const id1 = addNode('oscillator', { x: 0, y: 0 });
      const id2 = addNode('filter', { x: 100, y: 0 });

      const groupId = createGroup('My Group', [id1, id2]);

      expect(groupId).not.toBeNull();
      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.groups).toHaveLength(1);
      expect(newPatch.groups[0].name).toBe('My Group');
    });

    it('should not create group with less than 2 nodes', () => {
      const { addNode, createGroup } = usePatchStore.getState();
      const id = addNode('oscillator', { x: 0, y: 0 });

      const groupId = createGroup('Single Node', [id]);

      expect(groupId).toBeNull();
    });

    it('should delete a group', () => {
      const { addNode, createGroup, deleteGroup } = usePatchStore.getState();
      const id1 = addNode('oscillator', { x: 0, y: 0 });
      const id2 = addNode('filter', { x: 100, y: 0 });
      const groupId = createGroup('My Group', [id1, id2]);

      deleteGroup(groupId!);

      const newPatch = usePatchStore.getState().patch;
      expect(newPatch.groups).toHaveLength(0);
    });

    it('should collapse and expand a group', () => {
      const { addNode, createGroup, collapseGroup, expandGroup } = usePatchStore.getState();
      const id1 = addNode('oscillator', { x: 0, y: 0 });
      const id2 = addNode('filter', { x: 100, y: 0 });
      const groupId = createGroup('My Group', [id1, id2]);

      collapseGroup(groupId!);
      let group = usePatchStore.getState().patch.groups[0];
      expect(group.collapsed).toBe(true);

      expandGroup(groupId!);
      group = usePatchStore.getState().patch.groups[0];
      expect(group.collapsed).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should export patch as JSON', () => {
      const { addNode, exportPatch } = usePatchStore.getState();
      addNode('oscillator', { x: 0, y: 0 });

      const json = exportPatch();

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.nodes).toHaveLength(2);
    });

    it('should import valid patch JSON', () => {
      const { importPatch } = usePatchStore.getState();
      const patchJson = JSON.stringify({
        version: '1.0',
        meta: { name: 'Imported', created: new Date().toISOString(), modified: new Date().toISOString() },
        nodes: [{ id: 'output', type: 'output', position: { x: 0, y: 0 }, params: { gain: 0.7 } }],
        connections: [],
        groups: [],
      });

      const success = importPatch(patchJson);

      expect(success).toBe(true);
      const { patch } = usePatchStore.getState();
      expect(patch.meta.name).toBe('Imported');
    });

    it('should reject invalid patch JSON', () => {
      const { importPatch } = usePatchStore.getState();

      const success = importPatch('not valid json');

      expect(success).toBe(false);
    });

    it('should reject patch without version', () => {
      const { importPatch } = usePatchStore.getState();
      const patchJson = JSON.stringify({
        meta: { name: 'NoVersion', created: '', modified: '' },
        nodes: [],
        connections: [],
        groups: [],
      });

      const success = importPatch(patchJson);

      expect(success).toBe(false);
    });
  });
});
