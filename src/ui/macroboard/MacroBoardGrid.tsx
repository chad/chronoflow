import type { MacroBoard, MacroBoardControl } from '../../patch/types';
import { usePatchStore } from '../../patch/patchStore';
import { BigKnob } from './controls/BigKnob';
import { Fader } from './controls/Fader';
import { PerformButton } from './controls/PerformButton';
import { PadXY } from './controls/PadXY';
import { Ribbon } from './controls/Ribbon';

interface MacroBoardGridProps {
  board: MacroBoard;
  mode: 'perform' | 'edit';
  selectedControlId: string | null;
  onSelectControl: (id: string | null) => void;
}

function ControlRenderer({
  control,
  mode,
  isSelected,
  onSelect,
}: {
  control: MacroBoardControl;
  mode: 'perform' | 'edit';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const setControlValue = usePatchStore((s) => s.setMacroBoardControlValue);

  const wrapper = (children: React.ReactNode) => (
    <div
      className={`h-full rounded-xl border transition-colors ${
        mode === 'edit' && isSelected
          ? 'border-fuchsia-500 bg-gray-900/80'
          : 'border-gray-700/50 bg-gray-900/60'
      } ${mode === 'edit' ? 'cursor-pointer hover:border-gray-500' : ''}`}
      onClick={mode === 'edit' ? onSelect : undefined}
    >
      {children}
    </div>
  );

  switch (control.type) {
    case 'knob':
      return wrapper(
        <BigKnob
          value={control.value}
          label={control.label}
          color={control.color}
          onChange={(v) => setControlValue(control.id, v)}
        />
      );
    case 'fader':
      return wrapper(
        <Fader
          value={control.value}
          label={control.label}
          color={control.color}
          onChange={(v) => setControlValue(control.id, v)}
        />
      );
    case 'button':
      return wrapper(
        <PerformButton
          pressed={control.pressed}
          mode={control.mode}
          label={control.label}
          color={control.color}
          onPress={() =>
            setControlValue(control.id, control.mode === 'toggle' ? (control.pressed ? control.offValue : control.onValue) : control.onValue)
          }
          onRelease={() => {
            if (control.mode === 'momentary') {
              setControlValue(control.id, control.offValue);
            }
          }}
        />
      );
    case 'xypad':
      return wrapper(
        <PadXY
          x={control.x}
          y={control.y}
          label={control.label}
          color={control.color}
          onChangeX={(v) => setControlValue(control.id, v, 'x')}
          onChangeY={(v) => setControlValue(control.id, v, 'y')}
        />
      );
    case 'ribbon':
      return wrapper(
        <Ribbon
          value={control.value}
          label={control.label}
          color={control.color}
          springBack={control.springBack}
          centerValue={control.centerValue}
          onChange={(v) => setControlValue(control.id, v)}
          onRelease={() => {
            if (control.springBack) {
              setControlValue(control.id, control.centerValue);
            }
          }}
        />
      );
  }
}

export function MacroBoardGrid({ board, mode, selectedControlId, onSelectControl }: MacroBoardGridProps) {
  return (
    <div
      className="flex-1 p-4"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${board.cols}, 1fr)`,
        gridTemplateRows: `repeat(${board.rows}, 1fr)`,
        gap: '8px',
        height: '100%',
      }}
    >
      {board.controls.map((control) => (
        <div
          key={control.id}
          style={{
            gridColumn: `${control.gridCol + 1} / span ${control.colSpan}`,
            gridRow: `${control.gridRow + 1} / span ${control.rowSpan}`,
          }}
        >
          <ControlRenderer
            control={control}
            mode={mode}
            isSelected={selectedControlId === control.id}
            onSelect={() => onSelectControl(control.id)}
          />
        </div>
      ))}

      {/* Empty state */}
      {board.controls.length === 0 && (
        <div
          className="flex items-center justify-center text-gray-600 text-lg"
          style={{
            gridColumn: `1 / span ${board.cols}`,
            gridRow: `1 / span ${board.rows}`,
          }}
        >
          {mode === 'edit'
            ? 'Add controls from the palette on the left'
            : 'No controls configured — press Edit to set up your board'}
        </div>
      )}
    </div>
  );
}
