// ContextMenu - right-click context menu for canvas, nodes, and edges

import { useState, useEffect, useRef } from 'react';
import type { PatchNodeType } from '../../patch/types';

export interface ContextMenuState {
  type: 'canvas' | 'node' | 'edge';
  x: number;
  y: number;
  nodeId?: string;
  nodeType?: string;
  isMuted?: boolean;
  isBypassed?: boolean;
  edgeId?: string;
}

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onAddNode: (type: PatchNodeType, position: { x: number; y: number }) => void;
  onPaste: (position: { x: number; y: number }) => void;
  onSelectAll: () => void;
  onAutoLayout: () => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDisconnectAll: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleBypass: (id: string) => void;
  onCopyNode: (id: string) => void;
  onTraceSignal: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  hasClipboard: boolean;
}

interface MenuCategory {
  name: string;
  items: { type: PatchNodeType; label: string }[];
}

const NODE_CATEGORIES: MenuCategory[] = [
  {
    name: 'Sources',
    items: [
      { type: 'oscillator', label: 'Oscillator' },
      { type: 'noise', label: 'Noise' },
      { type: 'karplusstrong', label: 'Karplus-Strong' },
      { type: 'granular', label: 'Granular' },
      { type: 'smoothrandom', label: 'Smooth Random' },
    ],
  },
  {
    name: 'Modulators',
    items: [
      { type: 'lfo', label: 'LFO' },
      { type: 'adsr', label: 'ADSR' },
      { type: 'envfollower', label: 'Env Follower' },
    ],
  },
  {
    name: 'Sequencing',
    items: [
      { type: 'clock', label: 'Clock' },
      { type: 'clockdiv', label: 'Clock Divider' },
      { type: 'sequencer', label: 'Sequencer' },
      { type: 'euclidean', label: 'Euclidean' },
    ],
  },
  {
    name: 'CV / Logic',
    items: [
      { type: 'samplehold', label: 'Sample & Hold' },
      { type: 'quantizer', label: 'Quantizer' },
      { type: 'slewlimiter', label: 'Slew Limiter' },
      { type: 'attenuverter', label: 'Attenuverter' },
      { type: 'logic', label: 'Logic' },
      { type: 'probgate', label: 'Prob Gate' },
      { type: 'macro', label: 'Macro' },
      { type: 'comparator', label: 'Comparator' },
    ],
  },
  {
    name: 'Structure',
    items: [
      { type: 'counter', label: 'Counter' },
      { type: 'sequencechain', label: 'Scene Chain' },
      { type: 'switch', label: 'Switch' },
      { type: 'crossfader', label: 'Crossfader' },
    ],
  },
  {
    name: 'Processing',
    items: [
      { type: 'filter', label: 'Filter' },
      { type: 'vca', label: 'VCA' },
      { type: 'wavefolder', label: 'Wavefolder' },
      { type: 'ringmod', label: 'Ring Mod' },
    ],
  },
  {
    name: 'Effects',
    items: [
      { type: 'delay', label: 'Delay' },
      { type: 'reverb', label: 'Reverb' },
      { type: 'mixer', label: 'Mixer' },
    ],
  },
];

function MenuItem({
  label,
  shortcut,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
        disabled
          ? 'text-gray-600 cursor-not-allowed'
          : danger
          ? 'text-red-400 hover:bg-red-900/30'
          : 'text-gray-200 hover:bg-gray-700'
      }`}
    >
      <span>{label}</span>
      {shortcut && <kbd className="text-[10px] text-gray-500 ml-4">{shortcut}</kbd>}
    </button>
  );
}

function Divider() {
  return <div className="border-t border-gray-700 my-1" />;
}

export function ContextMenu({
  state,
  onClose,
  onAddNode,
  onPaste,
  onSelectAll,
  onAutoLayout,
  onDeleteNode,
  onDuplicateNode,
  onDisconnectAll,
  onToggleMute,
  onToggleBypass,
  onCopyNode,
  onTraceSignal,
  onDeleteEdge,
  hasClipboard,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay attaching to avoid closing immediately from the triggering right-click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    document.addEventListener('keydown', handleEsc);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(state.x, window.innerWidth - 220),
    top: Math.min(state.y, window.innerHeight - 300),
    zIndex: 100,
  };

  // Node context menu
  if (state.type === 'node' && state.nodeId) {
    return (
      <div ref={menuRef} style={style} className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[180px]">
        <div className="px-3 py-1 text-[10px] text-gray-500 uppercase">
          {state.nodeType || 'Node'}
        </div>
        <MenuItem label="Copy" shortcut="⌘C" onClick={() => { onCopyNode(state.nodeId!); onClose(); }} />
        <MenuItem label="Duplicate" shortcut="⌘D" onClick={() => { onDuplicateNode(state.nodeId!); onClose(); }} />
        <Divider />
        <MenuItem
          label={state.isMuted ? '✓ Muted' : 'Mute'}
          shortcut="M"
          onClick={() => { onToggleMute(state.nodeId!); onClose(); }}
        />
        <MenuItem
          label={state.isBypassed ? '✓ Bypassed' : 'Bypass'}
          shortcut="B"
          onClick={() => { onToggleBypass(state.nodeId!); onClose(); }}
        />
        <Divider />
        <MenuItem label="Trace Signal Path" onClick={() => { onTraceSignal(state.nodeId!); onClose(); }} />
        <MenuItem label="Disconnect All" onClick={() => { onDisconnectAll(state.nodeId!); onClose(); }} />
        <Divider />
        <MenuItem
          label="Delete"
          shortcut="⌫"
          danger
          onClick={() => { onDeleteNode(state.nodeId!); onClose(); }}
          disabled={state.nodeId === 'output'}
        />
      </div>
    );
  }

  // Edge context menu
  if (state.type === 'edge' && state.edgeId) {
    return (
      <div ref={menuRef} style={style} className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[140px]">
        <MenuItem
          label="Delete Connection"
          shortcut="⌫"
          danger
          onClick={() => { onDeleteEdge(state.edgeId!); onClose(); }}
        />
      </div>
    );
  }

  // Canvas context menu with Add Module submenu
  return (
    <div ref={menuRef} style={style} className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[200px] max-h-[80vh] overflow-y-auto">
      <div className="px-3 py-1 text-[10px] text-gray-500 uppercase">Add Module</div>
      {NODE_CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
            onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
          >
            <span>{cat.name}</span>
            <span className="text-gray-500 text-[10px]">{expandedCategory === cat.name ? '▼' : '▶'}</span>
          </button>
          {expandedCategory === cat.name && (
            <div>
              {cat.items.map((item) => (
                <button
                  key={item.type}
                  className="w-full text-left pl-6 pr-3 py-1.5 text-xs text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300"
                  onClick={() => {
                    onAddNode(item.type, { x: state.x, y: state.y });
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <Divider />
      <MenuItem
        label="Paste"
        shortcut="⌘V"
        onClick={() => { onPaste({ x: state.x, y: state.y }); onClose(); }}
        disabled={!hasClipboard}
      />
      <MenuItem label="Select All" shortcut="⌘A" onClick={() => { onSelectAll(); onClose(); }} />
      <MenuItem label="Auto Layout" onClick={() => { onAutoLayout(); onClose(); }} />
    </div>
  );
}
