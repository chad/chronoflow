import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';

type ReverbData = {
  decay: number;
  mix: number;
};

type ReverbNode = Node<ReverbData, 'reverb'>;

export const ReverbNodeUI = memo(({ id, data, selected }: NodeProps<ReverbNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[120px] ${
        selected ? 'border-cyan-400' : 'border-indigo-500'
      }`}
    >
      <div className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide">
        Reverb
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Decay"
          value={data.decay}
          min={0.1}
          max={10}
          step={0.1}
          unit="s"
          onChange={(v) => updateNodeParam(id, 'decay', v)}
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

      {/* Audio input */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-indigo-400 !w-3 !h-3"
      />

      {/* Audio output */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-indigo-400 !w-3 !h-3"
      />
    </div>
  );
});

ReverbNodeUI.displayName = 'ReverbNodeUI';
