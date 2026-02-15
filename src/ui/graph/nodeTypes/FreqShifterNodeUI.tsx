import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

const MODE_OPTIONS = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'both', label: 'Both' },
];

type FreqShifterData = {
  shiftHz: number;
  mode: string;
  mix: number;
};

type FreqShifterNode = Node<FreqShifterData, 'freqshifter'>;

export const FreqShifterNodeUI = memo(({ id, data, selected }: NodeProps<FreqShifterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="freqshifter">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
          selected ? 'border-cyan-400' : 'border-pink-500'
        }`}
      >
        <div className="text-xs font-bold text-pink-400 mb-2 uppercase tracking-wide">
          Freq Shift
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Shift"
            value={data.shiftHz}
            min={-1000}
            max={1000}
            step={1}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'shiftHz', v)}
          />
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
          className="!bg-pink-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-pink-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

FreqShifterNodeUI.displayName = 'FreqShifterNodeUI';
