
import React from 'react';
import { ParameterControl, ToggleLinkControl } from '../ui/Shared';
import { Grid3x3 } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetDropdown } from '../ui/PresetDropdown';
import { CA_PRESETS } from '../../constants';

interface Props {
  params: SimulationParams;
  onChange: (key: keyof SimulationParams, value: any) => void;
  compact?: boolean;
  disabled?: boolean;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
}

export const CAControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
  const safeBirth = Array.isArray(params.golBirth) ? params.golBirth : [3];
  const safeSurvive = Array.isArray(params.golSurvive) ? params.golSurvive : [2, 3];

  const toggleRule = (type: 'birth' | 'survive', num: number) => {
    const arr = type === 'birth' ? [...safeBirth] : [...safeSurvive];
    let newArr;
    if (arr.includes(num)) {
      newArr = arr.filter(n => n !== num);
    } else {
      newArr = [...arr, num].sort();
    }
    onChange(type === 'birth' ? 'golBirth' : 'golSurvive', newArr);
  };

  const getLinkStatus = (key: string) => {
    if (!activeLinkModuleId) return 'idle';
    if (linkedParams?.includes(key)) return 'selected';
    return 'selectable';
  };

  const Content = (
    <div className="space-y-4">
      {!compact && (
        <div className="border-b border-zinc-800 pb-2">
          <ToggleLinkControl
            label="Classic Automata (GoL)"
            icon={Grid3x3}
            checked={params.useGoL}
            onChange={(v: boolean) => onChange('useGoL', v)}
            automatedValue={automatedParams?.['useGoL'] !== undefined ? (automatedParams['useGoL'] > 0) : undefined}
            onLink={() => onChange('useGoL', 'LINK')}
            linkStatus={getLinkStatus('useGoL')}
            iconColorClass="text-indigo-400"
          />
        </div>
      )}

      <div className={`space-y-4 ${disabled || (!params.useGoL && !compact) ? 'opacity-70' : ''}`}>

        {/* Preset Dropdown */}
        <PresetDropdown
          presets={CA_PRESETS.map(p => ({
            name: p.name,
            desc: p.desc,
            params: { golBirth: p.b, golSurvive: p.s }
          }))}
          onSelect={(p) => {
            onChange('useGoL', true);
            onChange('golBirth', p.golBirth);
            onChange('golSurvive', p.golSurvive);
          }}
          label="Automata Rule Presets..."
        />

        {/* Manual Controls */}
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-500 flex justify-between">
            <span>Birth (B)</span>
            <span className="font-mono text-zinc-300">[{safeBirth.join('')}]</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                onClick={() => toggleRule('birth', n)}
                className={`w-6 h-6 rounded text-[9px] font-bold border transition-colors ${safeBirth.includes(n) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
              >{n}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] text-zinc-500 flex justify-between">
            <span>Survival (S)</span>
            <span className="font-mono text-zinc-300">[{safeSurvive.join('')}]</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                onClick={() => toggleRule('survive', n)}
                className={`w-6 h-6 rounded text-[9px] font-bold border transition-colors ${safeSurvive.includes(n) ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
              >{n}</button>
            ))}
          </div>
        </div>

        <ParameterControl
          label="Influence"
          value={params.golInfluence ?? (params as any).golBlend ?? 0.8} min={0} max={1.0} step={0.05}
          onChange={(v: number) => {
            onChange('golInfluence', v);
            onChange('golBlend' as any, v);
          }}
          linkStatus={getLinkStatus('golInfluence')} onLink={() => onChange('golInfluence', 'LINK')}
          automatedValue={automatedParams?.['golInfluence']}
        />
      </div>
    </div>
  );

  return Content;
};
