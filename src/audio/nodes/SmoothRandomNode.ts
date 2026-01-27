// SmoothRandomNode - Random walk / smooth random generator for ambient modulation
// Unlike S&H which jumps between values, this "wanders" smoothly

import type { SynthNode, AudioNodeParams } from './types';

export interface SmoothRandomParams {
  rate: number; // How fast it changes (Hz)
  range: number; // How far it can wander (0-1 normalized output)
  smooth: number; // Interpolation smoothness (0-1)
}

const DEFAULT_PARAMS: SmoothRandomParams = {
  rate: 0.1, // Very slow for ambient
  range: 1,
  smooth: 0.8,
};

export class SynthSmoothRandomNode implements SynthNode {
  id: string;
  type = 'smoothrandom';

  private context: AudioContext;
  private params: SmoothRandomParams;
  private constantSource: ConstantSourceNode;
  private outputGain: GainNode;
  private updateInterval: number | null = null;
  private currentValue: number = 0;
  private targetValue: number = 0;

  constructor(context: AudioContext, id: string, params?: Partial<SmoothRandomParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create output chain
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 0;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = this.params.range;

    this.constantSource.connect(this.outputGain);
    this.constantSource.start();

    // Initialize random walk
    this.currentValue = (Math.random() - 0.5) * 2; // Start at random position
    this.targetValue = this.currentValue;

    // Start the random walk update loop
    this.startWalk();
  }

  private startWalk(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }

    // Update at 60fps for smooth animation
    const updateRate = 1000 / 60;

    this.updateInterval = window.setInterval(() => {
      this.updateWalk();
    }, updateRate);
  }

  private updateWalk(): void {
    const rate = this.params.rate;
    const smooth = this.params.smooth;

    // Random walk: occasionally pick a new target direction
    // The rate controls how often we change direction
    if (Math.random() < rate / 60) {
      // Bias toward center to prevent runaway
      const centerPull = -this.currentValue * 0.3;
      // Random step
      const randomStep = (Math.random() - 0.5) * 2;
      this.targetValue = Math.max(-1, Math.min(1, this.currentValue + randomStep * 0.5 + centerPull));
    }

    // Smooth interpolation toward target
    // Higher smooth = slower movement
    const smoothFactor = 1 - smooth * 0.95; // 0.05 to 1.0
    this.currentValue += (this.targetValue - this.currentValue) * smoothFactor * 0.1;

    // Clamp to range
    this.currentValue = Math.max(-1, Math.min(1, this.currentValue));

    // Update audio output with additional smoothing
    const smoothTime = smooth * 0.1; // Up to 100ms smoothing
    this.constantSource.offset.setTargetAtTime(
      this.currentValue,
      this.context.currentTime,
      Math.max(0.001, smoothTime)
    );
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode | null {
    return null; // No input - this is a source
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    // Could modulate rate via external CV in future
    return null;
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
      case 'rate':
        this.params.rate = Math.max(0.01, Math.min(10, value as number));
        break;
      case 'range':
        this.params.range = Math.max(0, Math.min(2, value as number));
        this.outputGain.gain.setValueAtTime(this.params.range, this.context.currentTime);
        break;
      case 'smooth':
        this.params.smooth = Math.max(0, Math.min(1, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentValue(): number {
    return this.currentValue * this.params.range;
  }

  dispose(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.outputGain.disconnect();
  }
}
