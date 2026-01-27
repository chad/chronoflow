// MidiRouter - routes MIDI messages to synth parameters

import { midiEngine } from './MidiEngine';
import { midiClock } from './MidiClock';
import { audioGraph } from '../audio/AudioGraph';
import { usePatchStore } from '../patch/patchStore';

// MIDI message types
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;

interface CCMapping {
  nodeId: string;
  param: string;
  min: number;
  max: number;
  controller: number;
}

class MidiRouter {
  private unsubscribe: (() => void) | null = null;
  private clockUnsubscribe: (() => void) | null = null;
  private currentNote: number | null = null;
  private ccMappings: CCMapping[] = [];
  private learningCallback: ((controller: number) => void) | null = null;
  private clockPulseCount: number = 0;

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
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const channel = data[0] & 0x0f;

    switch (status) {
      case NOTE_ON:
        this.handleNoteOn(channel, data[1], data[2]);
        break;
      case NOTE_OFF:
        this.handleNoteOff(channel, data[1]);
        break;
      case CONTROL_CHANGE:
        this.handleControlChange(channel, data[1], data[2]);
        break;
    }
  }

  private handleNoteOn(channel: number, note: number, velocity: number): void {
    if (velocity === 0) {
      this.handleNoteOff(channel, note);
      return;
    }

    this.currentNote = note;

    // Use polyphonic voice allocation
    audioGraph.noteOn(note, velocity);

    // Forward to MIDI output if selected (for GarageBand, etc.)
    midiEngine.noteOn(channel, note, velocity);
  }

  private handleNoteOff(channel: number, note: number): void {
    // Use polyphonic voice release
    audioGraph.noteOff(note);

    if (this.currentNote === note) {
      this.currentNote = null;
    }

    // Forward to MIDI output
    midiEngine.noteOff(channel, note);
  }

  private handleControlChange(channel: number, controller: number, value: number): void {
    // Check if we're learning a CC
    if (this.learningCallback) {
      this.learningCallback(controller);
      this.learningCallback = null;
      return;
    }

    // Apply CC mappings
    const mappings = this.ccMappings.filter((m) => m.controller === controller);
    mappings.forEach((mapping) => {
      const normalizedValue = value / 127;
      const scaledValue = mapping.min + normalizedValue * (mapping.max - mapping.min);
      usePatchStore.getState().updateNodeParam(mapping.nodeId, mapping.param, scaledValue);
    });

    // Forward to MIDI output
    midiEngine.controlChange(channel, controller, value);
  }

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
