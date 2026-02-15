import { memo, useState, useCallback } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { Select } from '../../controls/Select';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';
import audioGraph from '../../../audio/AudioGraph';
import type { SynthAudioInputNode } from '../../../audio/nodes/AudioInputNode';

const SOURCE_OPTIONS = [
  { value: 'microphone', label: 'Mic' },
  { value: 'stream', label: 'Stream' },
];

type AudioInputData = {
  gain: number;
  monitoring: boolean;
  source: string;
};

type AudioInputNode = Node<AudioInputData, 'audioinput'>;

export const AudioInputNodeUI = memo(({ id, data, selected }: NodeProps<AudioInputNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const [isCapturing, setIsCapturing] = useState(false);

  const toggleCapture = useCallback(async () => {
    const node = audioGraph.getNode(id) as SynthAudioInputNode | undefined;
    if (!node) return;

    if (isCapturing) {
      node.stopCapture();
      setIsCapturing(false);
    } else {
      await node.startMicrophone();
      setIsCapturing(node.isCapturing());
    }
  }, [id, isCapturing]);

  return (
    <NodeWrapper nodeId={id} nodeType="audioinput">
      <div
        className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[160px] ${
          selected ? 'border-cyan-400' : 'border-green-500'
        }`}
      >
        <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wide">
          Audio Input
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Select
            label="Source"
            value={data.source}
            options={SOURCE_OPTIONS}
            onChange={(v) => updateNodeParam(id, 'source', v)}
          />
          <Knob
            label="Gain"
            value={data.gain}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'gain', v)}
          />
        </div>

        <div className="flex gap-2 mt-2 justify-center">
          <button
            onClick={toggleCapture}
            className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
              isCapturing
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-700 text-white hover:bg-green-600'
            }`}
          >
            {isCapturing ? '⏹ Stop' : '⏺ Start'}
          </button>
          <button
            onClick={() => updateNodeParam(id, 'monitoring', !data.monitoring)}
            className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
              data.monitoring
                ? 'bg-yellow-600 text-black'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            🎧 Mon
          </button>
        </div>

        {/* Modulation input */}
        <ClickableHandle
          type="target"
          position={Position.Top}
          id="gain_mod"
          nodeId={id}
          className="!bg-yellow-400 !w-2 !h-2 !-top-1"
          style={{ left: '50%' }}
          title="Gain Mod"
        />

        {/* Audio output */}
        <ClickableHandle
          type="source"
          position={Position.Right}
          id="output"
          nodeId={id}
          className="!bg-green-400 !w-3 !h-3"
        />
      </div>
    </NodeWrapper>
  );
});

AudioInputNodeUI.displayName = 'AudioInputNodeUI';
