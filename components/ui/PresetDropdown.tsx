import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface PresetOption {
  name: string;
  params: Record<string, any>;
  desc?: string;
}

interface Props {
  presets: PresetOption[];
  onSelect: (params: Record<string, any>) => void;
  label?: string;
  className?: string;
}

export const PresetDropdown: React.FC<Props> = ({
  presets,
  onSelect,
  label = "Presets...",
  className = ""
}) => {
  const [selectedName, setSelectedName] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedName(val);
    const found = presets.find(p => p.name === val);
    if (found) {
      onSelect(found.params);
    }
  };

  if (!presets || presets.length === 0) return null;

  const selectId = React.useId();

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="relative w-full">
        <select
          id={selectId}
          name={selectId}
          aria-label={label}
          value={selectedName}
          onChange={handleChange}
          className="w-full bg-zinc-900 text-[10px] text-zinc-200 h-6 pl-2 pr-6 rounded-sm border border-zinc-800 outline-none appearance-none cursor-pointer hover:border-zinc-700 hover:bg-zinc-850 transition-colors focus:border-indigo-500/80"
        >
          <option value="" disabled className="text-zinc-500">
            {label}
          </option>
          {presets.map(p => (
            <option key={p.name} value={p.name} className="bg-zinc-900 text-zinc-200 py-0.5">
              {p.name} {p.desc ? `(${p.desc})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
      </div>
    </div>
  );
};
