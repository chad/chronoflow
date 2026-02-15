// MidiRouter - routes MIDI messages to synth parameters
// Supports note on/off, pitch bend, mod wheel, sustain pedal,
// channel aftertouch, and arbitrary CC mappings.

import { midiEngine } from './MidiEngine';
import { midiClock } from './MidiClock';
import { audioGraph } from '../audio/AudioGraph';
import { usePatchStore } from '../patch/patchStore';

// MIDI message types
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;
const CHANNEL_PRESSURE = 0xd0;
const PITCH_BEND = 0xe0;

// Well-known CC numbers
const CC_MOD_WHEEL = 1;
const CC_SUSTAIN_PEDAL = 64;
const CC_ALL_NOTES_OFF = 123;
const CC_ALL_SOUND_OFF = 120;

interface CCMapping {
  nodeId: string;
  param: string;
  min: number;
  max: number;
  controller: number;
}

// Callbacks for external listeners (e.g. piano keyboard display)
type NoteCallback = (note: number, velocity: number) => void;
type NoteOffCallback = (note: number) => void;
type PitchBendCallback = (value: number) => void;
type ModWheelCallback = (value: number) => void;

class MidiRouter {
  private unsubscribe: (() => void) | null = null;
  private clockUnsubscribe: (() => void) | null = null;
  private currentNote: number | null = null;
  private ccMappings: CCMapping[] = [];
  private learningCallback: ((controller: number) => void) | null = null;
  private clockPulseCount: number = 0;

  // Performance state
  private pitchBend: number = 0; // -1 to +1 (0 = center)
  private pitchBendRange: number = 2; // semitones (default ±2)
  private modWheel: number = 0; // 0-1
  private sustainPedal: boolean = false;
  private sustainedNotes: Set<number> = new Set();
  private heldNotes: Set<number> = new Set(); // physically held keys
  private aftertouch: number = 0; // 0-1

  // External listeners
  private noteOnCallbacks: Set<NoteCallback> = new Set();
  private noteOffCallbacks: Set<NoteOffCallback> = new Set();
  private pitchBendCallbacks: Set<PitchBendCallback> = new Set();
  private modWheelCallbacks: Set<ModWheelCallback> = new Set();

  init(): void {
    this.unsubscribe = midiEngine.onMessage((event) => {
      this.handleMidiMessage(event);
    });

    // Subscribe to MIDI clock pulses and forward to sequencers
    this.clockUnsubscribe = midiClock.onClock(() => {
      this.handleClockPulse();
    });
  }

  private handleClockPulse(): void {
    this.clockPulseCount++;

    // Forward clock pulse to all sequencers with extClock enabled
    // We trigger on every 6th pulse (4 pulses per 16th note at 24 PPQN)
    // This gives us 16th note resolution which matches typical sequencer step rate
    if (this.clockPulseCount % 6 === 0) {
      audioGraph.triggerExternalClock();
    }
  }

  resetClockPosition(): void {
    this.clockPulseCount = 0;
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 1) return;

    const status = data[0] & 0xf0;
    const channel = data[0] & 0x0f;

    switch (status) {
      case NOTE_ON:
        if (data.length >= 3) this.handleNoteOn(channel, data[1], data[2]);
        break;
      case NOTE_OFF:
        if (data.length >= 3) this.handleNoteOff(channel, data[1]);
        break;
      case CONTROL_CHANGE:
        if (data.length >= 3) this.handleControlChange(channel, data[1], data[2]);
        break;
      case PITCH_BEND:
        if (data.length >= 3) this.handlePitchBend(channel, data[1], data[2]);
        break;
      case CHANNEL_PRESSURE:
        if (data.length >= 2) this.handleAftertouch(channel, data[1]);
        break;
    }
  }

  private handleNoteOn(channel: number, note: number, velocity: number): void {
    if (velocity === 0) {
      this.handleNoteOff(channel, note);
      return;
    }

    this.currentNote = note;
    this.heldNotes.add(note);

    // If this note was being sustained, remove from sustained set
    this.sustainedNotes.delete(note);

    // Use polyphonic voice allocation
    audioGraph.noteOn(note, velocity);

    // Apply current pitch bend to the new note
    if (this.pitchBend !== 0) {
      audioGraph.setPitchBend(this.pitchBend, this.pitchBendRange);
    }

    // Notify external listeners
    this.noteOnCallbacks.forEach((cb) => cb(note, velocity));

    // Forward to MIDI output if selected (for GarageBand, etc.)
    midiEngine.noteOn(channel, note, velocity);
  }

  private handleNoteOff(channel: number, note: number): void {
    this.heldNotes.delete(note);

    if (this.sustainPedal) {
      // Don't actually release — just remember it's sustained
      this.sustainedNotes.add(note);
    } else {
      // Actually release the note
      audioGraph.noteOff(note);
      // Notify external listeners
      this.noteOffCallbacks.forEach((cb) => cb(note));
    }

    if (this.currentNote === note) {
      this.currentNote = null;
    }

    // Forward to MIDI output
    midiEngine.noteOff(channel, note);
  }

  private handlePitchBend(_channel: number, lsb: number, msb: number): void {
    // Convert 14-bit pitch bend to -1..+1 range
    const raw = (msb << 7) | lsb; // 0-16383
    this.pitchBend = (raw - 8192) / 8192; // -1 to +1

    // Apply to all active oscillators
    audioGraph.setPitchBend(this.pitchBend, this.pitchBendRange);

    // Notify external listeners
    this.pitchBendCallbacks.forEach((cb) => cb(this.pitchBend));
  }

  private handleAftertouch(_channel: number, pressure: number): void {
    this.aftertouch = pressure / 127;

    // Route aftertouch to filter cutoff modulation by default
    audioGraph.setAftertouch(this.aftertouch);
  }

  private handleControlChange(channel: number, controller: number, value: number): void {
    // Check if we're learning a CC
    if (this.learningCallback) {
      this.learningCallback(controller);
      this.learningCallback = null;
      return;
    }

    // Handle well-known CCs first
    switch (controller) {
      case CC_MOD_WHEEL:
        this.handleModWheel(value);
        break;
      case CC_SUSTAIN_PEDAL:
        this.handleSustainPedal(value);
        break;
      case CC_ALL_NOTES_OFF:
      case CC_ALL_SOUND_OFF:
        this.handleAllNotesOff();
        break;
    }

    // Apply user CC mappings
    const mappings = this.ccMappings.filter((m) => m.controller === controller);
    mappings.forEach((mapping) => {
      const normalizedValue = value / 127;
      const scaledValue = mapping.min + normalizedValue * (mapping.max - mapping.min);
      usePatchStore.getState().updateNodeParam(mapping.nodeId, mapping.param, scaledValue);
    });

    // Forward to MIDI output
    midiEngine.controlChange(channel, controller, value);
  }

  private handleModWheel(value: number): void {
    this.modWheel = value / 127;

    // Route mod wheel to filter cutoff and LFO depth by default
    audioGraph.setModWheel(this.modWheel);

    // Notify external listeners
    this.modWheelCallbacks.forEach((cb) => cb(this.modWheel));
  }

  private handleSustainPedal(value: number): void {
    const wasDown = this.sustainPedal;
    this.sustainPedal = value >= 64; // Standard threshold

    if (wasDown && !this.sustainPedal) {
      // Pedal released — release all sustained notes that aren't physically held
      for (const note of this.sustainedNotes) {
        if (!this.heldNotes.has(note)) {
          audioGraph.noteOff(note);
          this.noteOffCallbacks.forEach((cb) => cb(note));
        }
      }
      this.sustainedNotes.clear();
    }
  }

  private handleAllNotesOff(): void {
    audioGraph.panic();
    this.heldNotes.clear();
    this.sustainedNotes.clear();
    this.sustainPedal = false;
    this.pitchBend = 0;
    this.noteOffCallbacks.forEach((cb) => cb(-1)); // -1 = all notes off
  }

  // ═══════════════════════════════════════════════════════════════
  // Public Getters
  // ═══════════════════════════════════════════════════════════════

  getPitchBend(): number {
    return this.pitchBend;
  }

  getPitchBendRange(): number {
    return this.pitchBendRange;
  }

  setPitchBendRange(semitones: number): void {
    this.pitchBendRange = Math.max(1, Math.min(24, semitones));
  }

  getModWheel(): number {
    return this.modWheel;
  }

  isSustainDown(): boolean {
    return this.sustainPedal;
  }

  getAftertouch(): number {
    return this.aftertouch;
  }

  getHeldNotes(): Set<number> {
    return new Set(this.heldNotes);
  }

  getSustainedNotes(): Set<number> {
    return new Set(this.sustainedNotes);
  }

  // ═══════════════════════════════════════════════════════════════
  // External Listeners
  // ═══════════════════════════════════════════════════════════════

  onNoteOn(callback: NoteCallback): () => void {
    this.noteOnCallbacks.add(callback);
    return () => this.noteOnCallbacks.delete(callback);
  }

  onNoteOff(callback: NoteOffCallback): () => void {
    this.noteOffCallbacks.add(callback);
    return () => this.noteOffCallbacks.delete(callback);
  }

  onPitchBend(callback: PitchBendCallback): () => void {
    this.pitchBendCallbacks.add(callback);
    return () => this.pitchBendCallbacks.delete(callback);
  }

  onModWheel(callback: ModWheelCallback): () => void {
    this.modWheelCallbacks.add(callback);
    return () => this.modWheelCallbacks.delete(callback);
  }

  // ═══════════════════════════════════════════════════════════════
  // CC Mapping
  // ═══════════════════════════════════════════════════════════════

  // Start CC learn mode
  startCCLearn(callback: (controller: number) => void): void {
    this.learningCallback = callback;
  }

  // Cancel CC learn mode
  cancelCCLearn(): void {
    this.learningCallback = null;
  }

  // Add a CC mapping
  addCCMapping(mapping: CCMapping): void {
    this.ccMappings.push(mapping);
  }

  // Remove a CC mapping
  removeCCMapping(nodeId: string, param: string): void {
    this.ccMappings = this.ccMappings.filter(
      (m) => !(m.nodeId === nodeId && m.param === param)
    );
  }

  // Get all CC mappings
  getCCMappings(): CCMapping[] {
    return [...this.ccMappings];
  }

  // Clear all mappings
  clearMappings(): void {
    this.ccMappings = [];
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.clockUnsubscribe) {
      this.clockUnsubscribe();
    }
  }
}

export const midiRouter = new MidiRouter();
export default midiRouter;
