import type { SynthNode, AudioNodeParams } from './types';
import { parseTrackerPattern, legacyStepsToPattern, type ParsedStep } from './trackerParser';

export interface SequencerParams {
  bpm: number;
  steps: number;
  gate: number;
  pattern: string;         // NEW: Tracker notation string
  running: boolean;
  extClock: boolean;       // Use external clock instead of internal BPM
  // Legacy (deprecated, for migration):
  step1?: number;
  step2?: number;
  step3?: number;
  step4?: number;
  step5?: number;
  step6?: number;
  step7?: number;
  step8?: number;
}

const DEFAULT_PARAMS: SequencerParams = {
  bpm: 120,
  steps: 8,
  gate: 0.5,
  pattern: 'C-4 D-4 E-4 F-4 G-4 A-4 B-4 C-5',
  running: true,
  extClock: false,
};

type NoteCallback = (note: number, velocity: number, gateTime: number) => void;
type StepCallback = (step: number) => void;
type StopCallback = () => void;

export class SynthSequencerNode implements SynthNode {
  id: string;
  type = 'sequencer';

  private context: AudioContext;
  private params: SequencerParams;
  private parsedSteps: ParsedStep[] = [];
  private currentStep = 0;
  private intervalId: number | null = null;
  private noteCallback: NoteCallback | null = null;
  private stopCallback: StopCallback | null = null;
  private stepCallbacks: StepCallback[] = [];
  private dummyGain: GainNode; // For satisfying the SynthNode interface
  private isConnected = false; // Only trigger notes when connected

  // External clock input
  private clockInput: GainNode;
  private clockAnalyser: AnalyserNode;
  private clockDataArray: Float32Array;
  private lastClockValue: number = 0;
  private clockCheckInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<SequencerParams>) {
    this.context = context;
    this.id = id;

    // Merge with defaults
    const mergedParams = { ...DEFAULT_PARAMS, ...params };

    // Migration: convert legacy step1-step8 params to pattern if needed
    if (!params?.pattern && params?.step1 !== undefined) {
      const stepCount = params.steps || 8;
      mergedParams.pattern = legacyStepsToPattern(params as Record<string, number | string | boolean>, stepCount);
    }

    this.params = mergedParams;

    // Parse the pattern
    this.updateParsedSteps();

    // Create a dummy gain node (sequencer doesn't produce audio)
    // Using context to satisfy it being used
    this.dummyGain = this.context.createGain();
    this.dummyGain.gain.value = 0;

    // Create clock input for external clock
    this.clockInput = context.createGain();
    this.clockAnalyser = context.createAnalyser();
    this.clockAnalyser.fftSize = 256;
    this.clockDataArray = new Float32Array(this.clockAnalyser.fftSize);
    this.clockInput.connect(this.clockAnalyser);

    if (this.params.running) {
      this.start();
    }
  }

  private updateParsedSteps(): void {
    const { steps } = parseTrackerPattern(this.params.pattern);
    this.parsedSteps = steps;
    this.params.steps = steps.length;
    // Reset currentStep if out of bounds
    if (this.currentStep >= this.params.steps) {
      this.currentStep = 0;
    }
  }

  // Set the callback that triggers notes
  setNoteCallback(callback: NoteCallback): void {
    this.noteCallback = callback;
  }

  // Set the callback for when sequencer stops (to clear effects)
  setStopCallback(callback: StopCallback): void {
    this.stopCallback = callback;
  }

  // Subscribe to step changes (for UI visualization)
  onStep(callback: StepCallback): void {
    this.stepCallbacks.push(callback);
  }

  private tick = (): void => {
    if (!this.params.running) return;

    const step = this.parsedSteps[this.currentStep];
    const velocity = 100;
    const stepDuration = 60 / this.params.bpm; // Duration of one step in seconds
    const gateTime = stepDuration * this.params.gate;

    // Notify UI of current step
    this.stepCallbacks.forEach((cb) => cb(this.currentStep));

    // Only trigger notes if the sequencer is connected to something and step is a note
    if (this.noteCallback && this.isConnected && step?.type === 'note' && step.midiNote !== undefined) {
      this.noteCallback(step.midiNote, velocity, gateTime);
    }

    // Advance to next step
    this.currentStep = (this.currentStep + 1) % this.params.steps;
  };

  start(): void {
    if (this.params.extClock) {
      // External clock mode - start monitoring clock input
      this.startClockMonitoring();
    } else {
      // Internal clock mode
      if (this.intervalId !== null) return;

      const stepDuration = (60 / this.params.bpm) * 1000; // ms per step
      this.tick(); // Play first step immediately
      this.intervalId = window.setInterval(this.tick, stepDuration);
    }
  }

  stop(): void {
    // Stop internal clock
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Stop clock monitoring
    this.stopClockMonitoring();

    this.currentStep = 0;
    this.stepCallbacks.forEach((cb) => cb(-1)); // Reset UI

    // Clear effects when stopping
    if (this.stopCallback) {
      this.stopCallback();
    }
  }

  private startClockMonitoring(): void {
    if (this.clockCheckInterval !== null) return;
    this.clockCheckInterval = window.setInterval(() => this.checkClockInput(), 2);
  }

  private stopClockMonitoring(): void {
    if (this.clockCheckInterval !== null) {
      window.clearInterval(this.clockCheckInterval);
      this.clockCheckInterval = null;
    }
  }

  private checkClockInput(): void {
    this.clockAnalyser.getFloatTimeDomainData(this.clockDataArray as Float32Array<ArrayBuffer>);
    const currentValue = this.clockDataArray[0] || 0;

    // Detect rising edge (trigger)
    if (currentValue > 0.5 && this.lastClockValue <= 0.5) {
      this.tick();
    }

    this.lastClockValue = currentValue;
  }

  // External trigger method (can be called directly by clock nodes)
  externalTrigger(): void {
    if (this.params.running) {
      this.tick();
    }
  }

  // Update the interval timing without triggering a new note
  private updateTiming(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      const stepDuration = (60 / this.params.bpm) * 1000;
      this.intervalId = window.setInterval(this.tick, stepDuration);
    }
  }

  getOutputNode(): AudioNode | null {
    return this.dummyGain;
  }

  getInputNode(): AudioNode | null {
    // Return clock input for external clock connections
    return this.clockInput;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'clock':
        // Return clock input gain for modulation-style connections
        return this.clockInput.gain;
      default:
        return null;
    }
  }

  connect(_destination: AudioNode | SynthNode): void {
    // Sequencer doesn't connect audio, but we track that it's "connected"
    // to enable note triggering (modular synth paradigm)
    this.isConnected = true;
  }

  disconnect(): void {
    // Mark as disconnected to stop triggering notes
    this.isConnected = false;
  }

  // Called by AudioGraph when a connection is made to this sequencer's output
  setConnected(connected: boolean): void {
    this.isConnected = connected;
  }

  setParam(name: string, value: number | string | boolean): void {
    const prevRunning = this.params.running;
    const prevExtClock = this.params.extClock;

    switch (name) {
      case 'bpm':
        this.params.bpm = value as number;
        this.updateTiming(); // Update interval without triggering a note
        break;
      case 'steps':
        // Steps is now derived from pattern, but allow manual override for UI
        this.params.steps = Math.max(1, Math.min(32, value as number));
        if (this.currentStep >= this.params.steps) {
          this.currentStep = 0;
        }
        break;
      case 'gate':
        this.params.gate = value as number;
        break;
      case 'pattern':
        this.params.pattern = value as string;
        this.updateParsedSteps();
        break;
      case 'running':
        this.params.running = value as boolean;
        if (this.params.running && !prevRunning) {
          this.start();
        } else if (!this.params.running && prevRunning) {
          this.stop();
        }
        break;
      case 'extClock':
        this.params.extClock = value as boolean;
        // Switch clock mode if running
        if (this.params.running) {
          if (this.params.extClock && !prevExtClock) {
            // Switch to external clock
            if (this.intervalId !== null) {
              window.clearInterval(this.intervalId);
              this.intervalId = null;
            }
            this.startClockMonitoring();
          } else if (!this.params.extClock && prevExtClock) {
            // Switch to internal clock
            this.stopClockMonitoring();
            const stepDuration = (60 / this.params.bpm) * 1000;
            this.intervalId = window.setInterval(this.tick, stepDuration);
          }
        }
        break;
      default:
        // Handle legacy step values (step1, step2, etc.) for backward compatibility
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

  getParsedSteps(): ParsedStep[] {
    return this.parsedSteps;
  }

  dispose(): void {
    this.stop();
    this.stepCallbacks = [];
    this.noteCallback = null;
    this.dummyGain.disconnect();
    this.clockInput.disconnect();
    this.clockAnalyser.disconnect();
  }
}
