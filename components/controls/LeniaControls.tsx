import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { LENIA_PRESETS } from '../../constants';

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

export const LeniaControls: React.FC<Props> = ({
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
        presets={LENIA_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Lenia Species Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Kernel Radius (R)"
          value={params.radius ?? 13}
          min={5} max={22} step={1}
          onChange={(v) => onChange('radius', v)}
          automatedValue={getAutoVal('radius')}
          linkStatus={getLinkStatus('radius')}
          onLink={() => handleLink('radius')}
        />
        <ParameterControl
          label="Growth Center (μ)"
          value={params.mu ?? 0.15}
          min={0.05} max={0.4} step={0.005}
          onChange={(v) => onChange('mu', v)}
          automatedValue={getAutoVal('mu')}
          linkStatus={getLinkStatus('mu')}
          onLink={() => handleLink('mu')}
        />
        <ParameterControl
          label="Growth Width (σ)"
          value={params.sigma ?? 0.035}
          min={0.005} max={0.08} step={0.002}
          onChange={(v) => onChange('sigma', v)}
          automatedValue={getAutoVal('sigma')}
          linkStatus={getLinkStatus('sigma')}
          onLink={() => handleLink('sigma')}
        />
        <ParameterControl
          label="Kernel Ring Center"
          value={params.kernelMu ?? 0.5}
          min={0.1} max={0.9} step={0.05}
          onChange={(v) => onChange('kernelMu', v)}
          automatedValue={getAutoVal('kernelMu')}
          linkStatus={getLinkStatus('kernelMu')}
          onLink={() => handleLink('kernelMu')}
        />
        <ParameterControl
          label="Lenia Speed (dt)"
          value={params.leniaDt ?? 0.1}
          min={0.02} max={0.4} step={0.01}
          onChange={(v) => onChange('leniaDt', v)}
          automatedValue={getAutoVal('leniaDt')}
          linkStatus={getLinkStatus('leniaDt')}
          onLink={() => handleLink('leniaDt')}
        />
        <ParameterControl
          label="Influence"
          value={params.leniaInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('leniaInfluence', v)}
          automatedValue={getAutoVal('leniaInfluence')}
          linkStatus={getLinkStatus('leniaInfluence')}
          onLink={() => handleLink('leniaInfluence')}
        />
        <ParameterControl
          label="Sample Step (1: Quality, 2: Fast)"
          value={params.sampleStep ?? 1}
          min={1} max={2} step={1}
          onChange={(v) => onChange('sampleStep', v)}
          automatedValue={getAutoVal('sampleStep')}
          linkStatus={getLinkStatus('sampleStep')}
          onLink={() => handleLink('sampleStep')}
        />
      </div>
    </div>
  );
};
