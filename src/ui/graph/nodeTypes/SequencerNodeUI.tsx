import { memo, useEffect, useState, useRef } from 'react';
import { Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Knob } from '../../controls/Knob';
import { usePatchStore } from '../../../patch/patchStore';
import { ClickableHandle } from '../ClickableHandle';
import { audioGraph } from '../../../audio/AudioGraph';
import { parseTrackerPattern, midiToNoteName, type ParsedStep } from '../../../audio/nodes/trackerParser';

type PatternKey = 'A' | 'B' | 'C' | 'D';

type SequencerData = {
  bpm: number;
  steps: number;
  gate: number;
  swing: number;
  patternA: string;
  patternB: string;
  patternC: string;
  patternD: string;
  chain: string;
  running: boolean;
  extClock: boolean;
  // Legacy support
  pattern?: string;
};

type SequencerNode = Node<SequencerData, 'sequencer'>;

export const SequencerNodeUI = memo(({ id, data, selected }: NodeProps<SequencerNode>) => {
  const updateNodeParam = usePatchStore((state) => state.updateNodeParam);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [activePatternKey, setActivePatternKey] = useState<PatternKey>('A');
  const [selectedTab, setSelectedTab] = useState<PatternKey>('A');

  // Pattern inputs for each lane
  const [patternInputs, setPatternInputs] = useState({
    A: data.patternA || '',
    B: data.patternB || '',
    C: data.patternC || '',
    D: data.patternD || '',
  });
  const [chainInput, setChainInput] = useState(data.chain || 'A');
  const [parseErrors, setParseErrors] = useState<Record<PatternKey, string | null>>({
    A: null, B: null, C: null, D: null,
  });
  const [parsedPatterns, setParsedPatterns] = useState<Record<PatternKey, ParsedStep[]>>({
    A: [], B: [], C: [], D: [],
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to sequencer step changes
  useEffect(() => {
    const sequencer = audioGraph.getNode(id);
    if (sequencer && 'onStep' in sequencer) {
      (sequencer as { onStep: (cb: (step: number, chainIndex: number, patternKey: string) => void) => void }).onStep(
        (step, chainIndex, patternKey) => {
          setCurrentStep(step);
          setCurrentChainIndex(chainIndex);
          setActivePatternKey(patternKey as PatternKey);
        }
      );
    }
  }, [id]);

  // Sync pattern inputs from data when it changes externally
  useEffect(() => {
    setPatternInputs({
      A: data.patternA || '',
      B: data.patternB || '',
      C: data.patternC || '',
      D: data.patternD || '',
    });
  }, [data.patternA, data.patternB, data.patternC, data.patternD]);

  useEffect(() => {
    setChainInput(data.chain || 'A');
  }, [data.chain]);

  // Parse all patterns on input change
  useEffect(() => {
    const newParsed: Record<PatternKey, ParsedStep[]> = { A: [], B: [], C: [], D: [] };
    const newErrors: Record<PatternKey, string | null> = { A: null, B: null, C: null, D: null };

    for (const key of ['A', 'B', 'C', 'D'] as PatternKey[]) {
      const { steps, errors } = parseTrackerPattern(patternInputs[key]);
      newParsed[key] = steps;
      newErrors[key] = errors.length > 0 ? errors[0] : null;
    }

    setParsedPatterns(newParsed);
    setParseErrors(newErrors);
  }, [patternInputs]);

  // Auto-scroll to show current step during playback
  useEffect(() => {
    if (scrollContainerRef.current && data.running && currentStep >= 0 && activePatternKey === selectedTab) {
      const container = scrollContainerRef.current;
      const stepWidth = 28;
      const scrollTarget = currentStep * stepWidth - container.clientWidth / 2 + stepWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [currentStep, data.running, activePatternKey, selectedTab]);

  // Commit pattern on blur or Enter
  const commitPattern = (key: PatternKey) => {
    const paramName = `pattern${key}` as const;
    if (!parseErrors[key] && patternInputs[key] !== data[paramName]) {
      updateNodeParam(id, paramName, patternInputs[key]);
    }
  };

  const commitChain = () => {
    if (chainInput !== data.chain) {
      updateNodeParam(id, 'chain', chainInput);
    }
  };

  const handlePatternChange = (key: PatternKey, value: string) => {
    setPatternInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleKeyDown = (key: PatternKey) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitPattern(key);
    }
  };

  // Get display text for a step with velocity indicator
  const getStepDisplay = (step: ParsedStep): string => {
    if (step.type === 'note' && step.midiNote !== undefined) {
      return midiToNoteName(step.midiNote);
    }
    return '--';
  };

  // Get opacity based on velocity (0-127 -> 0.4-1.0)
  const getVelocityOpacity = (step: ParsedStep): number => {
    if (step.type !== 'note') return 0.4;
    return 0.4 + (step.velocity / 127) * 0.6;
  };

  // Get border style for probability
  const getProbabilityStyle = (step: ParsedStep): string => {
    if (step.probability < 100) {
      return 'border border-dashed border-yellow-500/50';
    }
    return '';
  };

  const currentPattern = parsedPatterns[selectedTab];
  const isCurrentTabPlaying = selectedTab === activePatternKey && data.running;

  return (
    <div
      className={`bg-gray-900 border-2 rounded-lg p-3 min-w-[340px] max-w-[420px] ${
        selected ? 'border-cyan-400' : 'border-emerald-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
          Tracker Sequencer
        </div>
        <button
          onClick={() => updateNodeParam(id, 'running', !data.running)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            data.running
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {data.running ? 'STOP' : 'PLAY'}
        </button>
      </div>

      {/* Pattern Tabs */}
      <div className="flex gap-1 mb-2">
        {(['A', 'B', 'C', 'D'] as PatternKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedTab(key)}
            className={`flex-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${
              selectedTab === key
                ? 'bg-emerald-600 text-white'
                : activePatternKey === key && data.running
                ? 'bg-emerald-800 text-emerald-200'
                : patternInputs[key].trim()
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
            }`}
          >
            {key}
            {activePatternKey === key && data.running && (
              <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Pattern text input */}
      <div className="mb-2">
        <textarea
          value={patternInputs[selectedTab]}
          onChange={(e) => handlePatternChange(selectedTab, e.target.value)}
          onBlur={() => commitPattern(selectedTab)}
          onKeyDown={handleKeyDown(selectedTab)}
          className={`w-full bg-gray-800 text-gray-100 text-xs font-mono p-2 rounded border resize-none h-10 ${
            parseErrors[selectedTab] ? 'border-red-500' : 'border-gray-600 focus:border-emerald-500'
          } focus:outline-none`}
          placeholder="C-4:80?50 D-4 E-4:127 ---"
          spellCheck={false}
        />
        {parseErrors[selectedTab] && (
          <div className="text-[10px] text-red-400 mt-1">{parseErrors[selectedTab]}</div>
        )}
      </div>

      {/* Step display grid */}
      <div
        ref={scrollContainerRef}
        className="flex gap-0.5 mb-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-600"
      >
        {currentPattern.map((step, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-6 text-center py-1 rounded text-[8px] font-mono transition-all ${getProbabilityStyle(step)} ${
              isCurrentTabPlaying && currentStep === i
                ? 'bg-emerald-500 text-white scale-110'
                : step.type === 'note'
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-800 text-gray-500'
            }`}
            style={{ opacity: isCurrentTabPlaying && currentStep === i ? 1 : getVelocityOpacity(step) }}
            title={`${step.originalToken || ''} vel:${step.velocity} prob:${step.probability}%`}
          >
            {getStepDisplay(step)}
          </div>
        ))}
      </div>

      {/* Chain input */}
      <div className="flex items-center gap-2 mb-2">
        <label className="text-[10px] text-gray-400">Chain:</label>
        <input
          type="text"
          value={chainInput}
          onChange={(e) => setChainInput(e.target.value.toUpperCase())}
          onBlur={commitChain}
          onKeyDown={(e) => e.key === 'Enter' && commitChain()}
          className="flex-1 bg-gray-800 text-gray-100 text-xs font-mono px-2 py-1 rounded border border-gray-600 focus:border-emerald-500 focus:outline-none"
          placeholder="AABA"
          spellCheck={false}
        />
        <span className="text-[10px] text-gray-500">
          {currentChainIndex + 1}/{chainInput.replace(/\s/g, '').length || 1}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center pt-2 border-t border-gray-700">
        {!data.extClock && (
          <Knob
            label="BPM"
            value={data.bpm}
            min={20}
            max={300}
            step={1}
            onChange={(v) => updateNodeParam(id, 'bpm', v)}
          />
        )}
        <Knob
          label="Gate"
          value={data.gate}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => updateNodeParam(id, 'gate', v)}
        />
        <Knob
          label="Swing"
          value={data.swing ?? 50}
          min={0}
          max={100}
          step={1}
          onChange={(v) => updateNodeParam(id, 'swing', v)}
        />
      </div>

      {/* Ext Clock toggle */}
      <div className="flex justify-center mt-2">
        <button
          onClick={() => updateNodeParam(id, 'extClock', !data.extClock)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            data.extClock
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {data.extClock ? 'EXT CLK' : 'INT CLK'}
        </button>
      </div>

      {/* Notation hint */}
      <div className="text-[9px] text-gray-600 text-center mt-2">
        C-4:80?50 = note:velocity?probability
      </div>

      {/* Clock input handle (left) */}
      <ClickableHandle
        type="target"
        position={Position.Left}
        id="input"
        nodeId={id}
        className={`!w-2.5 !h-2.5 ${data.extClock ? '!bg-orange-400' : '!bg-gray-600'}`}
        title="Clock In (enable Ext Clock mode)"
      />

      {/* Output handle - triggers notes */}
      <ClickableHandle
        type="source"
        position={Position.Right}
        id="output"
        nodeId={id}
        className="!bg-emerald-400 !w-3 !h-3"
        title="Trigger Output"
      />
    </div>
  );
});

SequencerNodeUI.displayName = 'SequencerNodeUI';
