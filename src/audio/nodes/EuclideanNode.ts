// EuclideanNode - Euclidean rhythm generator
// Distributes N triggers evenly across M steps using the Euclidean algorithm
// Perfect for creating complex polyrhythms from simple parameters

import type { SynthNode, AudioNodeParams } from './types';

export interface EuclideanParams {
  steps: number;    // Total steps (1-32)
  hits: number;     // Number of triggers to distribute (1-steps)
  rotation: number; // Rotate pattern (0 to steps-1)
  running: boolean; // Whether pattern is running
}

const DEFAULT_PARAMS: EuclideanParams = {
  steps: 16,
  hits: 4,
  rotation: 0,
  running: true,
};

// Bjorklund's algorithm for generating Euclidean rhythms
function euclideanPattern(steps: number, hits: number): boolean[] {
  if (hits >= steps) return new Array(steps).fill(true);
  if (hits <= 0) return new Array(steps).fill(false);

  // Bjorklund's algorithm
  let pattern: number[][] = [];

  // Initialize: 'hits' ones and 'steps-hits' zeros
  for (let i = 0; i < hits; i++) pattern.push([1]);
  for (let i = 0; i < steps - hits; i++) pattern.push([0]);

  // Euclidean distribution
  while (true) {
    const zeros: number[][] = [];
    const ones: number[][] = [];

    for (const p of pattern) {
      if (p[0] === 0) zeros.push(p);
      else ones.push(p);
    }

    if (zeros.length <= 1 || ones.length <= 1) break;

    pattern = [];
    const minLen = Math.min(zeros.length, ones.length);

    for (let i = 0; i < minLen; i++) {
      pattern.push([...ones[i], ...zeros[i]]);
    }

    // Add remaining
    for (let i = minLen; i < ones.length; i++) pattern.push(ones[i]);
    for (let i = minLen; i < zeros.length; i++) pattern.push(zeros[i]);
  }

  // Flatten
  const result: boolean[] = [];
  for (const p of pattern) {
    for (const v of p) {
      result.push(v === 1);
    }
  }

  return result;
}

export class SynthEuclideanNode implements SynthNode {
  id: string;
  type = 'euclidean';

  private context: AudioContext;
  private params: EuclideanParams;
  private pattern: boolean[] = [];
  private currentStep: number = 0;

  // Output
  private constantSource: ConstantSourceNode;
  private outputGain: GainNode;

  // For receiving external clock
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array<ArrayBuffer>;
  private lastTriggerValue: number = 0;
  private checkInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<EuclideanParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Generate initial pattern
    this.regeneratePattern();

    // Create output
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 0;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;
    this.constantSource.connect(this.outputGain);
    this.constantSource.start();

    // Create trigger input detection
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize) as Float32Array<ArrayBuffer>;

    // Start checking for triggers
    this.startTriggerCheck();
  }

  private regeneratePattern(): void {
    const basePattern = euclideanPattern(this.params.steps, this.params.hits);

    // Apply rotation
    const rotation = this.params.rotation % this.params.steps;
    this.pattern = [
      ...basePattern.slice(rotation),
      ...basePattern.slice(0, rotation),
    ];
  }

  private startTriggerCheck(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }

    // Check for triggers at audio rate (every ~1ms)
    this.checkInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 1);
  }

  private checkTrigger(): void {
    if (!this.params.running) return;

    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    const currentValue = this.triggerData[0];

    // Detect rising edge (trigger)
    if (currentValue > 0.5 && this.lastTriggerValue <= 0.5) {
      this.advanceStep();
    }

    this.lastTriggerValue = currentValue;
  }

  private advanceStep(): void {
    const shouldTrigger = this.pattern[this.currentStep];

    if (shouldTrigger) {
      // Output trigger pulse
      const now = this.context.currentTime;
      this.constantSource.offset.setValueAtTime(1, now);
      this.constantSource.offset.setValueAtTime(0, now + 0.01);
    }

    this.currentStep = (this.currentStep + 1) % this.params.steps;
  }

  // Manual trigger (for testing or external sync via callback)
  trigger(): void {
    if (this.params.running) {
      this.advanceStep();
    }
  }

  reset(): void {
    this.currentStep = 0;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getPattern(): boolean[] {
    return [...this.pattern];
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.triggerAnalyser;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
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

  setParam(name: string, value: number | string | boolean): void {
    switch (name) {
      case 'steps':
        this.params.steps = Math.max(1, Math.min(32, Math.round(value as number)));
        this.params.hits = Math.min(this.params.hits, this.params.steps);
        this.params.rotation = Math.min(this.params.rotation, this.params.steps - 1);
        this.regeneratePattern();
        this.currentStep = this.currentStep % this.params.steps;
        break;
      case 'hits':
        this.params.hits = Math.max(0, Math.min(this.params.steps, Math.round(value as number)));
        this.regeneratePattern();
        break;
      case 'rotation':
        this.params.rotation = Math.max(0, Math.min(this.params.steps - 1, Math.round(value as number)));
        this.regeneratePattern();
        break;
      case 'running':
        this.params.running = value as boolean;
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
    this.triggerAnalyser.disconnect();
  }
}
