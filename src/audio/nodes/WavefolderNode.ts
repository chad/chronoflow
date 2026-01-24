import type { SynthNode, AudioNodeParams } from './types';

export interface WavefolderParams {
  drive: number;  // Input gain before folding (1-10)
  folds: number;  // Number of folds (1-5)
  mix: number;    // Dry/wet mix (0-1)
}

const DEFAULT_PARAMS: WavefolderParams = {
  drive: 1,
  folds: 2,
  mix: 1,
};

export class SynthWavefolderNode implements SynthNode {
  id: string;
  type = 'wavefolder';

  private context: AudioContext;
  private params: WavefolderParams;
  private inputGain: GainNode;
  private driveGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private waveshaper: WaveShaperNode;
  private outputGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<WavefolderParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create nodes
    this.inputGain = context.createGain();
    this.driveGain = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.waveshaper = context.createWaveShaper();
    this.outputGain = context.createGain();

    // Set initial values
    this.driveGain.gain.value = this.params.drive;
    this.updateMix();
    this.updateFoldCurve();

    // Connect: input -> dry -> output
    //          input -> drive -> waveshaper -> wet -> output
    this.inputGain.connect(this.dryGain);
    this.inputGain.connect(this.driveGain);
    this.driveGain.connect(this.waveshaper);
    this.waveshaper.connect(this.wetGain);
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);
  }

  private updateFoldCurve(): void {
    const samples = 8192;
    const curve = new Float32Array(samples);
    const folds = this.params.folds;

    for (let i = 0; i < samples; i++) {
      // Map index to -1 to 1
      let x = (i / (samples - 1)) * 2 - 1;

      // Apply folding
      for (let f = 0; f < folds; f++) {
        if (x > 1) {
          x = 2 - x;
        } else if (x < -1) {
          x = -2 - x;
        }
      }

      // Additional sine-based folding for smoother sound
      x = Math.sin(x * Math.PI * folds) / folds;

      curve[i] = x;
    }

    this.waveshaper.curve = curve;
  }

  private updateMix(): void {
    this.dryGain.gain.value = 1 - this.params.mix;
    this.wetGain.gain.value = this.params.mix;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'drive_mod':
        return this.driveGain.gain;
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
      case 'drive':
        this.params.drive = value as number;
        this.driveGain.gain.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
      case 'folds':
        this.params.folds = Math.round(value as number);
        this.updateFoldCurve();
        break;
      case 'mix':
        this.params.mix = value as number;
        this.updateMix();
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.inputGain.disconnect();
    this.driveGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.waveshaper.disconnect();
    this.outputGain.disconnect();
  }
}
