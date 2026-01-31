// ComparatorNode - Compares CV to threshold, outputs gate when condition met
// Creates "moments" - events triggered by signal conditions

import type { SynthNode, AudioNodeParams } from './types';

export interface ComparatorParams {
  threshold: number;  // Comparison threshold (-1 to 1)
  mode: 'greater' | 'less' | 'equal' | 'window';  // Comparison mode
  windowSize: number; // For window mode, how wide the window is
  hysteresis: number; // Prevent rapid toggling (0-0.5)
}

const DEFAULT_PARAMS: ComparatorParams = {
  threshold: 0.5,
  mode: 'greater',
  windowSize: 0.1,
  hysteresis: 0.05,
};

export class SynthComparatorNode implements SynthNode {
  id: string;
  type = 'comparator';

  private context: AudioContext;
  private params: ComparatorParams;

  // Input signal analysis
  private inputGain: GainNode;
  private inputAnalyser: AnalyserNode;
  private inputData: Float32Array;
  private checkInterval: number | null = null;

  // Threshold CV input (optional)
  private thresholdInput: GainNode;
  private thresholdAnalyser: AnalyserNode;
  private thresholdData: Float32Array;
  private hasThresholdCV: boolean = false;

  // Gate output
  private gateSource: ConstantSourceNode;
  private gateGain: GainNode;

  // Inverted gate output
  private invertedGain: GainNode;

  // Trigger output (pulse on state change)
  private triggerGain: GainNode;

  // State tracking
  private currentState: boolean = false;

  constructor(context: AudioContext, id: string, params?: Partial<ComparatorParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Input signal
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;
    this.inputAnalyser = context.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.inputData = new Float32Array(this.inputAnalyser.fftSize);
    this.inputGain.connect(this.inputAnalyser);

    // Threshold CV input
    this.thresholdInput = context.createGain();
    this.thresholdInput.gain.value = 1;
    this.thresholdAnalyser = context.createAnalyser();
    this.thresholdAnalyser.fftSize = 256;
    this.thresholdData = new Float32Array(this.thresholdAnalyser.fftSize);
    this.thresholdInput.connect(this.thresholdAnalyser);

    // Gate output (0 or 1)
    this.gateSource = context.createConstantSource();
    this.gateSource.offset.value = 1;
    this.gateGain = context.createGain();
    this.gateGain.gain.value = 0;
    this.gateSource.connect(this.gateGain);
    this.gateSource.start();

    // Inverted gate
    this.invertedGain = context.createGain();
    this.invertedGain.gain.value = 1; // Starts high (inverted of 0)
    this.gateSource.connect(this.invertedGain);

    // Trigger pulse output
    this.triggerGain = context.createGain();
    this.triggerGain.gain.value = 0;

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.checkInterval = window.setInterval(() => {
      this.checkComparison();
    }, 5); // 200Hz
  }

  private checkComparison(): void {
    // Get input signal value (use average of recent samples)
    this.inputAnalyser.getFloatTimeDomainData(this.inputData as Float32Array<ArrayBuffer>);
    let inputSum = 0;
    for (let i = 0; i < this.inputData.length; i++) {
      inputSum += this.inputData[i];
    }
    const inputValue = inputSum / this.inputData.length;

    // Get threshold (from CV or param)
    let threshold = this.params.threshold;
    if (this.hasThresholdCV) {
      this.thresholdAnalyser.getFloatTimeDomainData(this.thresholdData as Float32Array<ArrayBuffer>);
      let threshSum = 0;
      for (let i = 0; i < this.thresholdData.length; i++) {
        threshSum += this.thresholdData[i];
      }
      threshold = threshSum / this.thresholdData.length;
    }

    // Apply hysteresis
    const upperThreshold = threshold + this.params.hysteresis;
    const lowerThreshold = threshold - this.params.hysteresis;

    // Determine new state based on mode
    let newState: boolean;

    switch (this.params.mode) {
      case 'greater':
        if (this.currentState) {
          newState = inputValue > lowerThreshold;
        } else {
          newState = inputValue > upperThreshold;
        }
        break;

      case 'less':
        if (this.currentState) {
          newState = inputValue < upperThreshold;
        } else {
          newState = inputValue < lowerThreshold;
        }
        break;

      case 'equal':
        const diff = Math.abs(inputValue - threshold);
        newState = diff < this.params.windowSize;
        break;

      case 'window':
        const lower = threshold - this.params.windowSize / 2;
        const upper = threshold + this.params.windowSize / 2;
        newState = inputValue >= lower && inputValue <= upper;
        break;

      default:
        newState = false;
    }

    // Update outputs if state changed
    if (newState !== this.currentState) {
      this.currentState = newState;
      const now = this.context.currentTime;

      // Update gate
      this.gateGain.gain.setValueAtTime(newState ? 1 : 0, now);

      // Update inverted gate
      this.invertedGain.gain.setValueAtTime(newState ? 0 : 1, now);

      // Fire trigger pulse on rising edge
      if (newState) {
        this.triggerGain.gain.setValueAtTime(1, now);
        this.triggerGain.gain.setValueAtTime(0, now + 0.01);
      }
    }
  }

  // Get threshold CV input
  getThresholdInput(): AudioNode {
    this.hasThresholdCV = true;
    return this.thresholdInput;
  }

  // Get inverted gate output
  getInvertedOutput(): AudioNode {
    return this.invertedGain;
  }

  // Get trigger output (pulses on state change)
  getTriggerOutput(): AudioNode {
    return this.triggerGain;
  }

  getOutputNode(): AudioNode {
    return this.gateGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    if (paramName === 'threshold_mod') {
      // Return threshold input gain for modulation
      return this.thresholdInput.gain;
    }
    return null;
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.gateGain.connect(input);
      }
    } else {
      this.gateGain.connect(destination);
    }
  }

  disconnect(): void {
    this.gateGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'threshold':
        this.params.threshold = Math.max(-1, Math.min(1, value as number));
        break;
      case 'mode':
        this.params.mode = value as 'greater' | 'less' | 'equal' | 'window';
        break;
      case 'windowSize':
        this.params.windowSize = Math.max(0.01, Math.min(1, value as number));
        break;
      case 'hysteresis':
        this.params.hysteresis = Math.max(0, Math.min(0.5, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentState(): boolean {
    return this.currentState;
  }

  dispose(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }
    this.inputGain.disconnect();
    this.inputAnalyser.disconnect();
    this.thresholdInput.disconnect();
    this.thresholdAnalyser.disconnect();
    this.gateSource.stop();
    this.gateSource.disconnect();
    this.gateGain.disconnect();
    this.invertedGain.disconnect();
    this.triggerGain.disconnect();
  }
}
