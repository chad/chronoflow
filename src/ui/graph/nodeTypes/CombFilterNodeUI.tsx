import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

const MODE_OPTIONS = [
  { value: 'feedback', label: 'FB' },
  { value: 'feedforward', label: 'FF' },
  { value: 'both', label: 'Both' },
];

type CombFilterData = {
  frequency: number;
  feedback: number;
  damping: number;
  mode: string;
  mix: number;
};

type CombFilterNode = Node<CombFilterData, 'combfilter'>;

export const CombFilterNodeUI = memo(({ id, data, selected }: NodeProps<CombFilterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="combfilter">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
          selected ? 'border-cyan-400' : 'border-sky-500'
        }`}
      >
        <div className="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wide">
          Comb Filter
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Freq"
            value={data.frequency}
            min={20}
            max={5000}
            step={1}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'frequency', v)}
          />
          <Knob
            label="Fdbk"
            value={data.feedback}
            min={-0.99}
            max={0.99}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'feedback', v)}
          />
          <Knob
            label="Damp"
            value={data.damping}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'damping', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Select
            label="Mode"
            value={data.mode}
            options={MODE_OPTIONS}
            onChange={(v) => updateNodeParam(id, 'mode', v)}
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
          id="frequency_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '25%' }}
          title="Freq Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="feedback_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Feedback Mod"
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
          className="!bg-sky-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-sky-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

CombFilterNodeUI.displayName = 'CombFilterNodeUI';
