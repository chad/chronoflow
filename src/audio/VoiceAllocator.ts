// VoiceAllocator.ts - Manages polyphonic voice allocation

// Set to true to enable debug logging
const DEBUG = false;

import { Voice } from './Voice';
import { audioEngine } from './AudioEngine';
import type { PatchNode, PatchConnection } from '../patch/types';

export type VoiceStealingMode = 'oldest' | 'lowest' | 'highest' | 'quietest';

export interface VoiceAllocatorConfig {
  maxVoices: number;
  stealingMode: VoiceStealingMode;
}

const DEFAULT_CONFIG: VoiceAllocatorConfig = {
  maxVoices: 8,
  stealingMode: 'oldest',
};

export class VoiceAllocator {
  private voices: Voice[] = [];
  private config: VoiceAllocatorConfig;
  private mixerGain: GainNode | null = null;
  private noteToVoice: Map<number, Voice> = new Map();

  constructor(config?: Partial<VoiceAllocatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private ensureMixerGain(): GainNode {
    if (!this.mixerGain) {
      const ctx = audioEngine.getContext();
      if (!ctx) {
        throw new Error('AudioContext not initialized');
      }
      this.mixerGain = ctx.createGain();
      // Scale down based on voice count to prevent clipping
      this.mixerGain.gain.value = 1 / Math.sqrt(this.config.maxVoices);
    }
    return this.mixerGain;
  }

  // Initialize voices based on patch configuration
  initialize(patchNodes: PatchNode[], connections: PatchConnection[]): void {
    this.dispose();

    // Filter to only voice-relevant nodes (osc, filter, vca, adsr)
    const voiceNodes = patchNodes.filter((n) =>
      ['oscillator', 'filter', 'vca', 'adsr'].includes(n.type)
    );

    // Filter connections to only those between voice nodes or from voice to output/effects
    const globalNodeTypes = ['output', 'delay', 'reverb', 'lfo'];
    const voiceConnections = connections.filter((c) => {
      const fromIsVoice = voiceNodes.some((n) => n.id === c.from.nodeId);
      const toIsVoice = voiceNodes.some((n) => n.id === c.to.nodeId);
      // Check if destination is a global node by looking up its type
      const toNode = patchNodes.find((n) => n.id === c.to.nodeId);
      const toIsGlobal = toNode && globalNodeTypes.includes(toNode.type);
      // Include if both are voice nodes, or if from voice to global node
      return fromIsVoice && (toIsVoice || toIsGlobal);
    });

    if (DEBUG) console.log('[VoiceAllocator] initialize:', {
      voiceNodes: voiceNodes.map(n => n.id),
      voiceConnections: voiceConnections.map(c => `${c.from.nodeId}.${c.from.port} -> ${c.to.nodeId}.${c.to.port}`),
    });

    // Create voice pool
    const mixer = this.ensureMixerGain();
    for (let i = 0; i < this.config.maxVoices; i++) {
      const voice = new Voice(i, voiceNodes, voiceConnections);
      voice.getOutputNode().connect(mixer);
      this.voices.push(voice);
    }
    if (DEBUG) console.log('[VoiceAllocator] Created', this.voices.length, 'voices');
  }

  getOutputNode(): GainNode {
    return this.ensureMixerGain();
  }

  // Allocate a voice for a note
  noteOn(note: number, velocity: number): Voice | null {

    // Check if this note is already playing
    const existingVoice = this.noteToVoice.get(note);
    if (existingVoice) {
      // Retrigger the same voice
      existingVoice.noteOn(note, velocity);
      return existingVoice;
    }

    // Find an available voice
    let voice = this.findAvailableVoice();

    // If no available voice, steal one
    if (!voice) {
      voice = this.stealVoice(note);
    }

    if (voice) {
      voice.noteOn(note, velocity);
      this.noteToVoice.set(note, voice);
    }

    return voice;
  }

  // Release a voice for a note
  noteOff(note: number): void {
    const voice = this.noteToVoice.get(note);
    if (voice) {
      voice.noteOff();
      // Don't remove from map yet - voice may still be in release phase
      // We'll clean it up when the voice becomes available again
    }
  }

  // Find first available voice
  private findAvailableVoice(): Voice | null {
    // First, check for completely free voices
    for (const voice of this.voices) {
      if (voice.isAvailable()) {
        return voice;
      }
    }

    // Check for voices that have completed their release
    for (const voice of this.voices) {
      if (voice.isReleaseComplete()) {
        // Clean up note mapping
        this.noteToVoice.forEach((v, note) => {
          if (v === voice) {
            this.noteToVoice.delete(note);
          }
        });
        return voice;
      }
    }

    return null;
  }

  // Steal a voice based on configured mode
  private stealVoice(_newNote: number): Voice | null {
    if (this.voices.length === 0) return null;

    let victimVoice: Voice;

    switch (this.config.stealingMode) {
      case 'oldest':
        // Steal the voice that started earliest
        victimVoice = this.voices.reduce((oldest, voice) => {
          if (voice.state.note === null) return oldest;
          if (oldest.state.note === null) return voice;
          return voice.state.startTime < oldest.state.startTime ? voice : oldest;
        }, this.voices[0]);
        break;

      case 'lowest':
        // Steal the lowest note (useful for bass priority)
        victimVoice = this.voices.reduce((lowest, voice) => {
          if (voice.state.note === null) return lowest;
          if (lowest.state.note === null) return voice;
          return (voice.state.note || Infinity) < (lowest.state.note || Infinity) ? voice : lowest;
        }, this.voices[0]);
        break;

      case 'highest':
        // Steal the highest note
        victimVoice = this.voices.reduce((highest, voice) => {
          if (voice.state.note === null) return highest;
          if (highest.state.note === null) return voice;
          return (voice.state.note || -Infinity) > (highest.state.note || -Infinity) ? voice : highest;
        }, this.voices[0]);
        break;

      case 'quietest':
        // Steal the voice with lowest velocity (or in release phase)
        victimVoice = this.voices.reduce((quietest, voice) => {
          // Prefer releasing voices
          if (voice.state.releasing && !quietest.state.releasing) return voice;
          if (!voice.state.releasing && quietest.state.releasing) return quietest;
          // Otherwise, pick lowest velocity
          return voice.state.velocity < quietest.state.velocity ? voice : quietest;
        }, this.voices[0]);
        break;

      default:
        victimVoice = this.voices[0];
    }

    // Clean up the stolen voice's note mapping
    if (victimVoice.state.note !== null) {
      this.noteToVoice.delete(victimVoice.state.note);
    }

    // Force stop the voice
    victimVoice.forceStop();

    return victimVoice;
  }

  // Update a parameter on all voices
  updateParam(nodeId: string, param: string, value: number | string): void {
    for (const voice of this.voices) {
      voice.updateParam(nodeId, param, value);
    }
  }

  // Get active voice count
  getActiveVoiceCount(): number {
    return this.voices.filter((v) => !v.isAvailable()).length;
  }

  // Get all playing notes
  getPlayingNotes(): number[] {
    return Array.from(this.noteToVoice.keys());
  }

  // Get all voices (for LFO modulation connections)
  getVoices(): Voice[] {
    return this.voices;
  }

  // Release all notes
  releaseAll(): void {
    this.noteToVoice.forEach((_, note) => {
      this.noteOff(note);
    });
  }

  // Force stop all voices
  panic(): void {
    for (const voice of this.voices) {
      voice.forceStop();
    }
    this.noteToVoice.clear();
  }

  // Set voice stealing mode
  setStealingMode(mode: VoiceStealingMode): void {
    this.config.stealingMode = mode;
  }

  // Set max voices (requires reinitialization)
  setMaxVoices(maxVoices: number): void {
    this.config.maxVoices = maxVoices;
    if (this.mixerGain) {
      this.mixerGain.gain.value = 1 / Math.sqrt(maxVoices);
    }
  }

  dispose(): void {
    for (const voice of this.voices) {
      voice.dispose();
    }
    this.voices = [];
    this.noteToVoice.clear();
  }
}
