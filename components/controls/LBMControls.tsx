import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { LBM_PRESETS } from '../../constants';

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

export const LBMControls: React.FC<Props> = ({
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
        presets={LBM_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Lattice Boltzmann Fluid Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Relaxation Time (τ)"
          value={params.tau ?? 0.8}
          min={0.55} max={2.0} step={0.05}
          onChange={(v) => onChange('tau', v)}
          automatedValue={getAutoVal('tau')}
          linkStatus={getLinkStatus('tau')}
          onLink={() => handleLink('tau')}
        />
        <ParameterControl
          label="Horizontal Flow (gx)"
          value={params.gravityX ?? 0.0}
          min={-0.01} max={0.01} step={0.001}
          onChange={(v) => onChange('gravityX', v)}
          automatedValue={getAutoVal('gravityX')}
          linkStatus={getLinkStatus('gravityX')}
          onLink={() => handleLink('gravityX')}
        />
        <ParameterControl
          label="Vertical Buoyancy (gy)"
          value={params.gravityY ?? -0.005}
          min={-0.02} max={0.02} step={0.001}
          onChange={(v) => onChange('gravityY', v)}
          automatedValue={getAutoVal('gravityY')}
          linkStatus={getLinkStatus('gravityY')}
          onLink={() => handleLink('gravityY')}
        />
        <ParameterControl
          label="Morphogen Coupling"
          value={params.coupling ?? 1.0}
          min={0.0} max={3.0} step={0.1}
          onChange={(v) => onChange('coupling', v)}
          automatedValue={getAutoVal('coupling')}
          linkStatus={getLinkStatus('coupling')}
          onLink={() => handleLink('coupling')}
        />
        <ParameterControl
          label="Influence"
          value={params.lbmInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('lbmInfluence', v)}
          automatedValue={getAutoVal('lbmInfluence')}
          linkStatus={getLinkStatus('lbmInfluence')}
          onLink={() => handleLink('lbmInfluence')}
        />
      </div>
    </div>
  );
};
