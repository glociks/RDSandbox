import React from 'react';
import { Card, ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { CHROMATIC_PRESETS } from '../../constants';

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

export const ChromaticControls: React.FC<Props> = ({
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
        presets={CHROMATIC_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Chromatic Drift Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Red Shift (U)"
          value={params.driftU ?? 0.02}
          min={-0.1} max={0.1} step={0.005}
          onChange={(v) => onChange('driftU', v)}
          automatedValue={getAutoVal('driftU')}
          linkStatus={getLinkStatus('driftU')}
          onLink={() => handleLink('driftU')}
        />
        <ParameterControl
          label="Green Shift (V)"
          value={params.driftV ?? -0.01}
          min={-0.1} max={0.1} step={0.005}
          onChange={(v) => onChange('driftV', v)}
          automatedValue={getAutoVal('driftV')}
          linkStatus={getLinkStatus('driftV')}
          onLink={() => handleLink('driftV')}
        />
        <ParameterControl
          label="Blue Shift (W)"
          value={params.driftW ?? 0.03}
          min={-0.1} max={0.1} step={0.005}
          onChange={(v) => onChange('driftW', v)}
          automatedValue={getAutoVal('driftW')}
          linkStatus={getLinkStatus('driftW')}
          onLink={() => handleLink('driftW')}
        />
        <ParameterControl
          label="Phase Angle"
          value={params.phaseAngle ?? 0.5}
          min={0.0} max={Math.PI * 2} step={0.1}
          onChange={(v) => onChange('phaseAngle', v)}
          automatedValue={getAutoVal('phaseAngle')}
          linkStatus={getLinkStatus('phaseAngle')}
          onLink={() => handleLink('phaseAngle')}
        />
        <ParameterControl
          label="Influence"
          value={params.chromaMix ?? 0.8}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => onChange('chromaMix', v)}
          automatedValue={getAutoVal('chromaMix')}
          linkStatus={getLinkStatus('chromaMix')}
          onLink={() => handleLink('chromaMix')}
        />
      </div>
    </div>
  );

  return compact ? Content : <Card className="p-3">{Content}</Card>;
};
