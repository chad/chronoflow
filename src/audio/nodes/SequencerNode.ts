import type { SynthNode, AudioNodeParams } from './types';

export interface SequencerParams {
  bpm: number;
  steps: number;
  gate: number;
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  step6: number;
  step7: number;
  step8: number;
  running: boolean;
}

const DEFAULT_PARAMS: SequencerParams = {
  bpm: 120,
  steps: 8,
  gate: 0.5,
  step1: 0,
  step2: 2,
  step3: 4,
  step4: 5,
  step5: 7,
  step6: 9,
  step7: 11,
  step8: 12,
  running: true,
};

type NoteCallback = (note: number, velocity: number, gateTime: number) => void;
type StepCallback = (step: number) => void;

export class SynthSequencerNode implements SynthNode {
  id: string;
  type = 'sequencer';

  private context: AudioContext;
  private params: SequencerParams;
  private currentStep = 0;
  private intervalId: number | null = null;
  private noteCallback: NoteCallback | null = null;
  private stepCallbacks: StepCallback[] = [];
  private dummyGain: GainNode; // For satisfying the SynthNode interface

  constructor(context: AudioContext, id: string, params?: Partial<SequencerParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create a dummy gain node (sequencer doesn't produce audio)
    // Using context to satisfy it being used
    this.dummyGain = this.context.createGain();
    this.dummyGain.gain.value = 0;

    if (this.params.running) {
      this.start();
    }
  }

  // Set the callback that triggers notes
  setNoteCallback(callback: NoteCallback): void {
    this.noteCallback = callback;
  }

  // Subscribe to step changes (for UI visualization)
  onStep(callback: StepCallback): void {
    this.stepCallbacks.push(callback);
  }

  private getStepValue(step: number): number {
    const stepKey = `step${step + 1}` as keyof SequencerParams;
    return this.params[stepKey] as number;
  }

  private tick = (): void => {
    if (!this.params.running) return;

    const semitone = this.getStepValue(this.currentStep);
    const note = 60 + semitone; // C4 as base
    const velocity = 100;
    const stepDuration = 60 / this.params.bpm; // Duration of one step in seconds
    const gateTime = stepDuration * this.params.gate;

    // Notify UI of current step
    this.stepCallbacks.forEach((cb) => cb(this.currentStep));

    // Trigger the note
    if (this.noteCallback) {
      this.noteCallback(note, velocity, gateTime);
    }

    // Advance to next step
    this.currentStep = (this.currentStep + 1) % this.params.steps;
  };

  start(): void {
    if (this.intervalId !== null) return;

    const stepDuration = (60 / this.params.bpm) * 1000; // ms per step
    this.tick(); // Play first step immediately
    this.intervalId = window.setInterval(this.tick, stepDuration);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentStep = 0;
    this.stepCallbacks.forEach((cb) => cb(-1)); // Reset UI
  }

  private restartIfRunning(): void {
    if (this.params.running) {
      this.stop();
      this.start();
    }
  }

  getOutputNode(): AudioNode | null {
    return this.dummyGain;
  }

  getInputNode(): AudioNode | null {
    return null;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    return null;
  }

  connect(_destination: AudioNode | SynthNode): void {
    // Sequencer doesn't connect audio - it triggers notes
  }

  disconnect(): void {
    // No audio connections to disconnect
  }

  setParam(name: string, value: number | string | boolean): void {
    const prevRunning = this.params.running;

    switch (name) {
      case 'bpm':
        this.params.bpm = value as number;
        this.restartIfRunning();
        break;
      case 'steps':
        this.params.steps = Math.max(1, Math.min(8, value as number));
        if (this.currentStep >= this.params.steps) {
          this.currentStep = 0;
        }
        break;
      case 'gate':
        this.params.gate = value as number;
        break;
      case 'running':
        this.params.running = value as boolean;
        if (this.params.running && !prevRunning) {
          this.start();
        } else if (!this.params.running && prevRunning) {
          this.stop();
        }
        break;
      default:
        // Handle step values (step1, step2, etc.)
        if (name.startsWith('step')) {
          (this.params as unknown as Record<string, number | string | boolean>)[name] = value as number;
        }
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  dispose(): void {
    this.stop();
    this.stepCallbacks = [];
    this.noteCallback = null;
    this.dummyGain.disconnect();
  }
}
