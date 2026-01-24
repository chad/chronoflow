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

    // Start internal clock
    this.startClock();
  }

  private startClock(): void {
    if (this.clockInterval !== null) {
      window.clearInterval(this.clockInterval);
    }
    const intervalMs = (1 / this.params.rate) * 1000;
    this.clockInterval = window.setInterval(() => this.sample(), intervalMs);
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
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.outputGain.disconnect();
  }
}
