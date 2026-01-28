// ProbabilityGateNode - Randomly passes or blocks triggers based on probability
// Simple but powerful for adding controlled randomness to sequences

import type { SynthNode, AudioNodeParams } from './types';

export interface ProbabilityGateParams {
  probability: number; // Chance of passing trigger (0-1)
  mode: string;        // 'gate' (pass/block) or 'bernoulli' (route A/B)
}

const DEFAULT_PARAMS: ProbabilityGateParams = {
  probability: 0.5,
  mode: 'gate',
};

export class SynthProbabilityGateNode implements SynthNode {
  id: string;
  type = 'probgate';

  private context: AudioContext;
  private params: ProbabilityGateParams;

  // Trigger input detection
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array<ArrayBuffer>;
  private lastTriggerValue: number = 0;
  private checkInterval: number | null = null;

  // Outputs
  private outputA: ConstantSourceNode;
  private outputAGain: GainNode;
  private outputB: ConstantSourceNode;
  private outputBGain: GainNode;

  // Stats
  private passCount: number = 0;
  private totalCount: number = 0;

  constructor(context: AudioContext, id: string, params?: Partial<ProbabilityGateParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create trigger input detection
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize) as Float32Array<ArrayBuffer>;

    // Create output A (main/passed triggers)
    this.outputA = context.createConstantSource();
    this.outputA.offset.value = 0;
    this.outputAGain = context.createGain();
    this.outputAGain.gain.value = 1;
    this.outputA.connect(this.outputAGain);
    this.outputA.start();

    // Create output B (for Bernoulli mode - rejected triggers)
    this.outputB = context.createConstantSource();
    this.outputB.offset.value = 0;
    this.outputBGain = context.createGain();
    this.outputBGain.gain.value = 1;
    this.outputB.connect(this.outputBGain);
    this.outputB.start();

    // Start checking for triggers
    this.startTriggerCheck();
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
      this.processTrigger();
    }

    this.lastTriggerValue = currentValue;
  }

  private processTrigger(): void {
    this.totalCount++;
    const now = this.context.currentTime;

    const passes = Math.random() < this.params.probability;

    if (this.params.mode === 'gate') {
      // Gate mode: only pass if probability check passes
      if (passes) {
        this.passCount++;
        this.outputA.offset.setValueAtTime(1, now);
        this.outputA.offset.setValueAtTime(0, now + 0.01);
      }
    } else {
      // Bernoulli mode: always output, but to A or B
      if (passes) {
        this.passCount++;
        this.outputA.offset.setValueAtTime(1, now);
        this.outputA.offset.setValueAtTime(0, now + 0.01);
      } else {
        this.outputB.offset.setValueAtTime(1, now);
        this.outputB.offset.setValueAtTime(0, now + 0.01);
      }
    }
  }

  // Manual trigger
  trigger(): void {
    this.processTrigger();
  }

  resetStats(): void {
    this.passCount = 0;
    this.totalCount = 0;
  }

  getStats(): { passed: number; total: number; ratio: number } {
    return {
      passed: this.passCount,
      total: this.totalCount,
      ratio: this.totalCount > 0 ? this.passCount / this.totalCount : 0,
    };
  }

  getOutputNode(): AudioNode {
    return this.outputAGain;
  }

  // Secondary output for Bernoulli mode
  getOutputB(): AudioNode {
    return this.outputBGain;
  }

  getInputNode(): AudioNode {
    return this.triggerAnalyser;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      // Could add CV control over probability in future
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.outputAGain.connect(input);
      }
    } else {
      this.outputAGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputAGain.disconnect();
    this.outputBGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'probability':
        this.params.probability = Math.max(0, Math.min(1, value as number));
        break;
      case 'mode':
        if (['gate', 'bernoulli'].includes(value as string)) {
          this.params.mode = value as string;
        }
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
    this.outputA.stop();
    this.outputA.disconnect();
    this.outputAGain.disconnect();
    this.outputB.stop();
    this.outputB.disconnect();
    this.outputBGain.disconnect();
    this.triggerAnalyser.disconnect();
  }
}
