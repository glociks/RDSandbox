
import React from 'react';
import { ParameterControl } from '../ui/Shared';
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

export const RandomSeedConfig: React.FC<Props> = ({ config, onChange, activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix }) => {
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
      <ParameterControl
        label="Density (Probability)"
        value={config.randomThreshold} min={0.001} max={1.0} step={0.001}
        onChange={(v) => onChange({ randomThreshold: v })}
        automatedValue={getAutoVal('randomThreshold')}
        linkStatus={getLinkStatus('randomThreshold')}
        onLink={() => handleLink('randomThreshold')}
      />
    </div>
  );
};
