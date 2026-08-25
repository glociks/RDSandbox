
import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, X, Link as LinkIcon, Trash2, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { ParameterControl, Button, Label, Switch, formatParameterValue } from '../ui/Shared';
import { AutomationModule, ModTarget } from '../../types';
import { LFOControls } from './modules/LFOControls';
import { SequencerControls } from './modules/SequencerControls';
import { AudioControls } from './modules/AudioControls';
import { KeyframeControls } from './modules/KeyframeControls';
import { ADSRControls } from './modules/ADSRControls';
import { MidiControls } from './modules/MidiControls';
import { Scope } from './Scope';

interface Props {
   module: AutomationModule;
   index: number;
   onUpdate: (u: Partial<AutomationModule>) => void;
   onRemove: () => void;
   onMove: (dragIndex: number, hoverIndex: number) => void;
   isLinking: boolean;
   setLinking: (v: boolean) => void;
   modulesList: AutomationModule[];
   currentOutput: number;
   simTime: number;
   targetOutputs: Record<string, number>;
}

export const ModuleWrapper: React.FC<Props> = ({ module, index, onUpdate, onRemove, onMove, isLinking, setLinking, modulesList, currentOutput, simTime, targetOutputs }) => {
   const [showConfig, setShowConfig] = useState(true);
   const ref = useRef<HTMLDivElement>(null);

   const handleDragStart = (e: React.DragEvent) => {
      // Only drag if clicking the header/handle
      const target = e.target as HTMLElement;
      if (!target.closest('.drag-handle')) {
         e.preventDefault();
         return;
      }
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
   };

   const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (!isNaN(dragIndex) && dragIndex !== index) {
         onMove(dragIndex, index);
      }
   };

   const removeTarget = (targetId: string) => {
      onUpdate({ targets: module.targets.filter(t => t.id !== targetId) });
   };

   const updateTarget = (tId: string, updates: Partial<ModTarget>) => {
      onUpdate({ targets: module.targets.map(t => t.id === tId ? { ...t, ...updates } : t) });
   };

   const renderSpecifics = () => {
      const commonProps = { module, onUpdate, modulesList, simTime, currentOutput };
      switch (module.type) {
         case 'lfo': return <LFOControls {...commonProps} />;
         case 'sequencer': return <SequencerControls {...commonProps} />;
         case 'audio': return <AudioControls {...commonProps} />;
         case 'keyframe': return <KeyframeControls {...commonProps} />;
         case 'adsr': return <ADSRControls {...commonProps} />;
         case 'midi': return <MidiControls {...commonProps} />;
         default: return <div className="text-[9px] text-zinc-600">Specific controls not implemented.</div>;
      }
   };

   const stripeColor = isLinking ? 'bg-emerald-500' : (module.enabled ? 'bg-zinc-700' : 'bg-zinc-800/50');

   return (
      <div
         ref={ref}
         draggable
         onDragStart={handleDragStart}
         onDragOver={handleDragOver}
         onDrop={handleDrop}
         className={`flex flex-col ui-device overflow-hidden transition-all duration-200 ${isLinking ? '!border-emerald-500' : ''} ${!module.enabled ? 'opacity-70' : ''}`}
      >
         {/* Header / Title Bar */}
         <div
            className="drag-handle flex items-center ui-device-header cursor-grab active:cursor-grabbing"
            onClick={() => onUpdate({ isMinimized: !module.isMinimized })}
         >
            <div className="text-zinc-500 hover:text-zinc-300 mr-1">
               <GripVertical size={12} className="ui-icon-sidebar" />
            </div>

            <div className={`ui-device-dot rounded-full mr-2 ${stripeColor} ${isLinking ? 'animate-pulse' : ''}`} />
            <span className="font-bold flex-1 truncate select-none ui-device-title">{module.name}</span>

            <div className="flex items-center gap-2 shrink-0" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
               <Switch checked={module.enabled} onCheckedChange={(v: boolean) => onUpdate({ enabled: v })} className="scale-75 origin-right" />

               <span className="font-mono text-[10px] text-emerald-300 w-12 shrink-0 text-right bg-zinc-900/50 px-1 rounded tabular-nums inline-block">
                 {currentOutput.toFixed(2)}
               </span>

               <Button
                  size="xs" variant={isLinking ? 'primary' : 'ghost'}
                  className={`h-6 w-6 p-0 ${isLinking ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => setLinking(!isLinking)}
                  title={isLinking ? "Click a parameter to link" : "Link Parameters"}
               >
                  <LinkIcon size={12} className="ui-icon-sidebar" />
               </Button>

               <Button size="xs" variant="ghost" className="h-6 w-6 p-0 text-zinc-400 hover:text-white" onClick={() => onUpdate({ isMinimized: !module.isMinimized })}>
                  {module.isMinimized ? <Maximize2 size={12} className="ui-icon-sidebar" /> : <Minimize2 size={12} className="ui-icon-sidebar" />}
               </Button>

               <Button size="xs" variant="ghost" className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400" onClick={onRemove}>
                  <X size={12} className="ui-icon-sidebar" />
               </Button>
            </div>
         </div>

         {/* Main Body */}
         {!module.isMinimized && (
            <div className="p-2 space-y-2 cursor-default" onMouseDown={e => e.stopPropagation()}>
               {/* Visualization */}
               <Scope type={module.type === 'keyframe' || module.type === 'adsr' ? 'lfo' : module.type as any} config={module} value={currentOutput} time={simTime} />

               {/* Primary Controls (Type Specific) */}
               {renderSpecifics()}

               {/* Global Speed / BPM */}
               <div className="flex gap-1 border-t border-zinc-700/50 pt-2">
                  <div className="flex-1">
                     <ParameterControl label="BPM / Rate" value={module.bpm} min={1} max={300} step={1} onChange={(v) => onUpdate({ bpm: v })} />
                  </div>
                  <div className="flex-1">
                     <ParameterControl label="Gain" value={module.gain} min={0} max={10} step={0.1} onChange={(v) => onUpdate({ gain: v })} />
                  </div>
               </div>

               {/* Advanced Config & Targets */}
               <div className="pt-1">
                  <button
                     onClick={() => setShowConfig(!showConfig)}
                     className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-zinc-300 w-full uppercase tracking-wider py-1"
                  >
                     {showConfig ? <ChevronDown size={10} /> : <ChevronRight size={10} />} Mapping & Targets ({module.targets.length})
                  </button>

                  {showConfig && (
                     <div className="mt-1 space-y-2 bg-zinc-900/50 p-2 rounded-sm border border-zinc-800">

                        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-800/50">
                           <div className="flex items-center justify-between">
                              <Label>Range Mapping</Label>
                              <div className="flex items-center gap-1">
                                 <span className={`text-[8px] ${module.useMapping ? 'text-indigo-400' : 'text-zinc-500'}`}>MAP TO RANGE</span>
                                 <Switch checked={module.useMapping} onCheckedChange={(v: boolean) => onUpdate({ useMapping: v })} />
                              </div>
                           </div>
                           {module.useMapping ? (
                              <div className="flex gap-1 min-w-0 w-full">
                                 <div className="flex-1 min-w-0"><ParameterControl label="Min Output" value={module.minVal} min={-100} max={100} step={1} onChange={(v) => onUpdate({ minVal: v })} /></div>
                                 <div className="flex-1 min-w-0"><ParameterControl label="Max Output" value={module.maxVal} min={-100} max={100} step={1} onChange={(v) => onUpdate({ maxVal: v })} /></div>
                              </div>
                           ) : (
                              <div className="flex flex-col gap-1">
                                 <ParameterControl label="Offset" value={module.offset} min={-100} max={100} step={0.1} onChange={(v) => onUpdate({ offset: v })} />
                                 <div className="flex gap-1 min-w-0 w-full">
                                    <div className="flex-1 min-w-0"><ParameterControl label="Clamp Min" value={module.minVal} min={-100} max={100} step={1} onChange={(v) => onUpdate({ minVal: v })} /></div>
                                    <div className="flex-1 min-w-0"><ParameterControl label="Clamp Max" value={module.maxVal} min={-100} max={100} step={1} onChange={(v) => onUpdate({ maxVal: v })} /></div>
                                 </div>
                              </div>
                           )}
                        </div>

                        <div className="space-y-1 pt-1 max-h-40 overflow-y-auto custom-scrollbar">
                           {module.targets.length === 0 && (
                              <div className="flex flex-col items-center gap-2 py-2">
                                 <div className="text-[9px] text-zinc-600 italic">No linked parameters.</div>
                                 <Button size="xs" variant={isLinking ? 'primary' : 'secondary'} onClick={() => setLinking(!isLinking)}>
                                    {isLinking ? 'Linking Active...' : '+ Link Parameter'}
                                 </Button>
                              </div>
                           )}
                           {module.targets.map(t => {
                              const val = targetOutputs[`${module.id}_${t.id}`] || 0;
                              return (
                                 <div key={t.id} className="bg-zinc-800 p-1.5 rounded-sm border border-zinc-700 flex flex-col gap-1 group min-w-0">
                                    <div className="flex justify-between items-center text-[9px] text-zinc-300 font-bold px-1 gap-1.5 min-w-0">
                                       <span className="truncate flex-1 min-w-0 text-zinc-200" title={t.paramKey}>{t.paramKey}</span>
                                       <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                          <span className="font-mono text-yellow-500 shrink-0 text-right tabular-nums inline-block text-[9px]">{val.toFixed(2)}</span>
                                          <button
                                             type="button"
                                             onClick={(e) => { e.stopPropagation(); removeTarget(t.id); }}
                                             title="Remove Automation Link"
                                             className="text-zinc-500 hover:text-red-400 opacity-70 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-700/50 cursor-pointer"
                                          >
                                             <Trash2 size={11} />
                                          </button>
                                       </div>
                                    </div>
                                    <div className="flex gap-1 min-w-0 w-full">
                                       <div className="flex-1 min-w-0"><ParameterControl label="Gain" value={t.gain} min={-10} max={10} step={0.1} onChange={(v) => updateTarget(t.id, { gain: v })} /></div>
                                       <div className="flex-1 min-w-0"><ParameterControl label="Offset" value={t.offset} min={-100} max={100} step={0.1} onChange={(v) => updateTarget(t.id, { offset: v })} /></div>
                                    </div>
                                 </div>
                              );
                           })}
                           {module.targets.length > 0 && (
                              <Button size="xs" variant={isLinking ? 'primary' : 'ghost'} className={`w-full ${isLinking ? 'bg-emerald-500 hover:bg-emerald-400' : ''}`} onClick={() => setLinking(!isLinking)}>
                                 {isLinking ? 'Finish Linking' : '+ Link Another'}
                              </Button>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>
   );
};
