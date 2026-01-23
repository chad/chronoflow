import { useCallback, useRef, useState, useEffect } from 'react';

// Helper to create SVG arc path
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  // Handle case where angles are the same
  if (Math.abs(endAngle - startAngle) < 0.1) return '';

  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  logarithmic?: boolean;
  modulatedValue?: number;
  isModulated?: boolean;
}

export function Knob({
  value,
  min,
  max,
  step = 1,
  label,
  unit = '',
  onChange,
  logarithmic = false,
  modulatedValue,
  isModulated = false,
}: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Convert between linear and logarithmic scales
  const toLinear = useCallback(
    (val: number) => {
      if (!logarithmic) return val;
      return Math.log(val / min) / Math.log(max / min);
    },
    [logarithmic, min, max]
  );

  const fromLinear = useCallback(
    (linear: number) => {
      if (!logarithmic) return linear;
      return min * Math.pow(max / min, linear);
    },
    [logarithmic, min, max]
  );

  // Calculate rotation from value (0-270 degrees)
  const normalizedValue = (toLinear(value) - (logarithmic ? 0 : min)) / (logarithmic ? 1 : max - min);
  const rotation = normalizedValue * 270 - 135;

  // Calculate modulation indicator rotation
  const clampedModValue = modulatedValue !== undefined
    ? Math.max(min, Math.min(max, modulatedValue))
    : value;
  const normalizedModValue = (toLinear(clampedModValue) - (logarithmic ? 0 : min)) / (logarithmic ? 1 : max - min);
  const modRotation = normalizedModValue * 270 - 135;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent React Flow from capturing the event
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
    },
    [value]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY.current - e.clientY;
      const range = logarithmic ? 1 : max - min;
      const sensitivity = range / 150; // 150 pixels for full range

      let newValue: number;
      if (logarithmic) {
        const linearStart = toLinear(dragStartValue.current);
        const newLinear = Math.max(0, Math.min(1, linearStart + deltaY * sensitivity));
        newValue = fromLinear(newLinear);
      } else {
        newValue = dragStartValue.current + deltaY * sensitivity;
      }

      // Apply step and clamp
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, step, onChange, logarithmic, toLinear, fromLinear]);

  // Format display value
  const displayValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(step < 1 ? 2 : 0);

  // Handle double-click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(value.toString());
    setIsEditing(true);
    // Focus input after render
    setTimeout(() => inputRef.current?.select(), 0);
  }, [value]);

  // Handle input submission
  const handleInputSubmit = useCallback(() => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      const stepped = Math.round(clamped / step) * step;
      onChange(stepped);
    }
    setIsEditing(false);
  }, [editValue, min, max, step, onChange]);

  // Handle input key events
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleInputSubmit]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400 uppercase">{label}</span>
      <div
        ref={knobRef}
        className={`nodrag w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 cursor-pointer select-none relative ${
          isDragging ? 'border-cyan-400' : 'hover:border-gray-500'
        }`}
        onMouseDown={handleMouseDown}
        style={{ touchAction: 'none' }}
      >
        {/* Modulation arc (shows when modulated) */}
        {isModulated && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 40 40"
          >
            {/* Modulation indicator dot */}
            <circle
              cx="20"
              cy="20"
              r="14"
              fill="none"
              stroke="transparent"
            />
            <circle
              cx={20 + 14 * Math.sin((modRotation * Math.PI) / 180)}
              cy={20 - 14 * Math.cos((modRotation * Math.PI) / 180)}
              r="3"
              fill="#22d3ee"
              opacity="0.8"
            />
            {/* Arc from base value to modulated value */}
            <path
              d={describeArc(20, 20, 17, rotation, modRotation)}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              opacity="0.4"
              strokeLinecap="round"
            />
          </svg>
        )}
        {/* Base indicator line (user's setting) */}
        <div
          className={`absolute w-0.5 h-3 left-1/2 top-1 -translate-x-1/2 origin-bottom rounded ${
            isModulated ? 'bg-white' : 'bg-cyan-400'
          }`}
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: 'center 16px' }}
        />
      </div>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleInputSubmit}
          onKeyDown={handleInputKeyDown}
          className="nodrag w-12 text-[10px] text-center bg-gray-700 text-white border border-cyan-400 rounded px-1 outline-none"
          autoFocus
        />
      ) : (
        <span
          className="text-[10px] text-gray-300 cursor-text hover:text-cyan-300"
          onDoubleClick={handleDoubleClick}
          title="Double-click to edit"
        >
          {displayValue}
          {unit}
        </span>
      )}
    </div>
  );
}
