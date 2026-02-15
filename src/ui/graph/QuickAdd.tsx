// QuickAdd - Double-click canvas to open a search popup and place a node
// Zero dragging, two clicks: double-click position, then pick the node type.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fuzzySearch, type SearchResult } from '../../utils/fuzzySearch';
import type { PatchNodeType } from '../../patch/types';

interface NodeOption {
  type: PatchNodeType;
  label: string;
  category: string;
  description: string;
}

const ALL_NODES: NodeOption[] = [
  { type: 'oscillator', label: 'Oscillator', category: 'Sources', description: 'Audio oscillator with multiple waveforms' },
  { type: 'noise', label: 'Noise', category: 'Sources', description: 'White/pink noise generator' },
  { type: 'karplusstrong', label: 'Karplus-Strong', category: 'Sources', description: 'Plucked string synthesis' },
  { type: 'granular', label: 'Granular', category: 'Sources', description: 'Granular texture processor' },
  { type: 'smoothrandom', label: 'Smooth Random', category: 'Sources', description: 'Random walk generator' },
  { type: 'lfo', label: 'LFO', category: 'Modulators', description: 'Low frequency oscillator' },
  { type: 'adsr', label: 'ADSR', category: 'Modulators', description: 'Envelope generator' },
  { type: 'envfollower', label: 'Envelope Follower', category: 'Modulators', description: 'Track amplitude' },
  { type: 'clock', label: 'Clock', category: 'Sequencing', description: 'Master tempo clock' },
  { type: 'clockdiv', label: 'Clock Divider', category: 'Sequencing', description: 'Divide clock rate' },
  { type: 'sequencer', label: 'Sequencer', category: 'Sequencing', description: 'Step sequencer' },
  { type: 'euclidean', label: 'Euclidean', category: 'Sequencing', description: 'Euclidean rhythm' },
  { type: 'samplehold', label: 'Sample & Hold', category: 'CV/Logic', description: 'Sample on trigger' },
  { type: 'quantizer', label: 'Quantizer', category: 'CV/Logic', description: 'Quantize to scales' },
  { type: 'slewlimiter', label: 'Slew Limiter', category: 'CV/Logic', description: 'Smooth CV changes' },
  { type: 'attenuverter', label: 'Attenuverter', category: 'CV/Logic', description: 'Scale/invert signals' },
  { type: 'logic', label: 'Logic', category: 'CV/Logic', description: 'Boolean operations' },
  { type: 'probgate', label: 'Probability Gate', category: 'CV/Logic', description: 'Random gate pass' },
  { type: 'macro', label: 'Macro', category: 'CV/Logic', description: 'Multi-output control' },
  { type: 'comparator', label: 'Comparator', category: 'CV/Logic', description: 'Compare CV to threshold' },
  { type: 'counter', label: 'Counter', category: 'Structure', description: 'Count triggers' },
  { type: 'sequencechain', label: 'Scene Chain', category: 'Structure', description: 'Progress through scenes' },
  { type: 'switch', label: 'Switch', category: 'Structure', description: 'Route between inputs' },
  { type: 'crossfader', label: 'Crossfader', category: 'Structure', description: 'Blend two sources' },
  { type: 'filter', label: 'Filter', category: 'Processing', description: 'LP/HP/BP resonant filter' },
  { type: 'vca', label: 'VCA', category: 'Processing', description: 'Voltage controlled amp' },
  { type: 'wavefolder', label: 'Wavefolder', category: 'Processing', description: 'Harmonic waveshaping' },
  { type: 'ringmod', label: 'Ring Mod', category: 'Processing', description: 'Ring modulation' },
  { type: 'delay', label: 'Delay', category: 'Effects', description: 'Echo effect' },
  { type: 'reverb', label: 'Reverb', category: 'Effects', description: 'Space and ambience' },
  { type: 'mixer', label: 'Mixer', category: 'Effects', description: '4-channel mixer' },
];

interface QuickAddProps {
  position: { x: number; y: number }; // Screen position of popup
  canvasPosition: { x: number; y: number }; // Where to place the node on canvas
  onAdd: (type: PatchNodeType, position: { x: number; y: number }) => void;
  onClose: () => void;
}

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  'Sources': 'text-orange-400',
  'Modulators': 'text-pink-400',
  'Sequencing': 'text-emerald-400',
  'CV/Logic': 'text-sky-400',
  'Structure': 'text-amber-400',
  'Processing': 'text-purple-400',
  'Effects': 'text-blue-400',
};

export function QuickAdd({ position, canvasPosition, onAdd, onClose }: QuickAddProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo<SearchResult<NodeOption>[]>(() => {
    return fuzzySearch(query, ALL_NODES, (n) => `${n.label} ${n.category} ${n.description}`);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.quick-add-popup')) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, Math.min(results.length - 1, 14)));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onAdd(results[selectedIndex].item.type, canvasPosition);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          // Tab cycles through results
          setSelectedIndex((i) => (i + 1) % Math.min(results.length, 15));
          break;
      }
    },
    [results, selectedIndex, onClose, onAdd, canvasPosition]
  );

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x - 150, window.innerWidth - 320),
    top: Math.min(position.y - 20, window.innerHeight - 400),
    zIndex: 100,
  };

  return (
    <div className="quick-add-popup" style={style}>
      <div className="w-[300px] bg-gray-800 border border-cyan-500/50 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700">
          <span className="text-cyan-400 text-sm">+</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add module..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="px-1.5 py-0.5 text-[9px] text-gray-500 bg-gray-700 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto">
          {results.slice(0, 15).map((result, index) => (
            <button
              key={result.item.type}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-cyan-900/40 border-l-2 border-cyan-400'
                  : 'hover:bg-gray-700/50 border-l-2 border-transparent'
              }`}
              onClick={() => {
                onAdd(result.item.type, canvasPosition);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">{result.item.label}</div>
                <div className="text-[10px] text-gray-500">{result.item.description}</div>
              </div>
              <span className={`text-[10px] ${CATEGORY_COLORS[result.item.category] || 'text-gray-400'}`}>
                {result.item.category}
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-gray-500 text-sm">No modules found</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-gray-700 text-[10px] text-gray-600 flex gap-3">
          <span><kbd className="px-1 bg-gray-700 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 bg-gray-700 rounded">↵</kbd> add</span>
        </div>
      </div>
    </div>
  );
}
