// GranularWorkletNode - AudioWorklet-based granular processor
// Uses a separate audio thread for better performance

import type { SynthNode, AudioNodeParams } from './types';

export interface GranularWorkletParams {
  grainSize: number;   // Grain duration in ms (10-500)
  density: number;     // Grains per second (1-50)
  spray: number;       // Position randomization (0-1)
  pitch: number;       // Pitch shift factor (0.25-4.0)
  position: number;    // Playback position in buffer (0-1)
  freeze: boolean;     // Stop recording
  mix: number;         // Dry/wet mix (0-1)
  reverse: number;     // Probability of reverse grains (0-1)
}

const DEFAULT_PARAMS: GranularWorkletParams = {
  grainSize: 100,
  density: 10,
  spray: 0.1,
  pitch: 1.0,
  position: 0.5,
  freeze: false,
  mix: 1.0,
  reverse: 0,
};

// Track worklet registration status
let workletRegistered = false;
let workletRegistrationPromise: Promise<void> | null = null;

export async function registerGranularWorklet(context: AudioContext): Promise<void> {
  if (workletRegistered) return;

  if (workletRegistrationPromise) {
    return workletRegistrationPromise;
  }

  workletRegistrationPromise = context.audioWorklet.addModule('/worklets/granular-processor.js');

  try {
    await workletRegistrationPromise;
    workletRegistered = true;
  } catch (error) {
    workletRegistrationPromise = null;
    throw error;
  }
}

export class SynthGranularWorkletNode implements SynthNode {
  id: string;
  type = 'granular';

  private context: AudioContext;
  private params: GranularWorkletParams;
  private workletNode: AudioWorkletNode | null = null;
  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private initialized = false;
  private pendingInit: Promise<void> | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<GranularWorkletParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create gain nodes for routing
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.updateMix();

    // Connect dry path (always available, even before worklet loads)
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path will be connected when worklet is ready
    this.wetGain.connect(this.outputGain);

    // Start async initialization
    this.initWorklet();
  }

  private async initWorklet(): Promise<void> {
    if (this.initialized || this.pendingInit) return;

    this.pendingInit = (async () => {
      try {
        await registerGranularWorklet(this.context);

        this.workletNode = new AudioWorkletNode(this.context, 'granular-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });

        // Connect worklet to signal path
        this.inputGain.connect(this.workletNode);
        this.workletNode.connect(this.wetGain);

        // Send initial parameters to worklet
        this.syncAllParams();

        this.initialized = true;
        console.log(`[GranularWorkletNode ${this.id}] Worklet initialized`);
      } catch (error) {
        console.error(`[GranularWorkletNode ${this.id}] Failed to initialize worklet:`, error);
        // Fallback: dry signal passes through
      }
    })();

    return this.pendingInit;
  }

  private syncAllParams(): void {
    if (!this.workletNode) return;

    for (const [name, value] of Object.entries(this.params)) {
      this.workletNode.port.postMessage({
        type: 'setParam',
        data: { name, value },
      });
    }
  }

  private updateMix(): void {
    this.dryGain.gain.setValueAtTime(1 - this.params.mix, this.context.currentTime);
    this.wetGain.gain.setValueAtTime(this.params.mix, this.context.currentTime);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'mix_mod':
        return this.wetGain.gain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.outputGain.connect(input);
      }
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string | boolean): void {
    switch (name) {
      case 'grainSize':
        this.params.grainSize = Math.max(10, Math.min(500, value as number));
        break;
      case 'density':
        this.params.density = Math.max(1, Math.min(50, value as number));
        break;
      case 'spray':
        this.params.spray = Math.max(0, Math.min(1, value as number));
        break;
      case 'pitch':
        this.params.pitch = Math.max(0.25, Math.min(4, value as number));
        break;
      case 'position':
        this.params.position = Math.max(0, Math.min(1, value as number));
        break;
      case 'freeze':
        this.params.freeze = value as boolean;
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'reverse':
        this.params.reverse = Math.max(0, Math.min(1, value as number));
        break;
    }

    // Send to worklet
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'setParam',
        data: { name, value: this.params[name as keyof GranularWorkletParams] },
      });
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  // Toggle freeze
  trigger(): void {
    this.params.freeze = !this.params.freeze;
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'setParam',
        data: { name: 'freeze', value: this.params.freeze },
      });
    }
  }

  // Check if worklet is ready
  isReady(): boolean {
    return this.initialized;
  }

  // Wait for worklet to be ready
  async waitForReady(): Promise<void> {
    if (this.initialized) return;
    if (this.pendingInit) {
      await this.pendingInit;
    }
  }

  dispose(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.close();
    }
    this.inputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.outputGain.disconnect();
  }
}
