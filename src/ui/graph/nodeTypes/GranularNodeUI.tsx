import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type GranularData = {
  grainSize: number;
  density: number;
  spray: number;
  pitch: number;
  position: number;
  freeze: boolean;
  mix: number;
  reverse: number;
};

type GranularNode = Node<GranularData, 'granular'>;

export const GranularNodeUI = memo(({ id, data, selected }: NodeProps<GranularNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${
        selected ? 'border-cyan-400' : 'border-violet-500'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-violet-400 uppercase tracking-wide">
          Granular
        </div>
        <button
          onClick={() => updateNodeParam(id, 'freeze', !data.freeze)}
          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
            data.freeze
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {data.freeze ? 'FROZEN' : 'FREEZE'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Size"
          value={data.grainSize}
          min={10}
          max={500}
          step={1}
          unit="ms"
          onChange={(v) => updateNodeParam(id, 'grainSize', v)}
        />
        <Knob
          label="Density"
          value={data.density}
          min={1}
          max={50}
          step={1}
          unit="/s"
          onChange={(v) => updateNodeParam(id, 'density', v)}
        />
        <Knob
          label="Spray"
          value={data.spray}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'spray', v)}
        />
        <Knob
          label="Pitch"
          value={data.pitch}
          min={0.25}
          max={4}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'pitch', v)}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-2">
        <Knob
          label="Position"
          value={data.position}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'position', v)}
        />
        <Knob
          label="Reverse"
          value={data.reverse}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'reverse', v)}
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
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-violet-400 !w-3 !h-3"
        title="Audio In"
      />

      {/* Audio output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-violet-400 !w-3 !h-3"
        title="Audio Out"
      />
    </div>
  );
});

GranularNodeUI.displayName = 'GranularNodeUI';
