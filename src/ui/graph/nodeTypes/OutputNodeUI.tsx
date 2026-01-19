import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';

type OutputData = {
  gain: number;
};

type OutputNode = Node<OutputData, 'output'>;

export const OutputNodeUI = memo(({ id, data, selected }: NodeProps<OutputNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[100px] ${
        selected ? 'border-cyan-400' : 'border-red-500'
      }`}
    >
      <div className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">
        Output
      </div>

      <div className="flex justify-center">
        <Knob
          label="Master"
          value={data.gain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'gain', v)}
        />
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-red-400 !w-3 !h-3"
      />
    </div>
  );
});

OutputNodeUI.displayName = 'OutputNodeUI';
