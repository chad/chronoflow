import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type VocoderData = {
  bands: number;
  attack: number;
  release: number;
  shift: number;
  mix: number;
};

type VocoderNode = Node<VocoderData, 'vocoder'>;

export const VocoderNodeUI = memo(({ id, data, selected }: NodeProps<VocoderNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="vocoder">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${
          selected ? 'border-cyan-400' : 'border-emerald-500'
        }`}
      >
        <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wide">
          Vocoder
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Bands"
            value={data.bands}
            min={4}
            max={32}
            step={1}
            onChange={(v) => updateNodeParam(id, 'bands', v)}
          />
          <Knob
            label="Attack"
            value={data.attack}
            min={0.001}
            max={0.1}
            step={0.001}
            unit="s"
            onChange={(v) => updateNodeParam(id, 'attack', v)}
          />
          <Knob
            label="Release"
            value={data.release}
            min={0.005}
            max={0.5}
            step={0.005}
            unit="s"
            onChange={(v) => updateNodeParam(id, 'release', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob
            label="Shift"
            value={data.shift}
            min={-8}
            max={8}
            step={1}
            onChange={(v) => updateNodeParam(id, 'shift', v)}
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

        {/* Mod input */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="mix_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Mix Mod"
        />

        {/* Modulator input (voice) — left */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-emerald-400 !w-3 !h-3"
          style={{ top: '35%' }}
          title="Modulator (Voice)"
        />

        {/* Carrier input (synth) — left bottom */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="carrier"
          nodeId={id}
          className="!bg-emerald-300 !w-3 !h-3"
          style={{ top: '65%' }}
          title="Carrier (Synth)"
        />

        {/* Labels for inputs */}
        <div className="absolute left-5 text-[8px] text-emerald-400/60" style={{ top: '30%' }}>VOX</div>
        <div className="absolute left-5 text-[8px] text-emerald-300/60" style={{ top: '60%' }}>CAR</div>

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-emerald-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

VocoderNodeUI.displayName = 'VocoderNodeUI';
