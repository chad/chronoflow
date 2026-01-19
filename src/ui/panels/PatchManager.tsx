import { useRef, useState } from 'react';
import { usePatchStore } from '../../patch/patchStore';
import { DEMO_PATCH, SIMPLE_PATCH } from '../../patch/samplePatches';

export function PatchManager() {
  const patch = usePatchStore((state) => state.patch);
  const savePatch = usePatchStore((state) => state.savePatch);
  const loadPatch = usePatchStore((state) => state.loadPatch);
  const resetPatch = usePatchStore((state) => state.resetPatch);
  const exportPatch = usePatchStore((state) => state.exportPatch);
  const importPatch = usePatchStore((state) => state.importPatch);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSamples, setShowSamples] = useState(false);
  const setPatch = usePatchStore((state) => state.setPatch);

  const loadSamplePatch = (name: 'demo' | 'simple') => {
    const samplePatch = name === 'demo' ? DEMO_PATCH : SIMPLE_PATCH;
    // Create fresh dates for the loaded patch
    setPatch({
      ...samplePatch,
      meta: {
        ...samplePatch.meta,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      if (importPatch(json)) {
        console.log('Patch imported successfully');
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
          onClick={loadPatch}
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
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={() => loadSamplePatch('demo')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Demo Patch
              <span className="block text-purple-200 text-[10px]">Full synth with effects</span>
            </button>
            <button
              onClick={() => loadSamplePatch('simple')}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 py-1.5 rounded transition-colors text-left"
            >
              Simple Synth
              <span className="block text-teal-200 text-[10px]">Basic osc → filter → output</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
