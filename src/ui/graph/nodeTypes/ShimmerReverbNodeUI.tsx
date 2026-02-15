import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type ShimmerReverbData = {
  decay: number;
  shimmer: number;
  pitchShift: number;
  damping: number;
  mix: number;
  diffusion: number;
};

type ShimmerReverbNode = Node<ShimmerReverbData, 'shimmerreverb'>;

export const ShimmerReverbNodeUI = memo(({ id, data, selected }: NodeProps<ShimmerReverbNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="shimmerreverb">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${
          selected ? 'border-cyan-400' : 'border-violet-500'
        }`}
      >
        <div className="text-xs font-bold text-violet-400 mb-2 uppercase tracking-wide">
          Shimmer Reverb
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Decay"
            value={data.decay}
            min={0.5}
            max={15}
            step={0.1}
            unit="s"
            onChange={(v) => updateNodeParam(id, 'decay', v)}
          />
          <Knob
            label="Shimmer"
            value={data.shimmer}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'shimmer', v)}
          />
          <Knob
            label="Pitch"
            value={data.pitchShift}
            min={-24}
            max={24}
            step={1}
            unit="st"
            onChange={(v) => updateNodeParam(id, 'pitchShift', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob
            label="Damp"
            value={data.damping}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'damping', v)}
          />
          <Knob
            label="Diffuse"
            value={data.diffusion}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'diffusion', v)}
          />
          <Knob
            label="Mix"
            value={data.mix}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'mix', v)}
          />
        </div>

        {/* Mod inputs */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="shimmer_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '25%' }}
          title="Shimmer Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="damping_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Damping Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="mix_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '75%' }}
          title="Mix Mod"
        />

        {/* Audio input */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-violet-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-violet-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

ShimmerReverbNodeUI.displayName = 'ShimmerReverbNodeUI';
