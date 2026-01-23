import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { ModulatedKnob } from '../../controls/ModulatedKnob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type VCAData = {
  gain: number;
};

type VCANode = Node<VCAData, 'vca'>;

export const VCANodeUI = memo(({ id, data, selected }: NodeProps<VCANode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[100px] ${
        selected ? 'border-cyan-400' : 'border-green-500'
      }`}
    >
      <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wide">
        VCA
      </div>

      <div className="flex justify-center">
        <ModulatedKnob
          nodeId={id}
          paramName="gain"
          label="Gain"
          value={data.gain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'gain', v)}
        />
      </div>

      {/* Modulation input (top) */}
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="gain_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        title="Gain Mod (ADSR)"
      />

      {/* Audio input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-green-400 !w-3 !h-3"
      />

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-green-400 !w-3 !h-3"
      />
    </div>
  );
});

VCANodeUI.displayName = 'VCANodeUI';
