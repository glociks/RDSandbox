
import React from 'react';
import { Card, Label, ParameterControl, ToggleLinkControl } from '../ui/Shared';
import { ArrowDown } from 'lucide-react';
import { SimulationParams } from '../../types';

interface Props {
  params: SimulationParams;
  onChange: (key: keyof SimulationParams, value: any) => void;
  compact?: boolean;
  disabled?: boolean;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
}

export const GravityControls: React.FC<Props> = ({ params, onChange, compact = false, disabled = false, activeLinkModuleId, linkedParams, automatedParams }) => {
  
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
                label="Gravity (Inertial)"
                icon={ArrowDown}
                checked={params.useGravity}
                onChange={(v: boolean) => onChange('useGravity', v)}
                automatedValue={automatedParams?.['useGravity'] !== undefined ? (automatedParams['useGravity'] > 0) : undefined}
                onLink={() => onChange('useGravity', 'LINK')}
                linkStatus={getLinkStatus('useGravity')}
                iconColorClass="text-purple-400"
            />
         </div>
       )}
       
       <div>
         <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            
            <ParameterControl 
               label="Force Strength" 
               value={params.gravityStrength} min={0} max={2.0} step={0.01} 
               onChange={(v: number) => onChange('gravityStrength', v)} 
               linkStatus={getLinkStatus('gravityStrength')} onLink={() => onChange('gravityStrength', 'LINK')}
               automatedValue={automatedParams?.['gravityStrength']}
            />
            
            <ParameterControl 
               label="Angle (Rad)" 
               value={params.gravityAngle} min={0} max={Math.PI * 2} step={0.1} 
               onChange={(v: number) => onChange('gravityAngle', v)} 
               linkStatus={getLinkStatus('gravityAngle')} onLink={() => onChange('gravityAngle', 'LINK')}
               automatedValue={automatedParams?.['gravityAngle']}
            />

            <ParameterControl 
               label="Friction / Decay" 
               value={params.gravityFriction ?? 0.9} min={0.5} max={0.999} step={0.001} 
               onChange={(v: number) => onChange('gravityFriction', v)} 
               linkStatus={getLinkStatus('gravityFriction')} onLink={() => onChange('gravityFriction', 'LINK')}
               automatedValue={automatedParams?.['gravityFriction']}
            />

            <ParameterControl 
               label="Mass Threshold" 
               value={params.gravityMassThreshold ?? 2.0} min={0} max={10.0} step={0.1} 
               onChange={(v: number) => onChange('gravityMassThreshold', v)} 
               linkStatus={getLinkStatus('gravityMassThreshold')} onLink={() => onChange('gravityMassThreshold', 'LINK')}
               automatedValue={automatedParams?.['gravityMassThreshold']}
            />
         </div>
       </div>
    </div>
  );

  return Content;
};
