
import React from 'react';
import { Button, Slider, Switch, Input } from '../ui/Shared';
import { Image as ImageIcon, Video, Camera, X, Link2, CornerDownRight } from 'lucide-react';
import { MediaConfig } from '../../types';

interface MediaControlsProps {
  mediaConfig: MediaConfig;
  setMediaConfig: (c: MediaConfig | null) => void;
  onDetach: () => void;
  // Linking Support
  activeLinkModuleId: string | null;
  onLinkOpacity: () => void;
  isOpacityLinked: boolean;
  automatedOpacity?: number;
}

export const MediaControls: React.FC<MediaControlsProps> = ({ 
  mediaConfig, setMediaConfig, onDetach, 
  activeLinkModuleId, onLinkOpacity, isOpacityLinked, automatedOpacity 
}) => {
  
  const getLinkStatus = () => {
    if (!activeLinkModuleId) return 'idle';
    if (isOpacityLinked) return 'selected';
    return 'selectable';
  };

  const linkStatus = getLinkStatus();
  const isLinking = linkStatus !== 'idle';
  const displayOpacity = automatedOpacity !== undefined ? automatedOpacity : mediaConfig.opacity;

  // Handle linking click
  const handleOpacityClick = (e: React.MouseEvent) => {
      if (isLinking && linkStatus === 'selectable') {
          e.stopPropagation();
          onLinkOpacity();
      }
  };

  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1 mr-2 h-8">
      <div className="flex items-center gap-1 pr-2 border-r border-zinc-800">
        <Button variant="destructive" size="iconSm" onClick={onDetach} title="Detach Media" className="h-5 w-5">
            <X size={10} />
        </Button>
        {mediaConfig.type === 'image' && <ImageIcon size={12} className="text-emerald-400" />}
        {mediaConfig.type === 'video' && <Video size={12} className="text-blue-400" />}
        {mediaConfig.type === 'webcam' && <Camera size={12} className="text-red-400 animate-pulse" />}
      </div>

      {/* Compact Opacity Control (Horizontal) */}
      <div 
        className={`flex items-center gap-2 ${linkStatus === 'selectable' ? 'cursor-pointer ring-1 ring-amber-500/50 rounded px-1' : ''}`}
        onClick={handleOpacityClick}
      >
         <div className="flex items-center gap-1">
            <span className={`text-[9px] font-medium uppercase ${linkStatus === 'selected' ? 'text-emerald-400' : 'text-zinc-500'}`}>Opacity</span>
            {linkStatus === 'selected' && <Link2 size={8} className="text-emerald-400"/>}
            {linkStatus === 'selectable' && <CornerDownRight size={8} className="text-amber-400"/>}
         </div>
         
         <div className="w-16 flex items-center">
            <Slider 
                min={0} max={1} step={0.01} 
                value={displayOpacity} 
                onChange={(v: number) => !isLinking && setMediaConfig({ ...mediaConfig, opacity: v })}
                disabled={automatedOpacity !== undefined}
                className={automatedOpacity !== undefined ? "accent-yellow-400" : ""}
            />
         </div>
         <span className={`text-[9px] font-mono w-6 text-right ${automatedOpacity !== undefined ? 'text-yellow-400' : 'text-zinc-400'}`}>
            {displayOpacity.toFixed(2)}
         </span>
      </div>

      {/* Video Speed Control (Horizontal) - Hidden on Mobile */}
      {mediaConfig.type === 'video' && (
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-800">
          <span className="text-[9px] text-zinc-500 whitespace-nowrap">Speed</span>
          <div className="w-16">
            <Slider 
                min={0.1} max={5} step={0.1} 
                value={mediaConfig.playbackSpeed} 
                onChange={(v: number) => setMediaConfig({ ...mediaConfig, playbackSpeed: v })} 
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">{mediaConfig.playbackSpeed.toFixed(1)}x</span>
        </div>
      )}

      {/* Seed Toggle - Hidden on mobile (sm and down) */}
      <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-800">
        <span className="text-[9px] text-zinc-500 whitespace-nowrap">Use as Seed</span>
        <Switch
          checked={mediaConfig.seedOnReset}
          onCheckedChange={(v: boolean) => setMediaConfig({ ...mediaConfig, seedOnReset: v })}
          className="scale-75 origin-center"
        />
      </div>
    </div>
  );
};
