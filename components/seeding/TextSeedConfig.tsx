
import React from 'react';
import { Label, Input, ParameterControl } from '../ui/Shared';
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

export const TextSeedConfig: React.FC<Props> = ({ config, onChange, activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix }) => {
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
      <div className="space-y-1">
        <Label>Text to Rasterize</Label>
        <Input
          type="text"
          value={config.textString ?? 'McRD'}
          onChange={(e: any) => onChange({ textString: e.target.value })}
          className="w-full h-8"
        />
      </div>
      <ParameterControl
        label="Font Size"
        value={config.textSize ?? 48} min={10} max={200} step={5}
        onChange={(v) => onChange({ textSize: v })}
        automatedValue={getAutoVal('textSize')}
        linkStatus={getLinkStatus('textSize')}
        onLink={() => handleLink('textSize')}
      />
      <div className="grid grid-cols-2 gap-2">
        <ParameterControl
          label="Pos X"
          value={config.textPosX ?? 0.5} min={0} max={1} step={0.01}
          onChange={(v) => onChange({ textPosX: v })}
          automatedValue={getAutoVal('textPosX')}
          linkStatus={getLinkStatus('textPosX')}
          onLink={() => handleLink('textPosX')}
        />
        <ParameterControl
          label="Pos Y"
          value={config.textPosY ?? 0.5} min={0} max={1} step={0.01}
          onChange={(v) => onChange({ textPosY: v })}
          automatedValue={getAutoVal('textPosY')}
          linkStatus={getLinkStatus('textPosY')}
          onLink={() => handleLink('textPosY')}
        />
      </div>
    </div>
  );
};
