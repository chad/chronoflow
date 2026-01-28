import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type SlewLimiterData = {
  rise: number;
  fall: number;
  shape: string;
};

type SlewLimiterNode = Node<SlewLimiterData, 'slewlimiter'>;

export const SlewLimiterNodeUI = memo(({ id, data, selected }: NodeProps<SlewLimiterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-teal-500'
      }`}
    >
      {/* Input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-teal-400 !w-3 !h-3"
        title="CV In"
      />

      <div className="text-xs font-bold text-teal-400 mb-2 uppercase tracking-wide">
        Slew Limiter
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Rise"
            value={data.rise}
            min={0.001}
            max={5}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'rise', v)}
          />
          <Knob
            label="Fall"
            value={data.fall}
            min={0.001}
            max={5}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'fall', v)}
          />
        </div>

        <Select
          label="Shape"
          value={data.shape}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'exponential', label: 'Expo' },
            { value: 'logarithmic', label: 'Log' },
          ]}
          onChange={(v) => updateNodeParam(id, 'shape', v)}
        />
      </div>

      {/* Output handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-teal-400 !w-3 !h-3"
        title="CV Out"
      />
    </div>
  );
});

SlewLimiterNodeUI.displayName = 'SlewLimiterNodeUI';
