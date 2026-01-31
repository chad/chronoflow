// CrossfaderNode - Smooth transitions between two audio sources
// Essential for blending between textures, layers, or sections

import type { SynthNode, AudioNodeParams } from './types';

export interface CrossfaderParams {
  position: number;   // 0 = A, 1 = B
  curve: 'linear' | 'equal_power' | 'constant_power';  // Crossfade curve
}

const DEFAULT_PARAMS: CrossfaderParams = {
  position: 0.5,
  curve: 'equal_power',
};

export class SynthCrossfaderNode implements SynthNode {
  id: string;
  type = 'crossfader';

  private context: AudioContext;
  private params: CrossfaderParams;

  // Input A
  private inputA: GainNode;
  private gainA: GainNode;

  // Input B
  private inputB: GainNode;
  private gainB: GainNode;

  // CV control input
  private cvInput: GainNode;
  private cvAnalyser: AnalyserNode;
  private cvData: Float32Array;
  private hasCVInput: boolean = false;
  private checkInterval: number | null = null;

  // Output
  private outputGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<CrossfaderParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Input A path
    this.inputA = context.createGain();
    this.inputA.gain.value = 1;
    this.gainA = context.createGain();
    this.inputA.connect(this.gainA);

    // Input B path
    this.inputB = context.createGain();
    this.inputB.gain.value = 1;
    this.gainB = context.createGain();
    this.inputB.connect(this.gainB);

    // Output (merge both inputs)
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;
    this.gainA.connect(this.outputGain);
    this.gainB.connect(this.outputGain);

    // CV control input
    this.cvInput = context.createGain();
    this.cvInput.gain.value = 1;
    this.cvAnalyser = context.createAnalyser();
    this.cvAnalyser.fftSize = 256;
    this.cvData = new Float32Array(this.cvAnalyser.fftSize);
    this.cvInput.connect(this.cvAnalyser);

    // Apply initial position
    this.updateGains(this.params.position);

    // Start CV monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.checkInterval = window.setInterval(() => {
      if (this.hasCVInput) {
        this.cvAnalyser.getFloatTimeDomainData(this.cvData as Float32Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < this.cvData.length; i++) {
          sum += this.cvData[i];
        }
        // Normalize CV (assume 0-1 range, clamp)
        const position = Math.max(0, Math.min(1, sum / this.cvData.length));
        this.updateGains(position);
      }
    }, 10);
  }

  private updateGains(position: number): void {
    const now = this.context.currentTime;
    let gainAValue: number;
    let gainBValue: number;

    switch (this.params.curve) {
      case 'linear':
        // Simple linear crossfade
        gainAValue = 1 - position;
        gainBValue = position;
        break;

      case 'equal_power':
        // Equal power crossfade (maintains perceived volume)
        // Uses cosine/sine curves
        gainAValue = Math.cos(position * Math.PI / 2);
        gainBValue = Math.sin(position * Math.PI / 2);
        break;

      case 'constant_power':
        // Constant power (square root curve)
        gainAValue = Math.sqrt(1 - position);
        gainBValue = Math.sqrt(position);
        break;

      default:
        gainAValue = 1 - position;
        gainBValue = position;
    }

    // Apply with smooth transition
    this.gainA.gain.setTargetAtTime(gainAValue, now, 0.01);
    this.gainB.gain.setTargetAtTime(gainBValue, now, 0.01);
  }

  // Get input A
  getInputA(): AudioNode {
    return this.inputA;
  }

  // Get input B
  getInputB(): AudioNode {
    return this.inputB;
  }

  // Get CV input
  getCVInput(): AudioNode {
    this.hasCVInput = true;
    return this.cvInput;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    // Default to input A
    return this.inputA;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    if (paramName === 'position_mod') {
      // Return CV input for modulation
      this.hasCVInput = true;
      return this.cvInput.gain;
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
      case 'position':
        this.params.position = Math.max(0, Math.min(1, value as number));
        if (!this.hasCVInput) {
          this.updateGains(this.params.position);
        }
        break;
      case 'curve':
        this.params.curve = value as 'linear' | 'equal_power' | 'constant_power';
        this.updateGains(this.params.position);
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
    this.inputA.disconnect();
    this.inputB.disconnect();
    this.gainA.disconnect();
    this.gainB.disconnect();
    this.cvInput.disconnect();
    this.cvAnalyser.disconnect();
    this.outputGain.disconnect();
  }
}
