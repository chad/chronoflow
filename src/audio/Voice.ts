// Voice.ts - Represents a single polyphonic voice
// Each voice has its own oscillator(s), filter, VCA, and ADSR

// Set to true to enable debug logging
const DEBUG = false;

import { audioEngine } from './AudioEngine';
import { SynthOscillatorNode } from './nodes/OscillatorNode';
import { SynthFilterNode } from './nodes/FilterNode';
import { SynthVCANode } from './nodes/VCANode';
import { SynthADSRNode } from './nodes/ADSRNode';
import { SynthMixerNode } from './nodes/MixerNode';
import { SynthWavefolderNode } from './nodes/WavefolderNode';
import { SynthRingModNode } from './nodes/RingModNode';
import type { SynthNode } from './nodes/types';
import type { PatchNode, PatchConnection } from '../patch/types';

export interface VoiceState {
  note: number | null;
  velocity: number;
  startTime: number;
  releasing: boolean;
}

export class Voice {
  id: number;
  private context: AudioContext;
  private nodes: Map<string, SynthNode> = new Map();
  private outputGain: GainNode;
  state: VoiceState = {
    note: null,
    velocity: 0,
    startTime: 0,
    releasing: false,
  };

  constructor(id: number, patchNodes: PatchNode[], connections: PatchConnection[]) {
    this.id = id;
    const ctx = audioEngine.getContext();
    if (!ctx) {
      throw new Error('AudioContext not initialized');
    }
    this.context = ctx;

    // Create a gain node for this voice's output
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = 1;

    // Create voice-local copies of oscillators, filters, VCAs, and ADSRs
    // Skip output, delay, reverb, LFO - those are shared/global
    this.createVoiceNodes(patchNodes);
    this.connectVoiceNodes(connections);

    // Start all oscillators
    let oscCount = 0;
    this.nodes.forEach((node) => {
      if (node.type === 'oscillator') {
        (node as SynthOscillatorNode).start();
        oscCount++;
      }
    });
    if (DEBUG && id === 0) {
      console.log('[Voice 0] Created with nodes:', Array.from(this.nodes.keys()), 'oscillators started:', oscCount);
    }
  }

  private createVoiceNodes(patchNodes: PatchNode[]): void {
    for (const node of patchNodes) {
      // Only create per-voice nodes for these types
      // LFO, delay, reverb, output are shared globally
      switch (node.type) {
        case 'oscillator':
          this.nodes.set(
            node.id,
            new SynthOscillatorNode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
        case 'filter':
          this.nodes.set(
            node.id,
            new SynthFilterNode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
        case 'vca':
          this.nodes.set(
            node.id,
            new SynthVCANode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
        case 'adsr':
          this.nodes.set(
            node.id,
            new SynthADSRNode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
        case 'mixer':
          this.nodes.set(
            node.id,
            new SynthMixerNode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
        case 'wavefolder':
          this.nodes.set(
            node.id,
            new SynthWavefolderNode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
        case 'ringmod':
          this.nodes.set(
            node.id,
            new SynthRingModNode(this.context, `${node.id}_v${this.id}`, node.params)
          );
          break;
      }
    }
  }

  private connectVoiceNodes(connections: PatchConnection[]): void {
    for (const conn of connections) {
      const fromNode = this.nodes.get(conn.from.nodeId);
      const toNode = this.nodes.get(conn.to.nodeId);
      const connStr = `${conn.from.nodeId}.${conn.from.port} -> ${conn.to.nodeId}.${conn.to.port}`;

      // Skip connections that involve global nodes (not in this voice)
      if (!fromNode && !toNode) {
        if (DEBUG && this.id === 0) console.log('[Voice 0] SKIP (no nodes):', connStr);
        continue;
      }

      // If the destination is a voice node
      if (toNode) {
        if (fromNode) {
          // Both nodes are voice-local
          if (DEBUG && this.id === 0) console.log('[Voice 0] CONNECT internal:', connStr);
          this.connectNodes(fromNode, conn.from.port, toNode, conn.to.port);
        }
        // If source is global (LFO), we'll handle that separately via AudioGraph
      }

      // If source is voice-local but destination is global (output/effects)
      // Connect to voice output gain instead
      if (fromNode && !toNode) {
        // Check if this goes to output or effects
        const isToOutput = conn.to.nodeId === 'output' ||
                          conn.to.port === 'input';
        if (isToOutput) {
          if (DEBUG && this.id === 0) console.log('[Voice 0] CONNECT to outputGain:', connStr);
          const output = fromNode.getOutputNode();
          if (output) {
            output.connect(this.outputGain);
          }
        } else {
          if (DEBUG && this.id === 0) console.log('[Voice 0] SKIP (not to output):', connStr);
        }
      }
    }
  }

  private connectNodes(from: SynthNode, _fromPort: string, to: SynthNode, toPort: string): void {
    const output = from.getOutputNode();
    if (!output) return;

    // Check if this is a modulation connection
    if (toPort.endsWith('_mod')) {
      const modTarget = to.getModulationTarget(toPort);
      if (modTarget) {
        output.connect(modTarget);
      }
    } else {
      // Check if this is a mixer channel input
      const mixerInputMatch = toPort.match(/^input([1-4])$/);
      if (mixerInputMatch && to instanceof SynthMixerNode) {
        const channel = parseInt(mixerInputMatch[1], 10);
        const input = to.getInputChannel(channel);
        if (input) {
          output.connect(input);
        }
      } else {
        const input = to.getInputNode();
        if (input) {
          output.connect(input);
        }
      }
    }
  }

  getOutputNode(): GainNode {
    return this.outputGain;
  }

  getNode(id: string): SynthNode | undefined {
    return this.nodes.get(id);
  }

  // Note on - set frequency on all oscillators and trigger ADSRs
  noteOn(note: number, velocity: number): void {
    const frequency = 440 * Math.pow(2, (note - 69) / 12);
    const normalizedVelocity = velocity / 127;

    if (DEBUG) console.log(`[Voice ${this.id}] noteOn: note=${note} freq=${frequency.toFixed(1)} vel=${normalizedVelocity.toFixed(2)}`);

    this.state = {
      note,
      velocity: normalizedVelocity,
      startTime: this.context.currentTime,
      releasing: false,
    };

    // Set frequency on all oscillators
    let oscCount = 0;
    this.nodes.forEach((node) => {
      if (node.type === 'oscillator') {
        node.setParam('frequency', frequency);
        oscCount++;
      }
    });

    // Trigger all ADSRs
    let adsrCount = 0;
    this.nodes.forEach((node) => {
      if (node.type === 'adsr') {
        (node as SynthADSRNode).trigger(normalizedVelocity);
        adsrCount++;
      }
    });

    if (DEBUG) console.log(`[Voice ${this.id}] Updated ${oscCount} oscillators, triggered ${adsrCount} ADSRs`);

    // If no ADSR, set VCA gain directly
    const hasADSR = Array.from(this.nodes.values()).some((n) => n.type === 'adsr');
    if (!hasADSR) {
      this.nodes.forEach((node) => {
        if (node.type === 'vca') {
          node.setParam('gain', 0.1 + normalizedVelocity * 0.9);
        }
      });
    }
  }

  // Note off - release ADSRs
  noteOff(): void {
    if (this.state.note === null) return;

    this.state.releasing = true;

    // Release all ADSRs
    this.nodes.forEach((node) => {
      if (node.type === 'adsr') {
        (node as SynthADSRNode).release();
      }
    });

    // If no ADSR, set VCA to 0 immediately
    const hasADSR = Array.from(this.nodes.values()).some((n) => n.type === 'adsr');
    if (!hasADSR) {
      this.nodes.forEach((node) => {
        if (node.type === 'vca') {
          node.setParam('gain', 0);
        }
      });
      this.state.note = null;
    }
  }

  // Force stop immediately (for voice stealing)
  forceStop(): void {
    this.nodes.forEach((node) => {
      if (node.type === 'adsr') {
        (node as SynthADSRNode).forceStop();
      }
      if (node.type === 'vca') {
        node.setParam('gain', 0);
      }
    });
    this.state = {
      note: null,
      velocity: 0,
      startTime: 0,
      releasing: false,
    };
  }

  // Check if voice is available (not playing or in release phase)
  isAvailable(): boolean {
    return this.state.note === null;
  }

  // Check if voice has finished releasing
  isReleaseComplete(): boolean {
    if (!this.state.releasing) return false;

    // Check if all ADSRs have completed release
    let allComplete = true;
    this.nodes.forEach((node) => {
      if (node.type === 'adsr') {
        if ((node as SynthADSRNode).isEnvelopeActive()) {
          allComplete = false;
        }
      }
    });

    if (allComplete) {
      this.state.note = null;
      this.state.releasing = false;
    }

    return allComplete;
  }

  // Update parameters across all instances of a node type
  updateParam(nodeId: string, param: string, value: number | string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.setParam(param, value);
    }
  }

  dispose(): void {
    this.nodes.forEach((node) => {
      node.disconnect();
      node.dispose();
    });
    this.nodes.clear();
    this.outputGain.disconnect();
  }
}
