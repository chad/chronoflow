// AudioGraph - manages audio node instances and connections with polyphony support

import { audioEngine } from './AudioEngine';
import type { SynthNode } from './nodes';
import {
  SynthOscillatorNode,
  SynthFilterNode,
  SynthVCANode,
  SynthLFONode,
  SynthADSRNode,
  SynthDelayNode,
  SynthReverbNode,
  SynthOutputNode,
} from './nodes';
import { VoiceAllocator } from './VoiceAllocator';
import type { PatchNode, PatchConnection } from '../patch/types';

export type NodeType = 'oscillator' | 'filter' | 'vca' | 'lfo' | 'adsr' | 'delay' | 'reverb' | 'output';

// Node types that are per-voice (duplicated for polyphony)
const VOICE_NODE_TYPES: NodeType[] = ['oscillator', 'filter', 'vca', 'adsr'];

// Node types that are global (shared across all voices)
const GLOBAL_NODE_TYPES: NodeType[] = ['lfo', 'delay', 'reverb', 'output'];

interface Connection {
  fromId: string;
  fromPort: string;
  toId: string;
  toPort: string;
}

class AudioGraph {
  private nodes: Map<string, SynthNode> = new Map();
  private connections: Connection[] = [];
  private outputNode: SynthOutputNode | null = null;
  private voiceAllocator: VoiceAllocator | null = null;
  private polyphonyEnabled = true;
  private maxVoices = 8;

  async init(): Promise<void> {
    const context = await audioEngine.init();
    const destination = audioEngine.getDestination();

    // Create the output node
    this.outputNode = new SynthOutputNode(context, 'output', destination);
    this.nodes.set('output', this.outputNode);

    // Create voice allocator
    this.voiceAllocator = new VoiceAllocator({ maxVoices: this.maxVoices });
  }

  getContext(): AudioContext | null {
    return audioEngine.getContext();
  }

  getOutputNode(): SynthOutputNode | null {
    return this.outputNode;
  }

  getVoiceAllocator(): VoiceAllocator | null {
    return this.voiceAllocator;
  }

  isPolyphonyEnabled(): boolean {
    return this.polyphonyEnabled;
  }

  setPolyphonyEnabled(enabled: boolean): void {
    this.polyphonyEnabled = enabled;
  }

  setMaxVoices(count: number): void {
    this.maxVoices = count;
    if (this.voiceAllocator) {
      this.voiceAllocator.setMaxVoices(count);
    }
  }

  private isVoiceNodeType(type: NodeType): boolean {
    return VOICE_NODE_TYPES.includes(type);
  }

  createNode(type: NodeType, id: string, params?: Record<string, unknown>): SynthNode | null {
    const context = audioEngine.getContext();
    if (!context) {
      console.error('AudioGraph: Context not initialized');
      return null;
    }

    let node: SynthNode;

    switch (type) {
      case 'oscillator':
        node = new SynthOscillatorNode(context, id, params);
        break;
      case 'filter':
        node = new SynthFilterNode(context, id, params);
        break;
      case 'vca':
        node = new SynthVCANode(context, id, params);
        break;
      case 'lfo':
        node = new SynthLFONode(context, id, params);
        break;
      case 'adsr':
        node = new SynthADSRNode(context, id, params);
        break;
      case 'delay':
        node = new SynthDelayNode(context, id, params);
        break;
      case 'reverb':
        node = new SynthReverbNode(context, id, params);
        break;
      case 'output':
        // Output node is a singleton
        return this.outputNode;
      default:
        console.error(`AudioGraph: Unknown node type: ${type}`);
        return null;
    }

    this.nodes.set(id, node);
    return node;
  }

  getNode(id: string): SynthNode | undefined {
    return this.nodes.get(id);
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      // Remove all connections involving this node
      this.connections = this.connections.filter(
        (c) => c.fromId !== id && c.toId !== id
      );

      node.dispose();
      this.nodes.delete(id);
    }
  }

  private isModulationPort(port: string): boolean {
    return port.endsWith('_mod');
  }

  connect(fromId: string, fromPort: string, toId: string, toPort: string): boolean {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode || !toNode) {
      console.error(`AudioGraph: Cannot connect - node not found`);
      return false;
    }

    const output = fromNode.getOutputNode();
    if (!output) {
      console.error(`AudioGraph: Cannot connect - missing output`);
      return false;
    }

    // Check if this is a modulation connection
    if (this.isModulationPort(toPort)) {
      const modTarget = toNode.getModulationTarget(toPort);
      if (!modTarget) {
        console.error(`AudioGraph: Cannot connect - modulation target not found: ${toPort}`);
        return false;
      }
      output.connect(modTarget);
    } else {
      // Regular audio connection
      const input = toNode.getInputNode();
      if (!input) {
        console.error(`AudioGraph: Cannot connect - missing input`);
        return false;
      }
      output.connect(input);
    }

    this.connections.push({ fromId, fromPort, toId, toPort });
    return true;
  }

  disconnect(fromId: string, fromPort: string, toId: string, toPort: string): boolean {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode || !toNode) {
      return false;
    }

    const output = fromNode.getOutputNode();
    if (!output) {
      return false;
    }

    // Check if this is a modulation connection
    if (this.isModulationPort(toPort)) {
      const modTarget = toNode.getModulationTarget(toPort);
      if (modTarget) {
        output.disconnect(modTarget);
      }
    } else {
      const input = toNode.getInputNode();
      if (input) {
        output.disconnect(input);
      }
    }

    this.connections = this.connections.filter(
      (c) =>
        !(c.fromId === fromId && c.fromPort === fromPort && c.toId === toId && c.toPort === toPort)
    );

    return true;
  }

  setNodeParam(nodeId: string, param: string, value: number | string): void {
    // Update the global node (for UI display)
    const node = this.nodes.get(nodeId);
    if (node) {
      node.setParam(param, value);
    }

    // Also update all voice instances if this is a voice node
    if (this.voiceAllocator && node && this.isVoiceNodeType(node.type as NodeType)) {
      this.voiceAllocator.updateParam(nodeId, param, value);
    }
  }

  startOscillator(id: string): void {
    const node = this.nodes.get(id);
    if (node instanceof SynthOscillatorNode) {
      node.start();
    }
  }

  stopOscillator(id: string): void {
    const node = this.nodes.get(id);
    if (node instanceof SynthOscillatorNode) {
      node.stop();
    }
  }

  startLFO(id: string): void {
    const node = this.nodes.get(id);
    if (node instanceof SynthLFONode) {
      node.start();
    }
  }

  stopLFO(id: string): void {
    const node = this.nodes.get(id);
    if (node instanceof SynthLFONode) {
      node.stop();
    }
  }

  // === POLYPHONIC NOTE HANDLING ===

  // Note on with polyphony
  noteOn(note: number, velocity: number): void {
    console.log('[AudioGraph] noteOn:', note, velocity, 'polyphony:', this.polyphonyEnabled, 'hasAllocator:', !!this.voiceAllocator);
    if (this.polyphonyEnabled && this.voiceAllocator) {
      const voice = this.voiceAllocator.noteOn(note, velocity);
      console.log('[AudioGraph] Voice allocated:', voice?.id);
      if (!voice) {
        this.monoNoteOn(note, velocity);
      }
    } else {
      // Mono mode: update all oscillators and trigger ADSRs
      this.monoNoteOn(note, velocity);
    }
  }

  // Note off with polyphony
  noteOff(note: number): void {
    if (this.polyphonyEnabled && this.voiceAllocator) {
      this.voiceAllocator.noteOff(note);
    } else {
      this.monoNoteOff();
    }
  }

  // Mono mode note on (original behavior)
  private monoNoteOn(note: number, velocity: number): void {
    const frequency = 440 * Math.pow(2, (note - 69) / 12);
    const normalizedVelocity = velocity / 127;

    // Update all oscillators
    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        node.setParam('frequency', frequency);
      }
    });

    // Trigger all ADSRs
    this.triggerAllADSRs(normalizedVelocity);

    // If no ADSR, set VCA gain directly
    const hasADSR = Array.from(this.nodes.values()).some((n) => n instanceof SynthADSRNode);
    if (!hasADSR) {
      this.nodes.forEach((node) => {
        if (node instanceof SynthVCANode) {
          node.setParam('gain', 0.1 + normalizedVelocity * 0.9);
        }
      });
    }
  }

  // Mono mode note off
  private monoNoteOff(): void {
    this.releaseAllADSRs();

    const hasADSR = Array.from(this.nodes.values()).some((n) => n instanceof SynthADSRNode);
    if (!hasADSR) {
      this.nodes.forEach((node) => {
        if (node instanceof SynthVCANode) {
          node.setParam('gain', 0);
        }
      });
    }
  }

  // Get active voice count
  getActiveVoiceCount(): number {
    return this.voiceAllocator?.getActiveVoiceCount() ?? 0;
  }

  // Panic - stop all voices immediately
  panic(): void {
    this.voiceAllocator?.panic();
  }

  // === LEGACY ADSR METHODS (for mono mode compatibility) ===

  triggerADSR(id: string, velocity: number = 1): void {
    const node = this.nodes.get(id);
    if (node instanceof SynthADSRNode) {
      node.trigger(velocity);
    }
  }

  releaseADSR(id: string): void {
    const node = this.nodes.get(id);
    if (node instanceof SynthADSRNode) {
      node.release();
    }
  }

  triggerAllADSRs(velocity: number = 1): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthADSRNode) {
        node.trigger(velocity);
      }
    });
  }

  releaseAllADSRs(): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthADSRNode) {
        node.release();
      }
    });
  }

  // === REBUILD VOICES ===

  // Rebuild voice allocator when patch changes
  rebuildVoices(patchNodes: PatchNode[], patchConnections: PatchConnection[]): void {
    console.log('[AudioGraph] rebuildVoices called');
    if (!this.voiceAllocator) {
      console.log('[AudioGraph] No voice allocator!');
      return;
    }

    // Disconnect previous voice output connections
    try {
      this.voiceAllocator.getOutputNode().disconnect();
    } catch {
      // Ignore if not connected
    }

    // Initialize voice allocator with the patch
    this.voiceAllocator.initialize(patchNodes, patchConnections);
    console.log('[AudioGraph] Voice allocator initialized, voice count:', this.voiceAllocator.getVoices().length);

    // Find where voices should connect to (first effect or output)
    const voiceOutput = this.voiceAllocator.getOutputNode();

    // Find the first node in the effects chain that receives from voice nodes
    // This is the first delay, reverb, or output that a VCA/filter connects to
    const effectsEntryNode = this.findEffectsEntryNode(patchNodes, patchConnections);
    console.log('[AudioGraph] Effects entry node:', effectsEntryNode);

    if (effectsEntryNode) {
      const entryNode = this.nodes.get(effectsEntryNode);
      console.log('[AudioGraph] Entry node exists:', !!entryNode);
      if (entryNode) {
        const input = entryNode.getInputNode();
        console.log('[AudioGraph] Entry node input exists:', !!input);
        if (input) {
          voiceOutput.connect(input);
          console.log('[AudioGraph] Connected voice output to', effectsEntryNode);
        }
      }
    } else if (this.outputNode) {
      // No effects, connect directly to output
      const outputInput = this.outputNode.getInputNode();
      if (outputInput) {
        voiceOutput.connect(outputInput);
        console.log('[AudioGraph] Connected voice output to output node');
      }
    }

    // Connect global LFOs to voice modulation targets
    this.connectLFOsToVoices(patchConnections);
  }

  // Connect global LFO nodes to voice modulation targets
  private connectLFOsToVoices(patchConnections: PatchConnection[]): void {
    if (!this.voiceAllocator) return;

    // Find LFO -> voice modulation connections
    for (const conn of patchConnections) {
      const fromNode = this.nodes.get(conn.from.nodeId);
      if (!fromNode || fromNode.type !== 'lfo') continue;

      // Check if this connects to a modulation target on a voice node
      if (!conn.to.port.endsWith('_mod')) continue;

      const lfoOutput = fromNode.getOutputNode();
      if (!lfoOutput) continue;

      // Connect LFO to each voice's corresponding node's modulation target
      const voices = this.voiceAllocator.getVoices();
      for (const voice of voices) {
        const voiceNode = voice.getNode(conn.to.nodeId);
        if (voiceNode) {
          const modTarget = voiceNode.getModulationTarget(conn.to.port);
          if (modTarget) {
            lfoOutput.connect(modTarget);
          }
        }
      }
    }
  }

  // Find the first effects node that should receive voice output
  private findEffectsEntryNode(
    patchNodes: PatchNode[],
    connections: PatchConnection[]
  ): string | null {
    // Find connections from voice nodes to global nodes
    const voiceNodeIds = new Set(
      patchNodes.filter((n) => VOICE_NODE_TYPES.includes(n.type as NodeType)).map((n) => n.id)
    );

    for (const conn of connections) {
      if (voiceNodeIds.has(conn.from.nodeId)) {
        const toNode = patchNodes.find((n) => n.id === conn.to.nodeId);
        if (toNode && GLOBAL_NODE_TYPES.includes(toNode.type as NodeType)) {
          return conn.to.nodeId;
        }
      }
    }

    return 'output';
  }

  // Start all oscillators and LFOs
  startAll(): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        node.start();
      } else if (node instanceof SynthLFONode) {
        node.start();
      }
    });
  }

  // Stop all oscillators and LFOs
  stopAll(): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        node.stop();
      } else if (node instanceof SynthLFONode) {
        node.stop();
      }
    });
  }

  getAllNodes(): Map<string, SynthNode> {
    return this.nodes;
  }

  getConnections(): Connection[] {
    return [...this.connections];
  }

  clear(): void {
    this.stopAll();
    this.voiceAllocator?.dispose();

    this.nodes.forEach((node, id) => {
      if (id !== 'output') {
        node.dispose();
      }
    });
    this.nodes.clear();
    this.connections = [];

    if (this.outputNode) {
      this.nodes.set('output', this.outputNode);
    }

    // Recreate voice allocator
    this.voiceAllocator = new VoiceAllocator({ maxVoices: this.maxVoices });
  }
}

export const audioGraph = new AudioGraph();
export default audioGraph;
