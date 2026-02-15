import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type AttenuverterData = {
  amount: number;
};

type AttenuverterNode = Node<AttenuverterData, 'attenuverter'>;

export const AttenuverterNodeUI = memo(({ id, data, selected }: NodeProps<AttenuverterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  // Defensive: ensure amount is a valid number
  const amount = typeof data.amount === 'number' && !isNaN(data.amount) ? data.amount : 0;

  // Format display: show as percentage
  const displayPercent = Math.round(amount * 100);
  const polarityColor = displayPercent < 0 ? 'text-red-400' : displayPercent > 0 ? 'text-green-400' : 'text-gray-500';

  return (
    <NodeWrapper nodeId={id} nodeType="attenuverter">
      <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[100px] ${
        selected ? 'border-cyan-400' : 'border-gray-500'
      }`}
    >
      <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
        Attenuverter
      </div>

      <div className="flex justify-center">
        <Knob
          label="Amount"
          value={amount}
          min={-1}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'amount', v)}
        />
      </div>

      {/* Polarity indicator */}
      <div className={`text-xs text-center mt-1 font-mono ${polarityColor}`}>
        {displayPercent > 0 ? '+' : ''}{displayPercent}%
      </div>

      {/* Input (modulation signal in) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
      />

      {/* Output (processed modulation signal) */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
      />
    </div>
    </NodeWrapper>
  );
});

AttenuverterNodeUI.displayName = 'AttenuverterNodeUI';
