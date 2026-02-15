import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type EnvelopeFollowerData = {
  attack: number;
  release: number;
  gain: number;
  offset: number;
};

type EnvelopeFollowerNode = Node<EnvelopeFollowerData, 'envfollower'>;

export const EnvelopeFollowerNodeUI = memo(({ id, data, selected }: NodeProps<EnvelopeFollowerNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="envfollower">
      <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[150px] ${
        selected ? 'border-cyan-400' : 'border-rose-500'
      }`}
    >
      {/* Audio input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-rose-400 !w-3 !h-3"
        title="Audio In"
      />

      <div className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide">
        Env Follower
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Attack"
            value={data.attack}
            min={1}
            max={500}
            step={1}
            onChange={(v) => updateNodeParam(id, 'attack', v)}
          />
          <Knob
            label="Release"
            value={data.release}
            min={1}
            max={2000}
            step={1}
            onChange={(v) => updateNodeParam(id, 'release', v)}
          />
        </div>

        <div className="flex gap-2 justify-center">
          <Knob
            label="Gain"
            value={data.gain}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => updateNodeParam(id, 'gain', v)}
          />
          <Knob
            label="Offset"
            value={data.offset}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'offset', v)}
          />
        </div>
      </div>

      {/* CV Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-rose-400 !w-3 !h-3"
        title="CV Out"
      />
    </div>
    </NodeWrapper>
  );
});

EnvelopeFollowerNodeUI.displayName = 'EnvelopeFollowerNodeUI';
