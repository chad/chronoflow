// LogicNode - Logic gates for triggers/gates (AND, OR, XOR, NOT)
// Combine clock sources and triggers for complex rhythmic patterns

import type { SynthNode, AudioNodeParams } from './types';

export interface LogicParams {
  operation: string; // 'and' | 'or' | 'xor' | 'nand' | 'nor' | 'not'
}

const DEFAULT_PARAMS: LogicParams = {
  operation: 'and',
};

export class SynthLogicNode implements SynthNode {
  id: string;
  type = 'logic';

  private context: AudioContext;
  private params: LogicParams;

  // Two trigger inputs
  private inputAAnalyser: AnalyserNode;
  private inputBAnalyser: AnalyserNode;
  private inputAData: Float32Array<ArrayBuffer>;
  private inputBData: Float32Array<ArrayBuffer>;
  private inputAGain: GainNode;
  private inputBGain: GainNode;

  // Track input states
  private inputAHigh: boolean = false;
  private inputBHigh: boolean = false;
  private lastOutputHigh: boolean = false;

  // Output
  private outputSource: ConstantSourceNode;
  private outputGain: GainNode;

  private checkInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<LogicParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create input A
    this.inputAGain = context.createGain();
    this.inputAGain.gain.value = 1;
    this.inputAAnalyser = context.createAnalyser();
    this.inputAAnalyser.fftSize = 256;
    this.inputAData = new Float32Array(this.inputAAnalyser.fftSize) as Float32Array<ArrayBuffer>;
    this.inputAGain.connect(this.inputAAnalyser);

    // Create input B
    this.inputBGain = context.createGain();
    this.inputBGain.gain.value = 1;
    this.inputBAnalyser = context.createAnalyser();
    this.inputBAnalyser.fftSize = 256;
    this.inputBData = new Float32Array(this.inputBAnalyser.fftSize) as Float32Array<ArrayBuffer>;
    this.inputBGain.connect(this.inputBAnalyser);

    // Create output
    this.outputSource = context.createConstantSource();
    this.outputSource.offset.value = 0;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;
    this.outputSource.connect(this.outputGain);
    this.outputSource.start();

    // Start processing
    this.startProcessing();
  }

  private startProcessing(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(() => {
      this.process();
    }, 1);
  }

  private process(): void {
    // Read input states
    this.inputAAnalyser.getFloatTimeDomainData(this.inputAData);
    this.inputBAnalyser.getFloatTimeDomainData(this.inputBData);

    const aHigh = this.inputAData[0] > 0.5;
    const bHigh = this.inputBData[0] > 0.5;

    // Calculate output based on operation
    let outputHigh: boolean;

    switch (this.params.operation) {
      case 'and':
        outputHigh = aHigh && bHigh;
        break;
      case 'or':
        outputHigh = aHigh || bHigh;
        break;
      case 'xor':
        outputHigh = aHigh !== bHigh;
        break;
      case 'nand':
        outputHigh = !(aHigh && bHigh);
        break;
      case 'nor':
        outputHigh = !(aHigh || bHigh);
        break;
      case 'not':
        // NOT only uses input A
        outputHigh = !aHigh;
        break;
      default:
        outputHigh = false;
    }

    // Update output if changed
    if (outputHigh !== this.lastOutputHigh) {
      this.outputSource.offset.setValueAtTime(
        outputHigh ? 1 : 0,
        this.context.currentTime
      );
      this.lastOutputHigh = outputHigh;
    }

    this.inputAHigh = aHigh;
    this.inputBHigh = bHigh;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  // Primary input (A)
  getInputNode(): AudioNode {
    return this.inputAGain;
  }

  // Secondary input (B)
  getInputB(): AudioNode {
    return this.inputBGain;
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
      case 'operation':
        if (['and', 'or', 'xor', 'nand', 'nor', 'not'].includes(value as string)) {
          this.params.operation = value as string;
        }
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getInputStates(): { a: boolean; b: boolean } {
    return {
      a: this.inputAHigh,
      b: this.inputBHigh,
    };
  }

  dispose(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }
    this.outputSource.stop();
    this.outputSource.disconnect();
    this.outputGain.disconnect();
    this.inputAGain.disconnect();
    this.inputBGain.disconnect();
    this.inputAAnalyser.disconnect();
    this.inputBAnalyser.disconnect();
  }
}
