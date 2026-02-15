// VocoderNode - Classic channel vocoder
// Analyzes the spectral envelope of a modulator (voice) and imposes it
// onto a carrier (synth/noise), producing the classic robot voice effect.
//
// Two inputs: modulator (voice) and carrier (synth pad, noise, etc.)
// The carrier provides the tonal character, the modulator provides the shape.

import type { SynthNode, AudioNodeParams } from './types';

export interface VocoderParams {
  bands: number;      // Number of frequency bands (4-32)
  attack: number;     // Envelope follower attack in seconds (0.001-0.1)
  release: number;    // Envelope follower release in seconds (0.005-0.5)
  shift: number;      // Band shift — shift carrier bands up/down (-8 to +8)
  mix: number;        // Dry/wet (0 = dry modulator, 1 = full vocoder)
}

const DEFAULT_PARAMS: VocoderParams = {
  bands: 16,
  attack: 0.005,
  release: 0.02,
  shift: 0,
  mix: 1.0,
};

let workletRegistered = false;
let workletRegistrationPromise: Promise<void> | null = null;

async function registerVocoderWorklet(context: AudioContext): Promise<void> {
  if (workletRegistered) return;
  if (workletRegistrationPromise) return workletRegistrationPromise;

  workletRegistrationPromise = context.audioWorklet.addModule('/worklets/vocoder-processor.js');
  try {
    await workletRegistrationPromise;
    workletRegistered = true;
  } catch (error) {
    workletRegistrationPromise = null;
    throw error;
  }
}

export class SynthVocoderNode implements SynthNode {
  id: string;
  type = 'vocoder';

  private context: AudioContext;
  private params: VocoderParams;

  // Modulator input (voice)
  private modulatorInput: GainNode;
  // Carrier input (synth)
  private carrierInput: GainNode;
  // Internal carrier: noise generator for when no external carrier is connected
  private internalNoise: AudioBufferSourceNode | null = null;
  private internalNoiseGain: GainNode;
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  public carrierConnected: boolean = false;

  private workletNode: AudioWorkletNode | null = null;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private merger: ChannelMergerNode;

  constructor(context: AudioContext, id: string, params?: Partial<VocoderParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Modulator (voice) input
    this.modulatorInput = context.createGain();
    this.modulatorInput.gain.value = 1;

    // Carrier (synth) input
    this.carrierInput = context.createGain();
    this.carrierInput.gain.value = 1;

    // Internal noise carrier (fallback when nothing is connected to carrier input)
    this.internalNoiseGain = context.createGain();
    this.internalNoiseGain.gain.value = 0.5;
    this.createInternalNoise();

    // The worklet takes 2 inputs: [0]=modulator, [1]=carrier
    // We need a ChannelMergerNode to present them as separate inputs
    this.merger = context.createChannelMerger(2);

    // Output
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Dry path (modulator passthrough)
    this.modulatorInput.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);

    this.updateMix();
    this.initWorklet();
  }

  private createInternalNoise(): void {
    // Create a looping noise buffer as default carrier
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.internalNoise = this.context.createBufferSource();
    this.internalNoise.buffer = buffer;
    this.internalNoise.loop = true;
    this.internalNoise.connect(this.internalNoiseGain);
    this.internalNoise.start();
  }

  private async initWorklet(): Promise<void> {
    try {
      await registerVocoderWorklet(this.context);

      // AudioWorkletNode with 2 inputs
      this.workletNode = new AudioWorkletNode(this.context, 'vocoder-processor', {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

      // Connect modulator to worklet input 0
      this.modulatorInput.connect(this.workletNode, 0, 0);

      // Connect carrier to worklet input 1
      // Use merger to route carrier to the second input
      this.carrierInput.connect(this.workletNode, 0, 1);

      // Connect internal noise as default carrier
      this.internalNoiseGain.connect(this.workletNode, 0, 1);

      // Worklet output to wet path
      this.workletNode.connect(this.wetGain);

      // Send initial params
      this.sendAllParams();
    } catch (err) {
      console.error('VocoderNode: Failed to init worklet', err);
    }
  }

  private sendAllParams(): void {
    if (!this.workletNode) return;
    this.workletNode.port.postMessage({ type: 'setParam', name: 'bands', value: this.params.bands });
    this.workletNode.port.postMessage({ type: 'setParam', name: 'attack', value: this.params.attack });
    this.workletNode.port.postMessage({ type: 'setParam', name: 'release', value: this.params.release });
    this.workletNode.port.postMessage({ type: 'setParam', name: 'shift', value: this.params.shift });
    this.workletNode.port.postMessage({ type: 'setParam', name: 'mix', value: 1.0 }); // We handle mix externally
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  // Get modulator input (voice goes here)
  getModulatorInput(): AudioNode {
    return this.modulatorInput;
  }

  // Get carrier input (synth/noise goes here)
  getCarrierInput(): AudioNode {
    this.carrierConnected = true;
    // Mute internal noise when external carrier is connected
    this.internalNoiseGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    return this.carrierInput;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    // Default input is the modulator (voice)
    return this.modulatorInput;
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
      if (input) this.outputGain.connect(input);
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'bands':
        this.params.bands = Math.max(4, Math.min(32, Math.floor(value as number)));
        break;
      case 'attack':
        this.params.attack = Math.max(0.001, Math.min(0.1, value as number));
        break;
      case 'release':
        this.params.release = Math.max(0.005, Math.min(0.5, value as number));
        break;
      case 'shift':
        this.params.shift = Math.max(-8, Math.min(8, Math.round(value as number)));
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
    }

    // Forward to worklet
    if (this.workletNode && name !== 'mix') {
      this.workletNode.port.postMessage({ type: 'setParam', name, value: (this.params as unknown as Record<string, unknown>)[name] });
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.internalNoise) {
      this.internalNoise.stop();
      this.internalNoise.disconnect();
    }
    if (this.workletNode) this.workletNode.disconnect();
    this.modulatorInput.disconnect();
    this.carrierInput.disconnect();
    this.internalNoiseGain.disconnect();
    this.merger.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }
}
