import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { SURFACE_TENSION_PRESETS } from '../../constants';

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

export const SurfaceTensionControls: React.FC<Props> = ({
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
        presets={SURFACE_TENSION_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Surface Tension Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Interfacial Tension"
          value={params.interfacialTension ?? 0.15}
          min={0.01} max={0.6} step={0.02}
          onChange={(v) => onChange('interfacialTension', v)}
          automatedValue={getAutoVal('interfacialTension')}
          linkStatus={getLinkStatus('interfacialTension')}
          onLink={() => handleLink('interfacialTension')}
        />
        <ParameterControl
          label="Phase Separation"
          value={params.phaseSeparation ?? 1.0}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('phaseSeparation', v)}
          automatedValue={getAutoVal('phaseSeparation')}
          linkStatus={getLinkStatus('phaseSeparation')}
          onLink={() => handleLink('phaseSeparation')}
        />
        <ParameterControl
          label="Surface Mobility"
          value={params.surfaceMobility ?? 0.4}
          min={0.05} max={1.5} step={0.05}
          onChange={(v) => onChange('surfaceMobility', v)}
          automatedValue={getAutoVal('surfaceMobility')}
          linkStatus={getLinkStatus('surfaceMobility')}
          onLink={() => handleLink('surfaceMobility')}
        />
        <ParameterControl
          label="Droplet Coalescence"
          value={params.coalescenceRate ?? 0.8}
          min={0.1} max={2.5} step={0.1}
          onChange={(v) => onChange('coalescenceRate', v)}
          automatedValue={getAutoVal('coalescenceRate')}
          linkStatus={getLinkStatus('coalescenceRate')}
          onLink={() => handleLink('coalescenceRate')}
        />
        <ParameterControl
          label="Influence"
          value={params.tensionInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('tensionInfluence', v)}
          automatedValue={getAutoVal('tensionInfluence')}
          linkStatus={getLinkStatus('tensionInfluence')}
          onLink={() => handleLink('tensionInfluence')}
        />
      </div>
    </div>
  );
};
