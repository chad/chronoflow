import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';

type DelayData = {
  time: number;
  feedback: number;
  mix: number;
};

type DelayNode = Node<DelayData, 'delay'>;

export const DelayNodeUI = memo(({ id, data, selected }: NodeProps<DelayNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-blue-500'
      }`}
    >
      <div className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wide">
        Delay
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Time"
          value={data.time}
          min={0.01}
          max={2}
          step={0.01}
          unit="s"
          onChange={(v) => updateNodeParam(id, 'time', v)}
        />
        <Knob
          label="Fdbk"
          value={data.feedback}
          min={0}
          max={0.95}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'feedback', v)}
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

      {/* Modulation inputs */}
      <Handle
        type="target"
        position={Position.Top}
        id="time_mod"
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        style={{ left: '35%' }}
        title="Time Mod"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="feedback_mod"
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        style={{ left: '65%' }}
        title="Feedback Mod"
      />

      {/* Audio input */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-blue-400 !w-3 !h-3"
      />

      {/* Audio output */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-blue-400 !w-3 !h-3"
      />
    </div>
  );
});

DelayNodeUI.displayName = 'DelayNodeUI';
