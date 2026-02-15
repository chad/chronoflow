import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type CompressorData = {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  makeupGain: number;
  mix: number;
};

type CompressorNode = Node<CompressorData, 'compressor'>;

export const CompressorNodeUI = memo(({ id, data, selected }: NodeProps<CompressorNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="compressor">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${
          selected ? 'border-cyan-400' : 'border-amber-500'
        }`}
      >
        <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
          Compressor
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob
            label="Thresh"
            value={data.threshold}
            min={-60}
            max={0}
            step={0.5}
            unit="dB"
            onChange={(v) => updateNodeParam(id, 'threshold', v)}
          />
          <Knob
            label="Ratio"
            value={data.ratio}
            min={1}
            max={20}
            step={0.5}
            onChange={(v) => updateNodeParam(id, 'ratio', v)}
          />
          <Knob
            label="Attack"
            value={data.attack}
            min={0.001}
            max={1}
            step={0.001}
            unit="s"
            onChange={(v) => updateNodeParam(id, 'attack', v)}
          />
          <Knob
            label="Release"
            value={data.release}
            min={0.01}
            max={2}
            step={0.01}
            unit="s"
            onChange={(v) => updateNodeParam(id, 'release', v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob
            label="Knee"
            value={data.knee}
            min={0}
            max={40}
            step={1}
            unit="dB"
            onChange={(v) => updateNodeParam(id, 'knee', v)}
          />
          <Knob
            label="Makeup"
            value={data.makeupGain}
            min={0}
            max={30}
            step={0.5}
            unit="dB"
            onChange={(v) => updateNodeParam(id, 'makeupGain', v)}
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

        {/* Mod inputs */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="threshold_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '30%' }}
          title="Threshold Mod"
        />
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="mix_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '70%' }}
          title="Mix Mod"
        />

        {/* Sidechain input */}
        <ClickableHandle
          type="target"
          position={Position.Bottom}
          id="sidechain"
          nodeId={id}
          className="!bg-amber-300 !w-2 !h-2 !-bottom-1"
          style={{ left: '50%' }}
          title="Sidechain"
        />

        {/* Audio input */}
        <ClickableHandle
          type="target"
          position={Position.Left}
          id="input"
          nodeId={id}
          className="!bg-amber-400 !w-3 !h-3"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-amber-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

CompressorNodeUI.displayName = 'CompressorNodeUI';
