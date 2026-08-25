import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { THERMAL_CONVECTION_PRESETS } from '../../constants';

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

export const ThermalConvectionControls: React.FC<Props> = ({
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
        presets={THERMAL_CONVECTION_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Thermal Convection Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Buoyancy Lift"
          value={params.buoyancy ?? 1.4}
          min={0.1} max={4.0} step={0.1}
          onChange={(v) => onChange('buoyancy', v)}
          automatedValue={getAutoVal('buoyancy')}
          linkStatus={getLinkStatus('buoyancy')}
          onLink={() => handleLink('buoyancy')}
        />
        <ParameterControl
          label="Base Heat Source"
          value={params.heatSource ?? 0.8}
          min={0} max={3.0} step={0.1}
          onChange={(v) => onChange('heatSource', v)}
          automatedValue={getAutoVal('heatSource')}
          linkStatus={getLinkStatus('heatSource')}
          onLink={() => handleLink('heatSource')}
        />
        <ParameterControl
          label="Thermal Diffusion"
          value={params.thermalDiff ?? 0.2}
          min={0.01} max={0.6} step={0.02}
          onChange={(v) => onChange('thermalDiff', v)}
          automatedValue={getAutoVal('thermalDiff')}
          linkStatus={getLinkStatus('thermalDiff')}
          onLink={() => handleLink('thermalDiff')}
        />
        <ParameterControl
          label="Ambient Cooling"
          value={params.coolingRate ?? 0.05}
          min={0.005} max={0.25} step={0.005}
          onChange={(v) => onChange('coolingRate', v)}
          automatedValue={getAutoVal('coolingRate')}
          linkStatus={getLinkStatus('coolingRate')}
          onLink={() => handleLink('coolingRate')}
        />
        <ParameterControl
          label="Plume Turbulence"
          value={params.plumeTurbulence ?? 0.5}
          min={0} max={1.5} step={0.05}
          onChange={(v) => onChange('plumeTurbulence', v)}
          automatedValue={getAutoVal('plumeTurbulence')}
          linkStatus={getLinkStatus('plumeTurbulence')}
          onLink={() => handleLink('plumeTurbulence')}
        />
        <ParameterControl
          label="Influence"
          value={params.thermalInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('thermalInfluence', v)}
          automatedValue={getAutoVal('thermalInfluence')}
          linkStatus={getLinkStatus('thermalInfluence')}
          onLink={() => handleLink('thermalInfluence')}
        />
      </div>
    </div>
  );
};
