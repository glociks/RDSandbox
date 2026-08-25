import React, { useRef, useState } from 'react';
import { Label, ParameterControl, Button, Switch } from '../ui/Shared';
import { ContinuousSeed } from '../../types';
import { ChevronRight, ChevronLeft, Layers, Trash2, Image as ImageIcon, Video, Camera, AlertTriangle, Sprout, Clock, Dna, Shapes, Grid, FunctionSquare, Type, Link2, Unlink2 } from 'lucide-react';
import { InitialSeedMenu } from './InitialSeedMenu';
import { getSeedIcon } from '../../utils/effectIcons';

interface Props {
    seed: ContinuousSeed;
    updateSeed: (updates: Partial<ContinuousSeed>, shouldReseed?: boolean) => void;
    removeSeed: () => void;
    activeLinkModuleId: string | null;
    linkedParams: string[];
    automatedParams: Record<string, number>;
    onLinkParam?: (paramKey: string) => void;
}

export const ContinuousSeedItem: React.FC<Props> = ({ seed, updateSeed, removeSeed, activeLinkModuleId, linkedParams, automatedParams, onLinkParam }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [isAspectLocked, setIsAspectLocked] = useState(false);
    const lockedRatioRef = useRef<number>(1.0);

    const isStarting = !!seed.isStartingSeed;

    const handleScaleChange = (axis: 'x' | 'y', newVal: number) => {
        if (!isAspectLocked) {
            if (axis === 'x') updateSeed({ scaleX: newVal }, true);
            else updateSeed({ scaleY: newVal }, true);
            return;
        }

        const ratio = lockedRatioRef.current > 0.001 ? lockedRatioRef.current : (seed.scaleX > 0.001 ? (seed.scaleY / seed.scaleX) : 1.0);

        if (axis === 'x') {
            const minX = Math.max(0.05, 0.05 / ratio);
            const maxX = Math.min(5.0, 5.0 / ratio);
            const clampedX = Math.max(minX, Math.min(maxX, newVal));
            const calculatedY = Math.max(0.05, Math.min(5.0, Number((clampedX * ratio).toFixed(2))));
            updateSeed({ scaleX: Number(clampedX.toFixed(2)), scaleY: calculatedY }, true);
        } else {
            const minY = Math.max(0.05, 0.05 * ratio);
            const maxY = Math.min(5.0, 5.0 * ratio);
            const clampedY = Math.max(minY, Math.min(maxY, newVal));
            const calculatedX = Math.max(0.05, Math.min(5.0, Number((clampedY / ratio).toFixed(2))));
            updateSeed({ scaleX: calculatedX, scaleY: Number(clampedY.toFixed(2)) }, true);
        }
    };

    const getLinkStatus = (subKey: string) => {
        if (!activeLinkModuleId) return undefined;
        if (linkedParams?.includes(`cseed_${seed.id}_${subKey}`)) return 'selected';
        return 'selectable';
    };

    const handleLink = (subKey: string) => {
        if (onLinkParam) onLinkParam(`cseed_${seed.id}_${subKey}`);
    };

    const getAutoVal = (k: string) => automatedParams[`cseed_${seed.id}_${k}`];

    const handleReattachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            updateSeed({ mediaConfig: { type: 'image', opacity: 1, playbackSpeed: 1, keepAspect: true, seedOnReset: false, ...(seed.mediaConfig || {}), element: img } });
            e.target.value = '';
        };
        img.src = url;
    };

    const handleReattachVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const vid = document.createElement('video');
        vid.src = url; vid.loop = true; vid.muted = true; vid.playsInline = true; vid.crossOrigin = "anonymous";
        vid.onloadedmetadata = () => {
            updateSeed({ mediaConfig: { type: 'video', opacity: 1, playbackSpeed: 1, keepAspect: true, seedOnReset: false, ...(seed.mediaConfig || {}), element: vid } });
            e.target.value = '';
        };
        vid.load();
    };

    const handleReattachWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const vid = document.createElement('video');
            vid.srcObject = stream; vid.autoplay = true; vid.playsInline = true; vid.muted = true;
            vid.onloadedmetadata = () => {
                updateSeed({ mediaConfig: { type: 'webcam', opacity: 1, playbackSpeed: 1, keepAspect: true, seedOnReset: false, ...(seed.mediaConfig || {}), element: vid } });
            };
        } catch (err) {
            console.error("Webcam error", err);
            alert("Failed to access webcam.");
        }
    };

    const Icon = getSeedIcon(seed.type);
    const isOpen = !seed.isMinimized;

    return (
        <div className={`ui-section border rounded overflow-hidden transition-all duration-150 mb-2 ${seed.enabled ? 'border-zinc-800/90 bg-zinc-900/40' : 'border-zinc-900/60 bg-zinc-950/40 opacity-75'}`}>
            <input type="file" id={`cseed-reattach-image-${seed.id}`} name={`cseed-reattach-image-${seed.id}`} className="hidden" accept="image/*" ref={fileInputRef} onChange={handleReattachImage} />
            <input type="file" id={`cseed-reattach-video-${seed.id}`} name={`cseed-reattach-video-${seed.id}`} className="hidden" accept="video/*" ref={videoInputRef} onChange={handleReattachVideo} />

            {/* Seed Header matching Effects Header */}
            <div
                className={`flex items-center justify-between p-2 cursor-pointer transition-colors select-none ${seed.enabled ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-900/50'}`}
                onClick={() => updateSeed({ isMinimized: !seed.isMinimized }, false)}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Enable Toggle Switch */}
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center mr-0.5">
                        <Switch
                            checked={seed.enabled}
                            onCheckedChange={() => updateSeed({ enabled: !seed.enabled }, true)}
                        />
                    </div>

                    {/* Icon */}
                    <div className={`p-1 rounded bg-zinc-800/80 shrink-0 ${seed.enabled ? `seed-icon-${seed.type}` : 'text-zinc-500'}`}>
                        <Icon size={12} />
                    </div>

                    {/* Title */}
                    <span className={`text-[11px] font-semibold truncate tracking-wide ${seed.enabled ? 'text-zinc-200' : 'text-zinc-400'}`}>
                        {seed.name}
                    </span>

                    {/* Badge */}
                    {seed.isStartingSeed ? (
                        <span className="text-[8px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-1 py-0.2 rounded font-mono shrink-0 flex items-center gap-0.5">
                            <Sprout size={8} /> Start
                        </span>
                    ) : (
                        <span className="text-[8px] bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 px-1 py-0.2 rounded font-mono shrink-0 flex items-center gap-0.5">
                            <Clock size={8} /> Cont
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Red Trash Delete Button */}
                    <button
                        type="button"
                        className="ui-effect-trash-btn text-zinc-500 hover:text-red-400 p-1"
                        onClick={(e) => { e.stopPropagation(); removeSeed(); }}
                        title="Remove Seed"
                    >
                        <Trash2 size={13} />
                    </button>

                    {/* Expand/Collapse Chevron */}
                    <button
                        type="button"
                        className="p-0.5 text-zinc-400 hover:text-white"
                        onClick={() => updateSeed({ isMinimized: !seed.isMinimized }, false)}
                    >
                        <ChevronRight size={14} className={`sidebar-chevron-icon ${isOpen ? 'is-open' : 'is-closed'}`} />
                    </button>
                </div>
            </div>

            {/* Accordion Body with Smooth CSS Transition */}
            <div className={`ui-effect-body-accordion ${isOpen ? 'is-open' : 'is-closed'}`}>
                <div className="ui-effect-body-inner p-2.5 border-t border-zinc-800/80 bg-zinc-950/60 space-y-2.5">

                    {/* Starting Seed Toggle */}
                    <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded border border-zinc-800">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-zinc-200 flex items-center gap-1">
                                <Sprout size={11} className={seed.isStartingSeed ? "text-emerald-400" : "text-zinc-500"} />
                                Starting Seed (Reset Only)
                            </span>
                            <span className="text-[8px] text-zinc-500">
                                {seed.isStartingSeed ? "Applied once when resetting or re-seeding." : "Continuously injected on every frame."}
                            </span>
                        </div>
                        <Switch
                            checked={!!seed.isStartingSeed}
                            onCheckedChange={(v) => updateSeed({ isStartingSeed: v }, true)}
                        />
                    </div>

                    {/* Base Transform & Blending */}
                    <div className="grid grid-cols-2 gap-2">
                        <ParameterControl
                            label="Opacity"
                            value={seed.opacity} min={0} max={1} step={0.01}
                            onChange={(v) => updateSeed({ opacity: v }, true)}
                            automatedValue={getAutoVal('opacity')}
                            linkStatus={getLinkStatus('opacity')}
                            onLink={() => handleLink('opacity')}
                        />
                        <div className="space-y-1">
                            <Label htmlFor={`cseed-blend-${seed.id}`}>Blend Mode</Label>
                            <select
                                id={`cseed-blend-${seed.id}`}
                                name={`cseed-blend-${seed.id}`}
                                aria-label="Blend Mode"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-1 py-1 text-[10px] text-zinc-300"
                                value={seed.blendMode}
                                onChange={(e) => updateSeed({ blendMode: e.target.value as any }, true)}
                            >
                                <option value="add">Add</option>
                                <option value="subtract">Subtract</option>
                                <option value="multiply">Multiply</option>
                                <option value="screen">Screen</option>
                                <option value="overlay">Overlay</option>
                                <option value="replace">Replace</option>
                            </select>
                        </div>
                        <ParameterControl
                            label="Pos X"
                            value={seed.x} min={-1} max={1} step={0.01}
                            onChange={(v) => updateSeed({ x: v }, true)}
                            automatedValue={getAutoVal('x')}
                            linkStatus={getLinkStatus('x')}
                            onLink={() => handleLink('x')}
                        />
                        <ParameterControl
                            label="Pos Y"
                            value={seed.y} min={-1} max={1} step={0.01}
                            onChange={(v) => updateSeed({ y: v }, true)}
                            automatedValue={getAutoVal('y')}
                            linkStatus={getLinkStatus('y')}
                            onLink={() => handleLink('y')}
                        />
                        
                        {/* Scale X & Scale Y with Aspect Ratio Lock Toolbox */}
                        <div className="col-span-2 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-400 font-medium">Scale (X &amp; Y)</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAspectLocked(prev => {
                                            const next = !prev;
                                            if (next) {
                                                lockedRatioRef.current = seed.scaleX > 0.001 ? (seed.scaleY / seed.scaleX) : 1.0;
                                            }
                                            return next;
                                        });
                                    }}
                                    title={isAspectLocked ? "Aspect Ratio Locked (Click to unlock)" : "Lock Aspect Ratio"}
                                    className={`px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 transition-colors border cursor-pointer ${
                                        isAspectLocked
                                            ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-200 hover:bg-indigo-900'
                                            : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    {isAspectLocked ? <Link2 size={10} className="text-indigo-400" /> : <Unlink2 size={10} />}
                                    <span>{isAspectLocked ? 'Ratio Locked' : 'Unlocked'}</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-1 rounded bg-zinc-900/40 border border-zinc-800/80">
                                    <ParameterControl
                                        label="Scale X"
                                        value={seed.scaleX} min={0.05} max={5} step={0.05}
                                        onChange={(v) => handleScaleChange('x', v)}
                                        automatedValue={getAutoVal('scaleX')}
                                        linkStatus={getLinkStatus('scaleX')}
                                        onLink={() => handleLink('scaleX')}
                                    />
                                </div>
                                <div className="p-1 rounded bg-zinc-900/40 border border-zinc-800/80">
                                    <ParameterControl
                                        label="Scale Y"
                                        value={seed.scaleY} min={0.05} max={5} step={0.05}
                                        onChange={(v) => handleScaleChange('y', v)}
                                        automatedValue={getAutoVal('scaleY')}
                                        linkStatus={getLinkStatus('scaleY')}
                                        onLink={() => handleLink('scaleY')}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <ParameterControl
                                label="Rotation (°)"
                                value={seed.rotation} min={-360} max={360} step={1}
                                onChange={(v) => updateSeed({ rotation: v }, true)}
                                automatedValue={getAutoVal('rotation')}
                                linkStatus={getLinkStatus('rotation')}
                                onLink={() => handleLink('rotation')}
                            />
                        </div>
                    </div>

                    {/* Dynamic Config Based on Type */}
                    {seed.seedConfig && (
                        <div className="border border-zinc-800 rounded-sm bg-zinc-950 mt-2">
                            <InitialSeedMenu
                                config={seed.seedConfig}
                                onChange={(c) => updateSeed({ seedConfig: c }, true)}
                                onReset={() => { }}
                                compact={true}
                                activeLinkModuleId={activeLinkModuleId}
                                linkedParams={linkedParams}
                                automatedParams={automatedParams}
                                onLinkParam={onLinkParam}
                                automationPrefix={`cseed_${seed.id}_seedConfig`}
                            />
                        </div>
                    )}

                    {(seed.type === 'image' || seed.type === 'video' || seed.type === 'webcam') && (
                        <div className="border border-zinc-800 rounded-sm bg-zinc-950 p-2 space-y-2 mt-2">
                            {(!seed.mediaConfig || !seed.mediaConfig.element) ? (
                                <div className="text-[10px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-sm flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        <span className="font-bold">Media Missing</span>
                                    </div>
                                    <span className="text-[9px] opacity-80 leading-tight">This seed requires a {seed.type} file. Please select or attach media to enable this seed.</span>
                                    <div className="flex justify-start mt-1">
                                        {seed.type === 'image' && <Button size="xs" variant="primary" onClick={() => fileInputRef.current?.click()} className="gap-1 cursor-pointer"><ImageIcon size={10} /> Browse Image</Button>}
                                        {seed.type === 'video' && <Button size="xs" variant="primary" onClick={() => videoInputRef.current?.click()} className="gap-1 cursor-pointer"><Video size={10} /> Browse Video</Button>}
                                        {seed.type === 'webcam' && <Button size="xs" variant="primary" onClick={handleReattachWebcam} className="gap-1 cursor-pointer"><Camera size={10} /> Connect Webcam</Button>}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-start">
                                    {seed.type === 'image' && <Button size="xs" variant="secondary" onClick={() => fileInputRef.current?.click()} className="gap-1 cursor-pointer"><ImageIcon size={10} /> Change Image</Button>}
                                    {seed.type === 'video' && <Button size="xs" variant="secondary" onClick={() => videoInputRef.current?.click()} className="gap-1 cursor-pointer"><Video size={10} /> Change Video</Button>}
                                    {seed.type === 'webcam' && <Button size="xs" variant="secondary" onClick={handleReattachWebcam} className="gap-1 cursor-pointer"><Camera size={10} /> Change Webcam</Button>}
                                </div>
                            )}

                            {seed.type === 'video' && (
                                <ParameterControl
                                    label="Playback Speed"
                                    value={seed.mediaConfig?.playbackSpeed ?? 1.0} min={0} max={3} step={0.1}
                                    onChange={(v) => updateSeed({
                                        mediaConfig: {
                                            type: 'video',
                                            element: seed.mediaConfig?.element ?? null,
                                            opacity: seed.mediaConfig?.opacity ?? 1,
                                            keepAspect: seed.mediaConfig?.keepAspect ?? true,
                                            seedOnReset: seed.mediaConfig?.seedOnReset ?? false,
                                            playbackSpeed: v
                                        }
                                    }, true)}
                                />
                            )}
                        </div>
                    )}

                    {/* BlendIf configuration */}
                    {!seed.isStartingSeed && (
                        <div className="pt-2 border-t border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1"><Layers size={12} /> Blend IF Density</Label>
                                <Switch checked={seed.blendIf.enabled} onCheckedChange={(v) => updateSeed({ blendIf: { ...seed.blendIf, enabled: v } }, true)} />
                            </div>
                            {seed.blendIf.enabled && (
                                <div className="space-y-2 pl-2 border-l border-zinc-800">
                                    <ParameterControl
                                        label="Smoothness"
                                        value={seed.blendIf.smoothness} min={0.01} max={0.5} step={0.01}
                                        onChange={(v) => updateSeed({ blendIf: { ...seed.blendIf, smoothness: v } }, true)}
                                        automatedValue={getAutoVal('blendIf_smoothness')}
                                        linkStatus={getLinkStatus('blendIf_smoothness')}
                                        onLink={() => handleLink('blendIf_smoothness')}
                                    />
                                    <ParameterControl
                                        label="Low Threshold"
                                        value={seed.blendIf.points[0].pos} min={0} max={1} step={0.01}
                                        onChange={(v) => updateSeed({ blendIf: { ...seed.blendIf, points: [{ ...seed.blendIf.points[0], pos: v }, seed.blendIf.points[1]] } }, true)}
                                        automatedValue={getAutoVal('blendIf_low')}
                                        linkStatus={getLinkStatus('blendIf_low')}
                                        onLink={() => handleLink('blendIf_low')}
                                    />
                                    <ParameterControl
                                        label="High Threshold"
                                        value={seed.blendIf.points[1].pos} min={0} max={1} step={0.01}
                                        onChange={(v) => updateSeed({ blendIf: { ...seed.blendIf, points: [seed.blendIf.points[0], { ...seed.blendIf.points[1], pos: v }] } }, true)}
                                        automatedValue={getAutoVal('blendIf_high')}
                                        linkStatus={getLinkStatus('blendIf_high')}
                                        onLink={() => handleLink('blendIf_high')}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
