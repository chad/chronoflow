import type { SynthNode, AudioNodeParams } from './types';

export interface RingModParams {
  carrierFreq: number;  // Internal carrier frequency
  carrierType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  mix: number;          // Dry/wet mix
  useExternal: boolean; // Use external carrier instead of internal
}

const DEFAULT_PARAMS: RingModParams = {
  carrierFreq: 440,
  carrierType: 'sine',
  mix: 1,
  useExternal: false,
};

export class SynthRingModNode implements SynthNode {
  id: string;
  type = 'ringmod';

  private context: AudioContext;
  private params: RingModParams;

  // Signal path
  private inputGain: GainNode;          // Main signal input
  private carrierInput: GainNode;        // External carrier input
  private internalCarrier: OscillatorNode;
  private carrierGain: GainNode;         // Routes either internal or external carrier
  private ringModGain: GainNode;         // The actual ring mod (signal * carrier)
  private dryGain: GainNode;
  private wetGain: GainNode;
  private outputGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<RingModParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create nodes
    this.inputGain = context.createGain();
    this.carrierInput = context.createGain();
    this.carrierGain = context.createGain();
    this.ringModGain = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.outputGain = context.createGain();

    // Internal carrier oscillator
    this.internalCarrier = context.createOscillator();
    this.internalCarrier.frequency.value = this.params.carrierFreq;
    this.internalCarrier.type = this.params.carrierType;
    this.internalCarrier.start();

    // Set initial values
    this.ringModGain.gain.value = 0; // Will be modulated by carrier
    this.updateMix();
    this.updateCarrierRouting();

    // Connect ring mod: input signal modulates the gain of the carrier
    // This creates the multiplication effect
    this.inputGain.connect(this.ringModGain.gain);
    this.carrierGain.connect(this.ringModGain);
    this.ringModGain.connect(this.wetGain);

    // Dry path
    this.inputGain.connect(this.dryGain);

    // Mix to output
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);
  }

  private updateCarrierRouting(): void {
    // Disconnect previous routing
    try {
      this.internalCarrier.disconnect();
      this.carrierInput.disconnect();
    } catch {
      // Ignore if not connected
    }

    if (this.params.useExternal) {
      this.carrierInput.connect(this.carrierGain);
    } else {
      this.internalCarrier.connect(this.carrierGain);
    }
  }

  private updateMix(): void {
    this.dryGain.gain.value = 1 - this.params.mix;
    this.wetGain.gain.value = this.params.mix;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  // Secondary input for external carrier
  getCarrierInputNode(): AudioNode {
    return this.carrierInput;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'freq_mod':
        return this.internalCarrier.frequency;
      case 'carrier':
        // Allow connecting external signal as carrier
        this.params.useExternal = true;
        this.updateCarrierRouting();
        return this.carrierInput.gain;
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
      case 'carrierFreq':
        this.params.carrierFreq = value as number;
        this.internalCarrier.frequency.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
      case 'carrierType':
        this.params.carrierType = value as 'sine' | 'square' | 'sawtooth' | 'triangle';
        this.internalCarrier.type = this.params.carrierType;
        break;
      case 'mix':
        this.params.mix = value as number;
        this.updateMix();
        break;
      case 'useExternal':
        this.params.useExternal = value as boolean;
        this.updateCarrierRouting();
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.internalCarrier.stop();
    this.internalCarrier.disconnect();
    this.inputGain.disconnect();
    this.carrierInput.disconnect();
    this.carrierGain.disconnect();
    this.ringModGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.outputGain.disconnect();
  }
}
