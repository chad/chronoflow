import { useState, useEffect, useMemo } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import type { PatchNodeType } from '../../patch/types';
import { SearchInput } from '../components/SearchInput';

interface NodeOption {
  type: PatchNodeType;
  label: string;
  description: string;
}

interface Category {
  name: string;
  color: string;
  borderColor: string;
  modules: NodeOption[];
}

const CATEGORIES: Category[] = [
  {
    name: 'Sources',
    color: 'bg-orange-900/50',
    borderColor: 'border-l-orange-500',
    modules: [
      { type: 'oscillator', label: 'Oscillator', description: 'Audio oscillator with multiple waveforms' },
      { type: 'droneosc', label: 'Drone Osc', description: 'Multi-voice drone/pad oscillator with drift' },
      { type: 'wavetableosc', label: 'Wavetable', description: 'Morphable wavetable oscillator (8 tables)' },
      { type: 'noise', label: 'Noise', description: 'White/pink noise generator' },
      { type: 'karplusstrong', label: 'Karplus-Strong', description: 'Plucked string synthesis' },
      { type: 'granular', label: 'Granular', description: 'Granular texture processor' },
      { type: 'smoothrandom', label: 'Smooth Random', description: 'Smooth random walk generator' },
      { type: 'audioinput', label: 'Audio Input', description: 'Microphone or stream input' },
    ],
  },
  {
    name: 'Modulators',
    color: 'bg-pink-900/50',
    borderColor: 'border-l-pink-500',
    modules: [
      { type: 'lfo', label: 'LFO', description: 'Low frequency oscillator' },
      { type: 'adsr', label: 'ADSR', description: 'Attack/Decay/Sustain/Release envelope' },
      { type: 'envfollower', label: 'Envelope Follower', description: 'Track amplitude of input signal' },
    ],
  },
  {
    name: 'Sequencing',
    color: 'bg-emerald-900/50',
    borderColor: 'border-l-emerald-500',
    modules: [
      { type: 'clock', label: 'Clock', description: 'Master tempo clock' },
      { type: 'clockdiv', label: 'Clock Divider', description: 'Divide clock rate' },
      { type: 'sequencer', label: 'Sequencer', description: '8-step CV sequencer' },
      { type: 'euclidean', label: 'Euclidean', description: 'Euclidean rhythm generator' },
    ],
  },
  {
    name: 'CV / Logic',
    color: 'bg-sky-900/50',
    borderColor: 'border-l-sky-500',
    modules: [
      { type: 'samplehold', label: 'Sample & Hold', description: 'Sample input on trigger' },
      { type: 'quantizer', label: 'Quantizer', description: 'Quantize to musical scales' },
      { type: 'slewlimiter', label: 'Slew Limiter', description: 'Smooth/portamento CV changes' },
      { type: 'attenuverter', label: 'Attenuverter', description: 'Scale and invert signals' },
      { type: 'logic', label: 'Logic', description: 'Boolean logic operations' },
      { type: 'probgate', label: 'Probability Gate', description: 'Randomly pass/block gates' },
      { type: 'macro', label: 'Macro', description: 'Multi-output control knob' },
      { type: 'comparator', label: 'Comparator', description: 'Compare CV to threshold' },
    ],
  },
  {
    name: 'Structure',
    color: 'bg-amber-900/50',
    borderColor: 'border-l-amber-500',
    modules: [
      { type: 'counter', label: 'Counter', description: 'Count triggers, fire on N' },
      { type: 'sequencechain', label: 'Scene Chain', description: 'Progress through scenes' },
      { type: 'switch', label: 'Switch', description: 'Route between inputs' },
      { type: 'crossfader', label: 'Crossfader', description: 'Blend between two sources' },
    ],
  },
  {
    name: 'Processing',
    color: 'bg-purple-900/50',
    borderColor: 'border-l-purple-500',
    modules: [
      { type: 'filter', label: 'Filter', description: 'LP/HP/BP resonant filter' },
      { type: 'vca', label: 'VCA', description: 'Voltage controlled amplifier' },
      { type: 'wavefolder', label: 'Wavefolder', description: 'Harmonic waveshaping' },
      { type: 'ringmod', label: 'Ring Mod', description: 'Ring modulator' },
      { type: 'pitchshifter', label: 'Pitch Shifter', description: 'Granular pitch shifting' },
      { type: 'formantshifter', label: 'Formant Shifter', description: 'Shift vocal formants independently' },
      { type: 'freqshifter', label: 'Freq Shifter', description: 'Fixed Hz frequency shifting (Bode)' },
      { type: 'combfilter', label: 'Comb Filter', description: 'Resonant metallic comb filter' },
      { type: 'resonator', label: 'Resonator', description: 'Bank of tuned resonant filters (bells, metals)' },
      { type: 'vocoder', label: 'Vocoder', description: 'Channel vocoder (voice + carrier)' },
      { type: 'eq', label: 'EQ', description: '3-band parametric equalizer' },
      { type: 'compressor', label: 'Compressor', description: 'Dynamics compressor with sidechain' },
      { type: 'bitcrusher', label: 'Bitcrusher', description: 'Bit depth & sample rate reduction' },
    ],
  },
  {
    name: 'Effects',
    color: 'bg-blue-900/50',
    borderColor: 'border-l-blue-500',
    modules: [
      { type: 'delay', label: 'Delay', description: 'Stereo delay effect' },
      { type: 'tapedelay', label: 'Tape Delay', description: 'Analog tape echo with wow, flutter & saturation' },
      { type: 'reverb', label: 'Reverb', description: 'Convolution reverb' },
      { type: 'shimmerreverb', label: 'Shimmer Reverb', description: 'Reverb with pitch-shifted feedback' },
      { type: 'spectralfreeze', label: 'Spectral Freeze', description: 'FFT freeze/blur for infinite sustain textures' },
      { type: 'chorus', label: 'Chorus', description: 'Multi-voice ensemble effect' },
      { type: 'glitch', label: 'Glitch', description: 'Buffer stutter, reverse & pitch-ramp' },
      { type: 'stereofield', label: 'Stereo Field', description: 'Pan, width, mid/side & Haas effect' },
      { type: 'mixer', label: 'Mixer', description: '4-channel audio mixer' },
    ],
  },
  {
    name: 'Routing',
    color: 'bg-teal-900/50',
    borderColor: 'border-l-teal-500',
    modules: [
      { type: 'send', label: 'Send', description: 'Aux send to named bus (parallel effects)' },
      { type: 'return', label: 'Return', description: 'Receive from named bus' },
    ],
  },
];

const STORAGE_KEY = 'chronoflow-palette-collapsed';

function loadCollapsedState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function NodePalette() {
  const addNode = usePatchStore((state) => state.addNode);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(loadCollapsedState);

  useEffect(() => {
    saveCollapsedState(collapsedCategories);
  }, [collapsedCategories]);

  const handleAddNode = (type: PatchNodeType) => {
    // Place at a reasonable position with slight randomness to avoid stacking
    const x = 200 + Math.random() * 100;
    const y = 150 + Math.random() * 100;
    addNode(type, { x, y });
  };

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return CATEGORIES;
    }
    const query = searchQuery.toLowerCase();
    return CATEGORIES.map((category) => ({
      ...category,
      modules: category.modules.filter(
        (m) =>
          m.label.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.type.toLowerCase().includes(query)
      ),
    })).filter((category) => category.modules.length > 0);
  }, [searchQuery]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-3">Add Module</h3>

      <div className="mb-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search modules..."
        />
      </div>

      <div className="space-y-2">
        {filteredCategories.map((category) => {
          const isCollapsed = collapsedCategories[category.name] && !searchQuery;

          return (
            <div key={category.name} className="rounded overflow-hidden">
              <button
                onClick={() => toggleCategory(category.name)}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 transition-colors ${category.color}`}
              >
                <span>{category.name}</span>
                <span className="text-gray-500">
                  {isCollapsed ? '▶' : '▼'}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-1 py-1">
                  {category.modules.map((module) => (
                    <button
                      key={module.type}
                      onClick={() => handleAddNode(module.type)}
                      className={`w-full text-left px-2 py-1.5 border-l-2 ${category.borderColor} bg-gray-800/50 hover:bg-gray-700/50 transition-colors`}
                    >
                      <div className="text-xs font-medium text-gray-200">
                        {module.label}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {module.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-4">
            No modules found
          </div>
        )}
      </div>
    </div>
  );
}
