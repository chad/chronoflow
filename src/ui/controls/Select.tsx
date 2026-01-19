interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  label: string;
  onChange: (value: string) => void;
}

export function Select({ value, options, label, onChange }: SelectProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-400 uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nodrag bg-gray-800 border border-gray-600 text-gray-200 text-xs rounded px-2 py-1 cursor-pointer hover:border-gray-500 focus:border-cyan-400 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
