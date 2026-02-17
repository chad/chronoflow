import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type StereoFieldData = { pan: number; width: number; midSide: number; haasDelay: number; haasAmount: number };
type StereoFieldNode = Node<StereoFieldData, 'stereofield'>;

export const StereoFieldNodeUI = memo(({ id, data, selected }: NodeProps<StereoFieldNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="stereofield">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${selected ? 'border-cyan-400' : 'border-sky-500'}`}>
        <div className="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wide">🔊 Stereo Field</div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob label="Pan" value={data.pan ?? 0} min={-1} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'pan', v)} />
          <Knob label="Width" value={data.width ?? 1} min={0} max={2} step={0.01} onChange={(v) => updateNodeParam(id, 'width', v)} />
          <Knob label="M/S" value={data.midSide ?? 0} min={-1} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'midSide', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Haas" value={data.haasDelay ?? 0} min={0} max={20} step={0.5} unit="ms" onChange={(v) => updateNodeParam(id, 'haasDelay', v)} />
          <Knob label="H.Amt" value={data.haasAmount ?? 0} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'haasAmount', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="pan_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '50%' }} title="Pan Mod" />
        <ClickableHandle type="target" position={Position.Left} id="input" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

StereoFieldNodeUI.displayName = 'StereoFieldNodeUI';
