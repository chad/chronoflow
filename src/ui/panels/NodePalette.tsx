import { usePatchStore } from '../../patch/patchStore';
import type { PatchNodeType } from '../../patch/types';

interface NodeOption {
  type: PatchNodeType;
  label: string;
  color: string;
  description: string;
}

const NODE_OPTIONS: NodeOption[] = [
  {
    type: 'oscillator',
    label: 'Osc',
    color: 'bg-orange-500',
    description: 'Audio oscillator',
  },
  {
    type: 'filter',
    label: 'Filter',
    color: 'bg-purple-500',
    description: 'LP/HP/BP filter',
  },
  {
    type: 'vca',
    label: 'VCA',
    color: 'bg-green-500',
    description: 'Volume control',
  },
  {
    type: 'adsr',
    label: 'ADSR',
    color: 'bg-pink-500',
    description: 'Envelope generator',
  },
  {
    type: 'lfo',
    label: 'LFO',
    color: 'bg-yellow-500',
    description: 'Modulation source',
  },
  {
    type: 'delay',
    label: 'Delay',
    color: 'bg-blue-500',
    description: 'Delay effect',
  },
  {
    type: 'reverb',
    label: 'Reverb',
    color: 'bg-indigo-500',
    description: 'Reverb effect',
  },
  {
    type: 'mixer',
    label: 'Mixer',
    color: 'bg-amber-500',
    description: '4-channel mixer',
  },
];

export function NodePalette() {
  const addNode = usePatchStore((state) => state.addNode);

  const handleAddNode = (type: PatchNodeType) => {
    // Add node at a random position near center
    const x = 100 + Math.random() * 200;
    const y = 100 + Math.random() * 200;
    addNode(type, { x, y });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-300 mb-3">Add Node</h3>
      <div className="flex flex-wrap gap-2">
        {NODE_OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => handleAddNode(option.type)}
            className={`${option.color} hover:opacity-80 text-white text-xs font-medium px-3 py-1.5 rounded transition-opacity`}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
