import React from 'react';
import { CA_PRESETS } from '../../constants';

interface CAPresetsProps {
  onSelect: (preset: typeof CA_PRESETS[0]) => void;
  activeName?: string;
}

export const CAPresets: React.FC<CAPresetsProps> = ({ onSelect, activeName }) => {
  return (
    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
      {CA_PRESETS.map(p => (
        <button
          key={p.name}
          onClick={() => onSelect(p)}
          className={`
            text-left px-2 py-1.5 rounded border text-[9px] flex flex-col transition-all
            ${activeName === p.name 
              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
            }
          `}
        >
          <span className="font-bold truncate w-full">{p.name}</span>
          <span className="text-[8px] opacity-60 truncate w-full">{p.desc}</span>
          <div className="flex gap-2 mt-1 opacity-50 font-mono text-[7px]">
             <span>B:{p.b.join('')}</span>
             <span>S:{p.s.join('')}</span>
          </div>
        </button>
      ))}
    </div>
  );
};