import type { SynthNode, AudioNodeParams } from './types';

export interface ADSRParams {
  attack: number;  // seconds
  decay: number;   // seconds
  sustain: number; // 0-1 level
  release: number; // seconds
}

const DEFAULT_PARAMS: ADSRParams = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

export class SynthADSRNode implements SynthNode {
  id: string;
  type = 'adsr';

  private constantSource: ConstantSourceNode;
  private gainNode: GainNode;
  private context: AudioContext;
  private params: ADSRParams;
  private isActive = false;
  private releaseStartValue = 0;

  constructor(context: AudioContext, id: string, params?: Partial<ADSRParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // ConstantSourceNode outputs a constant value of 1.0
    // This feeds into the gain node which shapes it with the envelope
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 1;

    // The gain node shapes the constant signal into the envelope
    this.gainNode = context.createGain();
    this.gainNode.gain.value = 0;

    // Connect: constant 1.0 -> gain (envelope shape) -> output
    this.constantSource.connect(this.gainNode);
    this.constantSource.start();
  }

  trigger(velocity: number = 1): void {
    const now = this.context.currentTime;
    const { attack, decay, sustain } = this.params;

    // Cancel any scheduled changes
    this.gainNode.gain.cancelScheduledValues(now);

    // Start from current value (for retriggering)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);

    // Attack: ramp to peak (velocity-scaled)
    this.gainNode.gain.linearRampToValueAtTime(velocity, now + attack);

    // Decay: ramp to sustain level
    this.gainNode.gain.linearRampToValueAtTime(sustain * velocity, now + attack + decay);

    this.isActive = true;
  }

  release(): void {
    if (!this.isActive) return;

    const now = this.context.currentTime;
    const { release } = this.params;

    // Cancel scheduled changes and start release from current value
    this.gainNode.gain.cancelScheduledValues(now);
    this.releaseStartValue = this.gainNode.gain.value;

    this.gainNode.gain.setValueAtTime(this.releaseStartValue, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + release);

    this.isActive = false;
  }

  // Force immediate stop (for voice stealing)
  forceStop(): void {
    const now = this.context.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);
    this.isActive = false;
  }

  getOutputNode(): AudioNode {
    return this.gainNode;
  }

  getInputNode(): AudioNode | null {
    return null; // ADSR generates signal, doesn't process audio
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    return null;
  }

  // Connect envelope output to a parameter (like VCA gain)
  connectToParam(param: AudioParam): void {
    this.gainNode.connect(param);
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
      case 'attack':
        this.params.attack = Math.max(0.001, value as number);
        break;
      case 'decay':
        this.params.decay = Math.max(0.001, value as number);
        break;
      case 'sustain':
        this.params.sustain = Math.max(0, Math.min(1, value as number));
        break;
      case 'release':
        this.params.release = Math.max(0.001, value as number);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  isEnvelopeActive(): boolean {
    return this.isActive;
  }

  dispose(): void {
    this.forceStop();
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.gainNode.disconnect();
  }
}
