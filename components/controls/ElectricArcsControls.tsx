import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { ELECTRIC_ARCS_PRESETS } from '../../constants';

interface Props {
  params: Record<string, any>;
  onChange: (key: string, value: any) => void;
  compact?: boolean;
  disabled?: boolean;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
  onLinkParam?: (key: string) => void;
  prefix?: string;
}

export const ElectricArcsControls: React.FC<Props> = ({
  params, onChange, compact, disabled,
  activeLinkModuleId, linkedParams = [], automatedParams = {}, onLinkParam, prefix = ''
}) => {
  const getAutoVal = (k: string) => automatedParams[`${prefix}${k}`] ?? automatedParams[k];
  const getLinkStatus = (k: string) => {
    if (!activeLinkModuleId) return undefined;
    return (linkedParams.includes(`${prefix}${k}`) || linkedParams.includes(k)) ? 'selected' : 'selectable';
  };
  const handleLink = (k: string) => {
    if (onLinkParam) onLinkParam(`${prefix}${k}`);
    else onChange(k, 'LINK');
  };

  return (
    <div className="space-y-3">
      {/* Preset Dropdown */}
      <PresetDropdown
        presets={ELECTRIC_ARCS_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Electric Arcs Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Arc Intensity"
          value={params.arcIntensity ?? 1.5}
          min={0.1} max={4.0} step={0.1}
          onChange={(v) => onChange('arcIntensity', v)}
          automatedValue={getAutoVal('arcIntensity')}
          linkStatus={getLinkStatus('arcIntensity')}
          onLink={() => handleLink('arcIntensity')}
        />
        <ParameterControl
          label="Branching Probability"
          value={params.arcBranching ?? 0.6}
          min={0.05} max={1.0} step={0.05}
          onChange={(v) => onChange('arcBranching', v)}
          automatedValue={getAutoVal('arcBranching')}
          linkStatus={getLinkStatus('arcBranching')}
          onLink={() => handleLink('arcBranching')}
        />
        <ParameterControl
          label="Breakdown Threshold"
          value={params.arcThreshold ?? 0.3}
          min={0.05} max={0.8} step={0.05}
          onChange={(v) => onChange('arcThreshold', v)}
          automatedValue={getAutoVal('arcThreshold')}
          linkStatus={getLinkStatus('arcThreshold')}
          onLink={() => handleLink('arcThreshold')}
        />
        <ParameterControl
          label="Plasma Persistence"
          value={params.arcDecay ?? 0.94}
          min={0.7} max={0.99} step={0.01}
          onChange={(v) => onChange('arcDecay', v)}
          automatedValue={getAutoVal('arcDecay')}
          linkStatus={getLinkStatus('arcDecay')}
          onLink={() => handleLink('arcDecay')}
        />
        <ParameterControl
          label="Jitter & Chaos"
          value={params.arcJitter ?? 0.4}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('arcJitter', v)}
          automatedValue={getAutoVal('arcJitter')}
          linkStatus={getLinkStatus('arcJitter')}
          onLink={() => handleLink('arcJitter')}
        />
        <ParameterControl
          label="Drift Angle"
          value={params.arcDriftAngle ?? 0.0}
          min={0} max={6.28} step={0.1}
          onChange={(v) => onChange('arcDriftAngle', v)}
          automatedValue={getAutoVal('arcDriftAngle')}
          linkStatus={getLinkStatus('arcDriftAngle')}
          onLink={() => handleLink('arcDriftAngle')}
        />
      </div>
    </div>
  );
};
