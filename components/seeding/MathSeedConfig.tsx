
import React from 'react';
import { Label } from '../ui/Shared';
import { InitialSeedConfig } from '../../types';

interface Props {
   config: InitialSeedConfig;
   onChange: (u: Partial<InitialSeedConfig>) => void;
}

export const MathSeedConfig: React.FC<Props> = ({ config, onChange }) => {
   const templates = [
      { label: 'Checkers', code: '(Math.floor(x/20) + Math.floor(y/20)) % 2 === 0' },
      { label: 'Stripes', code: 'Math.sin(x * 0.1) > 0' },
      { label: 'Sine Wave', code: 'Math.sin(x*0.05 + y*0.05) * 0.5 + 0.5' },
      { label: 'Ring', code: 'Math.abs(Math.sqrt((x-w/2)**2 + (y-h/2)**2) - 50) < 5' },
      { label: 'Gradient', code: 'nx' },
      { label: 'Diagonal', code: 'Math.abs((x - y) % 20) < 2' },
      { label: 'Noise', code: 'Math.random() > 0.8' },
   ];

   return (
      <div className="space-y-3">
         <div className="space-y-1">
            <Label htmlFor="math-expression-input">Expression (Javascript)</Label>
            <textarea
               id="math-expression-input"
               name="math-expression-input"
               aria-label="Expression (Javascript)"
               value={config.mathExpression ?? 'Math.sin(x*0.1)*Math.cos(y*0.1) > 0'}
               onChange={(e: any) => onChange({ mathExpression: e.target.value })}
               className="w-full h-16 font-mono text-[10px] bg-zinc-950 border border-zinc-800 rounded p-1 text-zinc-300 resize-none focus:outline-none focus:border-indigo-500"
               placeholder="Math.sin(x*0.1) > 0"
            />
         </div>

         <div className="space-y-1">
            <Label htmlFor="math-templates-select">Templates</Label>
            <select
               id="math-templates-select"
               name="math-templates-select"
               aria-label="Templates"
               className="w-full bg-zinc-950 border border-zinc-800 text-[10px] p-1 rounded text-zinc-300"
               onChange={(e) => onChange({ mathExpression: e.target.value })}
               value=""
            >
               <option value="" disabled>Load Template...</option>
               {templates.map(t => (
                  <option key={t.label} value={t.code}>{t.label}</option>
               ))}
            </select>
         </div>

         <div className="text-[9px] text-zinc-500 bg-zinc-800/30 p-2 rounded">
            <p className="mb-1 font-bold text-zinc-400">Available Variables:</p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-zinc-500">
               <li>x, y : Pixel Coords</li>
               <li>nx, ny : 0-1 Coords</li>
               <li>w, h : Grid Dimensions</li>
               <li>Math : JS Math Lib</li>
            </ul>
            <p className="mt-1 text-emerald-500">Return <span className="font-mono">boolean</span> for threshold or <span className="font-mono">number (0-1)</span> for smooth gradient.</p>
         </div>
      </div>
   );
};
