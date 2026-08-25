import React from 'react';
import { ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { QUANTUM_PHASE_PRESETS } from '../../constants';

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

export const QuantumPhaseControls: React.FC<Props> = ({
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
        presets={QUANTUM_PHASE_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Quantum Phase Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Planck Const (ℏ)"
          value={params.quantumHbar ?? 1.0}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('quantumHbar', v)}
          automatedValue={getAutoVal('quantumHbar')}
          linkStatus={getLinkStatus('quantumHbar')}
          onLink={() => handleLink('quantumHbar')}
        />
        <ParameterControl
          label="Nonlinear Coupling"
          value={params.quantumCoupling ?? 0.8}
          min={-2.0} max={3.0} step={0.1}
          onChange={(v) => onChange('quantumCoupling', v)}
          automatedValue={getAutoVal('quantumCoupling')}
          linkStatus={getLinkStatus('quantumCoupling')}
          onLink={() => handleLink('quantumCoupling')}
        />
        <ParameterControl
          label="Trap Potential"
          value={params.quantumPotential ?? 0.5}
          min={0} max={2.0} step={0.05}
          onChange={(v) => onChange('quantumPotential', v)}
          automatedValue={getAutoVal('quantumPotential')}
          linkStatus={getLinkStatus('quantumPotential')}
          onLink={() => handleLink('quantumPotential')}
        />
        <ParameterControl
          label="Phase Speed"
          value={params.quantumPhaseSpeed ?? 1.0}
          min={0.1} max={3.0} step={0.1}
          onChange={(v) => onChange('quantumPhaseSpeed', v)}
          automatedValue={getAutoVal('quantumPhaseSpeed')}
          linkStatus={getLinkStatus('quantumPhaseSpeed')}
          onLink={() => handleLink('quantumPhaseSpeed')}
        />
        <ParameterControl
          label="Interference Fringes"
          value={params.quantumInterference ?? 0.8}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('quantumInterference', v)}
          automatedValue={getAutoVal('quantumInterference')}
          linkStatus={getLinkStatus('quantumInterference')}
          onLink={() => handleLink('quantumInterference')}
        />
        <ParameterControl
          label="Influence"
          value={params.quantumInfluence ?? 1.0}
          min={0} max={1.0} step={0.05}
          onChange={(v) => onChange('quantumInfluence', v)}
          automatedValue={getAutoVal('quantumInfluence')}
          linkStatus={getLinkStatus('quantumInfluence')}
          onLink={() => handleLink('quantumInfluence')}
        />
      </div>
    </div>
  );
};
