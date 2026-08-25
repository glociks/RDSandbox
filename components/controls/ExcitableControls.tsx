import React from 'react';
import { Card, ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { EXCITABLE_PRESETS } from '../../constants';

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

export const ExcitableControls: React.FC<Props> = ({
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
        presets={EXCITABLE_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Excitable Wave Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Threshold (a)"
          value={params.fnA ?? 0.7}
          min={0.1} max={1.5} step={0.05}
          onChange={(v) => onChange('fnA', v)}
          automatedValue={getAutoVal('fnA')}
          linkStatus={getLinkStatus('fnA')}
          onLink={() => handleLink('fnA')}
        />
        <ParameterControl
          label="Damping (b)"
          value={params.fnB ?? 0.8}
          min={0.1} max={2.0} step={0.05}
          onChange={(v) => onChange('fnB', v)}
          automatedValue={getAutoVal('fnB')}
          linkStatus={getLinkStatus('fnB')}
          onLink={() => handleLink('fnB')}
        />
        <ParameterControl
          label="Epsilon (Rate)"
          value={params.fnEpsilon ?? 0.08}
          min={0.01} max={0.5} step={0.01}
          onChange={(v) => onChange('fnEpsilon', v)}
          automatedValue={getAutoVal('fnEpsilon')}
          linkStatus={getLinkStatus('fnEpsilon')}
          onLink={() => handleLink('fnEpsilon')}
        />
        <ParameterControl
          label="Stimulus Pulse"
          value={params.fnStimulus ?? 0.0}
          min={0.0} max={0.5} step={0.01}
          onChange={(v) => onChange('fnStimulus', v)}
          automatedValue={getAutoVal('fnStimulus')}
          linkStatus={getLinkStatus('fnStimulus')}
          onLink={() => handleLink('fnStimulus')}
        />
        <ParameterControl
          label="Influence"
          value={params.fnInfluence ?? 0.8}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => onChange('fnInfluence', v)}
          automatedValue={getAutoVal('fnInfluence')}
          linkStatus={getLinkStatus('fnInfluence')}
          onLink={() => handleLink('fnInfluence')}
        />
      </div>
    </div>
  );

  return compact ? Content : <Card className="p-3">{Content}</Card>;
};
