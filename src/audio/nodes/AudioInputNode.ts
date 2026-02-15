// AudioInputNode - Captures live audio input (microphone, stream, etc.)
// Brings external audio into the modular graph for processing

import type { SynthNode, AudioNodeParams } from './types';

export interface AudioInputParams {
  gain: number;        // Input gain (0-2)
  monitoring: boolean; // Whether to pass-through dry signal
  source: 'microphone' | 'stream'; // Input source type
}

const DEFAULT_PARAMS: AudioInputParams = {
  gain: 1.0,
  monitoring: false,
  source: 'microphone',
};

export class SynthAudioInputNode implements SynthNode {
  id: string;
  type = 'audioinput';

  private context: AudioContext;
  private params: AudioInputParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private monitorGain: GainNode;

  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private externalSourceConnected = false;
  private isActive = false;

  constructor(context: AudioContext, id: string, params?: Partial<AudioInputParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = this.params.gain;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Monitor path (for hearing input directly — off by default to avoid feedback)
    this.monitorGain = context.createGain();
    this.monitorGain.gain.value = this.params.monitoring ? 1 : 0;

    this.inputGain.connect(this.outputGain);
    this.inputGain.connect(this.monitorGain);
    this.monitorGain.connect(context.destination);
  }

  // Request microphone access and start capturing
  async startMicrophone(): Promise<void> {
    if (this.isActive && this.params.source === 'microphone') return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.sourceNode = this.context.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.inputGain);
      this.isActive = true;
    } catch (err) {
      console.error('AudioInputNode: Failed to get microphone access', err);
    }
  }

  // Connect an external MediaStream (e.g., from ElevenLabs, WebRTC, screen capture)
  connectStream(stream: MediaStream): void {
    this.stopCapture();
    this.mediaStream = stream;
    this.sourceNode = this.context.createMediaStreamSource(stream);
    this.sourceNode.connect(this.inputGain);
    this.isActive = true;
    this.externalSourceConnected = true;
  }

  // Connect an existing AudioNode directly (e.g., MediaElementSource)
  connectAudioNode(node: AudioNode): void {
    node.connect(this.inputGain);
    this.externalSourceConnected = true;
    this.isActive = true;
  }

  // Stop all capture
  stopCapture(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream && !this.externalSourceConnected) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    this.mediaStream = null;
    this.isActive = false;
    this.externalSourceConnected = false;
  }

  isCapturing(): boolean {
    return this.isActive;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    // Allow other nodes to feed audio into this node (acts as pass-through)
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'gain_mod':
        return this.inputGain.gain;
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

  setParam(name: string, value: number | string | boolean): void {
    switch (name) {
      case 'gain':
        this.params.gain = Math.max(0, Math.min(2, value as number));
        this.inputGain.gain.setTargetAtTime(this.params.gain, this.context.currentTime, 0.01);
        break;
      case 'monitoring':
        this.params.monitoring = value as boolean;
        this.monitorGain.gain.setTargetAtTime(
          this.params.monitoring ? 1 : 0,
          this.context.currentTime,
          0.01
        );
        break;
      case 'source':
        this.params.source = value as 'microphone' | 'stream';
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.stopCapture();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.monitorGain.disconnect();
  }
}
