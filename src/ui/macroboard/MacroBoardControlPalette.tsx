import { nanoid } from 'nanoid';
import { usePatchStore } from '../../patch/patchStore';
import type { MacroBoard, MacroBoardControl, MacroBoardControlType } from '../../patch/types';

const CONTROL_DEFS: {
  type: MacroBoardControlType;
  label: string;
  desc: string;
  colSpan: number;
  rowSpan: number;
  icon: string;
}[] = [
  { type: 'knob', label: 'Knob', desc: 'Rotary control', colSpan: 1, rowSpan: 1, icon: 'O' },
  { type: 'fader', label: 'Fader', desc: 'Vertical slider', colSpan: 1, rowSpan: 2, icon: '|' },
  { type: 'button', label: 'Button', desc: 'Toggle or momentary', colSpan: 1, rowSpan: 1, icon: '#' },
  { type: 'xypad', label: 'XY Pad', desc: '2D surface control', colSpan: 3, rowSpan: 3, icon: '+' },
  { type: 'ribbon', label: 'Ribbon', desc: 'Horizontal strip', colSpan: 4, rowSpan: 1, icon: '—' },
];

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#4ade80', '#facc15', '#f87171', '#60a5fa'];

function isGridAreaFree(board: MacroBoard, col: number, row: number, colSpan: number, rowSpan: number): boolean {
  if (col + colSpan > board.cols || row + rowSpan > board.rows) return false;
  return !board.controls.some((c) => {
    const cRight = c.gridCol + c.colSpan;
    const cBottom = c.gridRow + c.rowSpan;
    const right = col + colSpan;
    const bottom = row + rowSpan;
    return col < cRight && right > c.gridCol && row < cBottom && bottom > c.gridRow;
  });
}

function findFreeSlot(board: MacroBoard, colSpan: number, rowSpan: number): { col: number; row: number } | null {
  for (let r = 0; r <= board.rows - rowSpan; r++) {
    for (let c = 0; c <= board.cols - colSpan; c++) {
      if (isGridAreaFree(board, c, r, colSpan, rowSpan)) {
        return { col: c, row: r };
      }
    }
  }
  return null;
}

function createDefaultControl(type: MacroBoardControlType, col: number, row: number, colSpan: number, rowSpan: number): MacroBoardControl {
  const id = nanoid(8);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const base = { id, label: type.charAt(0).toUpperCase() + type.slice(1), color, gridCol: col, gridRow: row, colSpan, rowSpan };

  switch (type) {
    case 'knob':
      return { ...base, type: 'knob', value: 0.5, mappings: [] };
    case 'fader':
      return { ...base, type: 'fader', value: 0.5, mappings: [] };
    case 'button':
      return { ...base, type: 'button', mode: 'toggle', pressed: false, onValue: 1, offValue: 0, mappings: [] };
    case 'xypad':
      return { ...base, type: 'xypad', x: 0.5, y: 0.5, xMappings: [], yMappings: [] };
    case 'ribbon':
      return { ...base, type: 'ribbon', value: 0.5, springBack: false, centerValue: 0.5, mappings: [] };
  }
}

interface MacroBoardControlPaletteProps {
  board: MacroBoard;
}

export function MacroBoardControlPalette({ board }: MacroBoardControlPaletteProps) {
  const addControl = usePatchStore((s) => s.addMacroBoardControl);

  const handleAdd = (def: typeof CONTROL_DEFS[number]) => {
    const slot = findFreeSlot(board, def.colSpan, def.rowSpan);
    if (!slot) return; // Board full
    const control = createDefaultControl(def.type, slot.col, slot.row, def.colSpan, def.rowSpan);
    addControl(control);
  };

  return (
    <aside className="w-48 bg-gray-900 border-r border-gray-800 p-3 flex flex-col gap-2 shrink-0">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Add Control</h3>
      {CONTROL_DEFS.map((def) => {
        const hasSpace = findFreeSlot(board, def.colSpan, def.rowSpan) !== null;
        return (
          <button
            key={def.type}
            onClick={() => handleAdd(def)}
            disabled={!hasSpace}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center text-fuchsia-400 font-mono text-lg">
              {def.icon}
            </span>
            <div>
              <div className="text-sm text-gray-200">{def.label}</div>
              <div className="text-[10px] text-gray-500">{def.desc} ({def.colSpan}x{def.rowSpan})</div>
            </div>
          </button>
        );
      })}
    </aside>
  );
}
