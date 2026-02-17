import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type WavetableOscData = { frequency: number; detune: number; morph: number; level: number };
type WavetableOscNode = Node<WavetableOscData, 'wavetableosc'>;

const TABLE_NAMES = ['Sine', 'Warm Saw', 'Soft Sq', 'Formant', 'Organ', 'Glass', 'Choir', 'Digital'];

export const WavetableOscNodeUI = memo(({ id, data, selected }: NodeProps<WavetableOscNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  const morphPos = (data.morph ?? 0) * 7;
  const tableIdx = Math.floor(morphPos);
  const tableName = TABLE_NAMES[Math.min(tableIdx, 7)];

  return (
    <NodeWrapper nodeId={id} nodeType="wavetableosc">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${selected ? 'border-cyan-400' : 'border-fuchsia-500'}`}>
        <div className="text-xs font-bold text-fuchsia-400 mb-2 uppercase tracking-wide">〰️ Wavetable</div>

        {/* Morph indicator */}
        <div className="mb-2">
          <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
            {TABLE_NAMES.map((n, i) => (
              <span key={i} className={i === tableIdx ? 'text-fuchsia-400 font-bold' : ''}>{n.charAt(0)}</span>
            ))}
          </div>
          <div className="h-1 bg-gray-800 rounded-full relative">
            <div
              className="h-1 bg-fuchsia-500 rounded-full absolute top-0 left-0 transition-all"
              style={{ width: `${(data.morph ?? 0) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 text-center mt-0.5">{tableName}</div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob label="Freq" value={data.frequency ?? 220} min={20} max={8000} step={1} unit="Hz" onChange={(v) => updateNodeParam(id, 'frequency', v)} />
          <Knob label="Morph" value={data.morph ?? 0} min={0} max={1} step={0.001} onChange={(v) => updateNodeParam(id, 'morph', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Detune" value={data.detune ?? 0} min={-100} max={100} step={1} unit="¢" onChange={(v) => updateNodeParam(id, 'detune', v)} />
          <Knob label="Level" value={data.level ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'level', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="freq_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '35%' }} title="Freq Mod" />
        <ClickableHandle type="target" position={Position.Top} id="level_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '65%' }} title="Level Mod" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

WavetableOscNodeUI.displayName = 'WavetableOscNodeUI';
