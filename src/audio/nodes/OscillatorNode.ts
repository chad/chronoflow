import type { SynthNode, WaveformType, AudioNodeParams } from './types';

export interface OscillatorParams {
  frequency: number;
  detune: number;
  waveform: WaveformType;
}

const DEFAULT_PARAMS: OscillatorParams = {
  frequency: 440,
  detune: 0,
  waveform: 'sawtooth',
};

export class SynthOscillatorNode implements SynthNode {
  id: string;
  type = 'oscillator';

  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode;
  private context: AudioContext;
  private params: OscillatorParams;
  private isPlaying = false;

  // Persistent modulation inputs (always available for connections)
  private freqModGain: GainNode;
  private detuneModGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<OscillatorParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Output gain node (always exists for connections)
    this.gainNode = context.createGain();
    this.gainNode.gain.value = 1;

    // Create persistent modulation input nodes
    // These collect modulation signals and forward to oscillator when it exists
    this.freqModGain = context.createGain();
    this.freqModGain.gain.value = 1;
    this.detuneModGain = context.createGain();
    this.detuneModGain.gain.value = 1;
  }

  private createOscillator(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }

    this.oscillator = this.context.createOscillator();
    this.oscillator.type = this.params.waveform;
    this.oscillator.frequency.value = this.params.frequency;
    this.oscillator.detune.value = this.params.detune;
    this.oscillator.connect(this.gainNode);

    // Connect persistent modulation inputs to the oscillator
    this.freqModGain.connect(this.oscillator.frequency);
    this.detuneModGain.connect(this.oscillator.detune);
  }

  start(): void {
    if (this.isPlaying) return;

    this.createOscillator();
    this.oscillator!.start();
    this.isPlaying = true;
  }

  stop(): void {
    if (!this.isPlaying || !this.oscillator) return;

    this.oscillator.stop();
    this.oscillator.disconnect();
    this.oscillator = null;
    this.isPlaying = false;
  }

  getOutputNode(): AudioNode {
    return this.gainNode;
  }

  getInputNode(): AudioNode | null {
    return null; // Oscillator has no audio input
  }

  getFrequencyParam(): AudioParam | null {
    return this.oscillator?.frequency ?? null;
  }

  getDetuneParam(): AudioParam | null {
    return this.oscillator?.detune ?? null;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    // For oscillator, modulation goes through intermediate nodes
    // Use getModulationInputNode instead for audio-rate modulation
    switch (paramName) {
      case 'freq_mod':
        return this.oscillator?.frequency ?? null;
      case 'detune_mod':
        return this.oscillator?.detune ?? null;
      default:
        return null;
    }
  }

  // Get the modulation input node for audio-rate modulation
  // This allows connections even before the oscillator starts
  getModulationInputNode(paramName: string): AudioNode | null {
    switch (paramName) {
      case 'freq_mod':
        return this.freqModGain;
      case 'detune_mod':
        return this.detuneModGain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.gainNode.connect(input);
      }
    } else {
      this.gainNode.connect(destination);
    }
  }

  disconnect(): void {
    this.gainNode.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'frequency':
        this.params.frequency = value as number;
        if (this.oscillator) {
          this.oscillator.frequency.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        }
        break;
      case 'detune':
        this.params.detune = value as number;
        if (this.oscillator) {
          this.oscillator.detune.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        }
        break;
      case 'waveform':
        this.params.waveform = value as WaveformType;
        if (this.oscillator) {
          this.oscillator.type = value as WaveformType;
        }
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
    this.freqModGain.disconnect();
    this.detuneModGain.disconnect();
  }
}
