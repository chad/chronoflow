import { useRef, useState, useMemo } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import { audioGraph } from '../../audio/AudioGraph';
import { SearchInput } from '../components/SearchInput';
import {
  DEMO_PATCH,
  SIMPLE_PATCH,
  MIXER_PATCH,
  SEQUENCER_PATCH,
  RANDOM_MELODY_PATCH,
  WESTCOAST_PATCH,
  BELLS_PATCH,
  NOISE_DRUMS_PATCH,
  AMBIENT_PATCH,
  POLYRHYTHM_PATCH,
  TRACKER_DEMO_PATCH,
  AMBIENT_GENERATIVE_PATCH,
  PENTATONIC_DREAMS_PATCH,
  CRYSTAL_BELLS_PATCH,
  MIDNIGHT_DRIVE_PATCH,
  ETHEREAL_DRIFT_PATCH,
  EVOLVING_MELODY_PATCH,
  POLYRHYTHMIC_TRIGGERS_PATCH,
  MACRO_DRONE_PATCH,
  COSMIC_CATHEDRAL_PATCH,
  ETERNAL_GARDEN_PATCH,
} from '../../patch/samplePatches';

interface SamplePatch {
  key: string;
  name: string;
  description: string;
  patch: typeof DEMO_PATCH;
}

interface PatchCategory {
  name: string;
  patches: SamplePatch[];
}

const PATCH_CATEGORIES: PatchCategory[] = [
  {
    name: 'Learn',
    patches: [
      { key: 'simple', name: 'Simple Synth', description: 'Basic osc → filter → output', patch: SIMPLE_PATCH },
      { key: 'demo', name: 'Demo Patch', description: 'Full synth with LFO + effects', patch: DEMO_PATCH },
      { key: 'mixer', name: 'Triple Oscillator', description: '3 oscillators with mixer', patch: MIXER_PATCH },
      { key: 'sequencer', name: 'Arpeggio Sequence', description: '8-step sequencer with FX', patch: SEQUENCER_PATCH },
    ],
  },
  {
    name: 'Generative',
    patches: [
      { key: 'eternalgarden', name: 'Eternal Garden', description: 'Scene Chain + Crossfade evolution', patch: ETERNAL_GARDEN_PATCH },
      { key: 'cosmiccathedral', name: 'Cosmic Cathedral', description: '6-layer generative masterpiece', patch: COSMIC_CATHEDRAL_PATCH },
      { key: 'evolvingmelody', name: 'Evolving Melody', description: 'Turing Machine + Slew + Euclidean', patch: EVOLVING_MELODY_PATCH },
      { key: 'polyrhythmictriggers', name: 'Polyrhythmic Triggers', description: '3x Euclidean + Logic XOR', patch: POLYRHYTHMIC_TRIGGERS_PATCH },
      { key: 'macrodrone', name: 'Macro Drone', description: 'Macro Controller + Env Follower', patch: MACRO_DRONE_PATCH },
      { key: 'ambientgen', name: 'Ambient Generative', description: 'Probability + S&H + drone layers', patch: AMBIENT_GENERATIVE_PATCH },
      { key: 'pentatonic', name: 'Pentatonic Dreams', description: 'Consonant, modal, lush reverb', patch: PENTATONIC_DREAMS_PATCH },
      { key: 'crystalbells', name: 'Crystal Bells', description: 'Round bell tones, cathedral reverb', patch: CRYSTAL_BELLS_PATCH },
      { key: 'ethereal', name: 'Ethereal Drift', description: 'Granular + Strings + SmoothRnd', patch: ETHEREAL_DRIFT_PATCH },
      { key: 'midnight', name: 'Midnight Machine', description: 'S&H melodies, driving bass', patch: MIDNIGHT_DRIVE_PATCH },
    ],
  },
  {
    name: 'Showcase',
    patches: [
      { key: 'tracker', name: 'Tracker Demo', description: 'Velocity, probability, patterns', patch: TRACKER_DEMO_PATCH },
      { key: 'random', name: 'Random Melody', description: 'Noise → S&H → Quantizer', patch: RANDOM_MELODY_PATCH },
      { key: 'westcoast', name: 'West Coast Lead', description: 'Wavefolder harmonics', patch: WESTCOAST_PATCH },
      { key: 'bells', name: 'Metallic Bells', description: 'Ring modulator tones', patch: BELLS_PATCH },
      { key: 'drums', name: 'Noise Drums', description: 'Hi-hat percussion', patch: NOISE_DRUMS_PATCH },
      { key: 'polyrhythm', name: 'Polyrhythmic Voices', description: 'Master clock + divider + 2 voices', patch: POLYRHYTHM_PATCH },
      { key: 'ambient', name: 'Generative Ambient', description: 'All new modules combined', patch: AMBIENT_PATCH },
    ],
  },
];

export function PatchManager() {
  const patch = usePatchStore((state) => state.patch);
  const savePatch = usePatchStore((state) => state.savePatch);
  const loadPatch = usePatchStore((state) => state.loadPatch);
  const resetPatch = usePatchStore((state) => state.resetPatch);
  const exportPatch = usePatchStore((state) => state.exportPatch);
  const importPatch = usePatchStore((state) => state.importPatch);
  const autoLayoutNodes = usePatchStore((state) => state.autoLayoutNodes);
  const setPatch = usePatchStore((state) => state.setPatch);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const loadSamplePatch = (samplePatch: typeof DEMO_PATCH) => {
    audioGraph.panic();
    setPatch({
      ...samplePatch,
      meta: {
        ...samplePatch.meta,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
    setTimeout(() => autoLayoutNodes(), 0);
  };

  const handleExport = () => {
    const json = exportPatch();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patch.meta.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowActions(false);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
    setShowActions(false);
  };

  const handleLoad = () => {
    loadPatch();
    setTimeout(() => autoLayoutNodes(), 0);
    setShowActions(false);
  };

  const handleSave = () => {
    savePatch();
    setShowActions(false);
  };

  const handleNew = () => {
    resetPatch();
    setShowActions(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      if (importPatch(json)) {
        setTimeout(() => autoLayoutNodes(), 0);
      } else {
        console.error('Failed to import patch');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleCategory = (name: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return PATCH_CATEGORIES;
    }
    const query = searchQuery.toLowerCase();
    return PATCH_CATEGORIES.map((category) => ({
      ...category,
      patches: category.patches.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      ),
    })).filter((category) => category.patches.length > 0);
  }, [searchQuery]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-300">Patch</h3>
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1"
          >
            Actions
            <span className="text-[10px]">{showActions ? '▲' : '▼'}</span>
          </button>
          {showActions && (
            <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 min-w-[100px]">
              <button
                onClick={handleSave}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleLoad}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                Load
              </button>
              <div className="border-t border-gray-700" />
              <button
                onClick={handleExport}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={handleImport}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                Import JSON
              </button>
              <div className="border-t border-gray-700" />
              <button
                onClick={handleNew}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-700 transition-colors"
              >
                New Patch
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-200 mb-3 truncate font-medium">{patch.meta.name}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="pt-3 border-t border-gray-700">
        <button
          onClick={() => setShowSamples(!showSamples)}
          className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1 mb-2"
        >
          <span>{showSamples ? '▼' : '▶'}</span>
          Sample Patches
        </button>

        {showSamples && (
          <div className="space-y-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search patches..."
            />

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredCategories.map((category) => {
                const isCollapsed = collapsedCategories[category.name] && !searchQuery;

                return (
                  <div key={category.name}>
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide hover:text-gray-300"
                    >
                      <span>{category.name}</span>
                      <span>{isCollapsed ? '▶' : '▼'}</span>
                    </button>

                    {!isCollapsed && (
                      <div className="space-y-1 mt-1">
                        {category.patches.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => loadSamplePatch(p.patch)}
                            className="w-full text-left px-2 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors"
                          >
                            <div className="text-xs font-medium text-gray-200">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {p.description}
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
                  No patches found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
