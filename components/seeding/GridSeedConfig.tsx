
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

export const GridSeedConfig: React.FC<Props> = ({ config, onChange, activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix }) => {
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
      <div className="flex gap-1.5 min-w-0 w-full">
        <div className="flex-1 min-w-0">
          <ParameterControl
            label="Space X"
            value={config.gridSpacingX} min={5} max={100} step={1}
            onChange={(v) => onChange({ gridSpacingX: v })}
            automatedValue={getAutoVal('gridSpacingX')}
            linkStatus={getLinkStatus('gridSpacingX')}
            onLink={() => handleLink('gridSpacingX')}
          />
        </div>
        <div className="flex-1 min-w-0">
          <ParameterControl
            label="Space Y"
            value={config.gridSpacingY} min={5} max={100} step={1}
            onChange={(v) => onChange({ gridSpacingY: v })}
            automatedValue={getAutoVal('gridSpacingY')}
            linkStatus={getLinkStatus('gridSpacingY')}
            onLink={() => handleLink('gridSpacingY')}
          />
        </div>
      </div>

      <ParameterControl
        label="Dot Size (px)"
        value={config.gridDotSize} min={1} max={20} step={1}
        onChange={(v) => onChange({ gridDotSize: v })}
        automatedValue={getAutoVal('gridDotSize')}
        linkStatus={getLinkStatus('gridDotSize')}
        onLink={() => handleLink('gridDotSize')}
      />
      <div className="flex justify-between items-center">
        <Label>Offset Rows (Hex)</Label>
        <Switch checked={config.gridOffset} onCheckedChange={(v: boolean) => onChange({ gridOffset: v })} />
      </div>
    </div>
  );
};
