// TuringMachineNode - Shift register with probability of bit flip
// Creates pseudo-random but repeatable/lockable sequences
// Classic module for evolving-but-coherent generative melodies

import type { SynthNode, AudioNodeParams } from './types';

export interface TuringMachineParams {
  probability: number; // Chance of bit flip (0-1, 0.5 = full random)
  length: number;      // Shift register length (2-16)
  scale: number;       // Output voltage range (0-5V equivalent)
  locked: boolean;     // When true, probability is 0 (repeating)
}

const DEFAULT_PARAMS: TuringMachineParams = {
  probability: 0.5,
  length: 8,
  scale: 1,
  locked: false,
};

export class SynthTuringMachineNode implements SynthNode {
  id: string;
  type = 'turing';

  private context: AudioContext;
  private params: TuringMachineParams;

  // Shift register (array of bits)
  private register: boolean[] = [];
  private currentStep: number = 0;

  // Output
  private constantSource: ConstantSourceNode;
  private outputGain: GainNode;

  // Gate output (for trigger on each step)
  private gateSource: ConstantSourceNode;
  private gateGain: GainNode;

  // Trigger input detection
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array<ArrayBuffer>;
  private lastTriggerValue: number = 0;
  private checkInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<TuringMachineParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Initialize register with random bits
    this.initializeRegister();

    // Create CV output
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 0;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = this.params.scale;
    this.constantSource.connect(this.outputGain);
    this.constantSource.start();

    // Create gate output
    this.gateSource = context.createConstantSource();
    this.gateSource.offset.value = 0;
    this.gateGain = context.createGain();
    this.gateGain.gain.value = 1;
    this.gateSource.connect(this.gateGain);
    this.gateSource.start();

    // Create trigger input detection
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize) as Float32Array<ArrayBuffer>;

    // Start checking for triggers
    this.startTriggerCheck();
  }

  private initializeRegister(): void {
    this.register = [];
    for (let i = 0; i < this.params.length; i++) {
      this.register.push(Math.random() > 0.5);
    }
  }

  private startTriggerCheck(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 1);
  }

  private checkTrigger(): void {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    const currentValue = this.triggerData[0];

    // Detect rising edge
    if (currentValue > 0.5 && this.lastTriggerValue <= 0.5) {
      this.advanceStep();
    }

    this.lastTriggerValue = currentValue;
  }

  private advanceStep(): void {
    // Get the bit that's about to fall off
    const fallingBit = this.register[this.register.length - 1];

    // Determine if we flip it
    const effectiveProb = this.params.locked ? 0 : this.params.probability;
    const shouldFlip = Math.random() < effectiveProb;
    const newBit = shouldFlip ? !fallingBit : fallingBit;

    // Shift register and insert new bit
    this.register.pop();
    this.register.unshift(newBit);

    // Calculate output value from register bits
    // Convert register to a value between 0 and 1
    let value = 0;
    for (let i = 0; i < this.register.length; i++) {
      if (this.register[i]) {
        value += Math.pow(2, i);
      }
    }
    // Normalize to 0-1 range
    const maxValue = Math.pow(2, this.register.length) - 1;
    const normalizedValue = value / maxValue;

    // Update CV output
    const now = this.context.currentTime;
    this.constantSource.offset.setValueAtTime(normalizedValue, now);

    // Output gate pulse
    this.gateSource.offset.setValueAtTime(1, now);
    this.gateSource.offset.setValueAtTime(0, now + 0.01);

    this.currentStep = (this.currentStep + 1) % this.params.length;
  }

  // Manual trigger
  trigger(): void {
    this.advanceStep();
  }

  // Randomize the register
  randomize(): void {
    this.initializeRegister();
  }

  getRegister(): boolean[] {
    return [...this.register];
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  // Gate output for triggers
  getGateOutput(): AudioNode {
    return this.gateGain;
  }

  getInputNode(): AudioNode {
    return this.triggerAnalyser;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'scale_mod':
        return this.outputGain.gain;
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
    this.gateGain.disconnect();
  }

  setParam(name: string, value: number | string | boolean): void {
    switch (name) {
      case 'probability':
        this.params.probability = Math.max(0, Math.min(1, value as number));
        break;
      case 'length':
        const newLength = Math.max(2, Math.min(16, Math.round(value as number)));
        if (newLength !== this.params.length) {
          this.params.length = newLength;
          // Resize register
          while (this.register.length < newLength) {
            this.register.push(Math.random() > 0.5);
          }
          while (this.register.length > newLength) {
            this.register.pop();
          }
        }
        break;
      case 'scale':
        this.params.scale = Math.max(0, Math.min(5, value as number));
        this.outputGain.gain.setValueAtTime(this.params.scale, this.context.currentTime);
        break;
      case 'locked':
        this.params.locked = value as boolean;
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.outputGain.disconnect();
    this.gateSource.stop();
    this.gateSource.disconnect();
    this.gateGain.disconnect();
    this.triggerAnalyser.disconnect();
  }
}
