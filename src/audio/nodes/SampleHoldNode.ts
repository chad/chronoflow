import type { SynthNode, AudioNodeParams } from './types';

export interface SampleHoldParams {
  rate: number; // Internal clock rate in Hz (when no external trigger)
  smooth: number; // Smoothing/glide time 0-1
}

const DEFAULT_PARAMS: SampleHoldParams = {
  rate: 4,
  smooth: 0,
};

export class SynthSampleHoldNode implements SynthNode {
  id: string;
  type = 'samplehold';

  private context: AudioContext;
  private params: SampleHoldParams;
  private inputGain: GainNode;
  private constantSource: ConstantSourceNode;
  private outputGain: GainNode;
  private analyser: AnalyserNode;
  private clockInterval: number | null = null;
  private currentValue: number = 0;
  private dataArray: Float32Array;

  // External trigger detection
  private triggerInput: GainNode;
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array;
  private lastTriggerValue: number = 0;
  private triggerCheckInterval: number | null = null;
  private useExternalTrigger: boolean = false;

  constructor(context: AudioContext, id: string, params?: Partial<SampleHoldParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create nodes
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Float32Array(this.analyser.fftSize);

    // Create constant source for DC output
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 0;
    this.constantSource.connect(this.outputGain);
    this.constantSource.start();

    // Connect input through analyser for sampling
    this.inputGain.connect(this.analyser);

    // Set up external trigger detection
    this.triggerInput = context.createGain();
    this.triggerInput.gain.value = 1;
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize);
    this.triggerInput.connect(this.triggerAnalyser);

    // Start internal clock
    this.startClock();
    // Start trigger detection (will only sample if external trigger connected)
    this.startTriggerDetection();
  }

  private startClock(): void {
    if (this.clockInterval !== null) {
      window.clearInterval(this.clockInterval);
    }
    // Only use internal clock if no external trigger is connected
    if (!this.useExternalTrigger) {
      const intervalMs = (1 / this.params.rate) * 1000;
      this.clockInterval = window.setInterval(() => this.sample(), intervalMs);
    }
  }

  private startTriggerDetection(): void {
    // Check for triggers at 120Hz (fast enough for musical timing)
    this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 8);
  }

  private checkTrigger(): void {
    if (!this.useExternalTrigger) return;

    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData as Float32Array<ArrayBuffer>);
    const currentValue = this.triggerData[0] || 0;

    // Detect rising edge (crossing threshold from below)
    const threshold = 0.1;
    if (currentValue > threshold && this.lastTriggerValue <= threshold) {
      this.sample();
    }

    this.lastTriggerValue = currentValue;
  }

  // Get trigger input node for external connections
  getTriggerInput(): AudioNode {
    return this.triggerInput;
  }

  // Enable external trigger mode (disables internal clock)
  setExternalTrigger(enabled: boolean): void {
    this.useExternalTrigger = enabled;
    if (enabled) {
      // Stop internal clock when using external trigger
      if (this.clockInterval !== null) {
        window.clearInterval(this.clockInterval);
        this.clockInterval = null;
      }
    } else {
      // Restart internal clock when not using external trigger
      this.startClock();
    }
  }

  private sample(): void {
    // Get current input value
    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);
    const newValue = this.dataArray[0] || 0;

    // Apply smoothing - set on constantSource.offset which is the actual signal
    if (this.params.smooth > 0) {
      const smoothTime = this.params.smooth * 0.5; // Max 500ms
      this.constantSource.offset.setTargetAtTime(newValue, this.context.currentTime, smoothTime);
    } else {
      this.constantSource.offset.setValueAtTime(newValue, this.context.currentTime);
    }
    this.currentValue = newValue;
  }

  // External trigger for sample (can be called by sequencer or clock)
  trigger(): void {
    this.sample();
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
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

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'rate':
        this.params.rate = Math.max(0.1, value as number);
        this.startClock();
        break;
      case 'smooth':
        this.params.smooth = value as number;
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentValue(): number {
    return this.currentValue;
  }

  dispose(): void {
    if (this.clockInterval !== null) {
      window.clearInterval(this.clockInterval);
    }
    if (this.triggerCheckInterval !== null) {
      window.clearInterval(this.triggerCheckInterval);
    }
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.outputGain.disconnect();
    this.triggerInput.disconnect();
    this.triggerAnalyser.disconnect();
  }
}
