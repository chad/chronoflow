import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

const NOISE_TYPES = [
  { value: 'white', label: 'White' },
  { value: 'pink', label: 'Pink' },
];

type NoiseData = {
  type: string;
  level: number;
};

type NoiseNode = Node<NoiseData, 'noise'>;

export const NoiseNodeUI = memo(({ id, data, selected }: NodeProps<NoiseNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="noise">
      <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[120px] ${
        selected ? 'border-cyan-400' : 'border-stone-500'
      }`}
    >
      <div className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-wide">
        Noise
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Select
          label="Type"
          value={data.type}
          options={NOISE_TYPES}
          onChange={(v) => updateNodeParam(id, 'type', v)}
        />
        <Knob
          label="Level"
          value={data.level}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'level', v)}
        />
      </div>

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-stone-400 !w-3 !h-3"
      />
    </div>
    </NodeWrapper>
  );
});

NoiseNodeUI.displayName = 'NoiseNodeUI';
