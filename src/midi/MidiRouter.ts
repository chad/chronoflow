// MidiRouter - routes MIDI messages to synth parameters

import { midiEngine } from './MidiEngine';
import { audioGraph } from '../audio/AudioGraph';
import { usePatchStore } from '../patch/patchStore';

// MIDI message types
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;

// MIDI note to frequency conversion
function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

interface CCMapping {
  nodeId: string;
  param: string;
  min: number;
  max: number;
  controller: number;
}

class MidiRouter {
  private unsubscribe: (() => void) | null = null;
  private currentNote: number | null = null;
  private ccMappings: CCMapping[] = [];
  private learningCallback: ((controller: number) => void) | null = null;

  init(): void {
    this.unsubscribe = midiEngine.onMessage((event) => {
      this.handleMidiMessage(event);
    });
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
    const frequency = midiNoteToFrequency(note);
    const normalizedVelocity = velocity / 127;

    // Update all oscillator frequencies in the patch
    const patch = usePatchStore.getState().patch;
    const hasADSR = patch.nodes.some((node) => node.type === 'adsr');

    patch.nodes.forEach((node) => {
      if (node.type === 'oscillator') {
        usePatchStore.getState().updateNodeParam(node.id, 'frequency', frequency);
      }
      // Only control VCA directly if there's no ADSR (ADSR handles it otherwise)
      if (node.type === 'vca' && !hasADSR) {
        const gain = 0.1 + normalizedVelocity * 0.9;
        usePatchStore.getState().updateNodeParam(node.id, 'gain', gain);
      }
    });

    // Trigger all ADSRs with velocity
    audioGraph.triggerAllADSRs(normalizedVelocity);

    // Forward to MIDI output if selected (for GarageBand, etc.)
    midiEngine.noteOn(channel, note, velocity);
  }

  private handleNoteOff(channel: number, note: number): void {
    if (this.currentNote === note) {
      this.currentNote = null;

      const patch = usePatchStore.getState().patch;
      const hasADSR = patch.nodes.some((node) => node.type === 'adsr');

      // Only set VCAs to zero directly if there's no ADSR
      if (!hasADSR) {
        patch.nodes.forEach((node) => {
          if (node.type === 'vca') {
            usePatchStore.getState().updateNodeParam(node.id, 'gain', 0);
          }
        });
      }

      // Release all ADSRs
      audioGraph.releaseAllADSRs();
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
  }
}

export const midiRouter = new MidiRouter();
export default midiRouter;
