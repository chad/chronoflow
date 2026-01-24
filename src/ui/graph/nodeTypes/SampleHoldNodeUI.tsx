import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type SampleHoldData = {
  rate: number;
  smooth: number;
};

type SampleHoldNode = Node<SampleHoldData, 'samplehold'>;

export const SampleHoldNodeUI = memo(({ id, data, selected }: NodeProps<SampleHoldNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[120px] ${
        selected ? 'border-cyan-400' : 'border-lime-500'
      }`}
    >
      <div className="text-xs font-bold text-lime-400 mb-2 uppercase tracking-wide">
        S&H
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Rate"
          value={data.rate}
          min={0.1}
          max={20}
          step={0.1}
          unit="Hz"
          onChange={(v) => updateNodeParam(id, 'rate', v)}
        />
        <Knob
          label="Smooth"
          value={data.smooth}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'smooth', v)}
        />
      </div>

      {/* Signal input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-lime-400 !w-3 !h-3"
        title="Signal In"
      />

      {/* Output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-lime-400 !w-3 !h-3"
        title="Sampled Out"
      />
    </div>
  );
});

SampleHoldNodeUI.displayName = 'SampleHoldNodeUI';
