import React from 'react';
import { ParameterControl } from '../../ui/Shared';
import { Activity, Waves, Zap, Box } from 'lucide-react';
import { AutomationModule } from '../../../types';

interface LFOControlsProps {
  module: AutomationModule;
  onUpdate: (updates: Partial<AutomationModule>) => void;
}

export const LFOControls: React.FC<LFOControlsProps> = ({ module, onUpdate }) => {
  const lfo = module.lfo || {
    shape: 'sine',
    width: 0.5,
    phase: 0,
    smoothness: 0.5,
  };

  const update = (k: string, v: unknown) => onUpdate({ lfo: { ...lfo, [k]: v } });

  return (
    <div className="space-y-1">
      <div className="flex justify-between bg-zinc-900 p-0.5 rounded-sm border border-zinc-800 mb-2">
        {(['sine', 'triangle', 'square', 'noise'] as const).map(shape => (
          <button 
            key={shape} 
            onClick={() => update('shape', shape)}
            className={`flex-1 h-5 flex items-center justify-center rounded-sm transition-colors ${lfo.shape === shape ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            title={shape}
            aria-label={`${shape} LFO Shape`}
          >
            {shape === 'sine' && <Waves size={12} />}
            {shape === 'triangle' && <Activity size={12} />}
            {shape === 'square' && <Box size={12} />}
            {shape === 'noise' && <Zap size={12} />}
          </button>
        ))}
      </div>

      {lfo.shape === 'noise' && (
        <div className="mb-2">
          <ParameterControl
            label="Smoothness"
            value={lfo.smoothness ?? 0.5}
            min={0}
            max={1}
            step={0.01}
            onChange={(v: number) => update('smoothness', v)}
          />
        </div>
      )}
      {lfo.shape === 'square' && (
        <div className="mb-2">
          <ParameterControl
            label="Pulse Width"
            value={lfo.width ?? 0.5}
            min={0.05}
            max={0.95}
            step={0.01}
            onChange={(v: number) => update('width', v)}
          />
        </div>
      )}

      <div className="flex gap-1 min-w-0 w-full">
        <div className="flex-1 min-w-0">
          <ParameterControl label="Freq Mult" value={module.frequency} min={0.1} max={10} step={0.1} onChange={(v: number) => onUpdate({ frequency: v })} />
        </div>
        <div className="flex-1 min-w-0">
          <ParameterControl label="Phase" value={lfo.phase} min={0} max={Math.PI * 2} step={0.1} onChange={(v: number) => update('phase', v)} />
        </div>
      </div>
    </div>
  );
};
