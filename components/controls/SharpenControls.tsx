import React from 'react';
import { Card, ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { SHARPEN_PRESETS } from '../../constants';

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

export const SharpenControls: React.FC<Props> = ({
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

  const Content = (
    <div className="space-y-3">
      {/* Preset Dropdown */}
      <PresetDropdown
        presets={SHARPEN_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Laplacian Sharpen Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Influence"
          value={params.sharpenInfluence ?? params.influence ?? 1.0}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => {
            onChange('sharpenInfluence', v);
            onChange('influence', v);
          }}
          automatedValue={getAutoVal('sharpenInfluence')}
          linkStatus={getLinkStatus('sharpenInfluence')}
          onLink={() => handleLink('sharpenInfluence')}
        />
        <ParameterControl
          label="Sharpen Boost"
          value={params.sharpenStrength ?? 1.0}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('sharpenStrength', v)}
          automatedValue={getAutoVal('sharpenStrength')}
          linkStatus={getLinkStatus('sharpenStrength')}
          onLink={() => handleLink('sharpenStrength')}
        />
        <ParameterControl
          label="Neg Diffusion"
          value={params.negativeDiffusion ?? 0.02}
          min={0.0} max={0.1} step={0.005}
          onChange={(v) => onChange('negativeDiffusion', v)}
          automatedValue={getAutoVal('negativeDiffusion')}
          linkStatus={getLinkStatus('negativeDiffusion')}
          onLink={() => handleLink('negativeDiffusion')}
        />
        <ParameterControl
          label="Edge Blend"
          value={params.edgeBlend ?? 0.9}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => onChange('edgeBlend', v)}
          automatedValue={getAutoVal('edgeBlend')}
          linkStatus={getLinkStatus('edgeBlend')}
          onLink={() => handleLink('edgeBlend')}
        />
      </div>
    </div>
  );

  return compact ? Content : <Card className="p-3">{Content}</Card>;
};
