import React, { useRef, useState } from 'react';
import { Plus, RotateCcw, Sprout } from 'lucide-react';
import { Button, Switch } from '../ui/Shared';
import { ContinuousSeed, ContinuousSeedType, InitialSeedConfig } from '../../types';
import { ContinuousSeedItem } from './ContinuousSeedItem';
import { AddSeedDropdown } from '../ui/AddSeedDropdown';

interface Props {
    seeds: ContinuousSeed[];
    setSeeds: (seeds: ContinuousSeed[]) => void;
    onRemoveContinuousSeed: (seedId: string) => void;
    activeLinkModuleId: string | null;
    linkedParams: string[];
    automatedParams: Record<string, number>;
    onLinkParam?: (paramKey: string) => void;
    onReset?: () => void;
    autoCloseAccordions?: boolean;
}

export const ContinuousSeedMenu: React.FC<Props> = ({
    seeds, setSeeds, onRemoveContinuousSeed, activeLinkModuleId, linkedParams, automatedParams, onLinkParam, onReset, autoCloseAccordions = true
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [autoRefreshSeeds, setAutoRefreshSeeds] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const reseedTimerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerDebouncedReseed = () => {
        if (reseedTimerRef.current) clearTimeout(reseedTimerRef.current);
        reseedTimerRef.current = setTimeout(() => {
            if (onReset) onReset();
        }, 16);
    };

    const handleUpdateSeeds = (newSeeds: ContinuousSeed[], shouldReseed: boolean = true) => {
        setSeeds(newSeeds);
        if (shouldReseed && autoRefreshSeeds && onReset) {
            triggerDebouncedReseed();
        }
    };

    const addSeed = (type: ContinuousSeedType, seedConfig?: InitialSeedConfig, asStartingSeed: boolean = true) => {
        const newSeed: ContinuousSeed = {
            id: `cseed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Seed`,
            type,
            enabled: true,
            isMinimized: false,
            opacity: 1.0,
            blendMode: 'replace',
            x: 0,
            y: 0,
            scaleX: 1.0,
            scaleY: 1.0,
            rotation: 0,
            blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
            seedConfig,
            isStartingSeed: asStartingSeed
        };
        const currentSeeds = autoCloseAccordions ? seeds.map(s => ({ ...s, isMinimized: true })) : seeds;
        handleUpdateSeeds([...currentSeeds, newSeed], true);
        setShowDropdown(false);
    };

    const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const newSeed: ContinuousSeed = {
                id: `cseed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                type: 'image',
                enabled: true,
                isMinimized: false,
                opacity: 1.0,
                blendMode: 'replace',
                x: 0, y: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0,
                blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
                mediaConfig: { type: 'image', element: img, opacity: 1, playbackSpeed: 1, keepAspect: true, seedOnReset: false },
                isStartingSeed: false
            };
            const currentSeeds = autoCloseAccordions ? seeds.map(s => ({ ...s, isMinimized: true })) : seeds;
            handleUpdateSeeds([...currentSeeds, newSeed], true);
        };
        img.src = url;
        e.target.value = '';
        setShowDropdown(false);
    };

    const handleVideoImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const vid = document.createElement('video');
        vid.src = url;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.crossOrigin = "anonymous";

        const newSeed: ContinuousSeed = {
            id: `cseed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'video',
            enabled: true,
            isMinimized: false,
            opacity: 1.0,
            blendMode: 'replace',
            x: 0, y: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0,
            blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
            mediaConfig: { type: 'video', element: vid, opacity: 1, playbackSpeed: 1, keepAspect: true, seedOnReset: false },
            isStartingSeed: false
        };
        const currentSeeds = autoCloseAccordions ? seeds.map(s => ({ ...s, isMinimized: true })) : seeds;
        handleUpdateSeeds([...currentSeeds, newSeed], true);
        e.target.value = '';

        vid.onloadedmetadata = () => {
            vid.play().catch(err => console.error("Video auto-play failed", err));
        };
        vid.load();
        setShowDropdown(false);
    };

    const handleWebcamImport = async () => {
        setShowDropdown(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const vid = document.createElement('video');
            vid.srcObject = stream;
            vid.autoplay = true;
            vid.playsInline = true;
            vid.muted = true;

            const newSeed: ContinuousSeed = {
                id: `cseed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: 'Webcam',
                type: 'webcam',
                enabled: true,
                isMinimized: false,
                opacity: 1.0,
                blendMode: 'replace',
                x: 0, y: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0,
                blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
                mediaConfig: { type: 'webcam', element: vid, opacity: 1, playbackSpeed: 1, keepAspect: true, seedOnReset: false },
                isStartingSeed: false
            };
            const currentSeeds = autoCloseAccordions ? seeds.map(s => ({ ...s, isMinimized: true })) : seeds;
            handleUpdateSeeds([...currentSeeds, newSeed], true);

            vid.onloadedmetadata = () => {
                vid.play().catch(err => console.error("Webcam auto-play failed", err));
            };
        } catch (err) {
            console.error("Webcam error", err);
            alert("Failed to access webcam. Check permissions.");
        }
    };

    const addSeedContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="space-y-2.5 relative">
            <input type="file" id="cseed-image-import" name="cseed-image-import" className="hidden" accept="image/*" ref={fileInputRef} onChange={handleImageImport} />
            <input type="file" id="cseed-video-import" name="cseed-video-import" className="hidden" accept="video/*" ref={videoInputRef} onChange={handleVideoImport} />

            {/* 1. TOP: Add Seed Button & Dropdown */}
            <div ref={addSeedContainerRef} className="relative">
                <Button
                    onClick={() => setShowDropdown(prev => !prev)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-normal ui-add-effect-btn rounded shadow-sm cursor-pointer"
                >
                    <Plus size={14} className="text-indigo-300" /> Add Seed
                </Button>

                <AddSeedDropdown
                    isOpen={showDropdown}
                    onClose={() => setShowDropdown(false)}
                    onSelectSeed={addSeed}
                    onImportImage={() => fileInputRef.current?.click()}
                    onImportVideo={() => videoInputRef.current?.click()}
                    onImportWebcam={handleWebcamImport}
                    containerRef={addSeedContainerRef}
                />
            </div>

            {/* 2. MIDDLE: List of Seed Items */}
            <div className="flex flex-col gap-1.5">
                {seeds.map((seed, index) => (
                    <ContinuousSeedItem
                        key={seed.id}
                        seed={seed}
                        updateSeed={(updates, shouldReseed = true) => {
                            let newSeeds: ContinuousSeed[];
                            if (updates.isMinimized === false && autoCloseAccordions) {
                                newSeeds = seeds.map((s, i) => i === index ? { ...s, ...updates } : { ...s, isMinimized: true });
                            } else {
                                newSeeds = [...seeds];
                                newSeeds[index] = { ...newSeeds[index], ...updates };
                            }
                            handleUpdateSeeds(newSeeds, shouldReseed);
                        }}
                        removeSeed={() => {
                            onRemoveContinuousSeed(seed.id);
                            if (autoRefreshSeeds && onReset) triggerDebouncedReseed();
                        }}
                        activeLinkModuleId={activeLinkModuleId}
                        linkedParams={linkedParams}
                        automatedParams={automatedParams}
                        onLinkParam={onLinkParam}
                    />
                ))}

                {seeds.length === 0 && (
                    <div className="text-[10px] text-zinc-500 text-center italic py-3 bg-zinc-950/30 rounded border border-zinc-900">
                        No seeds configured. Click "+ Add Seed" above to create initial or continuous patterns.
                    </div>
                )}
            </div>

            {/* Auto-refresh Seeds Toggle */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-950/60 rounded border border-zinc-800/80 text-[10px] text-zinc-300 select-none">
                <span className="flex items-center gap-1.5 text-zinc-300 font-normal">
                    <Sprout size={12} className={autoRefreshSeeds ? "text-emerald-400" : "text-zinc-500"} />
                    Auto-refresh seeds
                </span>
                <Switch
                    checked={autoRefreshSeeds}
                    onCheckedChange={setAutoRefreshSeeds}
                />
            </div>

            {/* 3. BOTTOM: Re-Seed Simulation Button */}
            {onReset && (
                <Button
                    onClick={() => onReset()}
                    className="w-full flex gap-2 justify-center py-2 text-xs font-semibold bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 shadow-sm"
                    variant="secondary"
                >
                    <RotateCcw size={13} className="text-emerald-400" /> Re-Seed Simulation
                </Button>
            )}
        </div>
    );
};
