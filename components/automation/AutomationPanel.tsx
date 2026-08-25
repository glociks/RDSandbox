
import React from 'react';
import { Button, Label } from '../ui/Shared';
import { AutomationModule, ModType } from '../../types';
import { ModuleWrapper } from './ModuleWrapper';

import { generateId } from '../../utils/idGenerator';

// Default Module Factories
const createModule = (type: ModType, count: number): AutomationModule => {
  const base = {
    id: generateId(`mod_${type}`),
    type,
    name: `${type.toUpperCase()} ${count + 1}`,
    enabled: true,
    isMinimized: false,
    gain: 1.0,
    offset: 0.0,
    minVal: -100,
    maxVal: 100,
    useMapping: false,
    bpm: 120,
    frequency: 1.0,
    targets: []
  };

  switch (type) {
    case 'lfo': return { ...base, frequency: 0.1, lfo: { shape: 'sine', width: 0.5, phase: 0 } };
    case 'sequencer': return { ...base, sequencer: { steps: Array(16).fill(0.5), count: 16, smoothness: 0.2 }, frequency: 4.0 };
    case 'audio': return { ...base, audio: { sourceId: 'mic', filterType: 'none', filterFreq: 1000, gain: 1.0, smoothing: 0.5 } };
    case 'keyframe': return { ...base, keyframe: { timelineLength: 200, loop: true, keyframes: [{ id: 'k1', t: 0, val: 0, type: 'linear' }, { id: 'k2', t: 200, val: 1, type: 'linear' }], editor: { zoom: 1, scrollX: 0, mode: 'select', defCurveType: 'linear', selectedKeyframeId: null } } };
    case 'adsr': return { ...base, adsr: { inputSourceId: '', threshold: 0.5, attack: 10, decay: 10, sustain: 0.5, release: 20, triggerState: false, triggerTime: 0, releaseTime: 0, lastValue: 0 } };
    case 'midi': return { ...base, midi: { deviceId: 'any', channel: 0, type: 'cc', ccNumber: 1, lastEventTime: 0, smoothness: 0 } };
    default: return base;
  }
};

interface Props {
  modules: AutomationModule[];
  setModules: (m: AutomationModule[]) => void;
  activeLinkModuleId: string | null;
  setActiveLinkModuleId: (id: string | null) => void;
  moduleOutputs: Record<string, number>;
  targetOutputs: Record<string, number>;
  simTime: number;
}

export const AutomationPanel: React.FC<Props> = ({ modules, setModules, activeLinkModuleId, setActiveLinkModuleId, moduleOutputs, targetOutputs, simTime }) => {

  const addModule = (type: ModType) => {
    if (modules.length >= 20) return;
    setModules([...modules, createModule(type, modules.length)]);
  };

  const removeModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
    if (activeLinkModuleId === id) setActiveLinkModuleId(null);
  };

  const updateModule = (id: string, updates: Partial<AutomationModule>) => {
    setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const moveModule = (dragIndex: number, hoverIndex: number) => {
    const dragged = modules[dragIndex];
    const newModules = [...modules];
    newModules.splice(dragIndex, 1);
    newModules.splice(hoverIndex, 0, dragged);
    setModules(newModules);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar ui-sidebar-content relative">
        {modules.map((mod, idx) => (
          <ModuleWrapper
            key={mod.id}
            index={idx}
            module={mod}
            onUpdate={(u) => updateModule(mod.id, u)}
            onRemove={() => removeModule(mod.id)}
            onMove={moveModule}
            isLinking={activeLinkModuleId === mod.id}
            setLinking={(v) => setActiveLinkModuleId(v ? mod.id : null)}
            modulesList={modules}
            currentOutput={moduleOutputs[mod.id] || 0}
            targetOutputs={targetOutputs}
            simTime={simTime}
          />
        ))}

        <div className="min-h-[5rem] flex flex-col items-center justify-center rounded-lg ui-device-add gap-2 p-2">
          <Label>Add Device</Label>
          <div className="flex gap-1 flex-wrap justify-center">
            {(['lfo', 'sequencer', 'audio', 'keyframe', 'adsr', 'midi'] as ModType[]).map(t => (
              <Button key={t} size="xs" variant="secondary" onClick={() => addModule(t)} className="uppercase text-[9px]">{t}</Button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
};
