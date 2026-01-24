import { useRef, useState } from 'react';
import { usePatchStore } from '../../patch/patchStore';
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
} from '../../patch/samplePatches';

export function PatchManager() {
  const patch = usePatchStore((state) => state.patch);
  const savePatch = usePatchStore((state) => state.savePatch);
  const loadPatch = usePatchStore((state) => state.loadPatch);
  const resetPatch = usePatchStore((state) => state.resetPatch);
  const exportPatch = usePatchStore((state) => state.exportPatch);
  const importPatch = usePatchStore((state) => state.importPatch);
  const autoLayoutNodes = usePatchStore((state) => state.autoLayoutNodes);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSamples, setShowSamples] = useState(false);
  const setPatch = usePatchStore((state) => state.setPatch);

  const loadSamplePatch = (name: string) => {
    const patches: Record<string, typeof DEMO_PATCH> = {
      demo: DEMO_PATCH,
      simple: SIMPLE_PATCH,
      mixer: MIXER_PATCH,
      sequencer: SEQUENCER_PATCH,
      random: RANDOM_MELODY_PATCH,
      westcoast: WESTCOAST_PATCH,
      bells: BELLS_PATCH,
      drums: NOISE_DRUMS_PATCH,
      ambient: AMBIENT_PATCH,
    };
    const samplePatch = patches[name] || DEMO_PATCH;
    // Create fresh dates for the loaded patch
    setPatch({
      ...samplePatch,
      meta: {
        ...samplePatch.meta,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
    // Auto-layout after loading
    setTimeout(() => autoLayoutNodes(), 0);
    setShowSamples(false);
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
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleLoad = () => {
    loadPatch();
    // Auto-layout after loading from localStorage
    setTimeout(() => autoLayoutNodes(), 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      if (importPatch(json)) {
        // Auto-layout after importing
        setTimeout(() => autoLayoutNodes(), 0);
      } else {
        console.error('Failed to import patch');
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-2">Patch</h3>
      <p className="text-xs text-gray-400 mb-3 truncate">{patch.meta.name}</p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={savePatch}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Save
        </button>
        <button
          onClick={handleLoad}
          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Load
        </button>
        <button
          onClick={handleExport}
          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Export
        </button>
        <button
          onClick={handleImport}
          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Import
        </button>
        <button
          onClick={resetPatch}
          className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          New
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sample Patches */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <button
          onClick={() => setShowSamples(!showSamples)}
          className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
        >
          <span>{showSamples ? '▼' : '▶'}</span>
          Sample Patches
        </button>
        {showSamples && (
          <div className="mt-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Basics</div>
            <button
              onClick={() => loadSamplePatch('simple')}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Simple Synth
              <span className="block text-teal-200 text-[10px]">Basic osc → filter → output</span>
            </button>
            <button
              onClick={() => loadSamplePatch('demo')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Demo Patch
              <span className="block text-purple-200 text-[10px]">Full synth with LFO + effects</span>
            </button>
            <button
              onClick={() => loadSamplePatch('mixer')}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Triple Oscillator
              <span className="block text-amber-200 text-[10px]">3 oscs with mixer</span>
            </button>
            <button
              onClick={() => loadSamplePatch('sequencer')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Arpeggio Sequence
              <span className="block text-emerald-200 text-[10px]">8-step sequencer with FX</span>
            </button>

            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-2">New Modules</div>
            <button
              onClick={() => loadSamplePatch('random')}
              className="bg-lime-600 hover:bg-lime-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Random Melody
              <span className="block text-lime-200 text-[10px]">Noise → S&H → Quantizer</span>
            </button>
            <button
              onClick={() => loadSamplePatch('westcoast')}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              West Coast Lead
              <span className="block text-rose-200 text-[10px]">Wavefolder harmonics</span>
            </button>
            <button
              onClick={() => loadSamplePatch('bells')}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Metallic Bells
              <span className="block text-fuchsia-200 text-[10px]">Ring modulator tones</span>
            </button>
            <button
              onClick={() => loadSamplePatch('drums')}
              className="bg-stone-600 hover:bg-stone-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Noise Drums
              <span className="block text-stone-200 text-[10px]">Hi-hat percussion</span>
            </button>
            <button
              onClick={() => loadSamplePatch('ambient')}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Generative Ambient
              <span className="block text-sky-200 text-[10px]">All new modules combined</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
