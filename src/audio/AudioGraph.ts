// AudioGraph - manages audio node instances and connections with polyphony support

// Set to true to enable debug logging
const DEBUG = false;

// Set to true to use AudioWorklet for granular processing
const USE_GRANULAR_WORKLET = true;

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
  SynthMixerNode,
  SynthSequencerNode,
  SynthAttenuverterNode,
  SynthNoiseNode,
  SynthSampleHoldNode,
  SynthWavefolderNode,
  SynthRingModNode,
  SynthQuantizerNode,
  SynthClockNode,
  SynthClockDividerNode,
  SynthOutputNode,
  SynthSmoothRandomNode,
  SynthKarplusStrongNode,
  SynthGranularNode,
  SynthGranularWorkletNode,
  SynthEuclideanNode,
  SynthSlewLimiterNode,
  SynthTuringMachineNode,
  SynthEnvelopeFollowerNode,
  SynthProbabilityGateNode,
  SynthLogicNode,
  SynthMacroNode,
  SynthCounterNode,
  SynthComparatorNode,
  SynthSwitchNode,
  SynthCrossfaderNode,
  SynthSequenceChainNode,
} from './nodes';
import { VoiceAllocator } from './VoiceAllocator';
import type { PatchNode, PatchConnection } from '../patch/types';

export type NodeType = 'oscillator' | 'filter' | 'vca' | 'lfo' | 'adsr' | 'delay' | 'reverb' | 'mixer' | 'sequencer' | 'attenuverter' | 'noise' | 'samplehold' | 'wavefolder' | 'ringmod' | 'quantizer' | 'clock' | 'clockdiv' | 'output' | 'smoothrandom' | 'karplusstrong' | 'granular' | 'euclidean' | 'slewlimiter' | 'turing' | 'envfollower' | 'probgate' | 'logic' | 'macro' | 'counter' | 'comparator' | 'switch' | 'crossfader' | 'sequencechain';

// Node types that are per-voice (duplicated for polyphony)
const VOICE_NODE_TYPES: NodeType[] = ['oscillator', 'filter', 'vca', 'adsr', 'mixer', 'wavefolder', 'ringmod'];

// Node types that are global (shared across all voices)
const GLOBAL_NODE_TYPES: NodeType[] = ['lfo', 'sequencer', 'attenuverter', 'noise', 'samplehold', 'quantizer', 'clock', 'clockdiv', 'delay', 'reverb', 'output', 'smoothrandom', 'karplusstrong', 'granular', 'euclidean', 'slewlimiter', 'turing', 'envfollower', 'probgate', 'logic', 'macro', 'counter', 'comparator', 'switch', 'crossfader', 'sequencechain'];

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
  private polyphonyEnabled = false;
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
      case 'mixer':
        node = new SynthMixerNode(context, id, params);
        break;
      case 'sequencer':
        node = new SynthSequencerNode(context, id, params);
        // Wire up the note callback so sequencer triggers notes
        (node as SynthSequencerNode).setNoteCallback((note, velocity, gateTime) => {
          this.noteOn(note, velocity);
          setTimeout(() => {
            this.noteOff(note);
          }, gateTime * 1000);
        });
        // Wire up stop callback to clear effects
        (node as SynthSequencerNode).setStopCallback(() => {
          this.clearEffects();
        });
        break;
      case 'attenuverter':
        node = new SynthAttenuverterNode(context, id, params);
        break;
      case 'noise':
        node = new SynthNoiseNode(context, id, params);
        break;
      case 'samplehold':
        node = new SynthSampleHoldNode(context, id, params);
        break;
      case 'wavefolder':
        node = new SynthWavefolderNode(context, id, params);
        break;
      case 'ringmod':
        node = new SynthRingModNode(context, id, params);
        break;
      case 'quantizer':
        node = new SynthQuantizerNode(context, id, params);
        break;
      case 'clock':
        node = new SynthClockNode(context, id, params);
        break;
      case 'clockdiv':
        node = new SynthClockDividerNode(context, id, params);
        break;
      case 'smoothrandom':
        node = new SynthSmoothRandomNode(context, id, params);
        break;
      case 'karplusstrong':
        node = new SynthKarplusStrongNode(context, id, params);
        break;
      case 'granular':
        // Use worklet version if enabled and AudioWorklet is supported
        if (USE_GRANULAR_WORKLET && context.audioWorklet) {
          node = new SynthGranularWorkletNode(context, id, params);
        } else {
          node = new SynthGranularNode(context, id, params);
        }
        break;
      case 'euclidean':
        node = new SynthEuclideanNode(context, id, params);
        break;
      case 'slewlimiter':
        node = new SynthSlewLimiterNode(context, id, params);
        break;
      case 'turing':
        node = new SynthTuringMachineNode(context, id, params);
        break;
      case 'envfollower':
        node = new SynthEnvelopeFollowerNode(context, id, params);
        break;
      case 'probgate':
        node = new SynthProbabilityGateNode(context, id, params);
        break;
      case 'logic':
        node = new SynthLogicNode(context, id, params);
        break;
      case 'macro':
        node = new SynthMacroNode(context, id, params);
        break;
      case 'counter':
        node = new SynthCounterNode(context, id, params);
        break;
      case 'comparator':
        node = new SynthComparatorNode(context, id, params);
        break;
      case 'switch':
        node = new SynthSwitchNode(context, id, params);
        break;
      case 'crossfader':
        node = new SynthCrossfaderNode(context, id, params);
        break;
      case 'sequencechain':
        node = new SynthSequenceChainNode(context, id, params);
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

    // Get the appropriate output based on port name
    let output: AudioNode | null = null;

    // Handle clock divider's multiple division outputs
    if (fromNode instanceof SynthClockDividerNode) {
      switch (fromPort) {
        case 'div1':
          output = fromNode.getDiv1Output();
          break;
        case 'div2':
          output = fromNode.getDiv2Output();
          break;
        case 'div4':
          output = fromNode.getDiv4Output();
          break;
        case 'div8':
          output = fromNode.getDiv8Output();
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else if (fromNode instanceof SynthMacroNode) {
      // Handle macro node's multiple outputs
      switch (fromPort) {
        case 'out1':
          output = fromNode.getOutput1();
          break;
        case 'out2':
          output = fromNode.getOutput2();
          break;
        case 'out3':
          output = fromNode.getOutput3();
          break;
        case 'out4':
          output = fromNode.getOutput4();
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else if (fromNode instanceof SynthCounterNode) {
      // Handle counter node's multiple outputs
      switch (fromPort) {
        case 'count':
          output = fromNode.getCountOutput();
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else if (fromNode instanceof SynthComparatorNode) {
      // Handle comparator node's multiple outputs
      switch (fromPort) {
        case 'inverted':
          output = fromNode.getInvertedOutput();
          break;
        case 'trigger':
          output = fromNode.getTriggerOutput();
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else if (fromNode instanceof SynthSequenceChainNode) {
      // Handle sequence chain node's multiple outputs
      switch (fromPort) {
        case 'trigger':
          output = fromNode.getTriggerOutput();
          break;
        case 'scene1': case 'scene2': case 'scene3': case 'scene4':
        case 'scene5': case 'scene6': case 'scene7': case 'scene8':
          const sceneNum = parseInt(fromPort.replace('scene', ''), 10);
          output = fromNode.getSceneGate(sceneNum);
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else {
      output = fromNode.getOutputNode();
    }

    if (!output) {
      console.error(`AudioGraph: Cannot connect - missing output`);
      return false;
    }

    // Check if this is a modulation connection
    if (this.isModulationPort(toPort)) {
      // For oscillators, use the modulation input node (works even before oscillator starts)
      if (toNode instanceof SynthOscillatorNode) {
        const modInputNode = toNode.getModulationInputNode(toPort);
        if (!modInputNode) {
          console.error(`AudioGraph: Cannot connect - modulation input not found: ${toPort}`);
          return false;
        }
        output.connect(modInputNode);
      } else {
        const modTarget = toNode.getModulationTarget(toPort);
        if (!modTarget) {
          console.error(`AudioGraph: Cannot connect - modulation target not found: ${toPort}`);
          return false;
        }
        output.connect(modTarget);
      }
    } else if (toPort === 'trigger' && toNode instanceof SynthKarplusStrongNode) {
      // Special handling for Karplus-Strong trigger input
      const triggerInput = toNode.getTriggerInput();
      output.connect(triggerInput);
    } else if (toPort === 'trigger' && toNode instanceof SynthSampleHoldNode) {
      // Special handling for Sample & Hold trigger input
      const triggerInput = toNode.getTriggerInput();
      toNode.setExternalTrigger(true);
      output.connect(triggerInput);
    } else if (toPort === 'trigger' && toNode instanceof SynthADSRNode) {
      // Special handling for ADSR trigger input
      const triggerInput = toNode.getTriggerInput();
      output.connect(triggerInput);
    } else if (toNode instanceof SynthCounterNode) {
      // Counter has trigger and reset inputs
      if (toPort === 'trigger' || toPort === 'input') {
        output.connect(toNode.getTriggerInput());
      } else if (toPort === 'reset') {
        output.connect(toNode.getResetInput());
      } else {
        output.connect(toNode.getInputNode());
      }
    } else if (toNode instanceof SynthComparatorNode) {
      // Comparator has input and threshold inputs
      if (toPort === 'threshold') {
        output.connect(toNode.getThresholdInput());
      } else {
        output.connect(toNode.getInputNode());
      }
    } else if (toNode instanceof SynthSwitchNode) {
      // Switch has multiple inputs, cv, and trigger
      const inputMatch = toPort.match(/^input([1-4])$/);
      if (inputMatch) {
        const channel = parseInt(inputMatch[1], 10);
        const input = toNode.getInput(channel);
        if (input) output.connect(input);
      } else if (toPort === 'cv') {
        output.connect(toNode.getCVInput());
      } else if (toPort === 'trigger') {
        output.connect(toNode.getTriggerInput());
      } else {
        output.connect(toNode.getInputNode());
      }
    } else if (toNode instanceof SynthCrossfaderNode) {
      // Crossfader has inputA, inputB, and cv
      if (toPort === 'inputA' || toPort === 'input') {
        output.connect(toNode.getInputA());
      } else if (toPort === 'inputB') {
        output.connect(toNode.getInputB());
      } else if (toPort === 'cv') {
        output.connect(toNode.getCVInput());
      } else {
        output.connect(toNode.getInputNode());
      }
    } else if (toNode instanceof SynthSequenceChainNode) {
      // Sequence chain has clock and reset inputs
      if (toPort === 'clock' || toPort === 'input') {
        output.connect(toNode.getClockInput());
      } else if (toPort === 'reset') {
        output.connect(toNode.getResetInput());
      } else {
        output.connect(toNode.getInputNode());
      }
    } else {
      // Check if this is a mixer channel input
      const mixerInputMatch = toPort.match(/^input([1-4])$/);
      if (mixerInputMatch && toNode instanceof SynthMixerNode) {
        const channel = parseInt(mixerInputMatch[1], 10);
        const input = toNode.getInputChannel(channel);
        if (!input) {
          console.error(`AudioGraph: Cannot connect - mixer channel ${channel} not found`);
          return false;
        }
        output.connect(input);
      } else {
        // Regular audio connection
        const input = toNode.getInputNode();
        if (!input) {
          console.error(`AudioGraph: Cannot connect - missing input for ${fromId}.${fromPort} -> ${toId}.${toPort}`);
          return false;
        }
        output.connect(input);
      }
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

    // Get the appropriate output based on port name
    let output: AudioNode | null = null;

    // Handle clock divider's multiple division outputs
    if (fromNode instanceof SynthClockDividerNode) {
      switch (fromPort) {
        case 'div1':
          output = fromNode.getDiv1Output();
          break;
        case 'div2':
          output = fromNode.getDiv2Output();
          break;
        case 'div4':
          output = fromNode.getDiv4Output();
          break;
        case 'div8':
          output = fromNode.getDiv8Output();
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else if (fromNode instanceof SynthMacroNode) {
      // Handle macro node's multiple outputs
      switch (fromPort) {
        case 'out1':
          output = fromNode.getOutput1();
          break;
        case 'out2':
          output = fromNode.getOutput2();
          break;
        case 'out3':
          output = fromNode.getOutput3();
          break;
        case 'out4':
          output = fromNode.getOutput4();
          break;
        default:
          output = fromNode.getOutputNode();
      }
    } else {
      output = fromNode.getOutputNode();
    }

    if (!output) {
      return false;
    }

    // Check if this is a modulation connection
    if (this.isModulationPort(toPort)) {
      // For oscillators, use the modulation input node
      if (toNode instanceof SynthOscillatorNode) {
        const modInputNode = toNode.getModulationInputNode(toPort);
        if (modInputNode) {
          output.disconnect(modInputNode);
        }
      } else {
        const modTarget = toNode.getModulationTarget(toPort);
        if (modTarget) {
          output.disconnect(modTarget);
        }
      }
    } else if (toPort === 'trigger' && toNode instanceof SynthKarplusStrongNode) {
      // Special handling for Karplus-Strong trigger input
      const triggerInput = toNode.getTriggerInput();
      output.disconnect(triggerInput);
    } else if (toPort === 'trigger' && toNode instanceof SynthSampleHoldNode) {
      // Special handling for Sample & Hold trigger input
      const triggerInput = toNode.getTriggerInput();
      toNode.setExternalTrigger(false);
      output.disconnect(triggerInput);
    } else if (toPort === 'trigger' && toNode instanceof SynthADSRNode) {
      // Special handling for ADSR trigger input
      const triggerInput = toNode.getTriggerInput();
      output.disconnect(triggerInput);
    } else {
      // Check if this is a mixer channel input
      const mixerInputMatch = toPort.match(/^input([1-4])$/);
      if (mixerInputMatch && toNode instanceof SynthMixerNode) {
        const channel = parseInt(mixerInputMatch[1], 10);
        const input = toNode.getInputChannel(channel);
        if (input) {
          output.disconnect(input);
        }
      } else {
        const input = toNode.getInputNode();
        if (input) {
          output.disconnect(input);
        }
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
    if (DEBUG) console.log('[AudioGraph] noteOn:', note, velocity, 'polyphony:', this.polyphonyEnabled, 'hasAllocator:', !!this.voiceAllocator);
    if (this.polyphonyEnabled && this.voiceAllocator) {
      const voice = this.voiceAllocator.noteOn(note, velocity);
      if (DEBUG) console.log('[AudioGraph] Voice allocated:', voice?.id);
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

  // Panic - stop all voices and clear effects immediately
  panic(): void {
    this.voiceAllocator?.panic();
    this.clearEffects();
  }

  // Clear all delay/reverb tails
  clearEffects(): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthDelayNode || node instanceof SynthReverbNode) {
        (node as { clear: () => void }).clear();
      }
    });
  }

  // Trigger external clock on all sequencers with extClock enabled
  triggerExternalClock(): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthSequencerNode) {
        const params = node.getParams();
        if (params.extClock) {
          node.externalTrigger();
        }
      }
    });
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
    if (DEBUG) console.log('[AudioGraph] rebuildVoices called');
    if (!this.voiceAllocator) {
      if (DEBUG) console.log('[AudioGraph] No voice allocator!');
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
    if (DEBUG) console.log('[AudioGraph] Voice allocator initialized, voice count:', this.voiceAllocator.getVoices().length);

    // Find where voices should connect to (first effect or output)
    const voiceOutput = this.voiceAllocator.getOutputNode();

    // Find the first node in the effects chain that receives from voice nodes
    // This is the first delay, reverb, or output that a VCA/filter connects to
    const effectsEntryNode = this.findEffectsEntryNode(patchNodes, patchConnections);
    if (DEBUG) console.log('[AudioGraph] Effects entry node:', effectsEntryNode);

    if (effectsEntryNode) {
      const entryNode = this.nodes.get(effectsEntryNode);
      if (DEBUG) console.log('[AudioGraph] Entry node exists:', !!entryNode);
      if (entryNode) {
        const input = entryNode.getInputNode();
        if (DEBUG) console.log('[AudioGraph] Entry node input exists:', !!input);
        if (input) {
          voiceOutput.connect(input);
          if (DEBUG) console.log('[AudioGraph] Connected voice output to', effectsEntryNode);
        }
      }
    } else if (this.outputNode) {
      // No effects, connect directly to output
      const outputInput = this.outputNode.getInputNode();
      if (outputInput) {
        voiceOutput.connect(outputInput);
        if (DEBUG) console.log('[AudioGraph] Connected voice output to output node');
      }
    }

    // Connect global modulators (LFO, S&H, Quantizer, etc.) to voice modulation targets
    this.connectGlobalModulatorsToVoices(patchConnections);
  }

  // Connect global node outputs to voice modulation targets and audio inputs
  private connectGlobalModulatorsToVoices(patchConnections: PatchConnection[]): void {
    if (!this.voiceAllocator) return;

    // Find global node -> voice node connections
    for (const conn of patchConnections) {
      const fromNode = this.nodes.get(conn.from.nodeId);
      if (!fromNode) continue;

      // Check if this is a global node type
      if (!GLOBAL_NODE_TYPES.includes(fromNode.type as NodeType)) continue;

      // Check if destination is a voice node type
      const toNodeType = this.getNodeType(conn.to.nodeId);
      if (!toNodeType || !VOICE_NODE_TYPES.includes(toNodeType)) continue;

      const globalOutput = fromNode.getOutputNode();
      if (!globalOutput) continue;

      // Handle modulation connections (_mod ports)
      if (conn.to.port.endsWith('_mod')) {
        if (DEBUG) console.log('[AudioGraph] Connecting global modulator', conn.from.nodeId, 'to voice mod target', conn.to.nodeId, conn.to.port);

        // Connect global node to each voice's corresponding node's modulation target
        const voices = this.voiceAllocator.getVoices();
        for (const voice of voices) {
          const voiceNode = voice.getNode(conn.to.nodeId);
          if (voiceNode) {
            const modTarget = voiceNode.getModulationTarget(conn.to.port);
            if (modTarget) {
              globalOutput.connect(modTarget);
              if (DEBUG) console.log('[AudioGraph] Connected mod to voice', voice.id);
            }
          }
        }
      } else {
        // Handle audio connections (regular input ports)
        if (DEBUG) console.log('[AudioGraph] Connecting global audio', conn.from.nodeId, 'to voice input', conn.to.nodeId, conn.to.port);

        // Connect global node to each voice's corresponding node's audio input
        const voices = this.voiceAllocator.getVoices();
        for (const voice of voices) {
          const voiceNode = voice.getNode(conn.to.nodeId);
          if (voiceNode) {
            const voiceInput = voiceNode.getInputNode();
            if (voiceInput) {
              globalOutput.connect(voiceInput);
              if (DEBUG) console.log('[AudioGraph] Connected audio to voice', voice.id);
            }
          }
        }
      }
    }
  }

  // Helper to get node type by ID
  private getNodeType(nodeId: string): NodeType | null {
    const node = this.nodes.get(nodeId);
    return node ? (node.type as NodeType) : null;
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
