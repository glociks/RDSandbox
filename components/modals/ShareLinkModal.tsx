import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button, Input } from '../ui/Shared';
import { Link, Copy, Check, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useFocusTrap';

interface Props {
    url?: string;
    presetUrl?: string;
    onClose: () => void;
}

export const ShareLinkModal: React.FC<Props> = ({ url, presetUrl, onClose }) => {
    const finalUrl = url || presetUrl || '';
    const [copied, setCopied] = useState(false);
    const containerRef = useModalA11y({ isOpen: true, onClose });

    const handleCopy = async () => {
        if (!finalUrl) return;
        try {
            await navigator.clipboard.writeText(finalUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard', err);
        }
    };

    return createPortal(
        <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-link-modal-title"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <Card
                className="w-96 p-5 space-y-4 bg-zinc-900 border-zinc-700 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h2 id="share-link-modal-title" className="text-sm font-normal uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                        <Link size={16} className="text-indigo-400" />
                        Share Preset Link
                    </h2>
                    <button onClick={onClose} aria-label="Close dialog" className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                        Copy the link below to share your exact current configuration, including all effects, automation, and simulation parameters.
                    </p>
                    <div className="flex items-center gap-2 mt-2 bg-zinc-950 p-2 border border-zinc-800 rounded-md">
                        <Input
                            type="text"
                            readOnly
                            aria-label="Preset Share URL"
                            value={finalUrl}
                            className="flex-1 bg-transparent text-xs text-zinc-300 font-mono outline-none border-none focus:ring-0 cursor-text select-all"
                            onClick={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.select()}
                        />
                        <Button
                            size="iconSm"
                            variant={copied ? "primary" : "secondary"}
                            onClick={handleCopy}
                            aria-label="Copy preset link"
                            className={`shrink-0 transition-colors cursor-pointer ${copied ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border-emerald-500/30' : ''}`}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </Button>
                    </div>
                </div>

                {/* Action */}
                <div className="pt-2">
                    <Button size="sm" variant="secondary" onClick={onClose} className="w-full font-normal cursor-pointer">
                        Close
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};
