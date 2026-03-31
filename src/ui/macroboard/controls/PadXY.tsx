import { useCallback, useRef, useState, useEffect } from 'react';

interface PadXYProps {
  x: number; // 0-1
  y: number; // 0-1
  label: string;
  color: string;
  onChangeX: (value: number) => void;
  onChangeY: (value: number) => void;
}

export function PadXY({ x, y, label, color, onChangeX, onChangeY }: PadXYProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeX = Math.max(0, Math.min(1, x));
  const safeY = Math.max(0, Math.min(1, y));

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      onChangeX(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
      onChangeY(Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height)));
    },
    [onChangeX, onChangeY]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => updateFromPointer(e.clientX, e.clientY);
    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateFromPointer]);

  return (
    <div className="flex flex-col h-full select-none gap-2 p-3">
      <span className="text-xs font-medium uppercase tracking-wider text-center" style={{ color }}>
        {label}
      </span>
      <div
        ref={padRef}
        className="relative flex-1 rounded-lg bg-gray-800 border border-gray-700 cursor-crosshair overflow-hidden"
        style={{ touchAction: 'none', minHeight: 100 }}
        onPointerDown={handlePointerDown}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15 }}>
          <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-400" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400" />
          <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-400" />
          <div className="absolute top-1/4 left-0 right-0 h-px bg-gray-400" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-400" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-gray-400" />
        </div>

        {/* Crosshair lines */}
        <div
          className="absolute top-0 bottom-0 w-px pointer-events-none"
          style={{ left: `${safeX * 100}%`, backgroundColor: `${color}60` }}
        />
        <div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ top: `${(1 - safeY) * 100}%`, backgroundColor: `${color}60` }}
        />

        {/* Position indicator */}
        <div
          className="absolute w-5 h-5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none border-2"
          style={{
            left: `${safeX * 100}%`,
            top: `${(1 - safeY) * 100}%`,
            borderColor: color,
            backgroundColor: `${color}40`,
            boxShadow: `0 0 12px ${color}80`,
          }}
        />

        {/* Coordinate display */}
        <div className="absolute bottom-1 right-2 text-[10px] font-mono text-gray-500 pointer-events-none">
          {Math.round(safeX * 100)}, {Math.round(safeY * 100)}
        </div>
      </div>
    </div>
  );
}
