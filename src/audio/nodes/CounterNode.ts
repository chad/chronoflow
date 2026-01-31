// CounterNode - Counts triggers and fires after N pulses
// Essential for creating phrase structures and section changes

import type { SynthNode, AudioNodeParams } from './types';

export interface CounterParams {
  count: number;      // Fire after this many triggers (1-64)
  mode: 'up' | 'down' | 'pendulum';  // Count direction
  autoReset: boolean; // Auto-reset after firing
}

const DEFAULT_PARAMS: CounterParams = {
  count: 8,
  mode: 'up',
  autoReset: true,
};

export class SynthCounterNode implements SynthNode {
  id: string;
  type = 'counter';

  private context: AudioContext;
  private params: CounterParams;

  // Current count state
  private currentCount: number = 0;
  private direction: 1 | -1 = 1; // For pendulum mode

  // Audio nodes for trigger detection
  private triggerInput: GainNode;
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array;
  private lastTriggerValue: number = 0;
  private triggerCheckInterval: number | null = null;

  // Reset input
  private resetInput: GainNode;
  private resetAnalyser: AnalyserNode;
  private resetData: Float32Array;
  private lastResetValue: number = 0;

  // Output - constant source that pulses
  private outputGain: GainNode;

  // Count output - CV representing current count (0-1 range)
  private countOutput: ConstantSourceNode;
  private countGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<CounterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Trigger input detection
    this.triggerInput = context.createGain();
    this.triggerInput.gain.value = 1;
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize);
    this.triggerInput.connect(this.triggerAnalyser);

    // Reset input detection
    this.resetInput = context.createGain();
    this.resetInput.gain.value = 1;
    this.resetAnalyser = context.createAnalyser();
    this.resetAnalyser.fftSize = 256;
    this.resetData = new Float32Array(this.resetAnalyser.fftSize);
    this.resetInput.connect(this.resetAnalyser);

    // Output pulse
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 0;

    // Count CV output (normalized 0-1)
    this.countOutput = context.createConstantSource();
    this.countOutput.offset.value = 1;
    this.countGain = context.createGain();
    this.countGain.gain.value = 0;
    this.countOutput.connect(this.countGain);
    this.countOutput.start();

    // Initialize count based on mode
    this.resetCounter();

    // Start detection
    this.startDetection();
  }

  private startDetection(): void {
    this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger();
      this.checkReset();
    }, 5); // 200Hz check rate
  }

  private checkTrigger(): void {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData as Float32Array<ArrayBuffer>);

    let maxValue = 0;
    for (let i = 0; i < this.triggerData.length; i++) {
      if (this.triggerData[i] > maxValue) maxValue = this.triggerData[i];
    }

    const threshold = 0.5;
    if (maxValue > threshold && this.lastTriggerValue <= threshold) {
      this.onTrigger();
    }

    this.lastTriggerValue = maxValue;
  }

  private checkReset(): void {
    this.resetAnalyser.getFloatTimeDomainData(this.resetData as Float32Array<ArrayBuffer>);

    let maxValue = 0;
    for (let i = 0; i < this.resetData.length; i++) {
      if (this.resetData[i] > maxValue) maxValue = this.resetData[i];
    }

    const threshold = 0.5;
    if (maxValue > threshold && this.lastResetValue <= threshold) {
      this.resetCounter();
    }

    this.lastResetValue = maxValue;
  }

  private onTrigger(): void {
    // Update count based on mode
    if (this.params.mode === 'up') {
      this.currentCount++;
    } else if (this.params.mode === 'down') {
      this.currentCount--;
    } else { // pendulum
      this.currentCount += this.direction;
      if (this.currentCount >= this.params.count || this.currentCount <= 0) {
        this.direction *= -1;
      }
    }

    // Update count CV output
    const normalizedCount = this.currentCount / this.params.count;
    this.countGain.gain.setValueAtTime(normalizedCount, this.context.currentTime);

    // Check if we should fire
    const shouldFire = this.params.mode === 'down'
      ? this.currentCount <= 0
      : this.currentCount >= this.params.count;

    if (shouldFire) {
      this.firePulse();
      if (this.params.autoReset) {
        this.resetCounter();
      }
    }
  }

  private firePulse(): void {
    const now = this.context.currentTime;
    // Generate a short pulse
    this.outputGain.gain.setValueAtTime(1, now);
    this.outputGain.gain.setValueAtTime(0, now + 0.01);
  }

  private resetCounter(): void {
    if (this.params.mode === 'down') {
      this.currentCount = this.params.count;
    } else {
      this.currentCount = 0;
    }
    this.direction = 1;
    this.countGain.gain.setValueAtTime(
      this.currentCount / this.params.count,
      this.context.currentTime
    );
  }

  // Get trigger input for clock connection
  getTriggerInput(): AudioNode {
    return this.triggerInput;
  }

  // Get reset input
  getResetInput(): AudioNode {
    return this.resetInput;
  }

  // Get count CV output
  getCountOutput(): AudioNode {
    return this.countGain;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.triggerInput;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    if (paramName === 'count_mod') {
      // Could modulate count, but tricky - skip for now
      return null;
    }
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
      case 'count':
        this.params.count = Math.max(1, Math.min(64, value as number));
        break;
      case 'mode':
        this.params.mode = value as 'up' | 'down' | 'pendulum';
        this.resetCounter();
        break;
      case 'autoReset':
        this.params.autoReset = value === 'true' || value === 1 || value === '1';
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentCount(): number {
    return this.currentCount;
  }

  dispose(): void {
    if (this.triggerCheckInterval !== null) {
      window.clearInterval(this.triggerCheckInterval);
    }
    this.triggerInput.disconnect();
    this.triggerAnalyser.disconnect();
    this.resetInput.disconnect();
    this.resetAnalyser.disconnect();
    this.outputGain.disconnect();
    this.countOutput.stop();
    this.countOutput.disconnect();
    this.countGain.disconnect();
  }
}
