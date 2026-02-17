import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type TapeDelayData = {
  time: number; feedback: number; mix: number;
  wow: number; flutter: number; saturation: number;
  degradation: number; tapeSpeed: number; pingPong: boolean;
};
type TapeDelayNode = Node<TapeDelayData, 'tapedelay'>;

export const TapeDelayNodeUI = memo(({ id, data, selected }: NodeProps<TapeDelayNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="tapedelay">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${selected ? 'border-cyan-400' : 'border-amber-600'}`}>
        <div className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wide">📼 Tape Delay</div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob label="Time" value={data.time ?? 0.375} min={0.05} max={2} step={0.01} unit="s" onChange={(v) => updateNodeParam(id, 'time', v)} />
          <Knob label="Fdbk" value={data.feedback ?? 0.55} min={0} max={0.95} step={0.01} onChange={(v) => updateNodeParam(id, 'feedback', v)} />
          <Knob label="Mix" value={data.mix ?? 0.4} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'mix', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Wow" value={data.wow ?? 0.15} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'wow', v)} />
          <Knob label="Fltr" value={data.flutter ?? 0.1} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'flutter', v)} />
          <Knob label="Sat" value={data.saturation ?? 0.3} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'saturation', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Degrade" value={data.degradation ?? 0.4} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'degradation', v)} />
          <Knob label="Speed" value={data.tapeSpeed ?? 1} min={0.5} max={2} step={0.05} onChange={(v) => updateNodeParam(id, 'tapeSpeed', v)} />
        </div>

        <div className="flex items-center gap-2 mt-2 justify-center">
          <label className="text-[10px] text-gray-400">Ping Pong</label>
          <input
            type="checkbox"
            checked={data.pingPong || false}
            onChange={(e) => updateNodeParam(id, 'pingPong', e.target.checked)}
            className="w-3 h-3"
          />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="time_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '25%' }} title="Time Mod" />
        <ClickableHandle type="target" position={Position.Top} id="feedback_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '50%' }} title="Feedback Mod" />
        <ClickableHandle type="target" position={Position.Top} id="mix_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '75%' }} title="Mix Mod" />
        <ClickableHandle type="target" position={Position.Left} id="input" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

TapeDelayNodeUI.displayName = 'TapeDelayNodeUI';
