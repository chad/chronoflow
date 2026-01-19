// Base types for audio nodes

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type FilterMode = 'lowpass' | 'highpass' | 'bandpass';

export interface AudioNodeParams {
  [key: string]: number | string | boolean;
}

export interface SynthNode {
  id: string;
  type: string;
  getOutputNode(): AudioNode | null;
  getInputNode(): AudioNode | null;
  getModulationTarget(paramName: string): AudioParam | null;
  connect(destination: AudioNode | SynthNode): void;
  disconnect(): void;
  setParam(name: string, value: number | string): void;
  getParams(): AudioNodeParams;
  dispose(): void;
}

export interface ModulatableParam {
  audioParam: AudioParam;
  baseValue: number;
  modulationAmount: number;
}
