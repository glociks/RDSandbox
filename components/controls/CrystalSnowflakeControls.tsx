import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { CRYSTAL_SNOWFLAKE_PRESETS } from '../../constants';

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

export const CrystalSnowflakeControls: React.FC<Props> = ({
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
        presets={CRYSTAL_SNOWFLAKE_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Crystal Dendrite Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Symmetry Order"
          value={params.anisotropyOrder ?? 6}
          min={2} max={12} step={1}
          onChange={(v) => onChange('anisotropyOrder', Math.round(v))}
          automatedValue={getAutoVal('anisotropyOrder')}
          linkStatus={getLinkStatus('anisotropyOrder')}
          onLink={() => handleLink('anisotropyOrder')}
        />
        <ParameterControl
          label="Anisotropy Strength"
          value={params.anisotropyStrength ?? 0.75}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('anisotropyStrength', v)}
          automatedValue={getAutoVal('anisotropyStrength')}
          linkStatus={getLinkStatus('anisotropyStrength')}
          onLink={() => handleLink('anisotropyStrength')}
        />
        <ParameterControl
          label="Freezing Rate"
          value={params.freezingRate ?? 0.35}
          min={0.05} max={1.0} step={0.05}
          onChange={(v) => onChange('freezingRate', v)}
          automatedValue={getAutoVal('freezingRate')}
          linkStatus={getLinkStatus('freezingRate')}
          onLink={() => handleLink('freezingRate')}
        />
        <ParameterControl
          label="Melting Rate"
          value={params.meltingRate ?? 0.02}
          min={0} max={0.2} step={0.01}
          onChange={(v) => onChange('meltingRate', v)}
          automatedValue={getAutoVal('meltingRate')}
          linkStatus={getLinkStatus('meltingRate')}
          onLink={() => handleLink('meltingRate')}
        />
        <ParameterControl
          label="Vapor Supersat"
          value={params.vaporSupersaturation ?? 0.8}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('vaporSupersaturation', v)}
          automatedValue={getAutoVal('vaporSupersaturation')}
          linkStatus={getLinkStatus('vaporSupersaturation')}
          onLink={() => handleLink('vaporSupersaturation')}
        />
        <ParameterControl
          label="Influence"
          value={params.crystalInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('crystalInfluence', v)}
          automatedValue={getAutoVal('crystalInfluence')}
          linkStatus={getLinkStatus('crystalInfluence')}
          onLink={() => handleLink('crystalInfluence')}
        />
      </div>
    </div>
  );
};
