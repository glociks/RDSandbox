import React from 'react';
import { Card, ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { TURBULENCE_PRESETS } from '../../constants';

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

export const TurbulenceControls: React.FC<Props> = ({
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
        presets={TURBULENCE_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Curl Turbulence Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Noise Scale"
          value={params.turbScale ?? 0.03}
          min={0.005} max={0.1} step={0.005}
          onChange={(v) => onChange('turbScale', v)}
          automatedValue={getAutoVal('turbScale')}
          linkStatus={getLinkStatus('turbScale')}
          onLink={() => handleLink('turbScale')}
        />
        <ParameterControl
          label="Flow Speed"
          value={params.turbSpeed ?? 0.8}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('turbSpeed', v)}
          automatedValue={getAutoVal('turbSpeed')}
          linkStatus={getLinkStatus('turbSpeed')}
          onLink={() => handleLink('turbSpeed')}
        />
        <ParameterControl
          label="Turb Strength"
          value={params.turbStrength ?? 1.2}
          min={0.1} max={5.0} step={0.1}
          onChange={(v) => onChange('turbStrength', v)}
          automatedValue={getAutoVal('turbStrength')}
          linkStatus={getLinkStatus('turbStrength')}
          onLink={() => handleLink('turbStrength')}
        />
        <ParameterControl
          label="Influence"
          value={params.turbInfluence ?? params.influence ?? 1.0}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => {
            onChange('turbInfluence', v);
            onChange('influence', v);
          }}
          automatedValue={getAutoVal('turbInfluence')}
          linkStatus={getLinkStatus('turbInfluence')}
          onLink={() => handleLink('turbInfluence')}
        />
        <ParameterControl
          label="Turb Feedback"
          value={params.turbFeedback ?? 1.0}
          min={0.85} max={1.15} step={0.01}
          onChange={(v) => onChange('turbFeedback', v)}
          automatedValue={getAutoVal('turbFeedback')}
          linkStatus={getLinkStatus('turbFeedback')}
          onLink={() => handleLink('turbFeedback')}
        />
        <ParameterControl
          label="Direction X"
          value={params.turbDirX ?? 0.0}
          min={-3.0} max={3.0} step={0.1}
          onChange={(v) => onChange('turbDirX', v)}
          automatedValue={getAutoVal('turbDirX')}
          linkStatus={getLinkStatus('turbDirX')}
          onLink={() => handleLink('turbDirX')}
        />
        <ParameterControl
          label="Direction Y"
          value={params.turbDirY ?? 0.0}
          min={-3.0} max={3.0} step={0.1}
          onChange={(v) => onChange('turbDirY', v)}
          automatedValue={getAutoVal('turbDirY')}
          linkStatus={getLinkStatus('turbDirY')}
          onLink={() => handleLink('turbDirY')}
        />
      </div>
    </div>
  );

  return compact ? Content : <Card className="p-3">{Content}</Card>;
};
