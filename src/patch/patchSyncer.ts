// PatchSyncer - syncs patch state to audio graph

import { audioGraph } from '../audio/AudioGraph';
import type { NodeType } from '../audio/AudioGraph';
import { usePatchStore } from './patchStore';
import type { Patch, PatchNode, PatchConnection } from './types';

// Node types that are per-voice (handled by VoiceAllocator, not global connections)
const VOICE_NODE_TYPES = ['oscillator', 'filter', 'vca', 'adsr'];

class PatchSyncer {
  private previousPatch: Patch | null = null;
  private unsubscribe: (() => void) | null = null;

  async init(): Promise<void> {
    await audioGraph.init();

    // Subscribe to patch store changes
    this.unsubscribe = usePatchStore.subscribe((state) => {
      this.syncPatch(state.patch);
    });

    // Initial sync
    const currentPatch = usePatchStore.getState().patch;
    this.syncPatch(currentPatch);
  }

  private syncPatch(patch: Patch): void {
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
    removedConnections.forEach((c) => this.removeAudioConnection(c));
    removedNodes.forEach((n) => this.removeAudioNode(n));
    addedNodes.forEach((n) => this.addAudioNode(n));
    modifiedNodes.forEach((n) => this.updateAudioNode(n));
    addedConnections.forEach((c) => this.addAudioConnection(c, patch));

    // Rebuild polyphonic voices if structure changed
    const structureChanged = addedNodes.length > 0 || removedNodes.length > 0 ||
                            addedConnections.length > 0 || removedConnections.length > 0;
    if (structureChanged) {
      audioGraph.rebuildVoices(patch.nodes, patch.connections);
    }

    this.previousPatch = JSON.parse(JSON.stringify(patch));
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
  }

  private addAudioConnection(connection: PatchConnection, patch: Patch): void {
    // When polyphony is enabled, skip connections between voice-type nodes
    // The VoiceAllocator handles those connections internally
    if (audioGraph.isPolyphonyEnabled()) {
      const fromNode = patch.nodes.find((n) => n.id === connection.from.nodeId);
      const toNode = patch.nodes.find((n) => n.id === connection.to.nodeId);
      const fromIsVoice = fromNode && VOICE_NODE_TYPES.includes(fromNode.type);
      const toIsVoice = toNode && VOICE_NODE_TYPES.includes(toNode.type);

      // Skip if both are voice nodes (handled by VoiceAllocator)
      if (fromIsVoice && toIsVoice) {
        return;
      }

      // Skip if voice node connects to global node (handled by VoiceAllocator -> effects entry)
      if (fromIsVoice && !toIsVoice) {
        return;
      }
    }

    audioGraph.connect(
      connection.from.nodeId,
      connection.from.port,
      connection.to.nodeId,
      connection.to.port
    );
  }

  private removeAudioConnection(connection: PatchConnection): void {
    audioGraph.disconnect(
      connection.from.nodeId,
      connection.from.port,
      connection.to.nodeId,
      connection.to.port
    );
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
