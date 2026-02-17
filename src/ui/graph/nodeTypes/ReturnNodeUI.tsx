import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type ReturnData = { bus: string; gain: number };
type ReturnNode = Node<ReturnData, 'return'>;

const BUS_OPTIONS = ['A', 'B', 'C', 'D', 'reverb', 'delay'];

export const ReturnNodeUI = memo(({ id, data, selected }: NodeProps<ReturnNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="return">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[130px] ${selected ? 'border-cyan-400' : 'border-teal-500'}`}>
        <div className="text-xs font-bold text-teal-400 mb-2 uppercase tracking-wide flex items-center gap-1">
          <span>📥</span> Return
        </div>

        <div className="mb-2">
          <label className="text-[10px] text-gray-400 block mb-1">Bus</label>
          <select
            value={data.bus || 'A'}
            onChange={(e) => updateNodeParam(id, 'bus', e.target.value)}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-700"
          >
            {BUS_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="flex justify-center">
          <Knob label="Gain" value={data.gain ?? 1} min={0} max={2} step={0.01} onChange={(v) => updateNodeParam(id, 'gain', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="gain_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '50%' }} title="Gain Mod" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

ReturnNodeUI.displayName = 'ReturnNodeUI';
