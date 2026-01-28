import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type ProbabilityGateData = {
  probability: number;
  mode: string;
};

type ProbabilityGateNode = Node<ProbabilityGateData, 'probgate'>;

export const ProbabilityGateNodeUI = memo(({ id, data, selected }: NodeProps<ProbabilityGateNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  const isBernoulli = data.mode === 'bernoulli';

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[130px] ${
        selected ? 'border-cyan-400' : 'border-lime-500'
      }`}
    >
      {/* Trigger input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-lime-400 !w-3 !h-3"
        title="Trigger In"
      />

      <div className="text-xs font-bold text-lime-400 mb-2 uppercase tracking-wide">
        Prob Gate
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex justify-center">
          <Knob
            label="Prob"
            value={data.probability}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'probability', v)}
          />
        </div>

        <Select
          label="Mode"
          value={data.mode}
          options={[
            { value: 'gate', label: 'Gate' },
            { value: 'bernoulli', label: 'Bernoulli' },
          ]}
          onChange={(v) => updateNodeParam(id, 'mode', v)}
        />

        {/* Probability display */}
        <div className="text-center text-xs text-gray-400">
          {Math.round(data.probability * 100)}% chance
        </div>
      </div>

      {/* Output A handle */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-lime-400 !w-3 !h-3"
        title={isBernoulli ? 'Output A' : 'Trigger Out'}
        style={{ top: isBernoulli ? '40%' : '50%' }}
      />

      {/* Output B handle (only for Bernoulli mode) */}
      {isBernoulli && (
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="outputB"
          nodeId={id}
          className="!bg-lime-300 !w-3 !h-3"
          title="Output B"
          style={{ top: '60%' }}
        />
      )}
    </div>
  );
});

ProbabilityGateNodeUI.displayName = 'ProbabilityGateNodeUI';
