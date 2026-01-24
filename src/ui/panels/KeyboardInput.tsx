import { useEffect, useState, useCallback, useRef } from 'react';
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

function noteToName(note: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${names[note % 12]}${octave}`;
}

export function KeyboardInput() {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const activeNotesRef = useRef<Set<number>>(new Set());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;

    // Don't capture keyboard when user is typing in an input field
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const note = KEY_TO_NOTE[e.key.toLowerCase()];
    if (note !== undefined && !activeNotesRef.current.has(note)) {
      e.preventDefault();

      // Add to active notes
      activeNotesRef.current.add(note);
      setActiveNotes(new Set(activeNotesRef.current));

      // Trigger note with default velocity (100 out of 127)
      audioGraph.noteOn(note, 100);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Don't capture keyboard when user is typing in an input field
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const note = KEY_TO_NOTE[e.key.toLowerCase()];
    if (note !== undefined && activeNotesRef.current.has(note)) {
      // Remove from active notes
      activeNotesRef.current.delete(note);
      setActiveNotes(new Set(activeNotesRef.current));

      // Release note
      audioGraph.noteOff(note);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const activeNotesList = Array.from(activeNotes);
  const voiceCount = audioGraph.getActiveVoiceCount();

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-2">Keyboard</h3>
      <p className="text-xs text-gray-400 mb-2">Use A-L keys to play (polyphonic)</p>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full transition-colors ${
            activeNotes.size > 0 ? 'bg-green-400' : 'bg-gray-600'
          }`}
        />
        <span className="text-xs text-gray-300">
          {activeNotes.size > 0
            ? activeNotesList.map(noteToName).join(', ')
            : 'Ready'}
        </span>
      </div>
      {voiceCount > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Voices: {voiceCount}
        </div>
      )}
    </div>
  );
}
