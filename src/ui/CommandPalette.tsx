import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fuzzySearch, type SearchResult } from '../utils/fuzzySearch';
import { usePatchStore } from '../patch/patchStore';
import {
  DEMO_PATCH,
  SIMPLE_PATCH,
  MIXER_PATCH,
  SEQUENCER_PATCH,
  RANDOM_MELODY_PATCH,
  WESTCOAST_PATCH,
  BELLS_PATCH,
  NOISE_DRUMS_PATCH,
  AMBIENT_PATCH,
  POLYRHYTHM_PATCH,
  TRACKER_DEMO_PATCH,
  AMBIENT_GENERATIVE_PATCH,
  PENTATONIC_DREAMS_PATCH,
  CRYSTAL_BELLS_PATCH,
  MIDNIGHT_DRIVE_PATCH,
  ETHEREAL_DRIFT_PATCH,
  EVOLVING_MELODY_PATCH,
  POLYRHYTHMIC_TRIGGERS_PATCH,
  MACRO_DRONE_PATCH,
  COSMIC_CATHEDRAL_PATCH,
  ETERNAL_GARDEN_PATCH,
} from '../patch/samplePatches';
import type { Patch } from '../patch/types';

// Command types
type CommandType = 'patch' | 'node' | 'action';

interface Command {
  id: string;
  type: CommandType;
  name: string;
  description: string;
  icon: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// Highlight matched characters in text
function HighlightedText({ text, matches }: { text: string; matches: number[] }) {
  if (matches.length === 0) {
    return <span>{text}</span>;
  }

  const matchSet = new Set(matches);
  return (
    <span>
      {text.split('').map((char, i) => (
        <span key={i} className={matchSet.has(i) ? 'text-cyan-400 font-bold' : ''}>
          {char}
        </span>
      ))}
    </span>
  );
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setPatch = usePatchStore((state) => state.setPatch);
  const addNode = usePatchStore((state) => state.addNode);
  const autoLayoutNodes = usePatchStore((state) => state.autoLayoutNodes);

  // Define all available commands
  const commands = useMemo<Command[]>(() => {
    const patches: [string, Patch][] = [
      ['Demo', DEMO_PATCH],
      ['Simple', SIMPLE_PATCH],
      ['Mixer', MIXER_PATCH],
      ['Sequencer', SEQUENCER_PATCH],
      ['Random Melody', RANDOM_MELODY_PATCH],
      ['West Coast', WESTCOAST_PATCH],
      ['Bells', BELLS_PATCH],
      ['Noise Drums', NOISE_DRUMS_PATCH],
      ['Ambient', AMBIENT_PATCH],
      ['Polyrhythm', POLYRHYTHM_PATCH],
      ['Tracker Demo', TRACKER_DEMO_PATCH],
      ['Ambient Generative', AMBIENT_GENERATIVE_PATCH],
      ['Pentatonic Dreams', PENTATONIC_DREAMS_PATCH],
      ['Crystal Bells', CRYSTAL_BELLS_PATCH],
      ['Midnight Drive', MIDNIGHT_DRIVE_PATCH],
      ['Ethereal Drift', ETHEREAL_DRIFT_PATCH],
      ['Evolving Melody', EVOLVING_MELODY_PATCH],
      ['Polyrhythmic Triggers', POLYRHYTHMIC_TRIGGERS_PATCH],
      ['Macro Drone', MACRO_DRONE_PATCH],
      ['Cosmic Cathedral', COSMIC_CATHEDRAL_PATCH],
      ['Eternal Garden', ETERNAL_GARDEN_PATCH],
    ];

    const nodeTypes: [string, string, string][] = [
      ['oscillator', 'Oscillator', 'Sound source with waveforms'],
      ['filter', 'Filter', 'Shape sound with LP/HP/BP'],
      ['vca', 'VCA', 'Voltage controlled amplifier'],
      ['lfo', 'LFO', 'Low frequency oscillator for modulation'],
      ['adsr', 'ADSR', 'Envelope generator'],
      ['delay', 'Delay', 'Echo effect'],
      ['reverb', 'Reverb', 'Space and ambience'],
      ['mixer', 'Mixer', 'Combine multiple signals'],
      ['sequencer', 'Sequencer', 'Step sequencer for patterns'],
      ['attenuverter', 'Attenuverter', 'Scale and invert signals'],
      ['noise', 'Noise', 'White/pink noise generator'],
      ['samplehold', 'Sample & Hold', 'Sample signal on trigger'],
      ['wavefolder', 'Wavefolder', 'Harmonic distortion'],
      ['ringmod', 'Ring Mod', 'Ring modulation effect'],
      ['quantizer', 'Quantizer', 'Snap to musical scales'],
      ['clock', 'Clock', 'Timing pulse generator'],
      ['clockdiv', 'Clock Divider', 'Divide clock pulses'],
      ['smoothrandom', 'Smooth Random', 'Random walk modulation'],
      ['karplusstrong', 'Karplus-Strong', 'Physical string modeling'],
      ['granular', 'Granular', 'Granular synthesis'],
      ['output', 'Output', 'Audio output to speakers'],
    ];

    const actions: [string, string, () => void][] = [
      ['Auto Layout', 'Arrange nodes automatically', autoLayoutNodes],
      ['New Patch', 'Clear and start fresh', () => setPatch(SIMPLE_PATCH)],
    ];

    const cmds: Command[] = [];

    // Add patches
    for (const [name, patch] of patches) {
      cmds.push({
        id: `patch-${name}`,
        type: 'patch',
        name,
        description: 'Load patch',
        icon: '📁',
        action: () => setPatch(patch),
      });
    }

    // Add node types
    for (const [type, name, desc] of nodeTypes) {
      cmds.push({
        id: `node-${type}`,
        type: 'node',
        name,
        description: desc,
        icon: '➕',
        action: () => {
          // Add at a reasonable position
          const x = 100 + Math.random() * 200;
          const y = 100 + Math.random() * 200;
          addNode(type as any, { x, y });
        },
      });
    }

    // Add actions
    for (const [name, desc, fn] of actions) {
      cmds.push({
        id: `action-${name}`,
        type: 'action',
        name,
        description: desc,
        icon: '⚡',
        action: fn,
      });
    }

    return cmds;
  }, [setPatch, addNode, autoLayoutNodes]);

  // Filter commands based on query
  const results = useMemo<SearchResult<Command>[]>(() => {
    return fuzzySearch(query, commands, (cmd) => `${cmd.name} ${cmd.description}`);
  }, [query, commands]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].item.action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  // Handle click on item
  const handleItemClick = useCallback(
    (index: number) => {
      if (results[index]) {
        results[index].item.action();
        onClose();
      }
    },
    [results, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search patches, nodes, actions..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="px-2 py-0.5 text-xs text-gray-500 bg-gray-800 rounded border border-gray-700">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No results found
            </div>
          ) : (
            results.slice(0, 20).map((result, index) => (
              <div
                key={result.item.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${
                  index === selectedIndex
                    ? 'bg-cyan-900/40 border-l-2 border-cyan-400'
                    : 'hover:bg-gray-800/50 border-l-2 border-transparent'
                }`}
                onClick={() => handleItemClick(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="text-lg">{result.item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    <HighlightedText text={result.item.name} matches={result.matches} />
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {result.item.description}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    result.item.type === 'patch'
                      ? 'bg-purple-900/50 text-purple-300'
                      : result.item.type === 'node'
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-orange-900/50 text-orange-300'
                  }`}
                >
                  {result.item.type}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 flex gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Enter</kbd> select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
