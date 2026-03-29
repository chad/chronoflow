// NodeWrapper - wraps node UIs with mute/bypass visuals, signal indicator, and semantic zoom
// Also adds preset menu and right-click context

import { memo, useState, useCallback } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import { SignalLED, MiniScope } from './SignalIndicator';
import { getPresetsForType, savePreset, type NodePreset } from '../../patch/nodePresets';
import { useTraceNodeIds } from './TraceContext';
import type { PatchNodeType } from '../../patch/types';

interface NodeWrapperProps {
  nodeId: string;
  nodeType: PatchNodeType;
  children: React.ReactNode;
  /** Current zoom level from viewport */
  zoomLevel?: number;
}

export const NodeWrapper = memo(({ nodeId, nodeType, children }: NodeWrapperProps) => {
  const node = usePatchStore((state) => state.patch.nodes.find((n) => n.id === nodeId));
  const toggleMute = usePatchStore((state) => state.toggleMute);
  // toggleBypass available via context menu
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);

  // Use precomputed trace set from context (O(1) lookup instead of O(N) BFS per node)
  const traceNodeIds = useTraceNodeIds();

  const [showPresets, setShowPresets] = useState(false);
  const [showScope, setShowScope] = useState(false);

  const isMuted = node?.muted || false;
  const isBypassed = node?.bypassed || false;

  // Signal tracing: dim nodes not in the trace path
  const tracingOpacity = traceNodeIds && !traceNodeIds.has(nodeId) ? 0.2 : 1;

  const handleLoadPreset = useCallback((preset: NodePreset) => {
    Object.entries(preset.params).forEach(([param, value]) => {
      updateNodeParam(nodeId, param, value);
    });
    setShowPresets(false);
  }, [nodeId, updateNodeParam]);

  const handleSavePreset = useCallback(() => {
    if (!node) return;
    const name = prompt('Preset name:');
    if (!name) return;
    savePreset(nodeType, name, node.params);
    setShowPresets(false);
  }, [node, nodeType]);

  const presets = getPresetsForType(nodeType);

  return (
    <div
      className="relative"
      style={{ opacity: tracingOpacity, transition: 'opacity 0.3s' }}
    >
      {/* Muted overlay */}
      {isMuted && (
        <div className="absolute inset-0 bg-gray-900/70 z-10 rounded-lg pointer-events-none flex items-center justify-center">
          <span className="text-gray-400 text-xs font-bold">MUTED</span>
        </div>
      )}

      {/* Bypass stripe overlay */}
      {isBypassed && (
        <div className="absolute inset-0 z-10 rounded-lg pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(234,179,8,0.15) 4px, rgba(234,179,8,0.15) 8px)',
            }}
          />
          <div className="absolute top-1 right-1 text-[9px] text-yellow-400 font-bold bg-gray-900/80 px-1 rounded">
            BYP
          </div>
        </div>
      )}

      {/* Top-right controls: signal LED + preset + scope toggle */}
      <div className="absolute -top-3 right-1 flex items-center gap-1 z-20">
        {isAudioEnabled && <SignalLED nodeId={nodeId} />}

        {/* Preset button */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-[9px] text-gray-500 hover:text-gray-300 bg-gray-800 rounded px-1"
            title="Presets"
          >
            ★
          </button>
          {showPresets && presets.length > 0 && (
            <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[120px] max-h-[200px] overflow-y-auto">
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleLoadPreset(p)}
                  className="w-full text-left px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-700"
                >
                  {p.name}
                </button>
              ))}
              <div className="border-t border-gray-700" />
              <button
                onClick={handleSavePreset}
                className="w-full text-left px-2 py-1 text-[10px] text-cyan-400 hover:bg-gray-700"
              >
                + Save Current
              </button>
            </div>
          )}
        </div>

        {/* Scope toggle */}
        <button
          onClick={() => setShowScope(!showScope)}
          className={`text-[9px] ${showScope ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'} bg-gray-800 rounded px-1`}
          title="Toggle scope"
        >
          〰
        </button>

        {/* Quick mute/bypass */}
        <button
          onClick={() => toggleMute(nodeId)}
          className={`text-[9px] ${isMuted ? 'text-red-400' : 'text-gray-600 hover:text-gray-300'} bg-gray-800 rounded px-1`}
          title="Mute (M)"
        >
          M
        </button>
      </div>

      {/* Mini scope */}
      {showScope && isAudioEnabled && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-20">
          <MiniScope nodeId={nodeId} width={80} height={24} />
        </div>
      )}

      {/* The actual node UI */}
      {children}
    </div>
  );
});

NodeWrapper.displayName = 'NodeWrapper';
