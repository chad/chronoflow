import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { NodeWrapper } from '../NodeWrapper';

type DroneOscData = {
  frequency: number; voices: number; spread: number;
  drift: number; driftRate: number; waveform: string;
  mode: string; subLevel: number; subWaveform: string;
  attack: number; level: number;
};
type DroneOscNode = Node<DroneOscData, 'droneosc'>;

const MODES = ['unison', 'harmonics', 'fifths', 'octaves'];
const WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square'];

export const DroneOscNodeUI = memo(({ id, data, selected }: NodeProps<DroneOscNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);

  return (
    <NodeWrapper nodeId={id} nodeType="droneosc">
      <div className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[200px] ${selected ? 'border-cyan-400' : 'border-violet-500'}`}>
        <div className="text-xs font-bold text-violet-400 mb-2 uppercase tracking-wide">🌊 Drone Osc</div>

        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-0.5">Wave</label>
            <select value={data.waveform || 'sawtooth'} onChange={(e) => updateNodeParam(id, 'waveform', e.target.value)}
              className="w-full bg-gray-800 text-gray-200 text-xs rounded px-1 py-0.5 border border-gray-700">
              {WAVEFORMS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-0.5">Mode</label>
            <select value={data.mode || 'unison'} onChange={(e) => updateNodeParam(id, 'mode', e.target.value)}
              className="w-full bg-gray-800 text-gray-200 text-xs rounded px-1 py-0.5 border border-gray-700">
              {MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Knob label="Freq" value={data.frequency ?? 110} min={20} max={2000} step={1} unit="Hz" onChange={(v) => updateNodeParam(id, 'frequency', v)} />
          <Knob label="Voices" value={data.voices ?? 4} min={1} max={8} step={1} onChange={(v) => updateNodeParam(id, 'voices', v)} />
          <Knob label="Spread" value={data.spread ?? 15} min={0} max={100} step={1} unit="¢" onChange={(v) => updateNodeParam(id, 'spread', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Drift" value={data.drift ?? 0.3} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'drift', v)} />
          <Knob label="Sub" value={data.subLevel ?? 0.3} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'subLevel', v)} />
          <Knob label="Level" value={data.level ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => updateNodeParam(id, 'level', v)} />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          <Knob label="Attack" value={data.attack ?? 2} min={0} max={10} step={0.1} unit="s" onChange={(v) => updateNodeParam(id, 'attack', v)} />
        </div>

        <ClickableHandle type="target" position={Position.Top} id="freq_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '35%' }} title="Freq Mod" />
        <ClickableHandle type="target" position={Position.Top} id="level_mod" nodeId={id} className="!bg-purple-400 !w-2 !h-2 !-top-1" style={{ left: '65%' }} title="Level Mod" />
        <ClickableHandle type="source" position={Position.Right} id="output" nodeId={id} className="!bg-blue-400 !w-3 !h-3" />
      </div>
    </NodeWrapper>
  );
});

DroneOscNodeUI.displayName = 'DroneOscNodeUI';
