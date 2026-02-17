import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type SendData = { bus: string; amount: number; preFader: boolean };
type SendNode = Node<SendData, 'send'>;

const BUS_OPTIONS = ['A', 'B', 'C', 'D', 'reverb', 'delay'];

export const SendNodeUI = memo(({ id, data, selected }: NodeProps<SendNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="send">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[130px] ${selected ? 'border-cyan-400' : 'border-emerald-500'}`}>
        <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wide flex items-center gap-1">
          <span>📤</span> Send
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
          <Knob label="Amount" value={data.amount ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'amount', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="amount_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '70%' }} title="Amount Mod" />
        <ClickableHandle type="target" position={Position.Left} id="input" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

SendNodeUI.displayName = 'SendNodeUI';
