
import React from 'react';
import { Label, ParameterControl, ToggleLinkControl, Switch } from '../ui/Shared';
import { Footprints } from 'lucide-react';
import { PresetDropdown } from '../ui/PresetDropdown';
import { WALKER_PRESETS } from '../../constants';

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

export const RandomWalkerControls: React.FC<Props> = ({
  params,
  onChange,
  compact = false,
  disabled = false,
  activeLinkModuleId,
  linkedParams = [],
  automatedParams = {},
  onLinkParam,
  prefix = ''
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
      {!compact && (
        <div className="border-b border-zinc-800 pb-2 mb-2">
          <ToggleLinkControl
            label="Random Walker"
            icon={Footprints}
            checked={Boolean(params.useWalker)}
            onChange={(v: boolean) => onChange('useWalker', v)}
            automatedValue={automatedParams?.['useWalker'] !== undefined ? (automatedParams['useWalker'] > 0) : undefined}
            onLink={() => handleLink('useWalker')}
            linkStatus={getLinkStatus('useWalker')}
            iconColorClass="text-teal-400"
          />
        </div>
      )}

      {/* Preset Dropdown */}
      <PresetDropdown
        presets={WALKER_PRESETS}
        onSelect={(p) => Object.entries(p).forEach(([k, v]) => onChange(k, v))}
        label="Random Walker Presets..."
      />

      <div className={`space-y-2 transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
        <ParameterControl
          label="Jitter Chance"
          value={params.jitterChance ?? 0.15}
          min={0}
          max={1.0}
          step={0.01}
          onChange={(v: number) => onChange('jitterChance', v)}
          linkStatus={getLinkStatus('jitterChance')}
          onLink={() => handleLink('jitterChance')}
          automatedValue={getAutoVal('jitterChance')}
        />
        <ParameterControl
          label="Strength"
          value={params.jitterStrength ?? 0.5}
          min={0}
          max={1.0}
          step={0.01}
          onChange={(v: number) => onChange('jitterStrength', v)}
          linkStatus={getLinkStatus('jitterStrength')}
          onLink={() => handleLink('jitterStrength')}
          automatedValue={getAutoVal('jitterStrength')}
        />
        <ParameterControl
          label="Global Noise"
          value={params.noise ?? 0.02}
          min={0}
          max={0.2}
          step={0.001}
          onChange={(v: number) => onChange('noise', v)}
          linkStatus={getLinkStatus('noise')}
          onLink={() => handleLink('noise')}
          automatedValue={getAutoVal('noise')}
        />

        <div className="bg-zinc-800/50 p-2 rounded-sm space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between">
            <Label>Color Mask</Label>
            <Switch checked={Boolean(params.walkerMask)} onCheckedChange={(v: boolean) => onChange('walkerMask', v)} />
          </div>
          {params.walkerMask && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="walker-mask-color"
                  name="walker-mask-color"
                  aria-label="Mask Color"
                  value={params.walkerMaskColor || '#ffffff'}
                  onChange={(e) => onChange('walkerMaskColor', e.target.value)}
                  className="w-6 h-6 rounded border-none p-0 cursor-pointer"
                />
                <span className="text-[9px] text-zinc-400">Mask Color</span>
              </div>
              <ParameterControl
                label="Tolerance"
                value={params.walkerMaskTol || 0.1}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(v: number) => onChange('walkerMaskTol', v)}
              />
              <div className="flex items-center justify-between">
                <Label>Invert Mask</Label>
                <Switch checked={Boolean(params.walkerMaskInvert)} onCheckedChange={(v: boolean) => onChange('walkerMaskInvert', v)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return Content;
};
