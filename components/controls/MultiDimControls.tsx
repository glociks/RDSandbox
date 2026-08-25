import React from 'react';
import { ParameterControl, ToggleLinkControl } from '../ui/Shared';
import { Cuboid } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetBar } from '../ui/PresetBar';
import { MULTIDIM_PRESETS } from '../../constants';

interface Props {
   params: SimulationParams;
   onChange: (key: keyof SimulationParams, value: any) => void;
   compact?: boolean;
   disabled?: boolean;
   activeLinkModuleId?: string | null;
   linkedParams?: string[];
   automatedParams?: Record<string, number>;
}

export const MultiDimControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
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
                  label="Hyper-Dimensionality"
                  icon={Cuboid}
                  checked={params.useMultiDim}
                  onChange={(v: boolean) => onChange('useMultiDim', v)}
                  automatedValue={automatedParams?.['useMultiDim'] !== undefined ? (automatedParams['useMultiDim'] > 0) : undefined}
                  onLink={() => onChange('useMultiDim', 'LINK')}
                  linkStatus={getLinkStatus('useMultiDim')}
                  iconColorClass="text-fuchsia-400"
               />
            </div>
         )}

         <div>
            <PresetBar
               modeKey="multidim"
               defaultPresets={MULTIDIM_PRESETS}
               currentParams={params}
               onApply={handleApplyPreset}
               filterKeys={['coupling', 'Dw', 'multiDimZoom', 'multiDimCrossDiff']}
            />
            <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

               <ParameterControl
                  label="Influence"
                  value={params.multiDimInfluence ?? 1.0} min={0} max={1.0} step={0.05}
                  onChange={(v: number) => onChange('multiDimInfluence', v)}
                  linkStatus={getLinkStatus('multiDimInfluence')} onLink={() => onChange('multiDimInfluence', 'LINK')}
                  automatedValue={automatedParams?.['multiDimInfluence']}
               />

               <ParameterControl
                  label="Coupling (Mix)"
                  value={params.coupling} min={0} max={0.3} step={0.001}
                  onChange={(v: number) => onChange('coupling', v)}
                  highlight
                  linkStatus={getLinkStatus('coupling')} onLink={() => onChange('coupling', 'LINK')}
                  automatedValue={automatedParams?.['coupling']}
               />

               <ParameterControl
                  label="W Diffusion (Dw)"
                  value={params.Dw} min={0} max={2.0} step={0.01}
                  onChange={(v: number) => onChange('Dw', v)}
                  linkStatus={getLinkStatus('Dw')} onLink={() => onChange('Dw', 'LINK')}
                  automatedValue={automatedParams?.['Dw']}
               />

               <ParameterControl
                  label="Zoom / Scale"
                  value={params.multiDimZoom ?? 1.0} min={0.1} max={3.0} step={0.1}
                  onChange={(v: number) => onChange('multiDimZoom', v)}
                  linkStatus={getLinkStatus('multiDimZoom')} onLink={() => onChange('multiDimZoom', 'LINK')}
                  automatedValue={automatedParams?.['multiDimZoom']}
               />

               <ParameterControl
                  label="Cross Diffusion"
                  value={params.multiDimCrossDiff ?? 0} min={0} max={0.5} step={0.01}
                  onChange={(v: number) => onChange('multiDimCrossDiff', v)}
                  linkStatus={getLinkStatus('multiDimCrossDiff')} onLink={() => onChange('multiDimCrossDiff', 'LINK')}
                  automatedValue={automatedParams?.['multiDimCrossDiff']}
               />
            </div>
         </div>
      </div>
   );

   return Content;
};