import type { SynthNode, AudioNodeParams } from './types';

export interface DelayParams {
  time: number;     // delay time in seconds
  feedback: number; // 0-1
  mix: number;      // 0-1 (dry/wet)
}

const DEFAULT_PARAMS: DelayParams = {
  time: 0.3,
  feedback: 0.4,
  mix: 0.5,
};

export class SynthDelayNode implements SynthNode {
  id: string;
  type = 'delay';

  private inputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private outputGain: GainNode;
  private context: AudioContext;
  private params: DelayParams;

  constructor(context: AudioContext, id: string, params?: Partial<DelayParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create nodes
    this.inputGain = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.delayNode = context.createDelay(5); // max 5 seconds
    this.feedbackGain = context.createGain();
    this.outputGain = context.createGain();

    // Set initial values
    this.delayNode.delayTime.value = this.params.time;
    this.feedbackGain.gain.value = this.params.feedback;
    this.updateMix();

    // Connect: input -> dry -> output
    //          input -> delay -> wet -> output
    //                   delay -> feedback -> delay
    this.inputGain.connect(this.dryGain);
    this.inputGain.connect(this.delayNode);
    this.dryGain.connect(this.outputGain);
    this.delayNode.connect(this.wetGain);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.wetGain.connect(this.outputGain);
  }

  private updateMix(): void {
    this.dryGain.gain.value = 1 - this.params.mix;
    this.wetGain.gain.value = this.params.mix;

    // When mix is very low, kill feedback to stop the delay loop
    if (this.params.mix < 0.01) {
      this.feedbackGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    } else {
      // Restore feedback when mix is turned back up
      this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01);
    }
  }

  // Clear the delay buffer by temporarily killing feedback
  clear(): void {
    this.feedbackGain.gain.setTargetAtTime(0, this.context.currentTime, 0.001);
    this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 0.001);
    // Restore after delay buffer would be empty
    setTimeout(() => {
      if (this.params.mix >= 0.01) {
        this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01);
        this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01);
      }
    }, this.params.time * 1000 * 3); // Wait for 3x delay time to fully clear
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'time_mod':
        return this.delayNode.delayTime;
      case 'feedback_mod':
        return this.feedbackGain.gain;
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

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'time':
        this.params.time = value as number;
        this.delayNode.delayTime.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
      case 'feedback':
        this.params.feedback = Math.min(0.95, value as number); // Prevent runaway feedback
        this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01);
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
    this.delayNode.disconnect();
    this.feedbackGain.disconnect();
    this.outputGain.disconnect();
  }
}
