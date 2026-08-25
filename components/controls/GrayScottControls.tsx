import React from 'react';
import { ParameterControl, ToggleLinkControl, Switch, Label } from '../ui/Shared';
import { FlaskConical, ShieldCheck } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetBar } from '../ui/PresetBar';
import { GRAY_SCOTT_PRESETS } from '../../constants';

interface Props {
  params: SimulationParams;
  onChange: (key: keyof SimulationParams, value: any) => void;
  compact?: boolean;
  disabled?: boolean;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
}

export const GrayScottControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
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
                label="Gray-Scott Model"
                icon={FlaskConical}
                checked={params.useGrayScott}
                onChange={(v: boolean) => onChange('useGrayScott', v)}
                automatedValue={automatedParams?.['useGrayScott'] !== undefined ? (automatedParams['useGrayScott'] > 0) : undefined}
                onLink={() => onChange('useGrayScott', 'LINK')}
                linkStatus={getLinkStatus('useGrayScott')}
                iconColorClass="text-lime-400"
            />
         </div>
       )}
       
       <div>
         <PresetBar 
            modeKey="grayscott" 
            defaultPresets={GRAY_SCOTT_PRESETS}
            currentParams={params}
            onApply={handleApplyPreset}
            filterKeys={['gsFeed','gsKill','gsDa','gsDb','gsTimeScale','gsClamp']}
         />
         <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            
            <ParameterControl 
               label="Influence" 
               value={params.gsInfluence ?? 1.0} min={0} max={1.0} step={0.05} 
               onChange={(v: number) => onChange('gsInfluence', v)} 
               linkStatus={getLinkStatus('gsInfluence')} onLink={() => onChange('gsInfluence', 'LINK')}
               automatedValue={automatedParams?.['gsInfluence']}
            />

            <div className="flex justify-between items-center bg-zinc-800/50 p-2 rounded-sm border border-zinc-800" title="Prevents infinite values / blowout for Gray Scott mode specifically">
               <Label className="flex items-center gap-2">
                  <ShieldCheck size={12} className={params.gsClamp ? "text-emerald-400" : "text-zinc-500"}/>
                  GS Clamp
               </Label>
               <Switch checked={params.gsClamp} onCheckedChange={(v: boolean) => onChange('gsClamp', v)} />
            </div>

            <ParameterControl 
               label="Time Scale" 
               value={params.gsTimeScale ?? 1.0} min={0.1} max={5.0} step={0.1} 
               onChange={(v: number) => onChange('gsTimeScale', v)} 
               linkStatus={getLinkStatus('gsTimeScale')} onLink={() => onChange('gsTimeScale', 'LINK')}
               automatedValue={automatedParams?.['gsTimeScale']}
            />
            
            <ParameterControl 
               label="Feed Rate (f)" 
               value={params.gsFeed} min={0.001} max={0.100} step={0.001} 
               onChange={(v: number) => onChange('gsFeed', v)} 
               highlight
               linkStatus={getLinkStatus('gsFeed')} onLink={() => onChange('gsFeed', 'LINK')}
               automatedValue={automatedParams?.['gsFeed']}
            />
            <ParameterControl 
               label="Kill Rate (k)" 
               value={params.gsKill} min={0.030} max={0.070} step={0.0001} 
               onChange={(v: number) => onChange('gsKill', v)} 
               linkStatus={getLinkStatus('gsKill')} onLink={() => onChange('gsKill', 'LINK')}
               automatedValue={automatedParams?.['gsKill']}
            />
            
            <div className="flex gap-2">
               <div className="flex-1">
                  <ParameterControl 
                     label="Diff A (Da)" 
                     value={params.gsDa} min={0.1} max={1.5} step={0.05} 
                     onChange={(v: number) => onChange('gsDa', v)} 
                     linkStatus={getLinkStatus('gsDa')} onLink={() => onChange('gsDa', 'LINK')}
                     automatedValue={automatedParams?.['gsDa']}
                  />
               </div>
               <div className="flex-1">
                  <ParameterControl 
                     label="Diff B (Db)" 
                     value={params.gsDb} min={0.1} max={1.5} step={0.05} 
                     onChange={(v: number) => onChange('gsDb', v)} 
                     linkStatus={getLinkStatus('gsDb')} onLink={() => onChange('gsDb', 'LINK')}
                     automatedValue={automatedParams?.['gsDb']}
                  />
               </div>
            </div>
         </div>
       </div>
    </div>
  );

  return Content;
};