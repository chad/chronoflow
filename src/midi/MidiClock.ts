// MidiClock - MIDI clock generator and receiver for sync between instances
// MIDI clock sends 24 pulses per quarter note (PPQN)

import { midiEngine } from './MidiEngine';
import { audioGraph } from '../audio/AudioGraph';

const PPQN = 24; // Pulses per quarter note (MIDI standard)

// MIDI System Real-Time messages
const MIDI_CLOCK = 0xf8;
const MIDI_START = 0xfa;
const MIDI_CONTINUE = 0xfb;
const MIDI_STOP = 0xfc;

export type ClockMode = 'off' | 'master' | 'follower';
export type ClockState = 'stopped' | 'running';

type ClockCallback = () => void;
type StateCallback = (state: ClockState) => void;

class MidiClock {
  private mode: ClockMode = 'off';
  private state: ClockState = 'stopped';
  private bpm: number = 120;
  private pulseCount: number = 0;

  // High-precision timing using AudioContext
  private nextPulseTime: number = 0;
  private schedulerInterval: number | null = null;

  // Callbacks
  private clockCallbacks: Set<ClockCallback> = new Set();
  private stateCallbacks: Set<StateCallback> = new Set();
  private midiUnsubscribe: (() => void) | null = null;

  // For follower mode - track incoming clock rate
  private lastClockTime: number = 0;
  private clockIntervals: number[] = [];
  private detectedBpm: number = 120;

  getMode(): ClockMode {
    return this.mode;
  }

  getState(): ClockState {
    return this.state;
  }

  getBpm(): number {
    return this.mode === 'follower' ? this.detectedBpm : this.bpm;
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
    // If running as master, timing will automatically adjust
  }

  setMode(mode: ClockMode): void {
    // Stop current mode
    this.stop();

    // Unsubscribe from MIDI messages if was follower
    if (this.midiUnsubscribe) {
      this.midiUnsubscribe();
      this.midiUnsubscribe = null;
    }

    this.mode = mode;

    // If follower mode, subscribe to MIDI input
    if (mode === 'follower') {
      this.midiUnsubscribe = midiEngine.onMessage((event) => {
        this.handleMidiMessage(event);
      });
    }

    console.log(`MIDI Clock mode set to: ${mode}`);
  }

  start(): void {
    if (this.mode === 'off') return;

    if (this.mode === 'master') {
      this.startMaster();
    }
    // Follower mode starts when it receives MIDI Start message

    this.state = 'running';
    this.notifyState();
  }

  stop(): void {
    if (this.mode === 'master') {
      this.stopMaster();
    }

    this.state = 'stopped';
    this.pulseCount = 0;
    this.notifyState();
  }

  private startMaster(): void {
    if (this.schedulerInterval !== null) return;

    // Send MIDI Start
    midiEngine.sendStart();

    // Use high-precision scheduling
    const context = audioGraph.getContext();
    if (!context) {
      console.error('AudioContext not available for MIDI clock');
      return;
    }

    this.nextPulseTime = context.currentTime;

    // Schedule pulses at high precision using AudioContext time
    const scheduleAhead = 0.1; // Schedule 100ms ahead
    const lookAhead = 25; // Check every 25ms

    this.schedulerInterval = window.setInterval(() => {
      const currentTime = context.currentTime;
      const pulseInterval = 60 / (this.bpm * PPQN); // Seconds per pulse

      while (this.nextPulseTime < currentTime + scheduleAhead) {
        // Send clock pulse
        midiEngine.sendClock();

        // Notify internal callbacks (for local sequencers)
        this.notifyClock();

        this.pulseCount++;
        this.nextPulseTime += pulseInterval;
      }
    }, lookAhead);

    console.log(`MIDI Clock master started at ${this.bpm} BPM`);
  }

  private stopMaster(): void {
    if (this.schedulerInterval !== null) {
      window.clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    // Send MIDI Stop
    midiEngine.sendStop();

    console.log('MIDI Clock master stopped');
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 1) return;

    const status = data[0];

    switch (status) {
      case MIDI_CLOCK:
        this.handleClockPulse();
        break;
      case MIDI_START:
        this.handleStart();
        break;
      case MIDI_CONTINUE:
        this.handleContinue();
        break;
      case MIDI_STOP:
        this.handleStop();
        break;
    }
  }

  private handleClockPulse(): void {
    if (this.mode !== 'follower') return;

    // Track timing for BPM detection
    const now = performance.now();
    if (this.lastClockTime > 0) {
      const interval = now - this.lastClockTime;
      this.clockIntervals.push(interval);

      // Keep last 24 intervals (one quarter note worth)
      if (this.clockIntervals.length > PPQN) {
        this.clockIntervals.shift();
      }

      // Calculate average BPM from intervals
      if (this.clockIntervals.length >= 6) {
        const avgInterval = this.clockIntervals.reduce((a, b) => a + b, 0) / this.clockIntervals.length;
        this.detectedBpm = Math.round(60000 / (avgInterval * PPQN));
      }
    }
    this.lastClockTime = now;

    // Notify callbacks
    this.notifyClock();
    this.pulseCount++;
  }

  private handleStart(): void {
    if (this.mode !== 'follower') return;

    this.pulseCount = 0;
    this.clockIntervals = [];
    this.state = 'running';
    this.notifyState();

    console.log('MIDI Clock follower received START');
  }

  private handleContinue(): void {
    if (this.mode !== 'follower') return;

    this.state = 'running';
    this.notifyState();

    console.log('MIDI Clock follower received CONTINUE');
  }

  private handleStop(): void {
    if (this.mode !== 'follower') return;

    this.state = 'stopped';
    this.notifyState();

    console.log('MIDI Clock follower received STOP');
  }

  // Subscribe to clock pulses (24 per quarter note)
  onClock(callback: ClockCallback): () => void {
    this.clockCallbacks.add(callback);
    return () => this.clockCallbacks.delete(callback);
  }

  // Subscribe to state changes
  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  private notifyClock(): void {
    this.clockCallbacks.forEach((cb) => cb());
  }

  private notifyState(): void {
    this.stateCallbacks.forEach((cb) => cb(this.state));
  }

  // Get current pulse count (useful for position display)
  getPulseCount(): number {
    return this.pulseCount;
  }

  // Get beat position (quarter notes)
  getBeatPosition(): number {
    return this.pulseCount / PPQN;
  }
}

export const midiClock = new MidiClock();
export default midiClock;
