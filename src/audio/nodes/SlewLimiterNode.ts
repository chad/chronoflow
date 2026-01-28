// SlewLimiterNode - Slew limiter / portamento / lag processor
// Smooths CV signals with separate rise and fall times
// Essential for turning stepped random into organic glides

import type { SynthNode, AudioNodeParams } from './types';

export interface SlewLimiterParams {
  rise: number;   // Rise time in seconds (0.001-5)
  fall: number;   // Fall time in seconds (0.001-5)
  shape: string;  // 'linear' | 'exponential' | 'logarithmic'
}

const DEFAULT_PARAMS: SlewLimiterParams = {
  rise: 0.1,
  fall: 0.1,
  shape: 'exponential',
};

export class SynthSlewLimiterNode implements SynthNode {
  id: string;
  type = 'slewlimiter';

  private context: AudioContext;
  private params: SlewLimiterParams;

  // Signal chain
  private inputGain: GainNode;
  private outputGain: GainNode;

  // For slew processing
  private analyser: AnalyserNode;
  private analyserData: Float32Array<ArrayBuffer>;
  private constantSource: ConstantSourceNode;
  private currentValue: number = 0;
  private targetValue: number = 0;
  private updateInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<SlewLimiterParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Input analysis
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyserData = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    this.inputGain.connect(this.analyser);

    // Output generation
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 0;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;
    this.constantSource.connect(this.outputGain);
    this.constantSource.start();

    // Start slew processing
    this.startProcessing();
  }

  private startProcessing(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }

    // Update at high rate for smooth output
    const updateRate = 1000 / 120; // 120Hz
    this.updateInterval = window.setInterval(() => {
      this.process();
    }, updateRate);
  }

  private process(): void {
    // Read input value
    this.analyser.getFloatTimeDomainData(this.analyserData);
    this.targetValue = this.analyserData[0];

    // Calculate slew rate based on direction
    const delta = this.targetValue - this.currentValue;
    const isRising = delta > 0;
    const slewTime = isRising ? this.params.rise : this.params.fall;

    // Apply slew based on shape
    const rate = 1 / (slewTime * 120); // Adjust for update rate

    switch (this.params.shape) {
      case 'linear':
        // Linear slew
        if (Math.abs(delta) < rate) {
          this.currentValue = this.targetValue;
        } else {
          this.currentValue += Math.sign(delta) * rate;
        }
        break;

      case 'exponential':
        // Exponential approach (RC filter style)
        this.currentValue += delta * Math.min(1, rate * 2);
        break;

      case 'logarithmic':
        // Logarithmic approach (faster initially, slower as it approaches)
        const logRate = rate * (1 + Math.abs(delta) * 2);
        this.currentValue += delta * Math.min(1, logRate);
        break;

      default:
        this.currentValue = this.targetValue;
    }

    // Update output
    this.constantSource.offset.setValueAtTime(
      this.currentValue,
      this.context.currentTime
    );
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'rise_mod':
      case 'fall_mod':
        // Could add CV control over slew times in future
        return null;
      default:
        return null;
    }
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
      case 'rise':
        this.params.rise = Math.max(0.001, Math.min(5, value as number));
        break;
      case 'fall':
        this.params.fall = Math.max(0.001, Math.min(5, value as number));
        break;
      case 'shape':
        if (['linear', 'exponential', 'logarithmic'].includes(value as string)) {
          this.params.shape = value as string;
        }
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
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.outputGain.disconnect();
    this.inputGain.disconnect();
    this.analyser.disconnect();
  }
}
