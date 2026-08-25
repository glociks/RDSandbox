
import React from 'react';
import { Label, ParameterControl, ToggleLinkControl } from '../ui/Shared';
import { Snowflake } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetBar } from '../ui/PresetBar';
import { FRACTAL_PRESETS, DEFAULT_PARAMS } from '../../constants';

interface Props {
  params: SimulationParams;
  onChange: (key: keyof SimulationParams, value: any) => void;
  compact?: boolean;
  disabled?: boolean;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
}

export const FractalControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
  const toggleRule = (type: 'birth' | 'survive', num: number) => {
    const arr = type === 'birth' ? [...params.fractalBirth] : [...params.fractalSurvive];
    let newArr;
    if (arr.includes(num)) {
      newArr = arr.filter(n => n !== num);
    } else {
      newArr = [...arr, num].sort();
    }
    onChange(type === 'birth' ? 'fractalBirth' : 'fractalSurvive', newArr);
  };

  const handleApplyPreset = (p: any) => {
    Object.entries(p).forEach(([k, v]) => onChange(k as keyof SimulationParams, v));
  };

  const getLinkStatus = (key: string) => {
    if (!activeLinkModuleId) return 'idle';
    if (linkedParams?.includes(key)) return 'selected';
    return 'selectable';
  };

  const Content = (
    <div className="space-y-2">
      {!compact && (
        <div className="border-b border-zinc-800 pb-2 mb-2">
          <ToggleLinkControl
            label="Fractal Automata"
            icon={Snowflake}
            checked={params.useFractal}
            onChange={(v: boolean) => onChange('useFractal', v)}
            automatedValue={automatedParams?.['useFractal'] !== undefined ? (automatedParams['useFractal'] > 0) : undefined}
            onLink={() => onChange('useFractal', 'LINK')}
            linkStatus={getLinkStatus('useFractal')}
            iconColorClass="text-orange-400"
          />
        </div>
      )}

      <div className="">
        <PresetBar
          modeKey="fractal"
          defaultPresets={FRACTAL_PRESETS}
          currentParams={params}
          onApply={handleApplyPreset}
          filterKeys={['fractalDepth', 'fractalBlockSize', 'fractalBirth', 'fractalSurvive', 'fractalInfluence', 'fractalThreshold']}
        />

        <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

          <ParameterControl
            label="1. Fractal Depth"
            value={params.fractalDepth} min={1} max={4} step={1}
            onChange={(v: number) => onChange('fractalDepth', v)}
            highlight
            linkStatus={getLinkStatus('fractalDepth')} onLink={() => onChange('fractalDepth', 'LINK')}
            automatedValue={automatedParams?.['fractalDepth']}
            defaultValue={DEFAULT_PARAMS.fractalDepth}
          />
          <ParameterControl
            label="2. Block Scale"
            value={params.fractalBlockSize} min={2} max={8} step={1}
            onChange={(v: number) => onChange('fractalBlockSize', v)}
            linkStatus={getLinkStatus('fractalBlockSize')} onLink={() => onChange('fractalBlockSize', 'LINK')}
            automatedValue={automatedParams?.['fractalBlockSize']}
            defaultValue={DEFAULT_PARAMS.fractalBlockSize}
          />
          <ParameterControl
            label="Influence"
            value={params.fractalInfluence ?? 0.4} min={0} max={1.0} step={0.05}
            onChange={(v: number) => onChange('fractalInfluence', v)}
            linkStatus={getLinkStatus('fractalInfluence')} onLink={() => onChange('fractalInfluence', 'LINK')}
            automatedValue={automatedParams?.['fractalInfluence']}
            defaultValue={DEFAULT_PARAMS.fractalInfluence}
          />
          <ParameterControl
            label="4. Density Threshold"
            value={params.fractalThreshold} min={0.1} max={1.0} step={0.05}
            onChange={(v: number) => onChange('fractalThreshold', v)}
            linkStatus={getLinkStatus('fractalThreshold')} onLink={() => onChange('fractalThreshold', 'LINK')}
            automatedValue={automatedParams?.['fractalThreshold']}
            defaultValue={DEFAULT_PARAMS.fractalThreshold}
          />

          <div className="space-y-1">
            <Label>5. Macro-Rules</Label>
            <div className="space-y-2 pl-1">
              <div className="space-y-1">
                <div className="text-[8px] text-zinc-500 flex justify-between">
                  <span>Birth (B)</span>
                  <span className="font-mono text-orange-300">[{params.fractalBirth.join('')}]</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => toggleRule('birth', n)}
                      className={`w-4 h-4 rounded text-[8px] font-bold border ${params.fractalBirth.includes(n) ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] text-zinc-500 flex justify-between">
                  <span>Survival (S)</span>
                  <span className="font-mono text-orange-300">[{params.fractalSurvive.join('')}]</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => toggleRule('survive', n)}
                      className={`w-4 h-4 rounded text-[8px] font-bold border ${params.fractalSurvive.includes(n) ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return Content;
};
