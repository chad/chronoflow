// MacroNode - Macro controller with multiple scaled CV outputs
// One knob/MIDI CC controls multiple parameters with different ranges
// Perfect for performance control and morphing patches

import type { SynthNode, AudioNodeParams } from './types';

export interface MacroParams {
  value: number;     // Main control value (0-1)
  out1Min: number;   // Output 1 minimum
  out1Max: number;   // Output 1 maximum
  out2Min: number;   // Output 2 minimum
  out2Max: number;   // Output 2 maximum
  out3Min: number;   // Output 3 minimum
  out3Max: number;   // Output 3 maximum
  out4Min: number;   // Output 4 minimum
  out4Max: number;   // Output 4 maximum
  smooth: number;    // Smoothing amount (0-1)
}

const DEFAULT_PARAMS: MacroParams = {
  value: 0.5,
  out1Min: 0,
  out1Max: 1,
  out2Min: 0,
  out2Max: 1,
  out3Min: 0,
  out3Max: 1,
  out4Min: 0,
  out4Max: 1,
  smooth: 0.1,
};

export class SynthMacroNode implements SynthNode {
  id: string;
  type = 'macro';

  private context: AudioContext;
  private params: MacroParams;

  // Four independent CV outputs
  private output1: ConstantSourceNode;
  private output1Gain: GainNode;
  private output2: ConstantSourceNode;
  private output2Gain: GainNode;
  private output3: ConstantSourceNode;
  private output3Gain: GainNode;
  private output4: ConstantSourceNode;
  private output4Gain: GainNode;

  // Main mixed output (all 4 summed)
  private mainOutput: GainNode;

  // For external CV input
  private inputGain: GainNode;
  private inputAnalyser: AnalyserNode;
  private inputData: Float32Array<ArrayBuffer>;

  private updateInterval: number | null = null;
  private currentValue: number = 0.5;

  constructor(context: AudioContext, id: string, params?: Partial<MacroParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.currentValue = this.params.value;

    // Create CV input
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;
    this.inputAnalyser = context.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.inputData = new Float32Array(this.inputAnalyser.fftSize) as Float32Array<ArrayBuffer>;
    this.inputGain.connect(this.inputAnalyser);

    // Create output 1
    this.output1 = context.createConstantSource();
    this.output1.offset.value = 0;
    this.output1Gain = context.createGain();
    this.output1Gain.gain.value = 1;
    this.output1.connect(this.output1Gain);
    this.output1.start();

    // Create output 2
    this.output2 = context.createConstantSource();
    this.output2.offset.value = 0;
    this.output2Gain = context.createGain();
    this.output2Gain.gain.value = 1;
    this.output2.connect(this.output2Gain);
    this.output2.start();

    // Create output 3
    this.output3 = context.createConstantSource();
    this.output3.offset.value = 0;
    this.output3Gain = context.createGain();
    this.output3Gain.gain.value = 1;
    this.output3.connect(this.output3Gain);
    this.output3.start();

    // Create output 4
    this.output4 = context.createConstantSource();
    this.output4.offset.value = 0;
    this.output4Gain = context.createGain();
    this.output4Gain.gain.value = 1;
    this.output4.connect(this.output4Gain);
    this.output4.start();

    // Main output (sum of all)
    this.mainOutput = context.createGain();
    this.mainOutput.gain.value = 0.25; // Scale down sum
    this.output1Gain.connect(this.mainOutput);
    this.output2Gain.connect(this.mainOutput);
    this.output3Gain.connect(this.mainOutput);
    this.output4Gain.connect(this.mainOutput);

    // Update outputs
    this.updateOutputs();

    // Start update loop for smooth transitions and external input
    this.startUpdateLoop();
  }

  private startUpdateLoop(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }

    this.updateInterval = window.setInterval(() => {
      // Check for external CV input
      this.inputAnalyser.getFloatTimeDomainData(this.inputData);
      const inputValue = this.inputData[0];

      // If we have significant external input, use it
      if (Math.abs(inputValue) > 0.01) {
        // Map input (-1 to 1) to (0 to 1)
        const normalizedInput = (inputValue + 1) / 2;
        this.params.value = Math.max(0, Math.min(1, normalizedInput));
      }

      // Smooth transition
      const targetValue = this.params.value;
      const smoothFactor = 1 - this.params.smooth * 0.95;
      this.currentValue += (targetValue - this.currentValue) * smoothFactor;

      // Update outputs
      this.updateOutputs();
    }, 16); // ~60fps
  }

  private updateOutputs(): void {
    const now = this.context.currentTime;
    const v = this.currentValue;

    // Scale value to each output's range
    const out1 = this.params.out1Min + v * (this.params.out1Max - this.params.out1Min);
    const out2 = this.params.out2Min + v * (this.params.out2Max - this.params.out2Min);
    const out3 = this.params.out3Min + v * (this.params.out3Max - this.params.out3Min);
    const out4 = this.params.out4Min + v * (this.params.out4Max - this.params.out4Min);

    this.output1.offset.setValueAtTime(out1, now);
    this.output2.offset.setValueAtTime(out2, now);
    this.output3.offset.setValueAtTime(out3, now);
    this.output4.offset.setValueAtTime(out4, now);
  }

  // Get individual outputs
  getOutput1(): AudioNode {
    return this.output1Gain;
  }

  getOutput2(): AudioNode {
    return this.output2Gain;
  }

  getOutput3(): AudioNode {
    return this.output3Gain;
  }

  getOutput4(): AudioNode {
    return this.output4Gain;
  }

  // Main output (for convenience, sums all)
  getOutputNode(): AudioNode {
    return this.mainOutput;
  }

  // CV input for external control
  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    // Allow direct modulation of value via audio
    switch (paramName) {
      case 'value_mod':
        // This would need special handling
        return null;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.mainOutput.connect(input);
      }
    } else {
      this.mainOutput.connect(destination);
    }
  }

  disconnect(): void {
    this.mainOutput.disconnect();
    this.output1Gain.disconnect();
    this.output2Gain.disconnect();
    this.output3Gain.disconnect();
    this.output4Gain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'value':
        this.params.value = Math.max(0, Math.min(1, value as number));
        break;
      case 'out1Min':
        this.params.out1Min = value as number;
        break;
      case 'out1Max':
        this.params.out1Max = value as number;
        break;
      case 'out2Min':
        this.params.out2Min = value as number;
        break;
      case 'out2Max':
        this.params.out2Max = value as number;
        break;
      case 'out3Min':
        this.params.out3Min = value as number;
        break;
      case 'out3Max':
        this.params.out3Max = value as number;
        break;
      case 'out4Min':
        this.params.out4Min = value as number;
        break;
      case 'out4Max':
        this.params.out4Max = value as number;
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
    return this.currentValue;
  }

  getOutputValues(): { out1: number; out2: number; out3: number; out4: number } {
    const v = this.currentValue;
    return {
      out1: this.params.out1Min + v * (this.params.out1Max - this.params.out1Min),
      out2: this.params.out2Min + v * (this.params.out2Max - this.params.out2Min),
      out3: this.params.out3Min + v * (this.params.out3Max - this.params.out3Min),
      out4: this.params.out4Min + v * (this.params.out4Max - this.params.out4Min),
    };
  }

  dispose(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }
    this.output1.stop();
    this.output1.disconnect();
    this.output1Gain.disconnect();
    this.output2.stop();
    this.output2.disconnect();
    this.output2Gain.disconnect();
    this.output3.stop();
    this.output3.disconnect();
    this.output3Gain.disconnect();
    this.output4.stop();
    this.output4.disconnect();
    this.output4Gain.disconnect();
    this.mainOutput.disconnect();
    this.inputGain.disconnect();
    this.inputAnalyser.disconnect();
  }
}
