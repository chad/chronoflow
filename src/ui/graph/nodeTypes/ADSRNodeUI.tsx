import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';

type ADSRData = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

type ADSRNode = Node<ADSRData, 'adsr'>;

export const ADSRNodeUI = memo(({ id, data, selected }: NodeProps<ADSRNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[180px] ${
        selected ? 'border-cyan-400' : 'border-pink-500'
      }`}
    >
      <div className="text-xs font-bold text-pink-400 mb-2 uppercase tracking-wide">
        ADSR
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Knob
          label="Atk"
          value={data.attack}
          min={0.001}
          max={2}
          step={0.001}
          unit="s"
          onChange={(v) => updateNodeParam(id, 'attack', v)}
        />
        <Knob
          label="Dec"
          value={data.decay}
          min={0.001}
          max={2}
          step={0.001}
          unit="s"
          onChange={(v) => updateNodeParam(id, 'decay', v)}
        />
        <Knob
          label="Sus"
          value={data.sustain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateNodeParam(id, 'sustain', v)}
        />
        <Knob
          label="Rel"
          value={data.release}
          min={0.001}
          max={5}
          step={0.001}
          unit="s"
          onChange={(v) => updateNodeParam(id, 'release', v)}
        />
      </div>

      {/* Output handle - connects to VCA gain_mod or other mod inputs */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-pink-400 !w-3 !h-3"
      />
    </div>
  );
});

ADSRNodeUI.displayName = 'ADSRNodeUI';
