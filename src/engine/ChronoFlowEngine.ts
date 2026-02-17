// ChronoFlowEngine - Standalone headless engine for running ChronoFlow patches
//
// Usage:
//   import { ChronoFlowEngine } from '@chronoflow/engine';
//
//   const engine = new ChronoFlowEngine();
//   await engine.init();
//   engine.loadPatch(patchJSON);
//
//   // Pipe external audio in
//   const input = engine.getNode('audio-input-1');
//   input.connectStream(mediaStream);
//
//   // Tweak params at runtime
//   engine.setParam('shimmer-reverb-1', 'shimmer', 0.8);
//
//   // Connect to your own AudioContext destination
//   engine.getOutputNode().connect(yourGainNode);

import type { Patch, PatchConnection, PatchNodeType } from '../patch/types';
import type { SynthNode } from '../audio/nodes/types';
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
  SynthAudioInputNode,
  SynthPitchShifterNode,
  SynthFormantShifterNode,
  SynthShimmerReverbNode,
  SynthChorusNode,
  SynthCompressorNode,
  SynthEQNode,
  SynthBitcrusherNode,
  SynthVocoderNode,
  SynthGlitchNode,
  SynthFreqShifterNode,
  SynthCombFilterNode,
  SynthSendNode,
  SynthReturnNode,
  SynthStereoFieldNode,
  SynthTapeDelayNode,
  SynthDroneOscNode,
  SynthSpectralFreezeNode,
  SynthWavetableOscNode,
  SynthResonatorNode,
} from '../audio/nodes';

export interface ChronoFlowEngineOptions {
  // Provide an existing AudioContext (e.g., shared with ElevenLabs, Tone.js, etc.)
  // If omitted, the engine creates its own.
  context?: AudioContext;

  // Master output volume (0-1). Default: 0.7
  masterVolume?: number;

  // If true, the engine connects its output to context.destination automatically.
  // Set to false if you want to route the output yourself. Default: true
  autoConnect?: boolean;
}

export interface EngineEvents {
  onPatchLoaded?: (patch: Patch) => void;
  onNodeCreated?: (nodeId: string, type: PatchNodeType) => void;
  onNodeRemoved?: (nodeId: string) => void;
  onParamChanged?: (nodeId: string, param: string, value: number | string | boolean) => void;
  onConnectionAdded?: (connection: PatchConnection) => void;
  onConnectionRemoved?: (connection: PatchConnection) => void;
}

export class ChronoFlowEngine {
  private context: AudioContext | null = null;
  private ownsContext: boolean = false;
  private masterGain: GainNode | null = null;
  private outputNode: SynthOutputNode | null = null;
  private nodes: Map<string, SynthNode> = new Map();
  private connections: PatchConnection[] = [];
  private currentPatch: Patch | null = null;
  private options: Required<ChronoFlowEngineOptions>;
  private events: EngineEvents = {};
  private initialized = false;

  constructor(options?: ChronoFlowEngineOptions) {
    this.options = {
      context: options?.context ?? undefined as unknown as AudioContext,
      masterVolume: options?.masterVolume ?? 0.7,
      autoConnect: options?.autoConnect ?? true,
    };
  }

  // --- Lifecycle ---

  async init(): Promise<AudioContext> {
    if (this.initialized && this.context) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return this.context;
    }

    if (this.options.context) {
      this.context = this.options.context;
      this.ownsContext = false;
    } else {
      this.context = new AudioContext();
      this.ownsContext = true;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    // Master gain
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.options.masterVolume;

    if (this.options.autoConnect) {
      this.masterGain.connect(this.context.destination);
    }

    // Create the output node
    this.outputNode = new SynthOutputNode(this.context, 'output', this.masterGain);
    this.nodes.set('output', this.outputNode);

    this.initialized = true;
    return this.context;
  }

  dispose(): void {
    this.clear();

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    if (this.ownsContext && this.context) {
      this.context.close();
    }

    this.context = null;
    this.outputNode = null;
    this.initialized = false;
  }

  // --- Event Handlers ---

  on(events: Partial<EngineEvents>): void {
    Object.assign(this.events, events);
  }

  // --- Patch Loading ---

  loadPatch(patch: Patch): void {
    this.ensureInitialized();

    // Clear existing graph
    this.clear();

    this.currentPatch = JSON.parse(JSON.stringify(patch));

    // Create all nodes
    for (const node of patch.nodes) {
      if (node.id === 'output') continue; // Output already exists
      this.createNode(node.type, node.id, node.params);
    }

    // Create all connections
    for (const conn of patch.connections) {
      this.connectInternal(conn);
    }

    // Start oscillators and LFOs
    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        (node as SynthOscillatorNode).start();
      } else if (node instanceof SynthLFONode) {
        (node as SynthLFONode).start();
      } else if (node instanceof SynthDroneOscNode) {
        (node as SynthDroneOscNode).start();
      } else if (node instanceof SynthWavetableOscNode) {
        (node as SynthWavetableOscNode).start();
      }
    });

    this.events.onPatchLoaded?.(patch);
  }

  // Load patch from JSON string
  loadPatchJSON(json: string): void {
    const patch = JSON.parse(json) as Patch;
    if (!patch.version || !patch.nodes) {
      throw new Error('Invalid patch format');
    }
    this.loadPatch(patch);
  }

  // Export current state as Patch JSON
  toJSON(): Patch {
    if (!this.currentPatch) {
      throw new Error('No patch loaded');
    }

    // Update params from live audio nodes into the patch
    const updatedNodes = this.currentPatch.nodes.map((node) => {
      const audioNode = this.nodes.get(node.id);
      if (audioNode) {
        return { ...node, params: { ...audioNode.getParams() } };
      }
      return node;
    });

    return {
      ...this.currentPatch,
      nodes: updatedNodes,
      connections: [...this.connections],
      meta: {
        ...this.currentPatch.meta,
        modified: new Date().toISOString(),
      },
    };
  }

  toJSONString(pretty = true): string {
    return JSON.stringify(this.toJSON(), null, pretty ? 2 : undefined);
  }

  // --- Node Operations ---

  getNode(id: string): SynthNode | undefined {
    return this.nodes.get(id);
  }

  getNodeTyped<T extends SynthNode>(id: string): T | undefined {
    return this.nodes.get(id) as T | undefined;
  }

  getAllNodes(): Map<string, SynthNode> {
    return new Map(this.nodes);
  }

  createNode(type: PatchNodeType, id: string, params?: Record<string, unknown>): SynthNode | null {
    this.ensureInitialized();
    const ctx = this.context!;

    let node: SynthNode;

    switch (type) {
      case 'oscillator': node = new SynthOscillatorNode(ctx, id, params); break;
      case 'filter': node = new SynthFilterNode(ctx, id, params); break;
      case 'vca': node = new SynthVCANode(ctx, id, params); break;
      case 'lfo': node = new SynthLFONode(ctx, id, params); break;
      case 'adsr': node = new SynthADSRNode(ctx, id, params); break;
      case 'delay': node = new SynthDelayNode(ctx, id, params); break;
      case 'reverb': node = new SynthReverbNode(ctx, id, params); break;
      case 'mixer': node = new SynthMixerNode(ctx, id, params); break;
      case 'sequencer': node = new SynthSequencerNode(ctx, id, params); break;
      case 'attenuverter': node = new SynthAttenuverterNode(ctx, id, params); break;
      case 'noise': node = new SynthNoiseNode(ctx, id, params); break;
      case 'samplehold': node = new SynthSampleHoldNode(ctx, id, params); break;
      case 'wavefolder': node = new SynthWavefolderNode(ctx, id, params); break;
      case 'ringmod': node = new SynthRingModNode(ctx, id, params); break;
      case 'quantizer': node = new SynthQuantizerNode(ctx, id, params); break;
      case 'clock': node = new SynthClockNode(ctx, id, params); break;
      case 'clockdiv': node = new SynthClockDividerNode(ctx, id, params); break;
      case 'smoothrandom': node = new SynthSmoothRandomNode(ctx, id, params); break;
      case 'karplusstrong': node = new SynthKarplusStrongNode(ctx, id, params); break;
      case 'granular': node = new SynthGranularNode(ctx, id, params); break;
      case 'euclidean': node = new SynthEuclideanNode(ctx, id, params); break;
      case 'slewlimiter': node = new SynthSlewLimiterNode(ctx, id, params); break;
      case 'turing': node = new SynthTuringMachineNode(ctx, id, params); break;
      case 'envfollower': node = new SynthEnvelopeFollowerNode(ctx, id, params); break;
      case 'probgate': node = new SynthProbabilityGateNode(ctx, id, params); break;
      case 'logic': node = new SynthLogicNode(ctx, id, params); break;
      case 'macro': node = new SynthMacroNode(ctx, id, params); break;
      case 'counter': node = new SynthCounterNode(ctx, id, params); break;
      case 'comparator': node = new SynthComparatorNode(ctx, id, params); break;
      case 'switch': node = new SynthSwitchNode(ctx, id, params); break;
      case 'crossfader': node = new SynthCrossfaderNode(ctx, id, params); break;
      case 'sequencechain': node = new SynthSequenceChainNode(ctx, id, params); break;
      case 'audioinput': node = new SynthAudioInputNode(ctx, id, params); break;
      case 'pitchshifter': node = new SynthPitchShifterNode(ctx, id, params); break;
      case 'formantshifter': node = new SynthFormantShifterNode(ctx, id, params); break;
      case 'shimmerreverb': node = new SynthShimmerReverbNode(ctx, id, params); break;
      case 'chorus': node = new SynthChorusNode(ctx, id, params); break;
      case 'compressor': node = new SynthCompressorNode(ctx, id, params); break;
      case 'eq': node = new SynthEQNode(ctx, id, params); break;
      case 'bitcrusher': node = new SynthBitcrusherNode(ctx, id, params); break;
      case 'vocoder': node = new SynthVocoderNode(ctx, id, params); break;
      case 'glitch': node = new SynthGlitchNode(ctx, id, params); break;
      case 'freqshifter': node = new SynthFreqShifterNode(ctx, id, params); break;
      case 'combfilter': node = new SynthCombFilterNode(ctx, id, params); break;
      case 'send': node = new SynthSendNode(ctx, id, params); break;
      case 'return': node = new SynthReturnNode(ctx, id, params); break;
      case 'stereofield': node = new SynthStereoFieldNode(ctx, id, params); break;
      case 'tapedelay': node = new SynthTapeDelayNode(ctx, id, params); break;
      case 'droneosc': node = new SynthDroneOscNode(ctx, id, params); break;
      case 'spectralfreeze': node = new SynthSpectralFreezeNode(ctx, id, params); break;
      case 'wavetableosc': node = new SynthWavetableOscNode(ctx, id, params); break;
      case 'resonator': node = new SynthResonatorNode(ctx, id, params); break;
      case 'output': return this.outputNode;
      default:
        console.error(`ChronoFlowEngine: Unknown node type: ${type}`);
        return null;
    }

    this.nodes.set(id, node);
    this.events.onNodeCreated?.(id, type);
    return node;
  }

  removeNode(id: string): void {
    if (id === 'output') return;

    const node = this.nodes.get(id);
    if (!node) return;

    // Remove related connections
    this.connections = this.connections.filter((c) => {
      if (c.from.nodeId === id || c.to.nodeId === id) {
        this.events.onConnectionRemoved?.(c);
        return false;
      }
      return true;
    });

    node.dispose();
    this.nodes.delete(id);
    this.events.onNodeRemoved?.(id);
  }

  // --- Params ---

  setParam(nodeId: string, param: string, value: number | string | boolean): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`ChronoFlowEngine: Node not found: ${nodeId}`);
      return;
    }
    node.setParam(param, value as number | string);

    // Keep patch in sync
    if (this.currentPatch) {
      const patchNode = this.currentPatch.nodes.find((n) => n.id === nodeId);
      if (patchNode) {
        patchNode.params[param] = value;
      }
    }

    this.events.onParamChanged?.(nodeId, param, value);
  }

  getParam(nodeId: string, param: string): number | string | boolean | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;
    const params = node.getParams();
    return params[param];
  }

  getParams(nodeId: string): Record<string, number | string | boolean> | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;
    return node.getParams() as Record<string, number | string | boolean>;
  }

  // Batch set multiple params at once
  setParams(updates: Array<{ nodeId: string; param: string; value: number | string | boolean }>): void {
    for (const { nodeId, param, value } of updates) {
      this.setParam(nodeId, param, value);
    }
  }

  // --- Connections ---

  connect(fromId: string, fromPort: string, toId: string, toPort: string): boolean {
    const conn: PatchConnection = {
      id: `${fromId}.${fromPort}-${toId}.${toPort}`,
      from: { nodeId: fromId, port: fromPort },
      to: { nodeId: toId, port: toPort },
    };
    return this.connectInternal(conn);
  }

  disconnect(fromId: string, fromPort: string, toId: string, toPort: string): boolean {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return false;

    const output = this.getOutputForPort(fromNode, fromPort);
    if (!output) return false;

    try {
      if (toPort.endsWith('_mod')) {
        const modTarget = this.getModulationTarget(toNode, toPort);
        if (modTarget) {
          if (modTarget instanceof AudioParam) {
            output.disconnect(modTarget);
          } else {
            output.disconnect(modTarget);
          }
        }
      } else {
        const input = this.getInputForPort(toNode, toPort);
        if (input) {
          output.disconnect(input);
        }
      }
    } catch {
      // Already disconnected
    }

    const connId = `${fromId}.${fromPort}-${toId}.${toPort}`;
    const removed = this.connections.find((c) => c.id === connId);
    this.connections = this.connections.filter((c) => c.id !== connId);

    if (removed) {
      this.events.onConnectionRemoved?.(removed);
    }

    return true;
  }

  getConnections(): PatchConnection[] {
    return [...this.connections];
  }

  // --- Audio Routing Helpers ---

  getAudioContext(): AudioContext {
    this.ensureInitialized();
    return this.context!;
  }

  // Get the master output GainNode — connect this to your own destination
  getMasterOutput(): GainNode {
    this.ensureInitialized();
    return this.masterGain!;
  }

  // Get the SynthOutputNode (the last node in the patch graph)
  getOutputNode(): SynthOutputNode | null {
    return this.outputNode;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.context!.currentTime,
        0.01
      );
    }
  }

  // Connect master output to an arbitrary AudioNode (e.g., another app's gain node)
  routeTo(destination: AudioNode): void {
    if (this.masterGain) {
      this.masterGain.connect(destination);
    }
  }

  // Disconnect master output from context.destination (if you want to route elsewhere)
  disconnectFromDestination(): void {
    if (this.masterGain && this.context) {
      try {
        this.masterGain.disconnect(this.context.destination);
      } catch {
        // Not connected
      }
    }
  }

  // --- MIDI / Note Control ---

  noteOn(note: number, velocity: number = 100): void {
    const frequency = 440 * Math.pow(2, (note - 69) / 12);
    const normalizedVelocity = velocity / 127;

    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        node.setParam('frequency', frequency);
      }
    });

    // Trigger ADSRs
    this.nodes.forEach((node) => {
      if (node instanceof SynthADSRNode) {
        node.trigger(normalizedVelocity);
      }
    });
  }

  noteOff(_note?: number): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthADSRNode) {
        node.release();
      }
    });
  }

  // --- Utility ---

  // Stop all sound immediately
  panic(): void {
    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        node.stop();
      } else if (node instanceof SynthADSRNode) {
        node.release();
      } else if (node instanceof SynthDelayNode || node instanceof SynthReverbNode || node instanceof SynthShimmerReverbNode) {
        (node as { clear: () => void }).clear();
      }
    });
  }

  // Clear everything except the output node
  clear(): void {
    // Stop all oscillators/LFOs first
    this.nodes.forEach((node) => {
      if (node instanceof SynthOscillatorNode) {
        node.stop();
      } else if (node instanceof SynthLFONode) {
        node.stop();
      }
    });

    // Dispose all nodes except output
    this.nodes.forEach((node, id) => {
      if (id !== 'output') {
        node.dispose();
      }
    });

    this.nodes.clear();
    this.connections = [];

    // Re-add output
    if (this.outputNode) {
      this.nodes.set('output', this.outputNode);
    }

    this.currentPatch = null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getCurrentPatch(): Patch | null {
    return this.currentPatch ? JSON.parse(JSON.stringify(this.currentPatch)) : null;
  }

  // --- Internal ---

  private ensureInitialized(): void {
    if (!this.initialized || !this.context) {
      throw new Error('ChronoFlowEngine not initialized. Call init() first.');
    }
  }

  private connectInternal(conn: PatchConnection): boolean {
    const fromNode = this.nodes.get(conn.from.nodeId);
    const toNode = this.nodes.get(conn.to.nodeId);

    if (!fromNode || !toNode) {
      console.warn(`ChronoFlowEngine: Cannot connect - node not found: ${conn.from.nodeId} -> ${conn.to.nodeId}`);
      return false;
    }

    const output = this.getOutputForPort(fromNode, conn.from.port);
    if (!output) {
      console.warn(`ChronoFlowEngine: Cannot connect - output port not found: ${conn.from.port}`);
      return false;
    }

    // Modulation targets return AudioParam, everything else returns AudioNode
    if (conn.to.port.endsWith('_mod')) {
      const modTarget = this.getModulationTarget(toNode, conn.to.port);
      if (!modTarget) {
        console.warn(`ChronoFlowEngine: Cannot connect - mod target not found: ${conn.to.port}`);
        return false;
      }
      try {
        if (modTarget instanceof AudioParam) {
          output.connect(modTarget);
        } else {
          output.connect(modTarget);
        }
      } catch (err) {
        console.error('ChronoFlowEngine: Modulation connection failed', err);
        return false;
      }
    } else {
      const input = this.getInputForPort(toNode, conn.to.port);
      if (!input) {
        console.warn(`ChronoFlowEngine: Cannot connect - input port not found: ${conn.to.port}`);
        return false;
      }
      try {
        output.connect(input);
      } catch (err) {
        console.error('ChronoFlowEngine: Connection failed', err);
        return false;
      }
    }

    this.connections.push(conn);
    this.events.onConnectionAdded?.(conn);
    return true;
  }

  private getOutputForPort(node: SynthNode, port: string): AudioNode | null {
    // Handle multi-output nodes
    if (node instanceof SynthClockDividerNode) {
      switch (port) {
        case 'div1': return node.getDiv1Output();
        case 'div2': return node.getDiv2Output();
        case 'div4': return node.getDiv4Output();
        case 'div8': return node.getDiv8Output();
      }
    }

    if (node instanceof SynthMacroNode) {
      switch (port) {
        case 'out1': return node.getOutput1();
        case 'out2': return node.getOutput2();
        case 'out3': return node.getOutput3();
        case 'out4': return node.getOutput4();
      }
    }

    if (node instanceof SynthComparatorNode) {
      switch (port) {
        case 'inverted': return node.getInvertedOutput();
        case 'trigger': return node.getTriggerOutput();
      }
    }

    if (node instanceof SynthSequenceChainNode) {
      switch (port) {
        case 'trigger': return node.getTriggerOutput();
        default: {
          const m = port.match(/^scene(\d+)$/);
          if (m) return node.getSceneGate(parseInt(m[1], 10));
        }
      }
    }

    return node.getOutputNode();
  }

  private getModulationTarget(node: SynthNode, port: string): AudioNode | AudioParam | null {
    if (node instanceof SynthOscillatorNode) {
      return node.getModulationInputNode(port);
    }
    return node.getModulationTarget(port);
  }

  private getInputForPort(node: SynthNode, port: string): AudioNode | null {
    // Trigger ports
    if (port === 'trigger') {
      if (node instanceof SynthKarplusStrongNode) return node.getTriggerInput();
      if (node instanceof SynthSampleHoldNode) {
        node.setExternalTrigger(true);
        return node.getTriggerInput();
      }
      if (node instanceof SynthADSRNode) return node.getTriggerInput();
      if (node instanceof SynthCounterNode) return node.getTriggerInput();
      if (node instanceof SynthSwitchNode) return node.getTriggerInput();
    }

    // Special multi-input nodes
    if (node instanceof SynthCounterNode) {
      if (port === 'reset') return node.getResetInput();
    }

    if (node instanceof SynthComparatorNode) {
      if (port === 'threshold') return node.getThresholdInput();
    }

    if (node instanceof SynthSwitchNode) {
      const inputMatch = port.match(/^input([1-4])$/);
      if (inputMatch) return node.getInput(parseInt(inputMatch[1], 10));
      if (port === 'cv') return node.getCVInput();
    }

    if (node instanceof SynthCrossfaderNode) {
      if (port === 'inputA' || port === 'input') return node.getInputA();
      if (port === 'inputB') return node.getInputB();
      if (port === 'cv') return node.getCVInput();
    }

    if (node instanceof SynthSequenceChainNode) {
      if (port === 'clock' || port === 'input') return node.getClockInput();
      if (port === 'reset') return node.getResetInput();
    }

    if (node instanceof SynthMixerNode) {
      const mixerMatch = port.match(/^input([1-4])$/);
      if (mixerMatch) return node.getInputChannel(parseInt(mixerMatch[1], 10));
    }

    if (node instanceof SynthCompressorNode) {
      if (port === 'sidechain') return node.getSidechainInput();
    }

    if (node instanceof SynthVocoderNode) {
      if (port === 'carrier') return node.getCarrierInput();
    }

    if (node instanceof SynthGlitchNode) {
      if (port === 'trigger') return node.getTriggerInput();
    }

    return node.getInputNode();
  }
}
