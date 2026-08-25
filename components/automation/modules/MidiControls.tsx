import React, { useEffect, useState } from 'react';
import { AutomationModule } from '../../../types';
import { ParameterControl, Label } from '../../ui/Shared';
import { getMidiDevices, initMidi, MidiDeviceInput } from '../../../utils/automation';

interface Props {
    module: AutomationModule;
    onUpdate: (u: Partial<AutomationModule>) => void;
    modulesList: AutomationModule[];
}

export const MidiControls: React.FC<Props> = ({ module, onUpdate }) => {
    const config = module.midi || {
        deviceId: 'any',
        channel: 0,
        type: 'cc' as const,
        ccNumber: 1,
        smoothness: 0.1,
        lastEventTime: 0,
    };
    
    const [devices, setDevices] = useState<MidiDeviceInput[]>([]);

    useEffect(() => {
        let isMounted = true;
        let interval: ReturnType<typeof setInterval> | undefined;

        const setup = async () => {
            await initMidi();
            if (!isMounted) return;
            
            const updateDevices = () => {
                setDevices(getMidiDevices());
            };
            updateDevices();
            interval = setInterval(updateDevices, 2000);
        };
        
        setup();

        return () => {
            isMounted = false;
            if (interval) clearInterval(interval);
        };
    }, []);

    const handleChange = (updates: Partial<typeof config>) => {
        onUpdate({ midi: { ...config, ...updates } });
    };

    return (
        <div className="space-y-2 border border-zinc-700/50 p-2 rounded-sm bg-zinc-900/50">
            {/* MIDI Device Selector */}
            <div className="space-y-1">
                <Label htmlFor={`midi-dev-${module.id}`}>MIDI Device</Label>
                <select
                    id={`midi-dev-${module.id}`}
                    name={`midi-dev-${module.id}`}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-1 py-1 text-[10px] text-zinc-300"
                    value={config.deviceId || ''}
                    onChange={(e) => handleChange({ deviceId: e.target.value })}
                    aria-label="MIDI Device"
                >
                    <option value="any">Any Device</option>
                    {devices.map(d => (
                        <option key={d.id} value={d.id}>{d.name || d.id}</option>
                    ))}
                </select>
            </div>

            {/* Grid for MIDI settings */}
            <div className="grid grid-cols-2 gap-2">
                {/* Channel Selector */}
                <div className="space-y-1">
                    <Label htmlFor={`midi-ch-${module.id}`}>Channel</Label>
                    <select
                        id={`midi-ch-${module.id}`}
                        name={`midi-ch-${module.id}`}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-1 py-1 text-[10px] text-zinc-300"
                        value={config.channel.toString()}
                        onChange={(e) => handleChange({ channel: parseInt(e.target.value, 10) })}
                        aria-label="MIDI Channel"
                    >
                        <option value="0">Any (1-16)</option>
                        {Array.from({ length: 16 }).map((_, i) => (
                            <option key={i + 1} value={(i + 1).toString()}>Ch {i + 1}</option>
                        ))}
                    </select>
                </div>

                {/* Input Type Selector */}
                <div className="space-y-1">
                    <Label htmlFor={`midi-type-${module.id}`}>Input Type</Label>
                    <select
                        id={`midi-type-${module.id}`}
                        name={`midi-type-${module.id}`}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-1 py-1 text-[10px] text-zinc-300"
                        value={config.type}
                        onChange={(e) => handleChange({ type: e.target.value as 'note' | 'cc' })}
                        aria-label="MIDI Input Type"
                    >
                        <option value="note">Note Pitch (0-1)</option>
                        <option value="cc">Control Change</option>
                    </select>
                </div>
            </div>

            {config.type === 'cc' && (
                <ParameterControl
                    label="CC Number"
                    value={config.ccNumber || 0}
                    min={0}
                    max={127}
                    step={1}
                    onChange={(v) => handleChange({ ccNumber: v })}
                />
            )}

            <ParameterControl
                label="Smoothness"
                value={config.smoothness}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => handleChange({ smoothness: v })}
            />
        </div>
    );
};
