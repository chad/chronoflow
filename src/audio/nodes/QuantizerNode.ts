import type { SynthNode, AudioNodeParams } from './types';

// Scale definitions (semitones from root)
const SCALES: Record<string, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  wholetone: [0, 2, 4, 6, 8, 10],
};

export interface QuantizerParams {
  scale: string;
  root: number;  // Root note (0-11, C=0)
  octaves: number; // Range in octaves
}

const DEFAULT_PARAMS: QuantizerParams = {
  scale: 'minor',
  root: 0,
  octaves: 2,
};

export class SynthQuantizerNode implements SynthNode {
  id: string;
  type = 'quantizer';

  private context: AudioContext;
  private params: QuantizerParams;
  private inputGain: GainNode;
  private outputGain: GainNode;
  private analyser: AnalyserNode;
  private dataArray: Float32Array;
  private updateInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<QuantizerParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create nodes
    this.inputGain = context.createGain();
    this.outputGain = context.createGain();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Float32Array(this.analyser.fftSize);

    // Connect input to analyser for reading
    this.inputGain.connect(this.analyser);

    // Start quantization loop
    this.startQuantizing();
  }

  private startQuantizing(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }

    // Update at ~60Hz for smooth response
    this.updateInterval = window.setInterval(() => this.quantize(), 16);
  }

  private quantize(): void {
    // Read current input value
    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);
    const inputValue = this.dataArray[0] || 0;

    // Map input (-1 to 1) to semitone range
    const totalSemitones = this.params.octaves * 12;
    const semitone = Math.round(((inputValue + 1) / 2) * totalSemitones);

    // Quantize to scale
    const scale = SCALES[this.params.scale] || SCALES.chromatic;
    const quantized = this.quantizeToScale(semitone, scale, this.params.root);

    // Convert back to output value (scaled to match input range)
    const outputValue = (quantized / totalSemitones) * 2 - 1;

    // Set output
    this.outputGain.gain.setValueAtTime(outputValue, this.context.currentTime);
  }

  private quantizeToScale(semitone: number, scale: number[], root: number): number {
    // Adjust for root note
    const adjusted = semitone - root;
    const octave = Math.floor(adjusted / 12);
    const noteInOctave = ((adjusted % 12) + 12) % 12; // Handle negative

    // Find nearest note in scale
    let nearest = scale[0];
    let minDist = Math.abs(noteInOctave - scale[0]);

    for (const note of scale) {
      const dist = Math.abs(noteInOctave - note);
      if (dist < minDist) {
        minDist = dist;
        nearest = note;
      }
    }

    return root + octave * 12 + nearest;
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
      case 'scale':
        this.params.scale = value as string;
        break;
      case 'root':
        this.params.root = value as number;
        break;
      case 'octaves':
        this.params.octaves = Math.max(1, Math.min(4, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
    }
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.outputGain.disconnect();
  }
}
