import type { SynthNode, AudioNodeParams } from './types';

export interface ClockDividerParams {
  // No real params - divisions are fixed outputs
  // But we track state
}

const DEFAULT_PARAMS: ClockDividerParams = {};

export class SynthClockDividerNode implements SynthNode {
  id: string;
  type = 'clockdiv';

  private context: AudioContext;
  private params: ClockDividerParams;

  // Input detection
  private inputGain: GainNode;
  private analyser: AnalyserNode;
  private dataArray: Float32Array;
  private lastInputValue: number = 0;
  private checkInterval: number | null = null;

  // Division outputs - each is a ConstantSourceNode
  private div1Output: ConstantSourceNode;  // /1 (every beat)
  private div2Output: ConstantSourceNode;  // /2 (every 2 beats)
  private div4Output: ConstantSourceNode;  // /4 (every 4 beats)
  private div8Output: ConstantSourceNode;  // /8 (every 8 beats)
  private mult2Output: ConstantSourceNode; // x2 (twice per beat) - handled differently

  // Output gains for routing
  private div1Gain: GainNode;
  private div2Gain: GainNode;
  private div4Gain: GainNode;
  private div8Gain: GainNode;
  private mult2Gain: GainNode;

  // Beat counter
  private beatCount: number = 0;

  // Callbacks for sequencers to register
  private divisionCallbacks: Map<number, Set<() => void>> = new Map([
    [1, new Set()],
    [2, new Set()],
    [4, new Set()],
    [8, new Set()],
  ]);

  constructor(context: AudioContext, id: string, params?: Partial<ClockDividerParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create input for trigger detection
    this.inputGain = context.createGain();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Float32Array(this.analyser.fftSize);
    this.inputGain.connect(this.analyser);

    // Create division outputs
    this.div1Output = context.createConstantSource();
    this.div2Output = context.createConstantSource();
    this.div4Output = context.createConstantSource();
    this.div8Output = context.createConstantSource();
    this.mult2Output = context.createConstantSource();

    this.div1Output.offset.value = 0;
    this.div2Output.offset.value = 0;
    this.div4Output.offset.value = 0;
    this.div8Output.offset.value = 0;
    this.mult2Output.offset.value = 0;

    // Create output gains
    this.div1Gain = context.createGain();
    this.div2Gain = context.createGain();
    this.div4Gain = context.createGain();
    this.div8Gain = context.createGain();
    this.mult2Gain = context.createGain();

    // Connect
    this.div1Output.connect(this.div1Gain);
    this.div2Output.connect(this.div2Gain);
    this.div4Output.connect(this.div4Gain);
    this.div8Output.connect(this.div8Gain);
    this.mult2Output.connect(this.mult2Gain);

    // Start sources
    this.div1Output.start();
    this.div2Output.start();
    this.div4Output.start();
    this.div8Output.start();
    this.mult2Output.start();

    // Start monitoring input for triggers
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Check for rising edge of input signal at high rate
    this.checkInterval = window.setInterval(() => this.checkInput(), 2);
  }

  private checkInput(): void {
    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);
    const currentValue = this.dataArray[0] || 0;

    // Detect rising edge (trigger)
    if (currentValue > 0.5 && this.lastInputValue <= 0.5) {
      this.onTrigger();
    }

    this.lastInputValue = currentValue;
  }

  private onTrigger(): void {
    const now = this.context.currentTime;
    const pulseDuration = 0.01; // 10ms pulse

    // /1 - every beat
    this.div1Output.offset.setValueAtTime(1, now);
    this.div1Output.offset.setValueAtTime(0, now + pulseDuration);
    this.divisionCallbacks.get(1)?.forEach(cb => cb());

    // /2 - every 2 beats
    if (this.beatCount % 2 === 0) {
      this.div2Output.offset.setValueAtTime(1, now);
      this.div2Output.offset.setValueAtTime(0, now + pulseDuration);
      this.divisionCallbacks.get(2)?.forEach(cb => cb());
    }

    // /4 - every 4 beats
    if (this.beatCount % 4 === 0) {
      this.div4Output.offset.setValueAtTime(1, now);
      this.div4Output.offset.setValueAtTime(0, now + pulseDuration);
      this.divisionCallbacks.get(4)?.forEach(cb => cb());
    }

    // /8 - every 8 beats
    if (this.beatCount % 8 === 0) {
      this.div8Output.offset.setValueAtTime(1, now);
      this.div8Output.offset.setValueAtTime(0, now + pulseDuration);
      this.divisionCallbacks.get(8)?.forEach(cb => cb());
    }

    this.beatCount++;
  }

  // Manual trigger (can be called by clock node directly)
  trigger(): void {
    this.onTrigger();
  }

  // Reset beat counter
  reset(): void {
    this.beatCount = 0;
  }

  // Register callback for a specific division
  onDivision(division: number, callback: () => void): void {
    this.divisionCallbacks.get(division)?.add(callback);
  }

  offDivision(division: number, callback: () => void): void {
    this.divisionCallbacks.get(division)?.delete(callback);
  }

  getBeatCount(): number {
    return this.beatCount;
  }

  getOutputNode(): AudioNode {
    // Default output is /1
    return this.div1Gain;
  }

  // Get specific division outputs
  getDiv1Output(): AudioNode {
    return this.div1Gain;
  }

  getDiv2Output(): AudioNode {
    return this.div2Gain;
  }

  getDiv4Output(): AudioNode {
    return this.div4Gain;
  }

  getDiv8Output(): AudioNode {
    return this.div8Gain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    // Division outputs can be used as modulation sources
    // but this node doesn't have modulation inputs
    return null;
  }

  // Connect specific division output to destination
  connectDivision(division: number, destination: AudioNode | SynthNode): void {
    let output: GainNode;
    switch (division) {
      case 1: output = this.div1Gain; break;
      case 2: output = this.div2Gain; break;
      case 4: output = this.div4Gain; break;
      case 8: output = this.div8Gain; break;
      default: output = this.div1Gain;
    }

    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        output.connect(input);
      }
    } else {
      output.connect(destination);
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    // Default connect uses /1 output
    this.connectDivision(1, destination);
  }

  disconnect(): void {
    this.div1Gain.disconnect();
    this.div2Gain.disconnect();
    this.div4Gain.disconnect();
    this.div8Gain.disconnect();
    this.mult2Gain.disconnect();
  }

  setParam(_name: string, _value: number | string): void {
    // No params to set currently
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }
    this.divisionCallbacks.forEach(set => set.clear());
    this.div1Output.stop();
    this.div2Output.stop();
    this.div4Output.stop();
    this.div8Output.stop();
    this.mult2Output.stop();
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.disconnect();
  }
}
