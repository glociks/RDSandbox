import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { PHYSARUM_PRESETS } from '../../constants';

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

export const PhysarumControls: React.FC<Props> = ({
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
        presets={PHYSARUM_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Physarum Slime Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Agent Swarm Count"
          value={params.agentCount ?? 15000}
          min={2000} max={60000} step={2000}
          onChange={(v) => onChange('agentCount', v)}
          automatedValue={getAutoVal('agentCount')}
          linkStatus={getLinkStatus('agentCount')}
          onLink={() => handleLink('agentCount')}
        />
        <ParameterControl
          label="Sensor Angle"
          value={params.sensorAngle ?? 0.45}
          min={0.1} max={1.2} step={0.05}
          onChange={(v) => onChange('sensorAngle', v)}
          automatedValue={getAutoVal('sensorAngle')}
          linkStatus={getLinkStatus('sensorAngle')}
          onLink={() => handleLink('sensorAngle')}
        />
        <ParameterControl
          label="Sensor Distance"
          value={params.sensorDistance ?? 8.0}
          min={3.0} max={25.0} step={1.0}
          onChange={(v) => onChange('sensorDistance', v)}
          automatedValue={getAutoVal('sensorDistance')}
          linkStatus={getLinkStatus('sensorDistance')}
          onLink={() => handleLink('sensorDistance')}
        />
        <ParameterControl
          label="Step Size"
          value={params.stepSize ?? 1.5}
          min={0.5} max={4.0} step={0.2}
          onChange={(v) => onChange('stepSize', v)}
          automatedValue={getAutoVal('stepSize')}
          linkStatus={getLinkStatus('stepSize')}
          onLink={() => handleLink('stepSize')}
        />
        <ParameterControl
          label="Trail Deposit"
          value={params.depositAmount ?? 1.8}
          min={0.2} max={5.0} step={0.2}
          onChange={(v) => onChange('depositAmount', v)}
          automatedValue={getAutoVal('depositAmount')}
          linkStatus={getLinkStatus('depositAmount')}
          onLink={() => handleLink('depositAmount')}
        />
        <ParameterControl
          label="Trail Decay"
          value={params.decayFactor ?? 0.96}
          min={0.85} max={0.995} step={0.005}
          onChange={(v) => onChange('decayFactor', v)}
          automatedValue={getAutoVal('decayFactor')}
          linkStatus={getLinkStatus('decayFactor')}
          onLink={() => handleLink('decayFactor')}
        />
        <ParameterControl
          label="Trail Diffusion"
          value={params.diffuseFactor ?? 0.2}
          min={0.02} max={0.6} step={0.02}
          onChange={(v) => onChange('diffuseFactor', v)}
          automatedValue={getAutoVal('diffuseFactor')}
          linkStatus={getLinkStatus('diffuseFactor')}
          onLink={() => handleLink('diffuseFactor')}
        />
        <ParameterControl
          label="Influence"
          value={params.physarumInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('physarumInfluence', v)}
          automatedValue={getAutoVal('physarumInfluence')}
          linkStatus={getLinkStatus('physarumInfluence')}
          onLink={() => handleLink('physarumInfluence')}
        />
      </div>
    </div>
  );
};
