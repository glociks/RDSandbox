
import React from 'react';
import { ParameterControl, Switch, Label } from '../ui/Shared';
import { InitialSeedConfig } from '../../types';

interface Props {
  config: InitialSeedConfig;
  onChange: (u: Partial<InitialSeedConfig>) => void;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
  onLinkParam?: (paramKey: string) => void;
  automationPrefix?: string;
}

export const PerlinSeedConfig: React.FC<Props> = ({ config, onChange, activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix }) => {
  const getAutoVal = (k: string) => automationPrefix && automatedParams ? automatedParams[`${automationPrefix}_${k}`] : undefined;
  const getLinkStatus = (k: string) => {
    if (!activeLinkModuleId || !automationPrefix) return undefined;
    return linkedParams?.includes(`${automationPrefix}_${k}`) ? 'selected' : 'selectable';
  };
  const handleLink = (k: string) => {
    if (onLinkParam && automationPrefix) onLinkParam(`${automationPrefix}_${k}`);
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center bg-zinc-800/50 p-2 rounded-sm border border-zinc-800">
        <Label>Smooth Gradient</Label>
        <Switch
          checked={config.perlinGradient || false}
          onCheckedChange={(v: boolean) => onChange({ perlinGradient: v })}
        />
      </div>

      <ParameterControl
        label="Scale"
        value={config.perlinScale} min={1} max={50} step={1}
        onChange={(v) => onChange({ perlinScale: v })}
        automatedValue={getAutoVal('perlinScale')}
        linkStatus={getLinkStatus('perlinScale')}
        onLink={() => handleLink('perlinScale')}
      />

      {!config.perlinGradient && (
        <ParameterControl
          label="Threshold"
          value={config.perlinThreshold} min={0} max={1} step={0.01}
          onChange={(v) => onChange({ perlinThreshold: v })}
          automatedValue={getAutoVal('perlinThreshold')}
          linkStatus={getLinkStatus('perlinThreshold')}
          onLink={() => handleLink('perlinThreshold')}
        />
      )}

      <ParameterControl
        label="Octaves"
        value={config.perlinOctaves} min={1} max={5} step={1}
        onChange={(v) => onChange({ perlinOctaves: v })}
        automatedValue={getAutoVal('perlinOctaves')}
        linkStatus={getLinkStatus('perlinOctaves')}
        onLink={() => handleLink('perlinOctaves')}
      />
    </div>
  );
};
