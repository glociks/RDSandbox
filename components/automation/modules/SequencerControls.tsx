import React from 'react';
import { ParameterControl } from '../../ui/Shared';
import { AutomationModule } from '../../../types';

interface SequencerControlsProps {
  module: AutomationModule;
  onUpdate: (updates: Partial<AutomationModule>) => void;
}

export const SequencerControls: React.FC<SequencerControlsProps> = ({ module, onUpdate }) => {
  const seq = module.sequencer || {
    steps: [0.2, 0.5, 0.8, 1.0, 0.6, 0.3, 0.1, 0.0],
    count: 8,
    smoothness: 0.1,
  };

  const update = (k: string, v: unknown) => onUpdate({ sequencer: { ...seq, [k]: v } });

  const setStep = (idx: number, val: number) => {
    const newSteps = [...seq.steps];
    newSteps[idx] = Math.max(0, Math.min(1, val));
    update('steps', newSteps);
  };

  return (
    <div className="space-y-2">
      {/* Interactive Grid */}
      <div className="h-16 flex items-end gap-[1px] bg-zinc-950 border border-zinc-800 p-0.5 rounded-sm">
        {seq.steps.slice(0, seq.count).map((val: number, i: number) => (
          <div key={i} className="flex-1 relative group bg-zinc-900 h-full flex items-end cursor-ns-resize">
            <div 
              className="w-full bg-indigo-500/80 group-hover:bg-indigo-400 transition-colors"
              style={{ height: `${val * 100}%` }}
            />
            <input 
              type="range"
              id={`seq-step-${module.id}-${i}`}
              name={`seq-step-${module.id}-${i}`}
              min={0}
              max={1}
              step={0.05}
              value={val} 
              onChange={(e) => setStep(i, parseFloat(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ns-resize"
              title={`Step ${i + 1}: ${val.toFixed(2)}`}
              aria-label={`Sequencer Step ${i + 1}`}
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <div className="flex-1">
          <ParameterControl label="Steps" value={seq.count} min={2} max={32} step={1} onChange={(v: number) => update('count', v)} />
        </div>
        <div className="flex-1">
          <ParameterControl label="Smooth" value={seq.smoothness} min={0} max={1} step={0.01} onChange={(v: number) => update('smoothness', v)} />
        </div>
      </div>
    </div>
  );
};
