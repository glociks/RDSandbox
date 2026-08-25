import React from 'react';
import { ParameterControl, Label } from '../../ui/Shared';
import { AutomationModule } from '../../../types';

interface ADSRControlsProps {
  module: AutomationModule;
  onUpdate: (updates: Partial<AutomationModule>) => void;
  modulesList: AutomationModule[];
}

export const ADSRControls: React.FC<ADSRControlsProps> = ({ module, onUpdate, modulesList }) => {
  const adsr = module.adsr || {
    inputSourceId: '',
    threshold: 0.5,
    attack: 10,
    decay: 20,
    sustain: 0.5,
    release: 30,
    triggerState: false,
    triggerTime: 0,
    releaseTime: 0,
    lastValue: 0,
  };

  const update = (k: string, v: unknown) => onUpdate({ adsr: { ...adsr, [k]: v } });
  const sources = modulesList.filter((m) => m.id !== module.id);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={`adsr-trigger-${module.id}`}>Trigger Source</Label>
        <select 
          id={`adsr-trigger-${module.id}`}
          name={`adsr-trigger-${module.id}`}
          className="w-full bg-zinc-950 border border-zinc-800 text-[10px] p-1 rounded-sm text-zinc-300"
          value={adsr.inputSourceId}
          onChange={(e) => update('inputSourceId', e.target.value)}
          aria-label="ADSR Trigger Source"
        >
          <option value="">(None - Manual)</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Sensitivity"
          value={adsr.threshold ?? 0.5}
          min={0}
          max={1}
          step={0.01}
          onChange={(v: number) => update('threshold', v)}
        />
        <div className="flex items-end justify-end pb-1">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${adsr.triggerState ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
            {adsr.triggerState ? 'TRIGGERED' : 'IDLE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 pt-1">
        <div className="space-y-1">
          <div className="h-16 w-full bg-zinc-950 rounded-sm relative border border-zinc-800 flex items-end">
            <div className="w-full bg-indigo-500/50" style={{ height: `${adsr.attack}%` }} />
          </div>
          <ParameterControl label="A" value={adsr.attack} min={0} max={100} step={1} onChange={(v: number) => update('attack', v)} />
        </div>

        <div className="space-y-1">
          <div className="h-16 w-full bg-zinc-950 rounded-sm relative border border-zinc-800 flex items-end">
            <div className="w-full bg-indigo-500/50" style={{ height: `${adsr.decay}%` }} />
          </div>
          <ParameterControl label="D" value={adsr.decay} min={0} max={100} step={1} onChange={(v: number) => update('decay', v)} />
        </div>

        <div className="space-y-1">
          <div className="h-16 w-full bg-zinc-950 rounded-sm relative border border-zinc-800 flex items-end">
            <div className="w-full bg-indigo-500/50" style={{ height: `${adsr.sustain * 100}%` }} />
          </div>
          <ParameterControl label="S" value={adsr.sustain} min={0} max={1} step={0.01} onChange={(v: number) => update('sustain', v)} />
        </div>

        <div className="space-y-1">
          <div className="h-16 w-full bg-zinc-950 rounded-sm relative border border-zinc-800 flex items-end">
            <div className="w-full bg-indigo-500/50" style={{ height: `${adsr.release}%` }} />
          </div>
          <ParameterControl label="R" value={adsr.release} min={0} max={100} step={1} onChange={(v: number) => update('release', v)} />
        </div>
      </div>
    </div>
  );
};
