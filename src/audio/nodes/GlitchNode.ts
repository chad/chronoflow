// GlitchNode - Buffer stutter, reverse, and pitch-ramp glitch effect
// Captures audio and retriggers/mangles fragments for glitch textures
//
// Can be triggered manually (for specific moments) or run continuously
// with a probability parameter for random glitching.

import type { SynthNode, AudioNodeParams } from './types';

export interface GlitchParams {
  rate: number;         // Retrigger rate in Hz (0.5-50)
  size: number;         // Buffer capture size in seconds (0.005-1.0)
  pitch: number;        // Playback pitch (0.25-4.0, 1.0 = normal)
  pitchRamp: number;    // Pitch change per retrigger (-1 to 1, 0 = none)
  reverse: boolean;     // Play buffer backwards
  probability: number;  // Probability of stutter per retrigger (0-1)
  mix: number;          // Dry/wet (0-1)
  active: boolean;      // Whether glitch is currently running
}

const DEFAULT_PARAMS: GlitchParams = {
  rate: 8,
  size: 0.05,
  pitch: 1.0,
  pitchRamp: 0,
  reverse: false,
  probability: 1.0,
  mix: 1.0,
  active: false,
};

let workletRegistered = false;
let workletRegistrationPromise: Promise<void> | null = null;

async function registerGlitchWorklet(context: AudioContext): Promise<void> {
  if (workletRegistered) return;
  if (workletRegistrationPromise) return workletRegistrationPromise;

  workletRegistrationPromise = context.audioWorklet.addModule('/worklets/glitch-processor.js');
  try {
    await workletRegistrationPromise;
    workletRegistered = true;
  } catch (error) {
    workletRegistrationPromise = null;
    throw error;
  }
}

export class SynthGlitchNode implements SynthNode {
  id: string;
  type = 'glitch';

  private context: AudioContext;
  private params: GlitchParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private workletNode: AudioWorkletNode | null = null;

  // Trigger input for external triggering (from clock, euclidean, etc.)
  private triggerInput: GainNode;
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array;
  private lastTriggerValue: number = 0;
  private triggerCheckInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<GlitchParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Trigger input for external clock/gate
    this.triggerInput = context.createGain();
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(256);
    this.triggerInput.connect(this.triggerAnalyser);

    this.initWorklet();
  }

  private async initWorklet(): Promise<void> {
    try {
      await registerGlitchWorklet(this.context);

      this.workletNode = new AudioWorkletNode(this.context, 'glitch-processor');

      this.inputGain.connect(this.workletNode);
      this.workletNode.connect(this.outputGain);

      // Send initial params
      this.sendAllParams();

      // If active on creation, trigger
      if (this.params.active) {
        this.workletNode.port.postMessage({ type: 'trigger' });
      }

      // Start trigger monitoring
      this.startTriggerMonitoring();
    } catch (err) {
      console.error('GlitchNode: Failed to init worklet', err);
      // Fallback: pass-through
      this.inputGain.connect(this.outputGain);
    }
  }

  private sendAllParams(): void {
    if (!this.workletNode) return;
    const port = this.workletNode.port;
    port.postMessage({ type: 'setParam', name: 'rate', value: this.params.rate });
    port.postMessage({ type: 'setParam', name: 'size', value: this.params.size });
    port.postMessage({ type: 'setParam', name: 'pitch', value: this.params.pitch });
    port.postMessage({ type: 'setParam', name: 'pitchRamp', value: this.params.pitchRamp });
    port.postMessage({ type: 'setParam', name: 'reverse', value: this.params.reverse });
    port.postMessage({ type: 'setParam', name: 'probability', value: this.params.probability });
    port.postMessage({ type: 'setParam', name: 'mix', value: this.params.mix });
  }

  private startTriggerMonitoring(): void {
    this.triggerCheckInterval = window.setInterval(() => {
      this.triggerAnalyser.getFloatTimeDomainData(this.triggerData as Float32Array<ArrayBuffer>);
      let maxVal = 0;
      for (let i = 0; i < this.triggerData.length; i++) {
        if (this.triggerData[i] > maxVal) maxVal = this.triggerData[i];
      }

      // Rising edge detection
      if (maxVal > 0.5 && this.lastTriggerValue <= 0.5) {
        this.trigger();
      }
      this.lastTriggerValue = maxVal;
    }, 5);
  }

  // Manual trigger — capture buffer and start stuttering
  trigger(): void {
    this.params.active = true;
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'trigger' });
    }
  }

  // Stop stuttering, return to pass-through
  release(): void {
    this.params.active = false;
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'release' });
    }
  }

  // Toggle active state
  toggle(): void {
    if (this.params.active) {
      this.release();
    } else {
      this.trigger();
    }
  }

  getTriggerInput(): AudioNode {
    return this.triggerInput;
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
        return this.outputGain.gain; // Approximate
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) this.outputGain.connect(input);
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string | boolean): void {
    switch (name) {
      case 'rate':
        this.params.rate = Math.max(0.5, Math.min(50, value as number));
        break;
      case 'size':
        this.params.size = Math.max(0.005, Math.min(1.0, value as number));
        break;
      case 'pitch':
        this.params.pitch = Math.max(0.25, Math.min(4.0, value as number));
        break;
      case 'pitchRamp':
        this.params.pitchRamp = Math.max(-1, Math.min(1, value as number));
        break;
      case 'reverse':
        this.params.reverse = value as boolean;
        break;
      case 'probability':
        this.params.probability = Math.max(0, Math.min(1, value as number));
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        break;
      case 'active':
        if (value as boolean) {
          this.trigger();
        } else {
          this.release();
        }
        return; // Don't send to worklet as param
    }

    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'setParam',
        name,
        value: (this.params as unknown as Record<string, unknown>)[name],
      });
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.triggerCheckInterval !== null) {
      window.clearInterval(this.triggerCheckInterval);
    }
    if (this.workletNode) this.workletNode.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.triggerInput.disconnect();
    this.triggerAnalyser.disconnect();
  }
}
