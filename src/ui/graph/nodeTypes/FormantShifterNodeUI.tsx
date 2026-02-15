import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

const VOWEL_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'a', label: 'A' },
  { value: 'e', label: 'E' },
  { value: 'i', label: 'I' },
  { value: 'o', label: 'O' },
  { value: 'u', label: 'U' },
];

type FormantShifterData = {
  shift: number;
  mix: number;
  bandwidth: number;
  vowel: string;
};

type FormantShifterNode = Node<FormantShifterData, 'formantshifter'>;

export const FormantShifterNodeUI = memo(({ id, data, selected }: NodeProps<FormantShifterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="formantshifter">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
          selected ? 'border-cyan-400' : 'border-fuchsia-500'
        }`}
      >
        <div className="text-xs font-bold text-fuchsia-400 mb-2 uppercase tracking-wide">
          Formant Shift
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Shift"
            value={data.shift}
            min={-12}
            max={12}
            step={0.1}
            unit="st"
            onChange={(v) => updateNodeParam(id, 'shift', v)}
          />
          <Knob
            label="BW"
            value={data.bandwidth}
            min={1}
            max={20}
            step={0.5}
            onChange={(v) => updateNodeParam(id, 'bandwidth', v)}
          />
          <Select
            label="Vowel"
            value={data.vowel}
            options={VOWEL_OPTIONS}
            onChange={(v) => updateNodeParam(id, 'vowel', v)}
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
          className="!bg-fuchsia-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-fuchsia-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

FormantShifterNodeUI.displayName = 'FormantShifterNodeUI';
