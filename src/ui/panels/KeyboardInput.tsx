import { useEffect, useState } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import { audioGraph } from '../../audio/AudioGraph';

// Map computer keyboard to MIDI notes (starting at C3 = 48)
const KEY_TO_NOTE: Record<string, number> = {
  // Bottom row: C3-B3
  a: 48, // C3
  w: 49, // C#3
  s: 50, // D3
  e: 51, // D#3
  d: 52, // E3
  f: 53, // F3
  t: 54, // F#3
  g: 55, // G3
  y: 56, // G#3
  h: 57, // A3
  u: 58, // A#3
  j: 59, // B3
  // Upper row: C4-E4
  k: 60, // C4
  o: 61, // C#4
  l: 62, // D4
  p: 63, // D#4
  ';': 64, // E4
};

function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function noteToName(note: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${names[note % 12]}${octave}`;
}

export function KeyboardInput() {
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const patch = usePatchStore((state) => state.patch);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const note = KEY_TO_NOTE[e.key.toLowerCase()];
      if (note !== undefined) {
        e.preventDefault();
        setActiveNote(note);

        const frequency = midiNoteToFrequency(note);
        const hasADSR = patch.nodes.some((node) => node.type === 'adsr');

        // Update all oscillators
        patch.nodes.forEach((node) => {
          if (node.type === 'oscillator') {
            updateNodeParam(node.id, 'frequency', frequency);
          }
          // Only control VCA directly if there's no ADSR
          if (node.type === 'vca' && !hasADSR) {
            updateNodeParam(node.id, 'gain', 0.5);
          }
        });

        // Trigger all ADSRs
        audioGraph.triggerAllADSRs(0.8);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = KEY_TO_NOTE[e.key.toLowerCase()];
      if (note !== undefined && note === activeNote) {
        setActiveNote(null);

        const hasADSR = patch.nodes.some((node) => node.type === 'adsr');

        // Only set VCAs to zero directly if there's no ADSR
        if (!hasADSR) {
          patch.nodes.forEach((node) => {
            if (node.type === 'vca') {
              updateNodeParam(node.id, 'gain', 0);
            }
          });
        }

        // Release all ADSRs
        audioGraph.releaseAllADSRs();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeNote, patch.nodes, updateNodeParam]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-2">Keyboard</h3>
      <p className="text-xs text-gray-400 mb-2">Use A-L keys to play</p>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full transition-colors ${
            activeNote ? 'bg-green-400' : 'bg-gray-600'
          }`}
        />
        <span className="text-xs text-gray-300">
          {activeNote ? noteToName(activeNote) : 'Ready'}
        </span>
      </div>
    </div>
  );
}
