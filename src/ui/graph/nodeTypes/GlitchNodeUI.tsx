import { memo, useCallback } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';
import audioGraph from '../../../audio/AudioGraph';
import type { SynthGlitchNode } from '../../../audio/nodes/GlitchNode';

type GlitchData = {
  rate: number;
  size: number;
  pitch: number;
  pitchRamp: number;
  reverse: boolean;
  probability: number;
  mix: number;
  active: boolean;
};

type GlitchNode = Node<GlitchData, 'glitch'>;

export const GlitchNodeUI = memo(({ id, data, selected }: NodeProps<GlitchNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  const toggleGlitch = useCallback(() => {
    const node = audioGraph.getNode(id) as SynthGlitchNode | undefined;
    if (node) {
      node.toggle();
      updateNodeParam(id, 'active', !data.active);
    }
  }, [id, data.active, updateNodeParam]);

  return (
    <NodeWrapper nodeId={id} nodeType="glitch">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${
          selected ? 'border-cyan-400' : data.active ? 'border-orange-400' : 'border-orange-600'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-orange-400 uppercase tracking-wide">
            Glitch
          </div>
          <button
            onClick={toggleGlitch}
            className={`px-2 py-0.5 text-[10px] rounded font-bold transition-colors ${
              data.active
                ? 'bg-orange-500 text-black animate-pulse'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {data.active ? '■ STOP' : '▶ GLITCH'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Rate"
            value={data.rate}
            min={0.5}
            max={50}
            step={0.5}
            unit="Hz"
            onChange={(v) => updateNodeParam(id, 'rate', v)}
          />
          <Knob
            label="Size"
            value={data.size}
            min={0.005}
            max={1.0}
            step={0.005}
            unit="s"
            onChange={(v) => updateNodeParam(id, 'size', v)}
          />
          <Knob
            label="Pitch"
            value={data.pitch}
            min={0.25}
            max={4.0}
            step={0.05}
            onChange={(v) => updateNodeParam(id, 'pitch', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob
            label="Ramp"
            value={data.pitchRamp}
            min={-1}
            max={1}
            step={0.05}
            onChange={(v) => updateNodeParam(id, 'pitchRamp', v)}
          />
          <Knob
            label="Prob"
            value={data.probability}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'probability', v)}
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

        <div className="flex gap-2 mt-2 justify-center">
          <button
            onClick={() => updateNodeParam(id, 'reverse', !data.reverse)}
            className={`px-2 py-0.5 text-[10px] rounded font-bold transition-colors ${
              data.reverse
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            ◀ REV
          </button>
        </div>

        {/* Trigger input */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="trigger"
          nodeId={id}
          className="!bg-orange-300 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Trigger"
        />

        {/* Audio input */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-orange-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-orange-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

GlitchNodeUI.displayName = 'GlitchNodeUI';
