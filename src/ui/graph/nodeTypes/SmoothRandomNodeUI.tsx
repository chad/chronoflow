import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type SmoothRandomData = {
  rate: number;
  range: number;
  smooth: number;
};

type SmoothRandomNode = Node<SmoothRandomData, 'smoothrandom'>;

export const SmoothRandomNodeUI = memo(({ id, data, selected }: NodeProps<SmoothRandomNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="smoothrandom">
      <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-teal-500'
      }`}
    >
      <div className="text-xs font-bold text-teal-400 mb-2 uppercase tracking-wide">
        Smooth Rnd
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Rate"
          value={data.rate}
          min={0.01}
          max={5}
          step={0.01}
          unit="Hz"
          onChange={(v) => updateNodeParam(id, 'rate', v)}
        />
        <Knob
          label="Range"
          value={data.range}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'range', v)}
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

      {/* Output only - this is a source */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-teal-400 !w-3 !h-3"
        title="Random Out"
      />
    </div>
    </NodeWrapper>
  );
});

SmoothRandomNodeUI.displayName = 'SmoothRandomNodeUI';
