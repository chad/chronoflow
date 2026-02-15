import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type ComparatorData = {
  threshold: number;
  mode: 'greater' | 'less' | 'equal' | 'window';
  windowSize: number;
  hysteresis: number;
};

type ComparatorNode = Node<ComparatorData, 'comparator'>;

const MODES: Array<{ value: ComparatorData['mode']; label: string; symbol: string }> = [
  { value: 'greater', label: '>', symbol: '>' },
  { value: 'less', label: '<', symbol: '<' },
  { value: 'equal', label: '=', symbol: '≈' },
  { value: 'window', label: '[]', symbol: '⊏⊐' },
];

export const ComparatorNodeUI = memo(({ id, data, selected }: NodeProps<ComparatorNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="comparator">
      <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[140px] ${
        selected ? 'border-cyan-400' : 'border-rose-500'
      }`}
    >
      {/* Signal input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className="!bg-rose-400 !w-3 !h-3"
        title="Signal In"
        style={{ top: '35%' }}
      />

      {/* Threshold CV input */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="threshold_cv"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
        title="Threshold CV"
        style={{ top: '65%' }}
      />

      <div className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide">
        Comparator
      </div>

      {/* Mode display */}
      <div className="text-center mb-2">
        <span className="text-2xl font-mono font-bold text-rose-300">
          {MODES.find(m => m.value === data.mode)?.symbol || '>'}
        </span>
        <div className="text-[9px] text-gray-500 mt-0.5">
          {data.mode === 'window' ? 'In Window' : `${data.mode.charAt(0).toUpperCase() + data.mode.slice(1)} Than`}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 justify-center">
          <Knob
            label="Thresh"
            value={data.threshold}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'threshold', v)}
          />
          <Knob
            label="Hyst"
            value={data.hysteresis}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => updateNodeParam(id, 'hysteresis', v)}
          />
        </div>

        {/* Mode selector */}
        <div className="flex gap-1 justify-center">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => updateNodeParam(id, 'mode', m.value)}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                data.mode === m.value
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={m.value}
            >
              {m.label}
            </button>
          ))}
        </div>

        {(data.mode === 'equal' || data.mode === 'window') && (
          <div className="flex justify-center">
            <Knob
              label="Window"
              value={data.windowSize}
              min={0.01}
              max={1}
              step={0.01}
              onChange={(v) => updateNodeParam(id, 'windowSize', v)}
            />
          </div>
        )}
      </div>

      {/* Gate output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-rose-400 !w-3 !h-3"
        title="Gate Out"
        style={{ top: '30%' }}
      />

      {/* Inverted gate output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="inverted"
        nodeId={id}
        className="!bg-rose-300 !w-3 !h-3"
        title="Inverted Gate"
        style={{ top: '50%' }}
      />

      {/* Trigger output */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="trigger"
        nodeId={id}
        className="!bg-yellow-400 !w-3 !h-3"
        title="Trigger (on change)"
        style={{ top: '70%' }}
      />
    </div>
    </NodeWrapper>
  );
});

ComparatorNodeUI.displayName = 'ComparatorNodeUI';
