// SequenceChainNode - Manages progression through musical sections/scenes
// Outputs scene number and triggers for section changes

import type { SynthNode, AudioNodeParams } from './types';

export interface SequenceChainParams {
  scenes: number;         // Number of scenes (2-8)
  stepsPerScene: number;  // Clock pulses per scene (1-64)
  mode: 'forward' | 'reverse' | 'pingpong' | 'random';
  loop: boolean;          // Loop or stop at end
}

const DEFAULT_PARAMS: SequenceChainParams = {
  scenes: 4,
  stepsPerScene: 16,
  mode: 'forward',
  loop: true,
};

export class SynthSequenceChainNode implements SynthNode {
  id: string;
  type = 'sequencechain';

  private context: AudioContext;
  private params: SequenceChainParams;

  // State
  private currentScene: number = 0;
  private currentStep: number = 0;
  private direction: 1 | -1 = 1; // For pingpong

  // Clock input
  private clockInput: GainNode;
  private clockAnalyser: AnalyserNode;
  private clockData: Float32Array;
  private lastClockValue: number = 0;

  // Reset input
  private resetInput: GainNode;
  private resetAnalyser: AnalyserNode;
  private resetData: Float32Array;
  private lastResetValue: number = 0;

  // Scene CV output (0-1 representing current scene)
  private sceneSource: ConstantSourceNode;
  private sceneGain: GainNode;

  // Scene trigger output (pulse on scene change)
  private triggerGain: GainNode;

  // Individual scene gate outputs (high when that scene is active)
  private sceneGates: GainNode[];

  private checkInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<SequenceChainParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Clock input
    this.clockInput = context.createGain();
    this.clockInput.gain.value = 1;
    this.clockAnalyser = context.createAnalyser();
    this.clockAnalyser.fftSize = 256;
    this.clockData = new Float32Array(this.clockAnalyser.fftSize);
    this.clockInput.connect(this.clockAnalyser);

    // Reset input
    this.resetInput = context.createGain();
    this.resetInput.gain.value = 1;
    this.resetAnalyser = context.createAnalyser();
    this.resetAnalyser.fftSize = 256;
    this.resetData = new Float32Array(this.resetAnalyser.fftSize);
    this.resetInput.connect(this.resetAnalyser);

    // Scene CV output
    this.sceneSource = context.createConstantSource();
    this.sceneSource.offset.value = 1;
    this.sceneGain = context.createGain();
    this.sceneGain.gain.value = 0;
    this.sceneSource.connect(this.sceneGain);
    this.sceneSource.start();

    // Scene change trigger
    this.triggerGain = context.createGain();
    this.triggerGain.gain.value = 0;

    // Individual scene gates (8 max)
    this.sceneGates = [];
    for (let i = 0; i < 8; i++) {
      const gate = context.createGain();
      gate.gain.value = i === 0 ? 1 : 0;
      this.sceneSource.connect(gate);
      this.sceneGates.push(gate);
    }

    // Update scene CV
    this.updateSceneOutput();

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.checkInterval = window.setInterval(() => {
      this.checkClock();
      this.checkReset();
    }, 5);
  }

  private checkClock(): void {
    this.clockAnalyser.getFloatTimeDomainData(this.clockData as Float32Array<ArrayBuffer>);

    let maxValue = 0;
    for (let i = 0; i < this.clockData.length; i++) {
      if (this.clockData[i] > maxValue) maxValue = this.clockData[i];
    }

    if (maxValue > 0.5 && this.lastClockValue <= 0.5) {
      this.onClockPulse();
    }

    this.lastClockValue = maxValue;
  }

  private checkReset(): void {
    this.resetAnalyser.getFloatTimeDomainData(this.resetData as Float32Array<ArrayBuffer>);

    let maxValue = 0;
    for (let i = 0; i < this.resetData.length; i++) {
      if (this.resetData[i] > maxValue) maxValue = this.resetData[i];
    }

    if (maxValue > 0.5 && this.lastResetValue <= 0.5) {
      this.reset();
    }

    this.lastResetValue = maxValue;
  }

  private onClockPulse(): void {
    this.currentStep++;

    if (this.currentStep >= this.params.stepsPerScene) {
      // Time to advance scene
      this.currentStep = 0;
      this.advanceScene();
    }
  }

  private advanceScene(): void {
    const prevScene = this.currentScene;

    switch (this.params.mode) {
      case 'forward':
        this.currentScene++;
        if (this.currentScene >= this.params.scenes) {
          this.currentScene = this.params.loop ? 0 : this.params.scenes - 1;
        }
        break;

      case 'reverse':
        this.currentScene--;
        if (this.currentScene < 0) {
          this.currentScene = this.params.loop ? this.params.scenes - 1 : 0;
        }
        break;

      case 'pingpong':
        this.currentScene += this.direction;
        if (this.currentScene >= this.params.scenes - 1) {
          this.currentScene = this.params.scenes - 1;
          this.direction = -1;
        } else if (this.currentScene <= 0) {
          this.currentScene = 0;
          this.direction = 1;
        }
        break;

      case 'random':
        this.currentScene = Math.floor(Math.random() * this.params.scenes);
        break;
    }

    // Fire trigger if scene changed
    if (this.currentScene !== prevScene) {
      this.updateSceneOutput();
      this.fireTrigger();
    }
  }

  private updateSceneOutput(): void {
    const now = this.context.currentTime;

    // Update scene CV (normalized 0-1)
    const normalizedScene = this.currentScene / Math.max(1, this.params.scenes - 1);
    this.sceneGain.gain.setValueAtTime(normalizedScene, now);

    // Update individual scene gates
    for (let i = 0; i < this.sceneGates.length; i++) {
      this.sceneGates[i].gain.setValueAtTime(i === this.currentScene ? 1 : 0, now);
    }
  }

  private fireTrigger(): void {
    const now = this.context.currentTime;
    this.triggerGain.gain.setValueAtTime(1, now);
    this.triggerGain.gain.setValueAtTime(0, now + 0.01);
  }

  reset(): void {
    this.currentScene = this.params.mode === 'reverse' ? this.params.scenes - 1 : 0;
    this.currentStep = 0;
    this.direction = 1;
    this.updateSceneOutput();
  }

  // Get clock input
  getClockInput(): AudioNode {
    return this.clockInput;
  }

  // Get reset input
  getResetInput(): AudioNode {
    return this.resetInput;
  }

  // Get scene trigger output
  getTriggerOutput(): AudioNode {
    return this.triggerGain;
  }

  // Get specific scene gate (1-8)
  getSceneGate(scene: number): AudioNode | null {
    if (scene >= 1 && scene <= 8) {
      return this.sceneGates[scene - 1];
    }
    return null;
  }

  getOutputNode(): AudioNode {
    return this.sceneGain;
  }

  getInputNode(): AudioNode {
    return this.clockInput;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    return null;
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.sceneGain.connect(input);
      }
    } else {
      this.sceneGain.connect(destination);
    }
  }

  disconnect(): void {
    this.sceneGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'scenes':
        this.params.scenes = Math.max(2, Math.min(8, value as number));
        if (this.currentScene >= this.params.scenes) {
          this.currentScene = this.params.scenes - 1;
        }
        this.updateSceneOutput();
        break;
      case 'stepsPerScene':
        this.params.stepsPerScene = Math.max(1, Math.min(64, value as number));
        break;
      case 'mode':
        this.params.mode = value as 'forward' | 'reverse' | 'pingpong' | 'random';
        break;
      case 'loop':
        this.params.loop = value === 'true' || value === 1 || value === '1';
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentScene(): number {
    return this.currentScene;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  dispose(): void {
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval);
    }
    this.clockInput.disconnect();
    this.clockAnalyser.disconnect();
    this.resetInput.disconnect();
    this.resetAnalyser.disconnect();
    this.sceneSource.stop();
    this.sceneSource.disconnect();
    this.sceneGain.disconnect();
    this.triggerGain.disconnect();
    this.sceneGates.forEach(g => g.disconnect());
  }
}
