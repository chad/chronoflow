import type { SynthNode, AudioNodeParams } from './types';

export interface ReverbParams {
  decay: number; // reverb time in seconds
  mix: number;   // 0-1 (dry/wet)
}

const DEFAULT_PARAMS: ReverbParams = {
  decay: 2,
  mix: 0.3,
};

export class SynthReverbNode implements SynthNode {
  id: string;
  type = 'reverb';

  private inputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private convolver: ConvolverNode;
  private outputGain: GainNode;
  private context: AudioContext;
  private params: ReverbParams;

  constructor(context: AudioContext, id: string, params?: Partial<ReverbParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create nodes
    this.inputGain = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.convolver = context.createConvolver();
    this.outputGain = context.createGain();

    // Generate impulse response
    this.generateImpulseResponse();
    this.updateMix();

    // Connect: input -> dry -> output
    //          input -> convolver -> wet -> output
    this.inputGain.connect(this.dryGain);
    this.inputGain.connect(this.convolver);
    this.dryGain.connect(this.outputGain);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
  }

  private generateImpulseResponse(): void {
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * this.params.decay;
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with noise
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }

    this.convolver.buffer = impulse;
  }

  private updateMix(): void {
    this.dryGain.gain.value = 1 - this.params.mix;
    this.wetGain.gain.value = this.params.mix;
  }

  // Clear the reverb tail by fading out the wet signal quickly
  clear(): void {
    this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    // Restore after a short time if mix is still > 0
    setTimeout(() => {
      if (this.params.mix > 0) {
        this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01);
      }
    }, 200);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    return null; // Reverb params aren't easily modulatable
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

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'decay':
        this.params.decay = value as number;
        this.generateImpulseResponse(); // Regenerate IR
        break;
      case 'mix':
        this.params.mix = value as number;
        this.updateMix();
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.inputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.convolver.disconnect();
    this.outputGain.disconnect();
  }
}
