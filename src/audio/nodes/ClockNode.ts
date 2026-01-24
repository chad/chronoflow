import type { SynthNode, AudioNodeParams } from './types';

export interface ClockParams {
  bpm: number;      // Beats per minute (20-300)
  running: boolean; // Whether clock is running
  swing: number;    // Swing amount 0-1 (0 = straight, 0.5 = triplet feel)
}

const DEFAULT_PARAMS: ClockParams = {
  bpm: 120,
  running: true,
  swing: 0,
};

export class SynthClockNode implements SynthNode {
  id: string;
  type = 'clock';

  private context: AudioContext;
  private params: ClockParams;
  private constantSource: ConstantSourceNode;
  private outputGain: GainNode;
  private clockInterval: number | null = null;
  private beatCount: number = 0;

  // Callbacks for external sync (sequencers, etc.)
  private triggerCallbacks: Set<() => void> = new Set();

  constructor(context: AudioContext, id: string, params?: Partial<ClockParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create output nodes
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Create constant source for trigger output
    this.constantSource = context.createConstantSource();
    this.constantSource.offset.value = 0;
    this.constantSource.connect(this.outputGain);
    this.constantSource.start();

    // Start clock if running
    if (this.params.running) {
      this.start();
    }
  }

  private getIntervalMs(): number {
    return (60 / this.params.bpm) * 1000;
  }

  private tick(): void {
    const now = this.context.currentTime;

    // Output a short trigger pulse (10ms)
    this.constantSource.offset.setValueAtTime(1, now);
    this.constantSource.offset.setValueAtTime(0, now + 0.01);

    // Call registered callbacks
    this.triggerCallbacks.forEach(cb => cb());

    this.beatCount++;
  }

  start(): void {
    if (this.clockInterval !== null) return;

    this.params.running = true;
    this.beatCount = 0;

    // Initial tick
    this.tick();

    // Schedule regular ticks
    const scheduleNextTick = () => {
      let intervalMs = this.getIntervalMs();

      // Apply swing to even beats (off-beats)
      if (this.params.swing > 0 && this.beatCount % 2 === 1) {
        intervalMs *= (1 + this.params.swing * 0.5);
      } else if (this.params.swing > 0 && this.beatCount % 2 === 0) {
        intervalMs *= (1 - this.params.swing * 0.25);
      }

      this.clockInterval = window.setTimeout(() => {
        this.tick();
        if (this.params.running) {
          scheduleNextTick();
        }
      }, intervalMs);
    };

    scheduleNextTick();
  }

  stop(): void {
    this.params.running = false;
    if (this.clockInterval !== null) {
      window.clearTimeout(this.clockInterval);
      this.clockInterval = null;
    }
    // Reset output to 0
    this.constantSource.offset.setValueAtTime(0, this.context.currentTime);
  }

  // Reset beat counter (for sync)
  reset(): void {
    this.beatCount = 0;
  }

  // Register callback for external modules to sync
  onTrigger(callback: () => void): void {
    this.triggerCallbacks.add(callback);
  }

  offTrigger(callback: () => void): void {
    this.triggerCallbacks.delete(callback);
  }

  // Manual trigger (for tap tempo or external sync)
  trigger(): void {
    this.tick();
  }

  getBeatCount(): number {
    return this.beatCount;
  }

  isRunning(): boolean {
    return this.params.running;
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode | null {
    return null; // Clock is a source, no audio input
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'bpm_mod':
        // Could modulate BPM but tricky - skip for now
        return null;
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
      case 'bpm':
        this.params.bpm = Math.max(20, Math.min(300, value as number));
        // No need to restart - next tick will use new BPM
        break;
      case 'running':
        if (value && !this.params.running) {
          this.start();
        } else if (!value && this.params.running) {
          this.stop();
        }
        break;
      case 'swing':
        this.params.swing = Math.max(0, Math.min(1, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.stop();
    this.triggerCallbacks.clear();
    this.constantSource.stop();
    this.constantSource.disconnect();
    this.outputGain.disconnect();
  }
}
