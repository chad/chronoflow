import type { SynthNode, AudioNodeParams } from './types';
import { parseTrackerPattern, parseChain, legacyStepsToPattern, type ParsedStep } from './trackerParser';

export interface SequencerParams {
  bpm: number;
  steps: number;
  gate: number;
  swing: number;           // 0-100, 50 = no swing, 67 = typical swing
  // Multiple patterns (lanes)
  patternA: string;
  patternB: string;
  patternC: string;
  patternD: string;
  chain: string;           // Pattern chain, e.g., "AABA" or "A B A B"
  running: boolean;
  extClock: boolean;       // Use external clock instead of internal BPM
  // Legacy (deprecated, for migration):
  pattern?: string;        // Old single pattern, migrates to patternA
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
  swing: 50,
  patternA: 'C-4 D-4 E-4 F-4 G-4 A-4 B-4 C-5',
  patternB: '',
  patternC: '',
  patternD: '',
  chain: 'A',
  running: true,
  extClock: false,
};

type NoteCallback = (note: number, velocity: number, gateTime: number) => void;
type StepCallback = (step: number, chainIndex: number, patternKey: string) => void;
type StopCallback = () => void;

// Parsed patterns for all lanes
interface ParsedPatterns {
  A: ParsedStep[];
  B: ParsedStep[];
  C: ParsedStep[];
  D: ParsedStep[];
}

export class SynthSequencerNode implements SynthNode {
  id: string;
  type = 'sequencer';

  private context: AudioContext;
  private params: SequencerParams;
  private parsedPatterns: ParsedPatterns = { A: [], B: [], C: [], D: [] };
  private chainSequence: string[] = ['A'];
  private currentStep = 0;
  private currentChainIndex = 0;
  private stepCount = 0; // For odd/even swing calculation
  private intervalId: number | null = null;
  private swingTimeoutId: number | null = null;
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

    // Migration: convert legacy step1-step8 params to patternA if needed
    if (!params?.patternA && params?.step1 !== undefined) {
      const stepCount = params.steps || 8;
      mergedParams.patternA = legacyStepsToPattern(params as Record<string, number | string | boolean>, stepCount);
    }

    // Migration: convert old single 'pattern' to 'patternA'
    if (params?.pattern && !params?.patternA) {
      mergedParams.patternA = params.pattern;
    }

    this.params = mergedParams;

    // Parse all patterns and chain
    this.updateParsedPatterns();

    // Create a dummy gain node (sequencer doesn't produce audio)
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

  private updateParsedPatterns(): void {
    // Parse all patterns
    this.parsedPatterns.A = parseTrackerPattern(this.params.patternA || '').steps;
    this.parsedPatterns.B = parseTrackerPattern(this.params.patternB || '').steps;
    this.parsedPatterns.C = parseTrackerPattern(this.params.patternC || '').steps;
    this.parsedPatterns.D = parseTrackerPattern(this.params.patternD || '').steps;

    // Parse chain
    this.chainSequence = parseChain(this.params.chain);

    // Update steps count based on current pattern
    this.updateStepsFromCurrentPattern();
  }

  private updateStepsFromCurrentPattern(): void {
    const currentPatternKey = this.chainSequence[this.currentChainIndex] || 'A';
    const currentPattern = this.parsedPatterns[currentPatternKey as keyof ParsedPatterns];
    this.params.steps = currentPattern.length || 1;

    // Reset currentStep if out of bounds
    if (this.currentStep >= this.params.steps) {
      this.currentStep = 0;
    }
  }

  private getCurrentPattern(): ParsedStep[] {
    const currentPatternKey = this.chainSequence[this.currentChainIndex] || 'A';
    return this.parsedPatterns[currentPatternKey as keyof ParsedPatterns];
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

    const currentPattern = this.getCurrentPattern();
    const step = currentPattern[this.currentStep];
    const stepDuration = 60 / this.params.bpm; // Duration of one step in seconds
    const gateTime = stepDuration * this.params.gate;

    // Notify UI of current step, chain index, and pattern key
    const patternKey = this.getCurrentPatternKey();
    this.stepCallbacks.forEach((cb) => cb(this.currentStep, this.currentChainIndex, patternKey));

    // Check probability - roll the dice
    const shouldPlay = step ? Math.random() * 100 < step.probability : false;

    // Only trigger notes if:
    // - sequencer is connected
    // - step is a note (not rest)
    // - probability check passes
    if (this.noteCallback && this.isConnected && step?.type === 'note' && step.midiNote !== undefined && shouldPlay) {
      // Use per-step velocity, scale to 0-127 range for noteOn
      this.noteCallback(step.midiNote, step.velocity, gateTime);
    }

    // Advance to next step
    this.currentStep++;
    this.stepCount++;

    // Check if we've reached the end of the current pattern
    if (this.currentStep >= currentPattern.length) {
      this.currentStep = 0;
      // Advance to next pattern in chain
      this.currentChainIndex = (this.currentChainIndex + 1) % this.chainSequence.length;
      this.updateStepsFromCurrentPattern();
    }
  };

  // Calculate swing delay for current step (returns delay in ms)
  private getSwingDelay(): number {
    // Swing only affects off-beats (odd steps: 1, 3, 5, 7...)
    if (this.stepCount % 2 === 0) {
      return 0;
    }

    // swing=50 means no swing, swing=67 is typical, swing=75 is heavy
    // Convert to timing offset: at swing=67, off-beat is delayed by ~33% of step duration
    const swingAmount = (this.params.swing - 50) / 50; // -1 to 1, where 0 = no swing
    const stepDuration = (60 / this.params.bpm) * 1000; // ms
    const maxSwingOffset = stepDuration * 0.5; // Max swing is half a step

    return swingAmount * maxSwingOffset;
  }

  start(): void {
    if (this.params.extClock) {
      // External clock mode - start monitoring clock input
      this.startClockMonitoring();
    } else {
      // Internal clock mode
      if (this.intervalId !== null) return;

      this.scheduleNextTick();
    }
  }

  private scheduleNextTick(): void {
    if (!this.params.running || this.params.extClock) return;

    const stepDuration = (60 / this.params.bpm) * 1000; // ms per step
    const swingDelay = this.getSwingDelay();
    const totalDelay = stepDuration + swingDelay;

    // Execute tick
    this.tick();

    // Schedule next tick with swing-adjusted timing
    this.intervalId = window.setTimeout(() => {
      this.scheduleNextTick();
    }, totalDelay);
  }

  stop(): void {
    // Stop internal clock
    if (this.intervalId !== null) {
      window.clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    if (this.swingTimeoutId !== null) {
      window.clearTimeout(this.swingTimeoutId);
      this.swingTimeoutId = null;
    }
    // Stop clock monitoring
    this.stopClockMonitoring();

    // Reset state
    this.currentStep = 0;
    this.currentChainIndex = 0;
    this.stepCount = 0;
    this.updateStepsFromCurrentPattern();

    this.stepCallbacks.forEach((cb) => cb(-1, 0, 'A')); // Reset UI

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
    // With swing-based scheduling, we just let the next tick use the new BPM
    // No need to restart the interval
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
        this.updateTiming();
        break;
      case 'steps':
        // Steps is now derived from pattern, but allow manual override for UI
        this.params.steps = Math.max(1, Math.min(64, value as number));
        if (this.currentStep >= this.params.steps) {
          this.currentStep = 0;
        }
        break;
      case 'gate':
        this.params.gate = value as number;
        break;
      case 'swing':
        this.params.swing = Math.max(0, Math.min(100, value as number));
        break;
      case 'pattern':
        // Legacy: map 'pattern' to 'patternA'
        this.params.patternA = value as string;
        this.updateParsedPatterns();
        break;
      case 'patternA':
        this.params.patternA = value as string;
        this.updateParsedPatterns();
        break;
      case 'patternB':
        this.params.patternB = value as string;
        this.updateParsedPatterns();
        break;
      case 'patternC':
        this.params.patternC = value as string;
        this.updateParsedPatterns();
        break;
      case 'patternD':
        this.params.patternD = value as string;
        this.updateParsedPatterns();
        break;
      case 'chain':
        this.params.chain = value as string;
        this.chainSequence = parseChain(value as string);
        // Reset to start of chain
        this.currentChainIndex = 0;
        this.currentStep = 0;
        this.updateStepsFromCurrentPattern();
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
              window.clearTimeout(this.intervalId);
              this.intervalId = null;
            }
            this.startClockMonitoring();
          } else if (!this.params.extClock && prevExtClock) {
            // Switch to internal clock
            this.stopClockMonitoring();
            this.scheduleNextTick();
          }
        }
        break;
      default:
        // Handle legacy step values (step1, step2, etc.) for backward compatibility
        if (name.startsWith('step') && !name.startsWith('steps')) {
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

  getCurrentChainIndex(): number {
    return this.currentChainIndex;
  }

  getCurrentPatternKey(): string {
    return this.chainSequence[this.currentChainIndex] || 'A';
  }

  getChainSequence(): string[] {
    return this.chainSequence;
  }

  getParsedSteps(): ParsedStep[] {
    // Return current pattern's steps for backward compatibility
    return this.getCurrentPattern();
  }

  getParsedPatterns(): ParsedPatterns {
    return this.parsedPatterns;
  }

  getPatternSteps(key: 'A' | 'B' | 'C' | 'D'): ParsedStep[] {
    return this.parsedPatterns[key];
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
