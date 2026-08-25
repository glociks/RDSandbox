import React from 'react';
import { Label, ParameterControl, Button } from '../ui/Shared';
import { InitialSeedConfig, SeedType } from '../../types';
import { RotateCcw } from 'lucide-react';
import { getSeedIcon } from '../../utils/effectIcons';
import { RandomSeedConfig } from './RandomSeedConfig';
import { PerlinSeedConfig } from './PerlinSeedConfig';
import { GridSeedConfig } from './GridSeedConfig';
import { ShapeSeedConfig } from './ShapeSeedConfig';
import { MathSeedConfig } from './MathSeedConfig';
import { TextSeedConfig } from './TextSeedConfig';

interface Props {
   config: InitialSeedConfig;
   onChange: (c: InitialSeedConfig) => void;
   onReset: () => void;
   compact?: boolean;
   disabled?: boolean;
   activeLinkModuleId?: string | null;
   linkedParams?: string[];
   automatedParams?: Record<string, number>;
   onLinkParam?: (paramKey: string) => void;
   automationPrefix?: string;
}

export const InitialSeedMenu: React.FC<Props> = ({
   config, onChange, onReset, compact = false, disabled = false,
   activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix
}) => {
   const update = (updates: Partial<InitialSeedConfig>) => {
      const nextConfig = { ...config, ...updates };
      if (updates.type === 'text' && !nextConfig.textString) {
         nextConfig.textString = 'McRD';
      }
      if (updates.type === 'math' && !nextConfig.mathExpression) {
         nextConfig.mathExpression = 'Math.sin(x*0.1)*Math.cos(y*0.1) > 0';
      }
      if (updates.type === 'shapes') {
         if (!nextConfig.shapeType) nextConfig.shapeType = 'circle';
         if (!nextConfig.shapeMode) nextConfig.shapeMode = 'single';
         if (nextConfig.shapeCount === undefined) nextConfig.shapeCount = 5;
         if (nextConfig.shapeSize === undefined) nextConfig.shapeSize = 20;
         if (nextConfig.shapePosX === undefined) nextConfig.shapePosX = 0.5;
         if (nextConfig.shapePosY === undefined) nextConfig.shapePosY = 0.5;
      }
      onChange(nextConfig);
   };

   const types: { id: SeedType, label: string }[] = [
      { id: 'random', label: 'Random' },
      { id: 'shapes', label: 'Shapes' },
      { id: 'perlin', label: 'Perlin' },
      { id: 'grid', label: 'Grid' },
      { id: 'math', label: 'Math' },
      { id: 'text', label: 'Text' },
   ];

   const autoProps = { activeLinkModuleId, linkedParams, automatedParams, onLinkParam, automationPrefix };

   const renderSpecifics = () => {
      switch (config.type) {
         case 'random': return <RandomSeedConfig config={config} onChange={update} {...autoProps} />;
         case 'perlin': return <PerlinSeedConfig config={config} onChange={update} {...autoProps} />;
         case 'grid': return <GridSeedConfig config={config} onChange={update} {...autoProps} />;
         case 'shapes': return <ShapeSeedConfig config={config} onChange={update} {...autoProps} />;
         case 'math': return <MathSeedConfig config={config} onChange={update} {...autoProps} />;
         case 'text': return <TextSeedConfig config={config} onChange={update} {...autoProps} />;
         default: return null;
      }
   };

   const getAutoVal = (k: string) => automationPrefix && automatedParams ? automatedParams[`${automationPrefix}_${k}`] : undefined;
   const getLinkStatus = (k: string) => {
      if (!activeLinkModuleId || !automationPrefix) return undefined;
      return linkedParams?.includes(`${automationPrefix}_${k}`) ? 'selected' : 'selectable';
   };
   const handleLink = (k: string) => {
      if (onLinkParam && automationPrefix) onLinkParam(`${automationPrefix}_${k}`);
   };

   return (
      <div className={`ui-seed-menu space-y-2 p-2 ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''} font-normal`}>
         {/* Icon-Based Compact Type Selector */}
         <div className="grid grid-cols-6 gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
            {types.map(t => {
               const IconComp = getSeedIcon(t.id);
               const isActive = config.type === t.id;
               return (
                  <button
                     key={t.id}
                     type="button"
                     onClick={() => update({ type: t.id })}
                     className={`ui-seed-type-btn py-1 px-1 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
                        isActive
                           ? 'ui-seed-type-btn-active bg-indigo-600 text-white shadow-sm'
                           : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                     }`}
                     title={t.label}
                  >
                     <IconComp size={13} />
                  </button>
               );
            })}
         </div>

         {/* Specific Config Area */}
         <div className="pt-0.5">
            {renderSpecifics()}
         </div>

         {/* Global Intensity & Channels */}
         <div className="space-y-1.5 pt-1.5 border-t border-zinc-800/80">
            <ParameterControl
               label="Global Intensity"
               value={config.intensity} min={0.1} max={5.0} step={0.1}
               onChange={(v) => update({ intensity: v })}
               automatedValue={getAutoVal('intensity')}
               linkStatus={getLinkStatus('intensity')}
               onLink={() => handleLink('intensity')}
            />

            <div className="space-y-1">
               <Label className="block text-zinc-400 text-[10px] font-normal">Injection Channels</Label>
               <div className="grid grid-cols-3 gap-1">
                  <ParameterControl
                     label="U (Red)"
                     value={config.seedTarget?.u ?? 0} min={0} max={1} step={0.1}
                     onChange={(v) => {
                       const current = config.seedTarget || { u: 0, v: 1, w: 0 };
                       update({ seedTarget: { ...current, u: v } });
                     }}
                     automatedValue={getAutoVal('seedTarget.u')}
                     linkStatus={getLinkStatus('seedTarget.u')}
                     onLink={() => handleLink('seedTarget.u')}
                  />
                  <ParameterControl
                     label="V (Grn)"
                     value={config.seedTarget?.v ?? 1} min={0} max={1} step={0.1}
                     onChange={(v) => {
                       const current = config.seedTarget || { u: 0, v: 1, w: 0 };
                       update({ seedTarget: { ...current, v: v } });
                     }}
                     automatedValue={getAutoVal('seedTarget.v')}
                     linkStatus={getLinkStatus('seedTarget.v')}
                     onLink={() => handleLink('seedTarget.v')}
                  />
                  <ParameterControl
                     label="W (Blu)"
                     value={config.seedTarget?.w ?? 0} min={0} max={1} step={0.1}
                     onChange={(v) => {
                       const current = config.seedTarget || { u: 0, v: 1, w: 0 };
                       update({ seedTarget: { ...current, w: v } });
                     }}
                     automatedValue={getAutoVal('seedTarget.w')}
                     linkStatus={getLinkStatus('seedTarget.w')}
                     onLink={() => handleLink('seedTarget.w')}
                  />
               </div>
            </div>
         </div>

         {!compact && (
            <Button onClick={() => onReset()} className="w-full flex gap-2 justify-center font-normal py-1.5 text-xs cursor-pointer" variant="secondary">
               <RotateCcw size={12} className="ui-icon-emerald" /> Re-Seed Simulation
            </Button>
         )}

         {disabled && (
            <div className="text-[10px] text-amber-500 text-center italic mt-1 font-normal">
               Disabled when using external media.
            </div>
         )}
      </div>
   );
};
