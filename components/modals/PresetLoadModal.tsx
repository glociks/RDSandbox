import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button, Label } from '../ui/Shared';
import { X, Download } from 'lucide-react';
import { SceneState } from '../../types';
import { useModalA11y } from '../../hooks/useFocusTrap';

export type LoadStrategy = 'ignore' | 'replace' | 'add';

export interface PresetLoadSettings {
    physics: 'ignore' | 'replace';
    continuousSeeds: LoadStrategy;
    automation: LoadStrategy;
}

interface Props {
    preset: SceneState;
    onConfirm: (settings: PresetLoadSettings) => void;
    onCancel: () => void;
}

export const PresetLoadModal: React.FC<Props> = ({ preset: _preset, onConfirm, onCancel }) => {
    const [settings, setSettings] = useState<PresetLoadSettings>({
        physics: 'replace',
        continuousSeeds: 'replace',
        automation: 'replace'
    });

    const containerRef = useModalA11y({ isOpen: true, onClose: onCancel });

    return createPortal(
        <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-load-title"
            className="fixed inset-0 ui-modal-overlay flex items-center justify-center z-[200] backdrop-blur-sm"
        >
            <Card className="w-80 flex flex-col p-4 ui-modal shadow-2xl space-y-4">
                <div className="flex items-center justify-between ui-modal-header pb-2">
                    <h2 id="preset-load-title" className="text-xs font-bold uppercase tracking-wider ui-modal-title flex items-center gap-2">
                        <Download size={14} className="text-emerald-400" />
                        Import Preset Settings
                    </h2>
                    <button onClick={onCancel} aria-label="Close dialog" className="ui-modal-close transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] text-zinc-400">Select how you want to merge each part of the preset into your current session.</p>

                    <div className="space-y-3">
                        {/* Physics & Initial Seed */}
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="preset-load-physics">Initial Seed &amp; Physics</Label>
                            <select
                                id="preset-load-physics"
                                name="preset-load-physics"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-300 outline-none"
                                value={settings.physics}
                                onChange={(e) => setSettings({ ...settings, physics: e.target.value as 'ignore' | 'replace' })}
                                aria-label="Initial Seed and Physics Strategy"
                            >
                                <option value="replace">Replace Current</option>
                                <option value="ignore">Do Not Load</option>
                            </select>
                        </div>

                        {/* Continuous Seeds */}
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="preset-load-cseeds">Add Seeds (Continuous)</Label>
                            <select
                                id="preset-load-cseeds"
                                name="preset-load-cseeds"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-300 outline-none"
                                value={settings.continuousSeeds}
                                onChange={(e) => setSettings({ ...settings, continuousSeeds: e.target.value as LoadStrategy })}
                                aria-label="Continuous Seeds Strategy"
                            >
                                <option value="replace">Replace Current</option>
                                <option value="add">Add to Current</option>
                                <option value="ignore">Do Not Load</option>
                            </select>
                        </div>

                        {/* Automation */}
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="preset-load-auto">Automation</Label>
                            <select
                                id="preset-load-auto"
                                name="preset-load-auto"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-300 outline-none"
                                value={settings.automation}
                                onChange={(e) => setSettings({ ...settings, automation: e.target.value as LoadStrategy })}
                                aria-label="Automation Strategy"
                            >
                                <option value="replace">Replace Current</option>
                                <option value="add">Add to Current</option>
                                <option value="ignore">Do Not Load</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex justify-between gap-2 border-t border-zinc-800">
                    <Button size="sm" variant="secondary" onClick={onCancel} className="w-1/2">
                        Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => onConfirm(settings)} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white">
                        Confirm Import
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};
