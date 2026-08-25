import React from 'react';
import { Label, ParameterControl, ToggleLinkControl, Input } from '../ui/Shared';
import { Wind } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetBar } from '../ui/PresetBar';
import { LGA_PRESETS } from '../../constants';

interface Props {
   params: SimulationParams;
   onChange: (key: keyof SimulationParams, value: any) => void;
   compact?: boolean;
   disabled?: boolean;
   activeLinkModuleId?: string | null;
   linkedParams?: string[];
   automatedParams?: Record<string, number>;
}

export const LGAControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
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
                  label="Lattice Gas (Fluid)"
                  icon={Wind}
                  checked={params.useLGA}
                  onChange={(v: boolean) => onChange('useLGA', v)}
                  automatedValue={automatedParams?.['useLGA'] !== undefined ? (automatedParams['useLGA'] > 0) : undefined}
                  onLink={() => onChange('useLGA', 'LINK')}
                  linkStatus={getLinkStatus('useLGA')}
                  iconColorClass="text-cyan-400"
               />
            </div>
         )}

         <div>
            <PresetBar
               modeKey="lga"
               defaultPresets={LGA_PRESETS}
               currentParams={params}
               onApply={handleApplyPreset}
               filterKeys={['lgaProbability', 'lgaAdvection', 'lgaViscosity', 'lgaBarrier', 'lgaNoise']}
            />
            <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

               <ParameterControl
                  label="Influence"
                  value={params.lgaInfluence ?? 1.0} min={0} max={1.0} step={0.05}
                  onChange={(v: number) => onChange('lgaInfluence', v)}
                  linkStatus={getLinkStatus('lgaInfluence')} onLink={() => onChange('lgaInfluence', 'LINK')}
                  automatedValue={automatedParams?.['lgaInfluence']}
               />

               <ParameterControl
                  label="Advection Speed"
                  value={params.lgaAdvection} min={0} max={5.0} step={0.1}
                  onChange={(v: number) => onChange('lgaAdvection', v)}
                  linkStatus={getLinkStatus('lgaAdvection')} onLink={() => onChange('lgaAdvection', 'LINK')}
                  automatedValue={automatedParams?.['lgaAdvection']}
               />

               <ParameterControl
                  label="Vertical Bias"
                  value={params.lgaVerticalFactor !== undefined ? params.lgaVerticalFactor : 1.0} min={0} max={5.0} step={0.1}
                  onChange={(v: number) => onChange('lgaVerticalFactor', v)}
                  linkStatus={getLinkStatus('lgaVerticalFactor')} onLink={() => onChange('lgaVerticalFactor', 'LINK')}
                  automatedValue={automatedParams?.['lgaVerticalFactor']}
               />

               <ParameterControl
                  label="Collision Prob."
                  value={params.lgaProbability} min={0} max={1.0} step={0.01}
                  onChange={(v: number) => onChange('lgaProbability', v)}
                  highlight
                  linkStatus={getLinkStatus('lgaProbability')} onLink={() => onChange('lgaProbability', 'LINK')}
                  automatedValue={automatedParams?.['lgaProbability']}
               />

               <div className="flex gap-1.5 min-w-0 w-full">
                  <div className="flex-1 min-w-0">
                     <ParameterControl
                        label="Flow X"
                        value={params.lgaFlowX || 0} min={-3} max={3} step={0.1}
                        onChange={(v: number) => onChange('lgaFlowX', v)}
                        linkStatus={getLinkStatus('lgaFlowX')} onLink={() => onChange('lgaFlowX', 'LINK')}
                        automatedValue={automatedParams?.['lgaFlowX']}
                     />
                  </div>
                  <div className="flex-1 min-w-0">
                     <ParameterControl
                        label="Flow Y"
                        value={params.lgaFlowY || 0} min={-3} max={3} step={0.1}
                        onChange={(v: number) => onChange('lgaFlowY', v)}
                        linkStatus={getLinkStatus('lgaFlowY')} onLink={() => onChange('lgaFlowY', 'LINK')}
                        automatedValue={automatedParams?.['lgaFlowY']}
                     />
                  </div>
               </div>

               <ParameterControl
                  label="Viscosity (Inertia)"
                  value={params.lgaViscosity} min={0} max={1.0} step={0.01}
                  onChange={(v: number) => onChange('lgaViscosity', v)}
                  linkStatus={getLinkStatus('lgaViscosity')} onLink={() => onChange('lgaViscosity', 'LINK')}
                  automatedValue={automatedParams?.['lgaViscosity']}
               />
               <ParameterControl
                  label="Barrier Threshold"
                  value={params.lgaBarrier} min={0} max={20.0} step={0.5}
                  onChange={(v: number) => onChange('lgaBarrier', v)}
                  linkStatus={getLinkStatus('lgaBarrier')} onLink={() => onChange('lgaBarrier', 'LINK')}
                  automatedValue={automatedParams?.['lgaBarrier']}
               />

               <div className="flex items-center justify-between p-1 bg-zinc-800/50 rounded-sm">
                  <Label>Reflector Color</Label>
                  <div className="flex items-center gap-2">
                     <input
                        type="color"
                        id="lga-reflector-color"
                        name="lga-reflector-color"
                        aria-label="Reflector Color"
                        value={params.lgaWallColor || '#ff0000'}
                        onChange={(e) => onChange('lgaWallColor', e.target.value)}
                        className="w-4 h-4 rounded-full overflow-hidden border-none p-0 cursor-pointer"
                     />
                     <Input
                        type="number"
                        id="lga-reflector-tol"
                        name="lga-reflector-tol"
                        aria-label="Reflector Tolerance"
                        value={params.lgaWallTol || 0.2}
                        onChange={(e: any) => onChange('lgaWallTol', parseFloat(e.target.value))}
                        className="w-12 h-4 text-right"
                        step={0.05}
                     />
                  </div>
               </div>
            </div>
         </div>
      </div>
   );

   return Content;
};