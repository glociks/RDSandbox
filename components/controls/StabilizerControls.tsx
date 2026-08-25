import React from 'react';
import { Card, Label, Switch, ParameterControl } from '../ui/Shared';
import { Zap, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { StabilizerConfig } from '../../types';

interface Props {
  config: StabilizerConfig;
  onChange: (newConfig: StabilizerConfig) => void;
  showConfig: boolean;
  onToggleConfig: () => void;
  compact?: boolean;
  disabled?: boolean;
}

export const StabilizerControls: React.FC<Props> = ({ config, onChange, showConfig, onToggleConfig, compact = false, disabled = false }) => {
  const toggle = () => onChange({ ...config, enabled: !config.enabled });
  const update = (key: keyof StabilizerConfig, value: any) => onChange({ ...config, [key]: value });

  const Content = (
    <div className={`space-y-4 ${compact ? '' : 'p-4'} transition-colors ${!compact && config.enabled ? 'border-indigo-500/30 bg-indigo-500/5' : ''}`}>
       {!compact && (
         <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 font-medium text-sm text-zinc-200">
                <Zap size={14} className={config.enabled ? "fill-indigo-400 text-indigo-400" : "text-zinc-600"} />
                Auto-Stabilize
              </div>
            </div>
            <Switch checked={config.enabled} onCheckedChange={toggle} />
         </div>
       )}
       
       <div className={compact ? "" : "pt-2"}>
         {!compact && (
           <button 
             onClick={onToggleConfig}
             className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 w-full"
           >
             {showConfig ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
             Detailed Configuration
           </button>
         )}
         
         {(compact || showConfig) && (
           <div className={`space-y-4 mt-2 ${!compact ? 'pl-2 border-l-2 border-zinc-800 pt-2' : ''} ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <div className="bg-blue-900/20 text-blue-200 p-2 rounded text-[9px] flex gap-2 items-start border border-blue-900/50">
                 <Info size={12} className="shrink-0 mt-0.5"/>
                 Designed for Standard McRD Physics mode. May have unpredictable effects on other modes.
              </div>

              <ParameterControl 
                 label="Target Density" 
                 value={config.targetDensity} min={1.0} max={15.0} step={0.5} 
                 onChange={(v: number) => update('targetDensity', v)} 
              />
              <ParameterControl 
                 label="Correction Strength" 
                 value={config.strength} min={0.1} max={5.0} step={0.1} 
                 onChange={(v: number) => update('strength', v)} 
              />
              
              <Label>Active Parameters</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: 'adjustKOff', label: 'kOff (Decay)' },
                  { k: 'adjustKRec', label: 'kRec (Recruit)' },
                  { k: 'adjustKOn', label: 'kOn (Base)' },
                  { k: 'adjustFeed', label: 'Feed Rate' },
                ].map((item) => (
                  <label key={item.k} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-3 h-3 rounded-sm border ${(config as any)[item.k] ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-700 bg-zinc-900'} flex items-center justify-center transition-colors`}>
                      {(config as any)[item.k] && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                    </div>
                    <input 
                      type="checkbox" 
                      id={`stabilizer-opt-${item.k}`}
                      name={`stabilizer-opt-${item.k}`}
                      aria-label={item.label}
                      className="hidden" 
                      checked={(config as any)[item.k]} 
                      onChange={() => update(item.k as keyof StabilizerConfig, !(config as any)[item.k])} 
                    />
                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200">{item.label}</span>
                  </label>
                ))}
              </div>
           </div>
         )}
       </div>
    </div>
  );

  return compact ? Content : <Card>{Content}</Card>;
};