import React, { useEffect, useState } from 'react';
import { ParameterControl, Label, Button } from '../../ui/Shared';
import { initAudio, getAudioDevices, updateAudioFilter } from '../../../utils/automation';
import { Mic, RefreshCcw, Settings2 } from 'lucide-react';
import { AutomationModule } from '../../../types';

interface AudioControlsProps {
    module: AutomationModule;
    onUpdate: (updates: Partial<AutomationModule>) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({ module, onUpdate }) => {
    const aud = module.audio || {
        sourceId: '',
        filterType: 'off',
        filterFreq: 1000,
        gain: 1.0,
        smoothing: 0.5,
        deviceId: '',
    };

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [isListening, setIsListening] = useState(false);

    const update = (k: string, v: unknown) => {
        const newConfig = { ...aud, [k]: v };
        onUpdate({ audio: newConfig });

        if (k === 'filterType' || k === 'filterFreq') {
            updateAudioFilter(
                k === 'filterType' ? (v as string) : aud.filterType,
                k === 'filterFreq' ? (v as number) : aud.filterFreq
            );
        }
    };

    const loadDevices = async () => {
        const devs = await getAudioDevices();
        setDevices(devs);
    };

    useEffect(() => {
        loadDevices();
    }, []);

    const handleDeviceChange = (deviceId: string) => {
        update('deviceId', deviceId);
        initAudio(deviceId, {
            type: (aud.filterType as BiquadFilterType) || 'allpass',
            freq: aud.filterFreq || 1000,
        });
    };

    useEffect(() => {
        if (!aud.filterType) update('filterType', 'off');
        if (!aud.filterFreq) update('filterFreq', 1000);
    }, []);

    const handleActivateAudio = async () => {
        try {
            await initAudio(aud.deviceId, {
                type: (aud.filterType as BiquadFilterType) || 'allpass',
                freq: aud.filterFreq || 1000,
            });
            setIsListening(true);
            loadDevices();
        } catch (e) {
            console.error("[AudioControls] Audio init error:", e);
        }
    };

    return (
        <div className="space-y-3">
            {/* Device Selection */}
            <div className="space-y-1">
                <Label htmlFor={`audio-dev-${module.id}`} className="flex items-center justify-between">
                    <span>Input Device</span>
                    <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <span className="text-[9px] text-zinc-500 font-mono">{isListening ? 'ACTIVE' : 'INACTIVE'}</span>
                    </span>
                    <button onClick={loadDevices} title="Refresh Devices" aria-label="Refresh Audio Devices" className="cursor-pointer">
                        <RefreshCcw size={10} className="text-zinc-500 hover:text-white" />
                    </button>
                </Label>
                <div className="flex gap-2">
                    <select
                        id={`audio-dev-${module.id}`}
                        name={`audio-dev-${module.id}`}
                        className="flex-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 p-1.5 rounded outline-none cursor-pointer hover:border-zinc-700"
                        value={aud.deviceId || ''}
                        onChange={(e) => handleDeviceChange(e.target.value)}
                        aria-label="Audio Input Device"
                    >
                        <option value="">Default Microphone</option>
                        {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Microphone ${d.deviceId.slice(0, 4)}...`}
                            </option>
                        ))}
                    </select>
                    <Button
                        size="iconSm"
                        variant={isListening ? "primary" : "secondary"}
                        onClick={handleActivateAudio}
                        title={isListening ? "Audio Active (Click to re-init)" : "Activate Audio (Microphone)"}
                        aria-label="Activate Microphone Audio"
                        className="cursor-pointer"
                    >
                        <Mic size={12} className={isListening ? "text-white" : "text-zinc-400"} />
                    </Button>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-zinc-800/30 p-2 rounded-sm border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 mb-1 border-b border-zinc-800/50 pb-1">
                    <Settings2 size={10} className="text-zinc-500" />
                    <Label>Frequency Filter</Label>
                </div>

                <div className="flex gap-2">
                    <div className="w-1/3">
                        <Label htmlFor={`audio-filt-type-${module.id}`} className="mb-1 block">Type</Label>
                        <select
                            id={`audio-filt-type-${module.id}`}
                            name={`audio-filt-type-${module.id}`}
                            className="w-full bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 p-1 rounded outline-none"
                            value={aud.filterType || 'off'}
                            onChange={(e) => update('filterType', e.target.value)}
                            aria-label="Audio Filter Type"
                        >
                            <option value="off">None (Full)</option>
                            <option value="lowpass">Low Pass (Bass)</option>
                            <option value="highpass">High Pass (Treble)</option>
                            <option value="bandpass">Band Pass (Mid)</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <ParameterControl
                            label="Freq (Hz)"
                            value={aud.filterFreq || 1000}
                            min={20}
                            max={15000}
                            step={10}
                            onChange={(v: number) => update('filterFreq', v)}
                            disabled={!aud.filterType || aud.filterType === 'off'}
                        />
                    </div>
                </div>
            </div>

            {/* Gain and Smooth */}
            <div className="flex gap-1">
                <div className="flex-1">
                    <ParameterControl label="Gain" value={aud.gain} min={0} max={10} step={0.1} onChange={(v: number) => update('gain', v)} />
                </div>
                <div className="flex-1">
                    <ParameterControl label="Smooth" value={aud.smoothing} min={0} max={0.99} step={0.01} onChange={(v: number) => update('smoothing', v)} />
                </div>
            </div>
        </div>
    );
};
