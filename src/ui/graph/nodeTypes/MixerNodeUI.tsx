import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';

type MixerData = {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  master: number;
};

type MixerNode = Node<MixerData, 'mixer'>;

export const MixerNodeUI = memo(({ id, data, selected }: NodeProps<MixerNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
        selected ? 'border-cyan-400' : 'border-amber-500'
      }`}
    >
      <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
        Mixer
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Ch 1"
          value={data.level1}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'level1', v)}
        />
        <Knob
          label="Ch 2"
          value={data.level2}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'level2', v)}
        />
        <Knob
          label="Ch 3"
          value={data.level3}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'level3', v)}
        />
        <Knob
          label="Ch 4"
          value={data.level4}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'level4', v)}
        />
      </div>

      <div className="flex justify-center mt-2 pt-2 border-t border-gray-700">
        <Knob
          label="Master"
          value={data.master}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'master', v)}
        />
      </div>

      {/* Input handles - 4 channels on left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="input1"
        className="!bg-amber-400 !w-3 !h-3"
        style={{ top: '25%' }}
        title="Input 1"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input2"
        className="!bg-amber-400 !w-3 !h-3"
        style={{ top: '42%' }}
        title="Input 2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input3"
        className="!bg-amber-400 !w-3 !h-3"
        style={{ top: '58%' }}
        title="Input 3"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input4"
        className="!bg-amber-400 !w-3 !h-3"
        style={{ top: '75%' }}
        title="Input 4"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-amber-400 !w-3 !h-3"
      />
    </div>
  );
});

MixerNodeUI.displayName = 'MixerNodeUI';
