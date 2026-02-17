import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type ResonatorData = {
  frequency: number; resonance: number; mode: string;
  partials: number; spread: number; brightness: number;
  decay: number; mix: number;
};
type ResonatorNode = Node<ResonatorData, 'resonator'>;

const MODES = ['harmonic', 'inharm', 'octaves', 'chord', 'free'];
const MODE_LABELS: Record<string, string> = {
  harmonic: 'Harmonic', inharm: 'Inharm', octaves: 'Octaves', chord: 'Chord', free: 'Free',
};

export const ResonatorNodeUI = memo(({ id, data, selected }: NodeProps<ResonatorNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="resonator">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[190px] ${selected ? 'border-cyan-400' : 'border-amber-500'}`}>
        <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">🔔 Resonator</div>

        <div className="mb-2">
          <label className="text-[10px] text-gray-400 block mb-0.5">Mode</label>
          <select value={data.mode || 'harmonic'} onChange={(e) => updateNodeParam(id, 'mode', e.target.value)}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded px-1.5 py-0.5 border border-gray-700">
            {MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob label="Freq" value={data.frequency ?? 220} min={20} max={8000} step={1} unit="Hz" onChange={(v) => updateNodeParam(id, 'frequency', v)} />
          <Knob label="Reso" value={data.resonance ?? 30} min={1} max={100} step={1} onChange={(v) => updateNodeParam(id, 'resonance', v)} />
          <Knob label="Parts" value={data.partials ?? 6} min={2} max={12} step={1} onChange={(v) => updateNodeParam(id, 'partials', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Spread" value={data.spread ?? 0.3} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'spread', v)} />
          <Knob label="Bright" value={data.brightness ?? 0.6} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'brightness', v)} />
          <Knob label="Mix" value={data.mix ?? 0.8} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'mix', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="freq_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '35%' }} title="Freq Mod" />
        <ClickableHandle type="target" position={Position.Top} id="mix_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '65%' }} title="Mix Mod" />
        <ClickableHandle type="target" position={Position.Bottom} id="trigger" nodeId={id} className="!bg-cyan-400 !w-2 !h-2 !-bottom-1" style={{ left: '50%' }} title="Strike Trigger" />
        <ClickableHandle type="target" position={Position.Left} id="input" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

ResonatorNodeUI.displayName = 'ResonatorNodeUI';
