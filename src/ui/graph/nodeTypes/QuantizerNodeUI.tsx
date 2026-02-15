import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

const SCALE_OPTIONS = [
  { value: 'chromatic', label: 'Chromatic' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'pentatonic', label: 'Penta' },
  { value: 'blues', label: 'Blues' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'mixolydian', label: 'Mixo' },
  { value: 'wholetone', label: 'Whole' },
];

const ROOT_OPTIONS = [
  { value: '0', label: 'C' },
  { value: '1', label: 'C#' },
  { value: '2', label: 'D' },
  { value: '3', label: 'D#' },
  { value: '4', label: 'E' },
  { value: '5', label: 'F' },
  { value: '6', label: 'F#' },
  { value: '7', label: 'G' },
  { value: '8', label: 'G#' },
  { value: '9', label: 'A' },
  { value: '10', label: 'A#' },
  { value: '11', label: 'B' },
];

type QuantizerData = {
  scale: string;
  root: number;
  octaves: number;
};

type QuantizerNode = Node<QuantizerData, 'quantizer'>;

export const QuantizerNodeUI = memo(({ id, data, selected }: NodeProps<QuantizerNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="quantizer">
      <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[150px] ${
        selected ? 'border-cyan-400' : 'border-sky-500'
      }`}
    >
      <div className="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wide">
        Quantizer
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Select
          label="Scale"
          value={data.scale}
          options={SCALE_OPTIONS}
          onChange={(v) => updateNodeParam(id, 'scale', v)}
        />
        <Select
          label="Root"
          value={String(data.root)}
          options={ROOT_OPTIONS}
          onChange={(v) => updateNodeParam(id, 'root', parseInt(v, 10))}
        />
        <Knob
          label="Oct"
          value={data.octaves}
          min={1}
          max={4}
          step={1}
          onChange={(v) => updateNodeParam(id, 'octaves', v)}
        />
      </div>

      {/* CV input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-sky-400 !w-3 !h-3"
        title="CV In"
      />

      {/* Quantized output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-sky-400 !w-3 !h-3"
        title="Quantized Out"
      />
    </div>
    </NodeWrapper>
  );
});

QuantizerNodeUI.displayName = 'QuantizerNodeUI';
