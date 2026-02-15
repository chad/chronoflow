import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type BitcrusherData = {
  bits: number;
  sampleRateReduction: number;
  mix: number;
};

type BitcrusherNode = Node<BitcrusherData, 'bitcrusher'>;

export const BitcrusherNodeUI = memo(({ id, data, selected }: NodeProps<BitcrusherNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="bitcrusher">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
          selected ? 'border-cyan-400' : 'border-red-500'
        }`}
      >
        <div className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">
          Bitcrusher
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Bits"
            value={data.bits}
            min={1}
            max={16}
            step={1}
            onChange={(v) => updateNodeParam(id, 'bits', v)}
          />
          <Knob
            label="Crush"
            value={data.sampleRateReduction}
            min={1}
            max={40}
            step={1}
            onChange={(v) => updateNodeParam(id, 'sampleRateReduction', v)}
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

        {/* Mod input */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="mix_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Mix Mod"
        />

        {/* Audio input */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-red-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-red-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

BitcrusherNodeUI.displayName = 'BitcrusherNodeUI';
