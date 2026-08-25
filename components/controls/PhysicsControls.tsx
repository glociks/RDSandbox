
import React from 'react';
import { ToggleLinkControl, ParameterControl } from '../ui/Shared';
import { Atom } from 'lucide-react';
import { SimulationParams } from '../../types';
import { PresetBar } from '../ui/PresetBar';
import { PHYSICS_PRESETS, DEFAULT_PARAMS } from '../../constants';

interface Props {
  params: SimulationParams;
  onChange: (key: keyof SimulationParams, value: any) => void;
  stabilizeConfig?: any;
  autoStabilize?: boolean;
  compact?: boolean;
  disabled?: boolean;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
}

export const PhysicsControls: React.FC<Props> = ({ 
  params, onChange, stabilizeConfig, autoStabilize, compact = false, disabled = false,
  activeLinkModuleId, linkedParams = [], automatedParams = {}
}) => {
  
  const handleApplyPreset = (p: any) => {
    Object.entries(p).forEach(([k, v]) => onChange(k as keyof SimulationParams, v));
  };

  const getLinkStatus = (key: string) => {
    if (!activeLinkModuleId) return 'idle';
    if (linkedParams.includes(key)) return 'selected';
    return 'selectable';
  };

  const Content = (
    <div className="space-y-2">
      {!compact && (
        <div className="border-b border-zinc-800 pb-2 mb-2">
          <ToggleLinkControl 
             label="Mass-Conserving Reaction Diffusion"
             icon={Atom}
             checked={params.usePhysics}
             onChange={(v: boolean) => onChange('usePhysics', v)}
             automatedValue={automatedParams['usePhysics'] !== undefined ? (automatedParams['usePhysics'] > 0) : undefined}
             onLink={() => onChange('usePhysics', 'LINK')}
             linkStatus={getLinkStatus('usePhysics')}
             iconColorClass="text-indigo-400"
          />
        </div>
      )}

      <PresetBar 
        modeKey="physics" 
        defaultPresets={PHYSICS_PRESETS}
        currentParams={params}
        onApply={handleApplyPreset}
        filterKeys={['Dm','Dc','kOn','kRec','kSat','kOff','feedRate','totalDensity','flowX','flowY']}
      />

      <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
        <ParameterControl 
           label="Influence" value={params.physicsInfluence ?? 1.0} min={0} max={1.0} step={0.05} 
           onChange={(v: number) => onChange('physicsInfluence', v)} 
           linkStatus={getLinkStatus('physicsInfluence')} onLink={() => onChange('physicsInfluence', 'LINK')}
           automatedValue={automatedParams['physicsInfluence']}
           defaultValue={DEFAULT_PARAMS.physicsInfluence}
        />

        <ParameterControl 
           label="Membrane (Dm)" value={params.Dm} min={0} max={1.0} step={0.01} 
           onChange={(v: number) => onChange('Dm', v)} 
           linkStatus={getLinkStatus('Dm')} onLink={() => onChange('Dm', 'LINK')}
           automatedValue={automatedParams['Dm']}
           defaultValue={DEFAULT_PARAMS.Dm}
        />
        <ParameterControl 
           label="Cytosol (Dc)" value={params.Dc} min={0.1} max={100.0} step={0.1} 
           onChange={(v: number) => onChange('Dc', v)} 
           linkStatus={getLinkStatus('Dc')} onLink={() => onChange('Dc', 'LINK')}
           automatedValue={automatedParams['Dc']}
           defaultValue={DEFAULT_PARAMS.Dc}
        />
        
        <ParameterControl 
          label="Recruitment (kRec)" value={params.kRec} min={0} max={0.5} step={0.001} 
          highlight={autoStabilize && stabilizeConfig?.kRec}
          onChange={(v: number) => onChange('kRec', v)} 
          linkStatus={getLinkStatus('kRec')} onLink={() => onChange('kRec', 'LINK')}
          automatedValue={automatedParams['kRec']}
          defaultValue={DEFAULT_PARAMS.kRec}
        />
        <ParameterControl 
          label="Basal Attach (kOn)" value={params.kOn} min={0} max={0.2} step={0.001} 
          highlight={autoStabilize && stabilizeConfig?.kOn}
          onChange={(v: number) => onChange('kOn', v)} 
          linkStatus={getLinkStatus('kOn')} onLink={() => onChange('kOn', 'LINK')}
          automatedValue={automatedParams['kOn']}
          defaultValue={DEFAULT_PARAMS.kOn}
        />
        <ParameterControl 
           label="Saturation (kSat)" value={params.kSat} min={0} max={0.5} step={0.001} 
           onChange={(v: number) => onChange('kSat', v)} 
           linkStatus={getLinkStatus('kSat')} onLink={() => onChange('kSat', 'LINK')}
           automatedValue={automatedParams['kSat']}
           defaultValue={DEFAULT_PARAMS.kSat}
        />
        <ParameterControl 
          label="Detachment (kOff)" value={params.kOff} min={0} max={3.0} step={0.01} 
          highlight={autoStabilize && stabilizeConfig?.kOff}
          onChange={(v: number) => onChange('kOff', v)} 
          linkStatus={getLinkStatus('kOff')} onLink={() => onChange('kOff', 'LINK')}
          automatedValue={automatedParams['kOff']}
          defaultValue={DEFAULT_PARAMS.kOff}
        />
        
        <ParameterControl 
           label="Feed Rate" value={params.feedRate} min={0} max={0.2} step={0.005} 
           onChange={(v: number) => onChange('feedRate', v)} 
           linkStatus={getLinkStatus('feedRate')} onLink={() => onChange('feedRate', 'LINK')}
           automatedValue={automatedParams['feedRate']}
           defaultValue={DEFAULT_PARAMS.feedRate}
        />
        <ParameterControl 
           label="Density" value={params.totalDensity} min={1.0} max={15.0} step={0.5} 
           onChange={(v: number) => onChange('totalDensity', v)} 
           linkStatus={getLinkStatus('totalDensity')} onLink={() => onChange('totalDensity', 'LINK')}
           automatedValue={automatedParams['totalDensity']}
           defaultValue={DEFAULT_PARAMS.totalDensity}
        />
      </div>
    </div>
  );

  return Content;
};
