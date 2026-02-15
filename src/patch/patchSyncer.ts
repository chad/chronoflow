// PatchSyncer - syncs patch state to audio graph

import { audioGraph } from '../audio/AudioGraph';
import type { NodeType } from '../audio/AudioGraph';
import { SynthSequencerNode } from '../audio/nodes';
import { usePatchStore } from './patchStore';
import { paramScheduler } from '../audio/ParamScheduler';
import type { Patch, PatchNode, PatchConnection } from './types';

// Set to true to enable debug logging
const DEBUG = false;

// Node types that are per-voice (handled by VoiceAllocator, not global connections)
const VOICE_NODE_TYPES = ['oscillator', 'filter', 'vca', 'adsr', 'mixer', 'wavefolder', 'ringmod'];

class PatchSyncer {
  private previousPatch: Patch | null = null;
  private unsubscribe: (() => void) | null = null;

  async init(): Promise<void> {
    await audioGraph.init();

    // Wire up param scheduler to flush batched updates to store
    paramScheduler.setFlushCallback((updates) => {
      usePatchStore.getState().batchUpdateParams(updates);
    });

    // Subscribe to patch store changes
    this.unsubscribe = usePatchStore.subscribe((state) => {
      this.syncPatch(state.patch);
    });

    // Initial sync
    const currentPatch = usePatchStore.getState().patch;
    this.syncPatch(currentPatch);
  }

  private syncPatch(patch: Patch): void {
    try {
    if (DEBUG) console.log('[PatchSyncer] syncPatch called for:', patch.meta.name);

    // Detect if this is a completely different patch (not just edits to current patch)
    // This happens when loading sample patches or importing patches
    const isPatchSwitch = this.previousPatch &&
      this.previousPatch.meta.name !== patch.meta.name;

    if (isPatchSwitch) {
      if (DEBUG) console.log('[PatchSyncer] Patch switch detected, doing full rebuild');
      // Clear entire audio graph and rebuild from scratch
      audioGraph.clear();

      // Add all nodes fresh
      patch.nodes.forEach((n) => this.addAudioNode(n));

      // Add all connections
      patch.connections.forEach((c) => this.addAudioConnection(c, patch));

      // Rebuild voices
      audioGraph.rebuildVoices(patch.nodes, patch.connections);

      // Update sequencer connections
      this.updateSequencerConnections(patch);

      this.previousPatch = JSON.parse(JSON.stringify(patch));
      return;
    }

    const prevNodes = this.previousPatch?.nodes ?? [];
    const prevConnections = this.previousPatch?.connections ?? [];

    // Find added nodes
    const addedNodes = patch.nodes.filter(
      (n) => !prevNodes.some((p) => p.id === n.id)
    );

    // Find removed nodes
    const removedNodes = prevNodes.filter(
      (p) => !patch.nodes.some((n) => n.id === p.id) && p.id !== 'output'
    );

    // If this is a "full reset" (all non-output nodes removed) or a major patch change,
    // panic first to stop all audio and clear effects
    const isFullReset = prevNodes.length > 1 && patch.nodes.length <= 1 && removedNodes.length > 0;
    const isMajorPatchChange = removedNodes.length >= 3 && addedNodes.length >= 3;
    if (isFullReset || isMajorPatchChange) {
      if (DEBUG) console.log('[PatchSyncer] Full reset or major patch change detected, calling panic');
      audioGraph.panic();
    }

    // Find modified nodes (params changed)
    const modifiedNodes = patch.nodes.filter((n) => {
      const prev = prevNodes.find((p) => p.id === n.id);
      if (!prev) return false;
      return JSON.stringify(n.params) !== JSON.stringify(prev.params);
    });

    // Helper to compare connections by content (not just ID)
    const connectionsEqual = (a: PatchConnection, b: PatchConnection) =>
      a.id === b.id &&
      a.from.nodeId === b.from.nodeId &&
      a.from.port === b.from.port &&
      a.to.nodeId === b.to.nodeId &&
      a.to.port === b.to.port;

    // Find removed connections (including modified ones - they need to be disconnected first)
    const removedConnections = prevConnections.filter(
      (p) => !patch.connections.some((c) => connectionsEqual(p, c))
    );

    // Find added connections (including modified ones - they need to be reconnected)
    const addedConnections = patch.connections.filter(
      (c) => !prevConnections.some((p) => connectionsEqual(c, p))
    );

    // Apply changes to audio graph
    if (DEBUG) console.log('[PatchSyncer] Changes:', {
      addedNodes: addedNodes.map(n => n.id),
      removedNodes: removedNodes.map(n => n.id),
      modifiedNodes: modifiedNodes.map(n => n.id),
      addedConnections: addedConnections.map(c => `${c.from.nodeId}.${c.from.port} -> ${c.to.nodeId}.${c.to.port}`),
      removedConnections: removedConnections.map(c => `${c.from.nodeId}.${c.from.port} -> ${c.to.nodeId}.${c.to.port}`),
    });

    removedConnections.forEach((c) => this.removeAudioConnection(c));
    removedNodes.forEach((n) => this.removeAudioNode(n));
    addedNodes.forEach((n) => this.addAudioNode(n));
    modifiedNodes.forEach((n) => this.updateAudioNode(n));
    addedConnections.forEach((c) => this.addAudioConnection(c, patch));

    // Rebuild polyphonic voices if structure changed
    const structureChanged = addedNodes.length > 0 || removedNodes.length > 0 ||
                            addedConnections.length > 0 || removedConnections.length > 0;
    if (DEBUG) console.log('[PatchSyncer] Structure changed:', structureChanged);
    if (structureChanged) {
      audioGraph.rebuildVoices(patch.nodes, patch.connections);
    }

    // Update sequencer connection states
    this.updateSequencerConnections(patch);

    this.previousPatch = JSON.parse(JSON.stringify(patch));
    } catch (err) {
      console.error('[PatchSyncer] Error in syncPatch:', err);
    }
  }

  private addAudioNode(node: PatchNode): void {
    if (node.id === 'output') return; // Output already exists

    const audioNode = audioGraph.createNode(node.type as NodeType, node.id, node.params);

    // Start oscillators and LFOs (but not global oscillators when polyphony is enabled)
    if (audioNode) {
      if (node.type === 'oscillator') {
        // Don't start global oscillators when polyphony is enabled
        // Voice oscillators are started by VoiceAllocator
        if (!audioGraph.isPolyphonyEnabled()) {
          audioGraph.startOscillator(node.id);
        }
      } else if (node.type === 'lfo') {
        // LFOs are always global, always start them
        audioGraph.startLFO(node.id);
      }
    }
  }

  private removeAudioNode(node: PatchNode): void {
    audioGraph.removeNode(node.id);
  }

  private updateAudioNode(node: PatchNode): void {
    Object.entries(node.params).forEach(([param, value]) => {
      audioGraph.setNodeParam(node.id, param, value as number | string);
    });

    // Handle mute state - set output gain to 0
    const audioNode = audioGraph.getNode(node.id);
    if (audioNode) {
      const output = audioNode.getOutputNode();
      if (output && 'gain' in output && output instanceof GainNode) {
        if (node.muted) {
          output.gain.setValueAtTime(0, 0);
        }
      }
    }
  }

  private addAudioConnection(connection: PatchConnection, patch: Patch): void {
    const connStr = `${connection.from.nodeId}.${connection.from.port} -> ${connection.to.nodeId}.${connection.to.port}`;

    // When polyphony is enabled, skip connections between voice-type nodes
    // The VoiceAllocator handles those connections internally
    if (audioGraph.isPolyphonyEnabled()) {
      const fromNode = patch.nodes.find((n) => n.id === connection.from.nodeId);
      const toNode = patch.nodes.find((n) => n.id === connection.to.nodeId);
      const fromIsVoice = fromNode && VOICE_NODE_TYPES.includes(fromNode.type);
      const toIsVoice = toNode && VOICE_NODE_TYPES.includes(toNode.type);

      // Skip if both are voice nodes (handled by VoiceAllocator)
      if (fromIsVoice && toIsVoice) {
        if (DEBUG) console.log('[PatchSyncer] SKIP (both voice):', connStr);
        return;
      }

      // Skip if voice node connects to global node (handled by VoiceAllocator -> effects entry)
      if (fromIsVoice && !toIsVoice) {
        if (DEBUG) console.log('[PatchSyncer] SKIP (voice->global):', connStr);
        return;
      }
    }

    if (DEBUG) console.log('[PatchSyncer] CONNECT:', connStr);
    const result = audioGraph.connect(
      connection.from.nodeId,
      connection.from.port,
      connection.to.nodeId,
      connection.to.port
    );
    if (DEBUG) console.log('[PatchSyncer] connect result:', result);
  }

  private removeAudioConnection(connection: PatchConnection): void {
    audioGraph.disconnect(
      connection.from.nodeId,
      connection.from.port,
      connection.to.nodeId,
      connection.to.port
    );
  }

  // Update sequencer nodes to know if they're connected
  private updateSequencerConnections(patch: Patch): void {
    // Find all sequencer nodes
    const sequencerNodes = patch.nodes.filter(n => n.type === 'sequencer');

    for (const seqNode of sequencerNodes) {
      // Check if this sequencer has any outgoing connections
      const hasConnection = patch.connections.some(
        c => c.from.nodeId === seqNode.id
      );

      // Update the sequencer's connection state
      const audioNode = audioGraph.getNode(seqNode.id);
      if (audioNode && audioNode instanceof SynthSequencerNode) {
        audioNode.setConnected(hasConnection);
      }
    }
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    audioGraph.clear();
  }
}

export const patchSyncer = new PatchSyncer();
export default patchSyncer;
