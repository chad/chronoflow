// PatchSyncer - syncs patch state to audio graph

import { audioGraph } from '../audio/AudioGraph';
import type { NodeType } from '../audio/AudioGraph';
import { usePatchStore } from './patchStore';
import type { Patch, PatchNode, PatchConnection } from './types';

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

    // Find removed connections
    const removedConnections = prevConnections.filter(
      (p) => !patch.connections.some((c) => c.id === p.id)
    );

    // Find added connections
    const addedConnections = patch.connections.filter(
      (c) => !prevConnections.some((p) => p.id === c.id)
    );

    // Apply changes to audio graph
    removedConnections.forEach((c) => this.removeAudioConnection(c));
    removedNodes.forEach((n) => this.removeAudioNode(n));
    addedNodes.forEach((n) => this.addAudioNode(n));
    modifiedNodes.forEach((n) => this.updateAudioNode(n));
    addedConnections.forEach((c) => this.addAudioConnection(c));

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

    // Start oscillators and LFOs
    if (audioNode && (node.type === 'oscillator' || node.type === 'lfo')) {
      if (node.type === 'oscillator') {
        audioGraph.startOscillator(node.id);
      } else {
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

  private addAudioConnection(connection: PatchConnection): void {
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
