// AudioGraph - manages audio node instances and connections

import { audioEngine } from './AudioEngine';
import type { SynthNode } from './nodes';
import {
  SynthOscillatorNode,
  SynthFilterNode,
  SynthVCANode,
  SynthLFONode,
  SynthOutputNode,
} from './nodes';

export type NodeType = 'oscillator' | 'filter' | 'vca' | 'lfo' | 'output';

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

  async init(): Promise<void> {
    const context = await audioEngine.init();
    const destination = audioEngine.getDestination();

    // Create the output node
    this.outputNode = new SynthOutputNode(context, 'output', destination);
    this.nodes.set('output', this.outputNode);
  }

  getContext(): AudioContext | null {
    return audioEngine.getContext();
  }

  getOutputNode(): SynthOutputNode | null {
    return this.outputNode;
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

  connect(fromId: string, fromPort: string, toId: string, toPort: string): boolean {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode || !toNode) {
      console.error(`AudioGraph: Cannot connect - node not found`);
      return false;
    }

    const output = fromNode.getOutputNode();
    const input = toNode.getInputNode();

    if (!output || !input) {
      console.error(`AudioGraph: Cannot connect - missing output/input`);
      return false;
    }

    output.connect(input);

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
    const input = toNode.getInputNode();

    if (output && input) {
      output.disconnect(input);
    }

    this.connections = this.connections.filter(
      (c) =>
        !(c.fromId === fromId && c.fromPort === fromPort && c.toId === toId && c.toPort === toPort)
    );

    return true;
  }

  setNodeParam(nodeId: string, param: string, value: number | string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.setParam(param, value);
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
  }
}

export const audioGraph = new AudioGraph();
export default audioGraph;
