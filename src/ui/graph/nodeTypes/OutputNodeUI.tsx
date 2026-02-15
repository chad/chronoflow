import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { LevelMeter, MiniScope } from '../SignalIndicator';
import { NodeWrapper } from '../NodeWrapper';

type OutputData = {
  gain: number;
};

type OutputNode = Node<OutputData, 'output'>;

export const OutputNodeUI = memo(({ id, data, selected }: NodeProps<OutputNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const isAudioEnabled = usePatchStore((state) => state.isAudioEnabled);

  return (
    <NodeWrapper nodeId={id} nodeType="output">
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[120px] ${
        selected ? 'border-cyan-400' : 'border-red-500'
      }`}
    >
      <div className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">
        Output
      </div>

      <div className="flex items-center gap-3 justify-center">
        <Knob
          label="Master"
          value={data.gain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'gain', v)}
        />
        {isAudioEnabled && (
          <div className="flex flex-col items-center gap-1">
            <LevelMeter nodeId={id} height={50} />
            <MiniScope nodeId={id} width={50} height={20} />
          </div>
        )}
      </div>

      {/* Input handle */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-red-400 !w-3 !h-3"
      />
    </div>
    </NodeWrapper>
  );
});

OutputNodeUI.displayName = 'OutputNodeUI';
