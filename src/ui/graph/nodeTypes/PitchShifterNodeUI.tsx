import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type PitchShifterData = {
  semitones: number;
  cents: number;
  grainSize: number;
  mix: number;
};

type PitchShifterNode = Node<PitchShifterData, 'pitchshifter'>;

export const PitchShifterNodeUI = memo(({ id, data, selected }: NodeProps<PitchShifterNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="pitchshifter">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
          selected ? 'border-cyan-400' : 'border-rose-500'
        }`}
      >
        <div className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide">
          Pitch Shifter
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Semi"
            value={data.semitones}
            min={-24}
            max={24}
            step={1}
            unit="st"
            onChange={(v) => updateNodeParam(id, 'semitones', v)}
          />
          <Knob
            label="Cents"
            value={data.cents}
            min={-100}
            max={100}
            step={1}
            unit="¢"
            onChange={(v) => updateNodeParam(id, 'cents', v)}
          />
          <Knob
            label="Grain"
            value={data.grainSize}
            min={256}
            max={8192}
            step={64}
            onChange={(v) => updateNodeParam(id, 'grainSize', v)}
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
          className="!bg-rose-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-rose-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

PitchShifterNodeUI.displayName = 'PitchShifterNodeUI';
