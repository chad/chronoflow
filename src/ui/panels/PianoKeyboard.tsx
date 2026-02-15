// PianoKeyboard - on-screen clickable piano with octave controls
// Shows active notes from both MIDI and computer keyboard

import { useState, useCallback, useRef, useEffect } from 'react';
import { audioGraph } from '../../audio/AudioGraph';
import { midiRouter } from '../../midi/MidiRouter';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function isBlackKey(noteInOctave: number): boolean {
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

interface PianoKeyboardProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function PianoKeyboard({ isCollapsed, onToggleCollapse }: PianoKeyboardProps) {
  const [octave, setOctave] = useState(4); // Middle C = C4 = MIDI 60
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [pitchBend, setPitchBend] = useState(0);
  const [sustainDown, setSustainDown] = useState(false);

  // Listen for MIDI input notes to display on piano
  useEffect(() => {
    const unsubNoteOn = midiRouter.onNoteOn((note) => {
      activeNotesRef.current.add(note);
      setActiveNotes(new Set(activeNotesRef.current));
    });
    const unsubNoteOff = midiRouter.onNoteOff((note) => {
      if (note === -1) {
        // All notes off
        activeNotesRef.current.clear();
      } else {
        activeNotesRef.current.delete(note);
      }
      setActiveNotes(new Set(activeNotesRef.current));
    });
    const unsubPitchBend = midiRouter.onPitchBend((value) => {
      setPitchBend(value);
    });

    // Poll sustain pedal state
    const interval = setInterval(() => {
      setSustainDown(midiRouter.isSustainDown());
    }, 100);

    return () => {
      unsubNoteOn();
      unsubNoteOff();
      unsubPitchBend();
      clearInterval(interval);
    };
  }, []);

  const handleNoteOn = useCallback((note: number) => {
    activeNotesRef.current.add(note);
    setActiveNotes(new Set(activeNotesRef.current));
    audioGraph.noteOn(note, 100);
  }, []);

  const handleNoteOff = useCallback((note: number) => {
    activeNotesRef.current.delete(note);
    setActiveNotes(new Set(activeNotesRef.current));
    audioGraph.noteOff(note);
  }, []);

  // Octave keyboard shortcuts (Z/X)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'z' && !e.metaKey && !e.ctrlKey) {
        setOctave((o) => Math.max(1, o - 1));
      } else if (e.key === 'x' && !e.metaKey && !e.ctrlKey) {
        setOctave((o) => Math.min(7, o + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (isCollapsed) {
    return (
      <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4">
        <button
          onClick={onToggleCollapse}
          className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-2"
        >
          <span>🎹</span>
          <span>Piano</span>
          {activeNotes.size > 0 && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
          <span className="text-[10px]">▲</span>
        </button>
        <div className="flex items-center gap-3">
          {sustainDown && (
            <span className="text-[10px] text-yellow-400">SUS</span>
          )}
          {pitchBend !== 0 && (
            <span className="text-[10px] text-cyan-400">PB {pitchBend > 0 ? '+' : ''}{(pitchBend * 100).toFixed(0)}%</span>
          )}
          <span className="text-[10px] text-gray-600">
            Z/X = octave • A-L = play
          </span>
        </div>
      </div>
    );
  }

  const startNote = (octave) * 12; // C of current octave
  const numKeys = 25; // 2 octaves + 1

  const whiteKeys: { note: number; noteInOctave: number; name: string }[] = [];
  const blackKeys: { note: number; noteInOctave: number; name: string; whiteIndex: number }[] = [];

  let whiteIndex = 0;
  for (let i = 0; i < numKeys; i++) {
    const note = startNote + i;
    const noteInOctave = note % 12;
    const noteOctave = Math.floor(note / 12) - 1;
    const name = `${NOTE_NAMES[noteInOctave]}${noteOctave}`;

    if (isBlackKey(noteInOctave)) {
      blackKeys.push({ note, noteInOctave, name, whiteIndex: whiteIndex - 1 });
    } else {
      whiteKeys.push({ note, noteInOctave, name });
      whiteIndex++;
    }
  }

  const whiteKeyWidth = 100 / whiteKeys.length;

  return (
    <div className="bg-gray-900 border-t border-gray-800">
      {/* Controls bar */}
      <div className="h-8 flex items-center justify-between px-4 border-b border-gray-800">
        <button
          onClick={onToggleCollapse}
          className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-2"
        >
          <span>🎹</span>
          <span>Piano</span>
          <span className="text-[10px]">▼</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOctave((o) => Math.max(1, o - 1))}
            className="text-xs text-gray-400 hover:text-white px-2 py-0.5 bg-gray-800 rounded"
          >
            Oct-
          </button>
          <span className="text-xs text-gray-300 font-mono w-8 text-center">C{octave}</span>
          <button
            onClick={() => setOctave((o) => Math.min(7, o + 1))}
            className="text-xs text-gray-400 hover:text-white px-2 py-0.5 bg-gray-800 rounded"
          >
            Oct+
          </button>
          <span className="text-[10px] text-gray-600 ml-2">Z/X = octave</span>
          {sustainDown && (
            <span className="ml-2 text-[10px] text-yellow-400 font-bold">⬤ SUS</span>
          )}
          {pitchBend !== 0 && (
            <span className="ml-2 text-[10px] text-cyan-400 font-mono">PB {pitchBend > 0 ? '+' : ''}{(pitchBend * midiRouter.getPitchBendRange()).toFixed(1)}st</span>
          )}
          {activeNotes.size > 0 && (
            <span className="ml-2 text-[10px] text-green-400">{activeNotes.size} note{activeNotes.size !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Piano keys */}
      <div className="relative h-16 select-none" style={{ touchAction: 'none' }}>
        {/* White keys */}
        <div className="flex h-full">
          {whiteKeys.map((key) => {
            const isActive = activeNotes.has(key.note);
            return (
              <button
                key={key.note}
                className={`relative flex-1 border-x border-gray-600 rounded-b transition-colors ${
                  isActive
                    ? 'bg-cyan-400'
                    : 'bg-gray-100 hover:bg-gray-300 active:bg-cyan-300'
                }`}
                style={{ width: `${whiteKeyWidth}%` }}
                onMouseDown={(e) => { e.preventDefault(); handleNoteOn(key.note); }}
                onMouseUp={() => handleNoteOff(key.note)}
                onMouseLeave={() => { if (activeNotes.has(key.note)) handleNoteOff(key.note); }}
                onTouchStart={(e) => { e.preventDefault(); handleNoteOn(key.note); }}
                onTouchEnd={() => handleNoteOff(key.note)}
              >
                {key.noteInOctave === 0 && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-500">
                    {key.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Black keys */}
        {blackKeys.map((key) => {
          const isActive = activeNotes.has(key.note);
          // Position black key between white keys
          const leftPercent = ((key.whiteIndex + 0.65) / whiteKeys.length) * 100;
          const widthPercent = (0.7 / whiteKeys.length) * 100;

          return (
            <button
              key={key.note}
              className={`absolute top-0 rounded-b-md transition-colors ${
                isActive
                  ? 'bg-cyan-500'
                  : 'bg-gray-900 hover:bg-gray-700 active:bg-cyan-600'
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                height: '60%',
                zIndex: 1,
              }}
              onMouseDown={(e) => { e.preventDefault(); handleNoteOn(key.note); }}
              onMouseUp={() => handleNoteOff(key.note)}
              onMouseLeave={() => { if (activeNotes.has(key.note)) handleNoteOff(key.note); }}
              onTouchStart={(e) => { e.preventDefault(); handleNoteOn(key.note); }}
              onTouchEnd={() => handleNoteOff(key.note)}
            />
          );
        })}
      </div>
    </div>
  );
}
