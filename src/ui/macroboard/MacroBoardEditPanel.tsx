import { usePatchStore } from '../../patch/patchStore';
import type { MacroMapping, MacroBoardControl } from '../../patch/types';

interface MacroBoardEditPanelProps {
  controlId: string;
  onClose: () => void;
}

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#4ade80', '#facc15', '#f87171', '#60a5fa'];

function MappingRow({
  mapping,
  onChange,
  onRemove,
}: {
  mapping: MacroMapping;
  onChange: (updated: MacroMapping) => void;
  onRemove: () => void;
}) {
  const nodes = usePatchStore((s) => s.patch.nodes);
  const selectedNode = nodes.find((n) => n.id === mapping.nodeId);

  // Get numeric params from the selected node
  const numericParams = selectedNode
    ? Object.entries(selectedNode.params)
        .filter(([, v]) => typeof v === 'number')
        .map(([k]) => k)
    : [];

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex gap-1.5">
        <select
          value={mapping.nodeId}
          onChange={(e) => onChange({ ...mapping, nodeId: e.target.value, param: '' })}
          className="flex-1 bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-600 outline-none"
        >
          <option value="">Node...</option>
          {nodes
            .filter((n) => n.type !== 'output')
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.type} ({n.id.slice(0, 4)})
              </option>
            ))}
        </select>
        <button onClick={onRemove} className="text-gray-500 hover:text-red-400 text-xs px-1" title="Remove mapping">
          x
        </button>
      </div>

      {mapping.nodeId && (
        <select
          value={mapping.param}
          onChange={(e) => onChange({ ...mapping, param: e.target.value })}
          className="bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-600 outline-none"
        >
          <option value="">Param...</option>
          {numericParams.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-1.5">
        <label className="flex-1">
          <span className="text-[10px] text-gray-500">Min</span>
          <input
            type="number"
            value={mapping.min}
            onChange={(e) => onChange({ ...mapping, min: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-600 outline-none"
            step="any"
          />
        </label>
        <label className="flex-1">
          <span className="text-[10px] text-gray-500">Max</span>
          <input
            type="number"
            value={mapping.max}
            onChange={(e) => onChange({ ...mapping, max: parseFloat(e.target.value) || 1 })}
            className="w-full bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-1 border border-gray-600 outline-none"
            step="any"
          />
        </label>
      </div>
    </div>
  );
}

function MappingsList({
  label,
  mappings,
  onChange,
}: {
  label: string;
  mappings: MacroMapping[];
  onChange: (mappings: MacroMapping[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <button
          onClick={() => onChange([...mappings, { nodeId: '', param: '', min: 0, max: 1 }])}
          className="text-[10px] px-2 py-0.5 bg-fuchsia-900 text-fuchsia-300 rounded hover:bg-fuchsia-800 transition-colors"
        >
          + Add
        </button>
      </div>
      {mappings.map((m, i) => (
        <MappingRow
          key={i}
          mapping={m}
          onChange={(updated) => {
            const next = [...mappings];
            next[i] = updated;
            onChange(next);
          }}
          onRemove={() => onChange(mappings.filter((_, j) => j !== i))}
        />
      ))}
      {mappings.length === 0 && (
        <div className="text-[10px] text-gray-600 text-center py-2">No mappings</div>
      )}
    </div>
  );
}

export function MacroBoardEditPanel({ controlId, onClose }: MacroBoardEditPanelProps) {
  const macroBoard = usePatchStore((s) => s.patch.macroBoard);
  const updateControl = usePatchStore((s) => s.updateMacroBoardControl);
  const removeControl = usePatchStore((s) => s.removeMacroBoardControl);

  const control = macroBoard?.controls.find((c) => c.id === controlId);
  if (!control) return null;

  const handleUpdate = (updates: Partial<MacroBoardControl>) => {
    updateControl(controlId, updates);
  };

  return (
    <aside className="w-64 bg-gray-900 border-l border-gray-800 p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Edit Control</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">
          x
        </button>
      </div>

      {/* Label */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-500 uppercase">Label</span>
        <input
          type="text"
          value={control.label}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-700 outline-none focus:border-fuchsia-500"
        />
      </label>

      {/* Color */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-500 uppercase">Color</span>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleUpdate({ color: c })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                control.color === c ? 'border-white scale-110' : 'border-transparent hover:border-gray-500'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Type-specific settings */}
      {control.type === 'button' && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 uppercase">Mode</span>
            <select
              value={control.mode}
              onChange={(e) => handleUpdate({ mode: e.target.value as 'momentary' | 'toggle' })}
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 outline-none"
            >
              <option value="toggle">Toggle</option>
              <option value="momentary">Momentary</option>
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] text-gray-500">On Value</span>
              <input
                type="number"
                value={control.onValue}
                onChange={(e) => handleUpdate({ onValue: parseFloat(e.target.value) || 0 })}
                className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 outline-none"
                step="any"
              />
            </label>
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] text-gray-500">Off Value</span>
              <input
                type="number"
                value={control.offValue}
                onChange={(e) => handleUpdate({ offValue: parseFloat(e.target.value) || 0 })}
                className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 outline-none"
                step="any"
              />
            </label>
          </div>
        </>
      )}

      {control.type === 'ribbon' && (
        <>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={control.springBack}
              onChange={(e) => handleUpdate({ springBack: e.target.checked })}
              className="accent-fuchsia-500"
            />
            <span className="text-xs text-gray-300">Spring back to center</span>
          </label>
          {control.springBack && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-500">Center Value (0-1)</span>
              <input
                type="number"
                value={control.centerValue}
                onChange={(e) => handleUpdate({ centerValue: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5)) })}
                className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-700 outline-none"
                step="0.05"
                min="0"
                max="1"
              />
            </label>
          )}
        </>
      )}

      {/* Grid position */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-500 uppercase">Grid Position</span>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-600">Col</span>
            <input
              type="number"
              value={control.gridCol}
              onChange={(e) => handleUpdate({ gridCol: Math.max(0, parseInt(e.target.value) || 0) })}
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700 outline-none"
              min="0"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-600">Row</span>
            <input
              type="number"
              value={control.gridRow}
              onChange={(e) => handleUpdate({ gridRow: Math.max(0, parseInt(e.target.value) || 0) })}
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700 outline-none"
              min="0"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-600">Width</span>
            <input
              type="number"
              value={control.colSpan}
              onChange={(e) => handleUpdate({ colSpan: Math.max(1, parseInt(e.target.value) || 1) })}
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700 outline-none"
              min="1"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-600">Height</span>
            <input
              type="number"
              value={control.rowSpan}
              onChange={(e) => handleUpdate({ rowSpan: Math.max(1, parseInt(e.target.value) || 1) })}
              className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700 outline-none"
              min="1"
            />
          </label>
        </div>
      </div>

      {/* Mappings */}
      <div className="border-t border-gray-800 pt-3">
        {control.type === 'xypad' ? (
          <>
            <MappingsList
              label="X Axis Mappings"
              mappings={control.xMappings}
              onChange={(xMappings) => handleUpdate({ xMappings } as any)}
            />
            <div className="mt-3">
              <MappingsList
                label="Y Axis Mappings"
                mappings={control.yMappings}
                onChange={(yMappings) => handleUpdate({ yMappings } as any)}
              />
            </div>
          </>
        ) : (
          <MappingsList
            label="Mappings"
            mappings={(control as any).mappings || []}
            onChange={(mappings) => handleUpdate({ mappings } as any)}
          />
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => {
          removeControl(controlId);
          onClose();
        }}
        className="mt-auto px-3 py-2 text-xs bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900 transition-colors border border-red-800"
      >
        Remove Control
      </button>
    </aside>
  );
}
