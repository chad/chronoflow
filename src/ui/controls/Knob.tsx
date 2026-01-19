import { useCallback, useRef, useState, useEffect } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  logarithmic?: boolean;
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
}: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
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
  const rotation = ((toLinear(value) - (logarithmic ? 0 : min)) / (logarithmic ? 1 : max - min)) * 270 - 135;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
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

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400 uppercase">{label}</span>
      <div
        ref={knobRef}
        className={`w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 cursor-pointer select-none relative ${
          isDragging ? 'border-cyan-400' : 'hover:border-gray-500'
        }`}
        onMouseDown={handleMouseDown}
        style={{ touchAction: 'none' }}
      >
        {/* Indicator line */}
        <div
          className="absolute w-0.5 h-3 bg-cyan-400 left-1/2 top-1 -translate-x-1/2 origin-bottom rounded"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: 'center 16px' }}
        />
      </div>
      <span className="text-[10px] text-gray-300">
        {displayValue}
        {unit}
      </span>
    </div>
  );
}
