import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceAllocator } from './VoiceAllocator';
import { audioEngine } from './AudioEngine';
import type { PatchNode, PatchConnection } from '../patch/types';

// Mock audioEngine
vi.mock('./AudioEngine', () => ({
  audioEngine: {
    getContext: vi.fn(),
  },
}));

// Create a simple patch for testing
const createTestPatch = (): { nodes: PatchNode[]; connections: PatchConnection[] } => ({
  nodes: [
    { id: 'osc1', type: 'oscillator', position: { x: 0, y: 0 }, params: { frequency: 440, waveform: 'sawtooth' } },
    { id: 'adsr1', type: 'adsr', position: { x: 200, y: 0 }, params: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 } },
    { id: 'vca1', type: 'vca', position: { x: 400, y: 0 }, params: { gain: 0.5 } },
    { id: 'output', type: 'output', position: { x: 600, y: 0 }, params: { gain: 0.7 } },
  ],
  connections: [
    { id: 'c1', from: { nodeId: 'osc1', port: 'output' }, to: { nodeId: 'vca1', port: 'input' } },
    { id: 'c2', from: { nodeId: 'adsr1', port: 'output' }, to: { nodeId: 'vca1', port: 'gain_mod' } },
    { id: 'c3', from: { nodeId: 'vca1', port: 'output' }, to: { nodeId: 'output', port: 'input' } },
  ],
});

describe('VoiceAllocator', () => {
  let mockContext: AudioContext;

  beforeEach(() => {
    // Create fresh AudioContext mock for each test
    mockContext = new AudioContext();
    vi.mocked(audioEngine.getContext).mockReturnValue(mockContext);
  });

  describe('constructor', () => {
    it('should create with default configuration', () => {
      const allocator = new VoiceAllocator();
      expect(allocator).toBeDefined();
    });

    it('should accept custom maxVoices', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      expect(allocator).toBeDefined();
    });

    it('should accept custom stealing mode', () => {
      const allocator = new VoiceAllocator({ stealingMode: 'lowest' });
      expect(allocator).toBeDefined();
    });
  });

  describe('initialization', () => {
    it('should initialize voices from patch', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();

      allocator.initialize(nodes, connections);

      expect(allocator.getVoices()).toHaveLength(4);
    });

    it('should create mixer gain node', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();

      allocator.initialize(nodes, connections);

      const output = allocator.getOutputNode();
      expect(output).toBeDefined();
    });

    it('should dispose previous voices on re-initialization', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();

      allocator.initialize(nodes, connections);
      allocator.initialize(nodes, connections);

      expect(allocator.getVoices()).toHaveLength(4);
    });
  });

  describe('noteOn', () => {
    it('should allocate a voice for a new note', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      const voice = allocator.noteOn(60, 100);

      expect(voice).not.toBeNull();
      expect(allocator.getActiveVoiceCount()).toBe(1);
    });

    it('should return same voice for retriggered note', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      const voice1 = allocator.noteOn(60, 100);
      const voice2 = allocator.noteOn(60, 80);

      expect(voice1).toBe(voice2);
    });

    it('should allocate different voices for different notes', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      const voice1 = allocator.noteOn(60, 100);
      const voice2 = allocator.noteOn(64, 100);
      const voice3 = allocator.noteOn(67, 100);

      expect(voice1).not.toBe(voice2);
      expect(voice2).not.toBe(voice3);
      expect(allocator.getActiveVoiceCount()).toBe(3);
    });

    it('should track playing notes', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      allocator.noteOn(60, 100);
      allocator.noteOn(64, 100);

      const playingNotes = allocator.getPlayingNotes();
      expect(playingNotes).toContain(60);
      expect(playingNotes).toContain(64);
    });
  });

  describe('noteOff', () => {
    it('should release voice for note', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      allocator.noteOn(60, 100);
      allocator.noteOff(60);

      // Voice is still active during release phase
      const playingNotes = allocator.getPlayingNotes();
      expect(playingNotes).toContain(60);
    });

    it('should do nothing for non-playing note', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      // Should not throw
      allocator.noteOff(60);
      expect(allocator.getActiveVoiceCount()).toBe(0);
    });
  });

  describe('voice stealing', () => {
    describe('oldest mode', () => {
      it('should steal oldest voice when all voices are used', () => {
        const allocator = new VoiceAllocator({ maxVoices: 2, stealingMode: 'oldest' });
        const { nodes, connections } = createTestPatch();
        allocator.initialize(nodes, connections);

        allocator.noteOn(60, 100);
        allocator.noteOn(64, 100);
        // Now all voices used, next note should steal
        const voice = allocator.noteOn(67, 100);

        expect(voice).not.toBeNull();
        const playingNotes = allocator.getPlayingNotes();
        expect(playingNotes).toContain(67);
        // Original note 60 should have been stolen
        expect(playingNotes).not.toContain(60);
      });
    });

    describe('lowest mode', () => {
      it('should steal lowest note when all voices are used', () => {
        const allocator = new VoiceAllocator({ maxVoices: 2, stealingMode: 'lowest' });
        const { nodes, connections } = createTestPatch();
        allocator.initialize(nodes, connections);

        allocator.noteOn(64, 100); // Higher note first
        allocator.noteOn(60, 100); // Lower note second
        // Steal should take the lowest note (60)
        allocator.noteOn(67, 100);

        const playingNotes = allocator.getPlayingNotes();
        expect(playingNotes).toContain(67);
        expect(playingNotes).toContain(64);
        expect(playingNotes).not.toContain(60);
      });
    });

    describe('highest mode', () => {
      it('should steal highest note when all voices are used', () => {
        const allocator = new VoiceAllocator({ maxVoices: 2, stealingMode: 'highest' });
        const { nodes, connections } = createTestPatch();
        allocator.initialize(nodes, connections);

        allocator.noteOn(60, 100);
        allocator.noteOn(72, 100); // Higher note
        // Steal should take the highest note (72)
        allocator.noteOn(64, 100);

        const playingNotes = allocator.getPlayingNotes();
        expect(playingNotes).toContain(64);
        expect(playingNotes).toContain(60);
        expect(playingNotes).not.toContain(72);
      });
    });

    describe('quietest mode', () => {
      it('should steal quietest voice when all voices are used', () => {
        const allocator = new VoiceAllocator({ maxVoices: 2, stealingMode: 'quietest' });
        const { nodes, connections } = createTestPatch();
        allocator.initialize(nodes, connections);

        allocator.noteOn(60, 100); // Loud
        allocator.noteOn(64, 50);  // Quiet
        // Steal should take the quietest voice
        allocator.noteOn(67, 100);

        const playingNotes = allocator.getPlayingNotes();
        expect(playingNotes).toContain(67);
        expect(playingNotes).toContain(60);
        expect(playingNotes).not.toContain(64);
      });
    });
  });

  describe('setStealingMode', () => {
    it('should change stealing mode', () => {
      const allocator = new VoiceAllocator({ stealingMode: 'oldest' });

      allocator.setStealingMode('lowest');
      // Can't directly verify, but shouldn't throw
      expect(() => allocator.setStealingMode('highest')).not.toThrow();
    });
  });

  describe('setMaxVoices', () => {
    it('should update max voices', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });

      allocator.setMaxVoices(8);
      // Can verify mixer gain is adjusted
      expect(() => allocator.setMaxVoices(2)).not.toThrow();
    });
  });

  describe('releaseAll', () => {
    it('should release all playing notes', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      allocator.noteOn(60, 100);
      allocator.noteOn(64, 100);
      allocator.noteOn(67, 100);

      allocator.releaseAll();

      // Voices are still tracked during release phase
      const playingNotes = allocator.getPlayingNotes();
      expect(playingNotes.length).toBe(3);
    });
  });

  describe('panic', () => {
    it('should immediately stop all voices', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      allocator.noteOn(60, 100);
      allocator.noteOn(64, 100);
      allocator.noteOn(67, 100);

      allocator.panic();

      // Panic clears the note-to-voice map
      const playingNotes = allocator.getPlayingNotes();
      expect(playingNotes).toHaveLength(0);
    });

    it('should force stop all voices', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      allocator.noteOn(60, 100);
      allocator.noteOn(64, 100);

      allocator.panic();

      // All voices should be available again
      expect(allocator.getActiveVoiceCount()).toBe(0);
    });
  });

  describe('updateParam', () => {
    it('should update param on all voices', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      // Should not throw
      allocator.updateParam('osc1', 'waveform', 'square');
      allocator.updateParam('adsr1', 'attack', 0.1);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      const allocator = new VoiceAllocator({ maxVoices: 4 });
      const { nodes, connections } = createTestPatch();
      allocator.initialize(nodes, connections);

      allocator.noteOn(60, 100);
      allocator.dispose();

      expect(allocator.getVoices()).toHaveLength(0);
      expect(allocator.getPlayingNotes()).toHaveLength(0);
    });
  });
});
