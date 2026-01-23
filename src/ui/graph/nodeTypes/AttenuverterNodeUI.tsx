import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type AttenuverterData = {
  amount: number;
};

type AttenuverterNode = Node<AttenuverterData, 'attenuverter'>;

export const AttenuverterNodeUI = memo(({ id, data, selected }: NodeProps<AttenuverterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  // Format display: show as percentage
  const displayPercent = Math.round(data.amount * 100);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[90px] ${
        selected ? 'border-cyan-400' : 'border-gray-500'
      }`}
    >
      <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide text-center">
        Atten
      </div>

      <div className="flex justify-center">
        <Knob
          label="Amount"
          value={data.amount}
          min={-1}
          max={1}
          step={0.01}
          unit="%"
          onChange={(v) => updateNodeParam(id, 'amount', v)}
        />
      </div>

      {/* Visual indicator of polarity */}
      <div className="text-[10px] text-center mt-1">
        <span className={displayPercent < 0 ? 'text-red-400' : displayPercent > 0 ? 'text-green-400' : 'text-gray-500'}>
          {displayPercent > 0 ? '+' : ''}{displayPercent}%
        </span>
      </div>

      {/* Input (modulation signal in) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
        title="Modulation In"
      />

      {/* Output (processed modulation signal) */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
        title="Modulation Out"
      />
    </div>
  );
});

AttenuverterNodeUI.displayName = 'AttenuverterNodeUI';
