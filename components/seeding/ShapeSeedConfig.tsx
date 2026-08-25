import React from 'react';
import { ParameterControl, Label, Switch } from '../ui/Shared';
import { InitialSeedConfig } from '../../types';
import { Circle, Square, Star, Target, Copy } from 'lucide-react';

interface Props {
   config: InitialSeedConfig;
   onChange: (u: Partial<InitialSeedConfig>) => void;
   activeLinkModuleId?: string | null;
   linkedParams?: string[];
   automatedParams?: Record<string, number>;
   onLinkParam?: (paramKey: string) => void;
   automationPrefix?: string;
}

export const ShapeSeedConfig: React.FC<Props> = ({ config, onChange, activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix }) => {
   const getAutoVal = (k: string) => automationPrefix && automatedParams ? automatedParams[`${automationPrefix}_${k}`] : undefined;
   const getLinkStatus = (k: string) => {
      if (!activeLinkModuleId || !automationPrefix) return undefined;
      return linkedParams?.includes(`${automationPrefix}_${k}`) ? 'selected' : 'selectable';
   };
   const handleLink = (k: string) => {
      if (onLinkParam && automationPrefix) onLinkParam(`${automationPrefix}_${k}`);
   };

   // Normalize shapeMode & shapeCount defaults
   const shapeMode = config.shapeMode || 'single';
   const shapeCount = typeof config.shapeCount === 'number' ? config.shapeCount : 5;
   const shapeType = config.shapeType || 'circle';
   const shapeSize = typeof config.shapeSize === 'number' ? config.shapeSize : 20;

   return (
      <div className="space-y-1.5 font-normal">
         {/* Shape Type Selector */}
         <div className="flex gap-1 justify-between bg-zinc-950 p-0.5 rounded border border-zinc-800">
            {(['circle', 'rect', 'star'] as const).map(t => (
               <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ shapeType: t })}
                  className={`flex-1 flex justify-center py-0.5 rounded-sm transition-colors cursor-pointer ${shapeType === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title={t}
               >
                  {t === 'circle' && <Circle size={12} />}
                  {t === 'rect' && <Square size={12} />}
                  {t === 'star' && <Star size={12} />}
               </button>
            ))}
         </div>

         {/* Mode Toggle (Single vs Scatter) */}
         <div className="flex items-center justify-between bg-zinc-900/60 px-2 py-1 rounded-sm border border-zinc-800">
            <Label className="flex items-center gap-1.5 text-[11px] font-normal text-zinc-300">
               {shapeMode === 'single' ? <Target size={11} className="ui-icon-indigo" /> : <Copy size={11} className="ui-icon-emerald" />}
               <span>{shapeMode === 'single' ? 'Single Object' : 'Scatter'}</span>
            </Label>
            <Switch
               checked={shapeMode === 'scatter'}
               onCheckedChange={(v: boolean) => onChange({
                  shapeMode: v ? 'scatter' : 'single',
                  shapeCount: shapeCount
               })}
            />
         </div>

         {/* Specific Controls based on Mode */}
         {shapeMode === 'scatter' ? (
            <ParameterControl
               label="Count"
               value={shapeCount} min={1} max={100} step={1}
               onChange={(v) => onChange({ shapeCount: v })}
               automatedValue={getAutoVal('shapeCount')}
               linkStatus={getLinkStatus('shapeCount')}
               onLink={() => handleLink('shapeCount')}
            />
         ) : (
            <div className="grid grid-cols-2 gap-1.5">
               <ParameterControl
                  label="Pos X"
                  value={config.shapePosX ?? 0.5} min={0} max={1} step={0.01}
                  onChange={(v) => onChange({ shapePosX: v })}
                  automatedValue={getAutoVal('shapePosX')}
                  linkStatus={getLinkStatus('shapePosX')}
                  onLink={() => handleLink('shapePosX')}
               />
               <ParameterControl
                  label="Pos Y"
                  value={config.shapePosY ?? 0.5} min={0} max={1} step={0.01}
                  onChange={(v) => onChange({ shapePosY: v })}
                  automatedValue={getAutoVal('shapePosY')}
                  linkStatus={getLinkStatus('shapePosY')}
                  onLink={() => handleLink('shapePosY')}
               />
            </div>
         )}

         <ParameterControl
            label="Size (px)"
            value={shapeSize} min={2} max={200} step={1}
            onChange={(v) => onChange({ shapeSize: v })}
            automatedValue={getAutoVal('shapeSize')}
            linkStatus={getLinkStatus('shapeSize')}
            onLink={() => handleLink('shapeSize')}
         />

         <div className="flex items-center justify-between pt-0.5">
            <Label className="text-[11px] font-normal text-zinc-300">Hollow / Outline</Label>
            <Switch checked={config.shapeHollow || false} onCheckedChange={(v: boolean) => onChange({ shapeHollow: v })} />
         </div>
      </div>
   );
};
