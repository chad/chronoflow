// SwitchNode - Routes between multiple inputs based on CV control
// Essential for switching between patterns, voices, or effects

import type { SynthNode, AudioNodeParams } from './types';

export interface SwitchParams {
  channels: number;   // Number of input channels (2-4)
  mode: 'cv' | 'sequential' | 'random';  // Selection mode
  position: number;   // Manual position (0-1, maps to channels)
  smooth: number;     // Crossfade time in ms (0 = instant)
}

const DEFAULT_PARAMS: SwitchParams = {
  channels: 2,
  mode: 'cv',
  position: 0,
  smooth: 10,
};

export class SynthSwitchNode implements SynthNode {
  id: string;
  type = 'switch';

  private context: AudioContext;
  private params: SwitchParams;

  // Input channels
  private inputs: GainNode[];
  private inputGains: GainNode[];  // For crossfading

  // CV control input
  private cvInput: GainNode;
  private cvAnalyser: AnalyserNode;
  private cvData: Float32Array;
  private hasCVInput: boolean = false;

  // Trigger input (for sequential mode)
  private triggerInput: GainNode;
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array;
  private lastTriggerValue: number = 0;

  // Output
  private outputGain: GainNode;

  // State
  private currentChannel: number = 0;
  private checkInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<SwitchParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create input channels with crossfade gains
    this.inputs = [];
    this.inputGains = [];
    for (let i = 0; i < 4; i++) {
      const input = context.createGain();
      input.gain.value = 1;
      const fadeGain = context.createGain();
      fadeGain.gain.value = i === 0 ? 1 : 0;
      input.connect(fadeGain);
      this.inputs.push(input);
      this.inputGains.push(fadeGain);
    }

    // Output
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Connect all fade gains to output
    this.inputGains.forEach(g => g.connect(this.outputGain));

    // CV control input
    this.cvInput = context.createGain();
    this.cvInput.gain.value = 1;
    this.cvAnalyser = context.createAnalyser();
    this.cvAnalyser.fftSize = 256;
    this.cvData = new Float32Array(this.cvAnalyser.fftSize);
    this.cvInput.connect(this.cvAnalyser);

    // Trigger input for sequential mode
    this.triggerInput = context.createGain();
    this.triggerInput.gain.value = 1;
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize);
    this.triggerInput.connect(this.triggerAnalyser);

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.checkInterval = window.setInterval(() => {
      this.updateSelection();
    }, 10);
  }

  private updateSelection(): void {
    let targetChannel = this.currentChannel;

    if (this.params.mode === 'cv') {
      // CV mode: use CV input or position param
      let position = this.params.position;

      if (this.hasCVInput) {
        this.cvAnalyser.getFloatTimeDomainData(this.cvData as Float32Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < this.cvData.length; i++) {
          sum += this.cvData[i];
        }
        // Normalize CV (assume 0-1 range, clamp)
        position = Math.max(0, Math.min(1, sum / this.cvData.length));
      }

      // Map position to channel
      targetChannel = Math.floor(position * this.params.channels);
      targetChannel = Math.max(0, Math.min(this.params.channels - 1, targetChannel));

    } else if (this.params.mode === 'sequential') {
      // Sequential mode: advance on trigger
      this.triggerAnalyser.getFloatTimeDomainData(this.triggerData as Float32Array<ArrayBuffer>);
      let maxValue = 0;
      for (let i = 0; i < this.triggerData.length; i++) {
        if (this.triggerData[i] > maxValue) maxValue = this.triggerData[i];
      }

      if (maxValue > 0.5 && this.lastTriggerValue <= 0.5) {
        targetChannel = (this.currentChannel + 1) % this.params.channels;
      }
      this.lastTriggerValue = maxValue;

    } else if (this.params.mode === 'random') {
      // Random mode: random channel on trigger
      this.triggerAnalyser.getFloatTimeDomainData(this.triggerData as Float32Array<ArrayBuffer>);
      let maxValue = 0;
      for (let i = 0; i < this.triggerData.length; i++) {
        if (this.triggerData[i] > maxValue) maxValue = this.triggerData[i];
      }

      if (maxValue > 0.5 && this.lastTriggerValue <= 0.5) {
        targetChannel = Math.floor(Math.random() * this.params.channels);
      }
      this.lastTriggerValue = maxValue;
    }

    // Apply crossfade if channel changed
    if (targetChannel !== this.currentChannel) {
      this.crossfadeTo(targetChannel);
    }
  }

  private crossfadeTo(channel: number): void {
    const now = this.context.currentTime;
    const fadeTime = this.params.smooth / 1000;

    // Fade out current channel
    this.inputGains[this.currentChannel].gain.setTargetAtTime(0, now, fadeTime / 3);

    // Fade in new channel
    this.inputGains[channel].gain.setTargetAtTime(1, now, fadeTime / 3);

    this.currentChannel = channel;
  }

  // Get specific input channel
  getInput(channel: number): AudioNode | null {
    if (channel >= 1 && channel <= 4) {
      return this.inputs[channel - 1];
    }
    return null;
  }

  // Get CV input
  getCVInput(): AudioNode {
    this.hasCVInput = true;
    return this.cvInput;
  }

  // Get trigger input (for sequential/random modes)
  getTriggerInput(): AudioNode {
    return this.triggerInput;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    // Default to input 1
    return this.inputs[0];
  }

  getModulationTarget(paramName: string): AudioParam | null {
    if (paramName === 'position_mod') {
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
      case 'channels':
        this.params.channels = Math.max(2, Math.min(4, value as number));
        break;
      case 'mode':
        this.params.mode = value as 'cv' | 'sequential' | 'random';
        break;
      case 'position':
        this.params.position = Math.max(0, Math.min(1, value as number));
        break;
      case 'smooth':
        this.params.smooth = Math.max(0, Math.min(500, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentChannel(): number {
    return this.currentChannel;
  }

  dispose(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }
    this.inputs.forEach(i => i.disconnect());
    this.inputGains.forEach(g => g.disconnect());
    this.cvInput.disconnect();
    this.cvAnalyser.disconnect();
    this.triggerInput.disconnect();
    this.triggerAnalyser.disconnect();
    this.outputGain.disconnect();
  }
}
