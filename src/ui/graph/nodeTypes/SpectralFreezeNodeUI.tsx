import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type SpectralFreezeData = {
  freeze: boolean; blur: number; shift: number;
  brightness: number; feedback: number; mix: number; grainSize: number;
};
type SpectralFreezeNode = Node<SpectralFreezeData, 'spectralfreeze'>;

export const SpectralFreezeNodeUI = memo(({ id, data, selected }: NodeProps<SpectralFreezeNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="spectralfreeze">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[190px] ${selected ? 'border-cyan-400' : 'border-indigo-500'}`}>
        <div className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide">❄️ Spectral Freeze</div>

        <div className="flex items-center justify-center mb-2">
          <button
            onClick={() => updateNodeParam(id, 'freeze', !data.freeze)}
            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
              data.freeze
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {data.freeze ? '❄️ FROZEN' : '▶ LIVE'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob label="Blur" value={data.blur ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'blur', v)} />
          <Knob label="Shift" value={data.shift ?? 0} min={-24} max={24} step={1} unit="st" onChange={(v) => updateNodeParam(id, 'shift', v)} />
          <Knob label="Bright" value={data.brightness ?? 0.7} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'brightness', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Fdbk" value={data.feedback ?? 0.3} min={0} max={0.95} step={0.01} onChange={(v) => updateNodeParam(id, 'feedback', v)} />
          <Knob label="Mix" value={data.mix ?? 0.8} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'mix', v)} />
          <Knob label="Grain" value={data.grainSize ?? 200} min={50} max={500} step={10} unit="ms" onChange={(v) => updateNodeParam(id, 'grainSize', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="mix_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '35%' }} title="Mix Mod" />
        <ClickableHandle type="target" position={Position.Top} id="feedback_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '65%' }} title="Feedback Mod" />
        <ClickableHandle type="target" position={Position.Bottom} id="trigger" nodeId={id} className="!bg-cyan-400 !w-2 !h-2 !-bottom-1" style={{ left: '50%' }} title="Freeze Toggle Trigger" />
        <ClickableHandle type="target" position={Position.Left} id="input" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

SpectralFreezeNodeUI.displayName = 'SpectralFreezeNodeUI';
