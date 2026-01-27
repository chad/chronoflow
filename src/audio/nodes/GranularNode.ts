// GranularNode - Granular processor for ambient textures
// Records audio input and plays it back as overlapping grains

import type { SynthNode, AudioNodeParams } from './types';

export interface GranularParams {
  grainSize: number; // Grain duration in ms (10-500)
  density: number; // Grains per second (1-50)
  spray: number; // Position randomization (0-1)
  pitch: number; // Pitch shift factor (0.5-2.0, 1.0 = normal)
  position: number; // Playback position in buffer (0-1)
  freeze: boolean; // Stop recording, loop current buffer
  mix: number; // Dry/wet mix (0-1)
  reverse: number; // Probability of reverse grains (0-1)
}

const DEFAULT_PARAMS: GranularParams = {
  grainSize: 100,
  density: 10,
  spray: 0.1,
  pitch: 1.0,
  position: 0.5,
  freeze: false,
  mix: 1.0,
  reverse: 0,
};

// Maximum buffer duration in seconds
const BUFFER_DURATION = 4;

export class SynthGranularNode implements SynthNode {
  id: string;
  type = 'granular';

  private context: AudioContext;
  private params: GranularParams;

  // Recording
  private recordBuffer: AudioBuffer;
  private recordNode: ScriptProcessorNode;
  private writePosition: number = 0;
  private isRecording: boolean = true;

  // Playback
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private inputGain: GainNode;
  private grainInterval: number | null = null;
  private activeGrains: Set<AudioBufferSourceNode> = new Set();
  private playPosition: number = 0;

  // Window function for grain envelope (reserved for future use)
  // private windowBuffer: AudioBuffer;

  constructor(context: AudioContext, id: string, params?: Partial<GranularParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create recording buffer (circular buffer)
    const bufferLength = Math.floor(BUFFER_DURATION * context.sampleRate);
    this.recordBuffer = context.createBuffer(1, bufferLength, context.sampleRate);

    // Create window function buffer (Hann window) - reserved for future optimization
    // this.windowBuffer = this.createWindowBuffer(0.1); // 100ms default

    // Create input/output nodes
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.updateMix();

    // Connect dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path goes through grain processing
    this.wetGain.connect(this.outputGain);

    // Create recording processor
    // Note: ScriptProcessorNode is deprecated but AudioWorklet requires more setup
    // Using small buffer size for low latency recording
    this.recordNode = context.createScriptProcessor(2048, 1, 1);
    this.recordNode.onaudioprocess = (e) => this.processRecording(e);
    this.inputGain.connect(this.recordNode);
    this.recordNode.connect(context.destination); // Must be connected to work

    // Start grain spawning
    this.startGrainScheduler();
  }

  // Reserved for future optimization - pre-compute window buffer
  // private createWindowBuffer(durationSec: number): AudioBuffer {
  //   const length = Math.floor(durationSec * this.context.sampleRate);
  //   const buffer = this.context.createBuffer(1, Math.max(length, 64), this.context.sampleRate);
  //   const data = buffer.getChannelData(0);
  //   for (let i = 0; i < data.length; i++) {
  //     const t = i / (data.length - 1);
  //     data[i] = 0.5 * (1 - Math.cos(2 * Math.PI * t));
  //   }
  //   return buffer;
  // }

  private processRecording(event: AudioProcessingEvent): void {
    if (this.params.freeze || !this.isRecording) return;

    const input = event.inputBuffer.getChannelData(0);
    const recordData = this.recordBuffer.getChannelData(0);
    const bufferLength = recordData.length;

    for (let i = 0; i < input.length; i++) {
      recordData[this.writePosition] = input[i];
      this.writePosition = (this.writePosition + 1) % bufferLength;
    }
  }

  private startGrainScheduler(): void {
    if (this.grainInterval !== null) {
      window.clearInterval(this.grainInterval);
    }

    // Calculate interval based on density
    const intervalMs = 1000 / this.params.density;
    this.grainInterval = window.setInterval(() => this.spawnGrain(), intervalMs);
  }

  private spawnGrain(): void {
    const recordData = this.recordBuffer.getChannelData(0);
    const bufferLength = recordData.length;
    const sampleRate = this.context.sampleRate;

    // Calculate grain parameters
    const grainDuration = this.params.grainSize / 1000; // Convert to seconds
    const grainSamples = Math.floor(grainDuration * sampleRate);

    // Position with spray (randomization)
    const basePosition = this.params.position * bufferLength;
    const sprayAmount = this.params.spray * bufferLength * 0.5;
    const spray = (Math.random() - 0.5) * 2 * sprayAmount;
    let readPosition = Math.floor(basePosition + spray);

    // Wrap position
    readPosition = ((readPosition % bufferLength) + bufferLength) % bufferLength;

    // Create grain buffer
    const grainBuffer = this.context.createBuffer(1, grainSamples, sampleRate);
    const grainData = grainBuffer.getChannelData(0);

    // Determine if this grain plays in reverse
    const shouldReverse = Math.random() < this.params.reverse;

    // Copy data from record buffer with windowing
    for (let i = 0; i < grainSamples; i++) {
      const windowPos = i / grainSamples;
      // Hann window
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * windowPos));

      let sampleIndex: number;
      if (shouldReverse) {
        sampleIndex = (readPosition + grainSamples - i) % bufferLength;
      } else {
        sampleIndex = (readPosition + i) % bufferLength;
      }

      grainData[i] = recordData[sampleIndex] * windowValue;
    }

    // Create source node for this grain
    const source = this.context.createBufferSource();
    source.buffer = grainBuffer;
    source.playbackRate.value = this.params.pitch;

    // Connect to wet output
    source.connect(this.wetGain);

    // Track active grains for cleanup
    this.activeGrains.add(source);
    source.onended = () => {
      this.activeGrains.delete(source);
    };

    // Play the grain
    source.start();

    // Slowly advance play position when not frozen (for texture evolution)
    if (!this.params.freeze) {
      this.playPosition += grainSamples * 0.01; // Slow advance
      if (this.playPosition >= bufferLength) {
        this.playPosition = 0;
      }
    }
  }

  private updateMix(): void {
    this.dryGain.gain.setValueAtTime(1 - this.params.mix, this.context.currentTime);
    this.wetGain.gain.setValueAtTime(this.params.mix, this.context.currentTime);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'mix_mod':
        return this.wetGain.gain;
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
      case 'grainSize':
        this.params.grainSize = Math.max(10, Math.min(500, value as number));
        break;
      case 'density':
        this.params.density = Math.max(1, Math.min(50, value as number));
        this.startGrainScheduler();
        break;
      case 'spray':
        this.params.spray = Math.max(0, Math.min(1, value as number));
        break;
      case 'pitch':
        this.params.pitch = Math.max(0.25, Math.min(4, value as number));
        break;
      case 'position':
        this.params.position = Math.max(0, Math.min(1, value as number));
        break;
      case 'freeze':
        this.params.freeze = value as boolean;
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'reverse':
        this.params.reverse = Math.max(0, Math.min(1, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  // Trigger freeze toggle
  trigger(): void {
    this.params.freeze = !this.params.freeze;
  }

  dispose(): void {
    if (this.grainInterval !== null) {
      window.clearInterval(this.grainInterval);
    }

    // Stop all active grains
    this.activeGrains.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.activeGrains.clear();

    this.recordNode.disconnect();
    this.inputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.outputGain.disconnect();
  }
}
