import React from 'react';
import { Card, ParameterControl } from '../ui/Shared';
import { PresetDropdown } from '../ui/PresetDropdown';
import { VORTEX_PRESETS } from '../../constants';

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

export const VortexControls: React.FC<Props> = ({
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
        presets={VORTEX_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Vortex Swirl Presets..."
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Swirl Speed"
          value={params.vortexSpeed ?? 1.0}
          min={-4.0} max={4.0} step={0.1}
          onChange={(v) => onChange('vortexSpeed', v)}
          automatedValue={getAutoVal('vortexSpeed')}
          linkStatus={getLinkStatus('vortexSpeed')}
          onLink={() => handleLink('vortexSpeed')}
        />
        <ParameterControl
          label="Vortex Radius"
          value={params.vortexRadius ?? 0.4}
          min={0.05} max={1.0} step={0.05}
          onChange={(v) => onChange('vortexRadius', v)}
          automatedValue={getAutoVal('vortexRadius')}
          linkStatus={getLinkStatus('vortexRadius')}
          onLink={() => handleLink('vortexRadius')}
        />
        <ParameterControl
          label="Spiral Angle (°)"
          value={params.vortexAngle ?? 0.0}
          min={-90.0} max={90.0} step={5.0}
          onChange={(v) => onChange('vortexAngle', v)}
          automatedValue={getAutoVal('vortexAngle')}
          linkStatus={getLinkStatus('vortexAngle')}
          onLink={() => handleLink('vortexAngle')}
        />
        <ParameterControl
          label="Zoom / Feedback"
          value={params.vortexFeedback ?? 1.0}
          min={0.85} max={1.15} step={0.01}
          onChange={(v) => onChange('vortexFeedback', v)}
          automatedValue={getAutoVal('vortexFeedback')}
          linkStatus={getLinkStatus('vortexFeedback')}
          onLink={() => handleLink('vortexFeedback')}
        />
        <ParameterControl
          label="Center X"
          value={params.vortexCenterX ?? 0.5}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => onChange('vortexCenterX', v)}
          automatedValue={getAutoVal('vortexCenterX')}
          linkStatus={getLinkStatus('vortexCenterX')}
          onLink={() => handleLink('vortexCenterX')}
        />
        <ParameterControl
          label="Center Y"
          value={params.vortexCenterY ?? 0.5}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => onChange('vortexCenterY', v)}
          automatedValue={getAutoVal('vortexCenterY')}
          linkStatus={getLinkStatus('vortexCenterY')}
          onLink={() => handleLink('vortexCenterY')}
        />
        <ParameterControl
          label="Influence"
          value={params.vortexBlend ?? 1.0}
          min={0.0} max={1.0} step={0.05}
          onChange={(v) => onChange('vortexBlend', v)}
          automatedValue={getAutoVal('vortexBlend')}
          linkStatus={getLinkStatus('vortexBlend')}
          onLink={() => handleLink('vortexBlend')}
        />
      </div>
    </div>
  );

  return compact ? Content : <Card className="p-3">{Content}</Card>;
};
