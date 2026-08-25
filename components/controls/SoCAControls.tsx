
import React from 'react';
import { Label, ParameterControl, ToggleLinkControl, Switch } from '../ui/Shared';
import { Activity } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetBar } from '../ui/PresetBar';
import { SOCA_PRESETS } from '../../constants';

interface Props {
   params: SimulationParams;
   onChange: (key: keyof SimulationParams, value: any) => void;
   compact?: boolean;
   disabled?: boolean;
   activeLinkModuleId?: string | null;
   linkedParams?: string[];
   automatedParams?: Record<string, number>;
}

export const SoCAControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
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
                  label="2nd Order Automata"
                  icon={Activity}
                  checked={params.useSoCA}
                  onChange={(v: boolean) => onChange('useSoCA', v)}
                  automatedValue={automatedParams?.['useSoCA'] !== undefined ? (automatedParams['useSoCA'] > 0) : undefined}
                  onLink={() => onChange('useSoCA', 'LINK')}
                  linkStatus={getLinkStatus('useSoCA')}
                  iconColorClass="text-pink-400"
               />
            </div>
         )}

         <div>
            <PresetBar
               modeKey="soca"
               defaultPresets={SOCA_PRESETS}
               currentParams={params}
               onApply={handleApplyPreset}
               filterKeys={['socaDamping', 'socaSpring', 'socaDtScale', 'socaSmoothness', 'socaSmoothnessEnabled', 'socaReactionMix']}
            />
            <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

               <ParameterControl
                  label="1. Inertia (Damping)"
                  value={params.socaDamping} min={0.5} max={0.999} step={0.001}
                  onChange={(v: number) => onChange('socaDamping', v)}
                  highlight
                  linkStatus={getLinkStatus('socaDamping')} onLink={() => onChange('socaDamping', 'LINK')}
                  automatedValue={automatedParams?.['socaDamping']}
               />
               <ParameterControl
                  label="2. Spring Stiffness"
                  value={params.socaSpring} min={0} max={0.2} step={0.001}
                  onChange={(v: number) => onChange('socaSpring', v)}
                  linkStatus={getLinkStatus('socaSpring')} onLink={() => onChange('socaSpring', 'LINK')}
                  automatedValue={automatedParams?.['socaSpring']}
               />
               <ParameterControl
                  label="3. Time Acceleration"
                  value={params.socaDtScale} min={0.1} max={5.0} step={0.1}
                  onChange={(v: number) => onChange('socaDtScale', v)}
                  linkStatus={getLinkStatus('socaDtScale')} onLink={() => onChange('socaDtScale', 'LINK')}
                  automatedValue={automatedParams?.['socaDtScale']}
               />

               <div className="p-1 border border-zinc-800 rounded-sm bg-zinc-900/50">
                  <div className="flex justify-between items-center mb-1 px-1">
                     <Label className="text-zinc-400 cursor-pointer" onClick={() => onChange('socaSmoothnessEnabled', !params.socaSmoothnessEnabled)}>4. Spatial Smoothness</Label>
                     <Switch checked={params.socaSmoothnessEnabled} onCheckedChange={(v: boolean) => onChange('socaSmoothnessEnabled', v)} />
                  </div>
                  <div className={params.socaSmoothnessEnabled ? "" : "opacity-30 pointer-events-none"}>
                     <ParameterControl
                        label="Amount"
                        value={params.socaSmoothness} min={0} max={1.0} step={0.05}
                        onChange={(v: number) => onChange('socaSmoothness', v)}
                        linkStatus={getLinkStatus('socaSmoothness')} onLink={() => onChange('socaSmoothness', 'LINK')}
                        automatedValue={automatedParams?.['socaSmoothness']}
                     />
                  </div>
               </div>

               <ParameterControl
                  label="Influence"
                  value={params.socaReactionMix} min={0} max={2.0} step={0.1}
                  onChange={(v: number) => onChange('socaReactionMix', v)}
                  linkStatus={getLinkStatus('socaReactionMix')} onLink={() => onChange('socaReactionMix', 'LINK')}
                  automatedValue={automatedParams?.['socaReactionMix']}
               />
            </div>
         </div>
      </div>
   );

   return Content;
};
