import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { REACTION_KINETICS_PRESETS } from '../../constants';

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

export const ReactionKineticsControls: React.FC<Props> = ({
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
        presets={REACTION_KINETICS_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Reaction Kinetics Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Oscillation Speed"
          value={params.bzSpeed ?? 1.0}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('bzSpeed', v)}
          automatedValue={getAutoVal('bzSpeed')}
          linkStatus={getLinkStatus('bzSpeed')}
          onLink={() => handleLink('bzSpeed')}
        />
        <ParameterControl
          label="Reaction Rate (F)"
          value={params.bzF ?? 1.2}
          min={0.5} max={3.0} step={0.05}
          onChange={(v) => onChange('bzF', v)}
          automatedValue={getAutoVal('bzF')}
          linkStatus={getLinkStatus('bzF')}
          onLink={() => handleLink('bzF')}
        />
        <ParameterControl
          label="Timescale (Eps)"
          value={params.bzEpsilon ?? 0.08}
          min={0.01} max={0.4} step={0.01}
          onChange={(v) => onChange('bzEpsilon', v)}
          automatedValue={getAutoVal('bzEpsilon')}
          linkStatus={getLinkStatus('bzEpsilon')}
          onLink={() => handleLink('bzEpsilon')}
        />
        <ParameterControl
          label="Diffusion Rate"
          value={params.bzDiffusion ?? 0.25}
          min={0.01} max={0.8} step={0.01}
          onChange={(v) => onChange('bzDiffusion', v)}
          automatedValue={getAutoVal('bzDiffusion')}
          linkStatus={getLinkStatus('bzDiffusion')}
          onLink={() => handleLink('bzDiffusion')}
        />
        <ParameterControl
          label="Mu Constant"
          value={params.bzMu ?? 0.002}
          min={0.0005} max={0.01} step={0.0005}
          onChange={(v) => onChange('bzMu', v)}
          automatedValue={getAutoVal('bzMu')}
          linkStatus={getLinkStatus('bzMu')}
          onLink={() => handleLink('bzMu')}
        />
        <ParameterControl
          label="Influence"
          value={params.bzInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('bzInfluence', v)}
          automatedValue={getAutoVal('bzInfluence')}
          linkStatus={getLinkStatus('bzInfluence')}
          onLink={() => handleLink('bzInfluence')}
        />
      </div>
    </div>
  );
};
