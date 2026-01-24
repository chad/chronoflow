import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';

type WavefolderData = {
  drive: number;
  folds: number;
  mix: number;
};

type WavefolderNode = Node<WavefolderData, 'wavefolder'>;

export const WavefolderNodeUI = memo(({ id, data, selected }: NodeProps<WavefolderNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`relative bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-rose-500'
      }`}
    >
      <div className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide">
        Wavefolder
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Drive"
          value={data.drive}
          min={1}
          max={10}
          step={0.1}
          onChange={(v) => updateNodeParam(id, 'drive', v)}
        />
        <Knob
          label="Folds"
          value={data.folds}
          min={1}
          max={5}
          step={1}
          onChange={(v) => updateNodeParam(id, 'folds', v)}
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

      {/* Drive modulation input */}
      <ClickableHandle
        type="target"
        position={Position.Top}
        id="drive_mod"
        nodeId={id}
        className="!bg-yellow-400 !w-2 !h-2 !-top-1"
        title="Drive Mod"
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
  );
});

WavefolderNodeUI.displayName = 'WavefolderNodeUI';
