
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Button } from '../ui/Shared';
import { AutomationPanel } from '../automation/AutomationPanel';
import { AutomationModule } from '../../types';

interface SidebarRightProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  width: number;
  onWidthChange?: (w: number) => void;
  modules: AutomationModule[];
  setModules: (m: AutomationModule[]) => void;
  activeLinkModuleId: string | null;
  setActiveLinkModuleId: (id: string | null) => void;

  moduleOutputs: Record<string, number>;
  targetOutputs: Record<string, number>;
  simTime: number;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  isOpen, setIsOpen, width, onWidthChange, modules, setModules, activeLinkModuleId, setActiveLinkModuleId,
  moduleOutputs, targetOutputs, simTime
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX; // Dragging left increases width
      const maxWidth = typeof window !== 'undefined' ? Math.min(650, window.innerWidth - 20) : 650;
      const newWidth = Math.min(Math.max(startWidth + delta, 180), maxWidth);
      onWidthChange?.(newWidth);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStartResize = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const startX = e.touches[0].clientX;
    const startWidth = width;

    const onTouchMove = (moveEvent: TouchEvent) => {
      const delta = startX - moveEvent.touches[0].clientX;
      const maxWidth = typeof window !== 'undefined' ? Math.min(650, window.innerWidth - 20) : 650;
      const newWidth = Math.min(Math.max(startWidth + delta, 180), maxWidth);
      onWidthChange?.(newWidth);
    };

    const onTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full ${!isOpen ? 'z-[45]' : 'z-[55]'} flex flex-col ui-sidebar backdrop-blur-md border-l border-zinc-800 shadow-2xl overflow-hidden pointer-events-auto ${isDragging ? '!transition-none select-none' : 'transition-[width,transform] duration-300 ease-in-out'} ${!isOpen ? 'ui-sidebar-minimized w-[44px]' : 'w-full'}`}
      style={{
        '--sidebar-w': `${width}px`,
        width: !isOpen ? undefined : `${width}px`,
        maxWidth: !isOpen ? undefined : 'calc(100vw - 16px)'
      } as React.CSSProperties}
    >
      {/* Left Edge Resize Handle */}
      {isOpen && (
        <div
          className="absolute top-0 left-0 h-full cursor-col-resize ui-sidebar-resizer z-[60] select-none touch-none"
          onMouseDown={handleMouseDownResize}
          onTouchStart={handleTouchStartResize}
          title="Drag to resize sidebar"
        />
      )}
      {!isOpen ? (
        <div
          className="h-full flex flex-col items-center cursor-pointer select-none hover:bg-zinc-800/50 transition-colors group ui-sidebar-minimized-body"
          onClick={() => setIsOpen(true)}
          title="Click to Open Automation Sidebar"
        >
          <div
            className="ui-sidebar-closed-header w-full flex items-center justify-center shrink-0 cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <Button
              variant="ghost"
              size="iconSm"
              onClick={(e: any) => { e.stopPropagation(); setIsOpen(true); }}
              title="Open Automation Sidebar"
              className="ui-sidebar-closed-btn cursor-pointer"
            >
              <ChevronLeft size={16} className="ui-sidebar-closed-icon" />
            </Button>
          </div>

          <div
            className="flex-1 flex flex-col items-center justify-start pt-4 gap-4 w-full cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <Activity size={16} className="ui-sidebar-minimized-icon group-hover:scale-110 transition-transform cursor-pointer" />
          </div>
        </div>
      ) : (
        <div className="h-full w-full flex flex-col min-w-0 overflow-hidden">

          {/* Header */}
          <div
            className="p-2 ui-sidebar-header flex items-center justify-between border-b cursor-pointer transition-colors shrink-0"
            onClick={() => setIsOpen(false)}
          >
            <span className="font-normal text-[10px] uppercase tracking-widest ui-sidebar-title flex items-center gap-1.5 whitespace-nowrap">
              <Activity size={14} className="ui-icon-sidebar shrink-0" /> Automation ({modules.length})
            </span>
            <Button variant="ghost" size="iconSm" onClick={(e: any) => { e.stopPropagation(); setIsOpen(false); }} title="Minimize Sidebar">
              <ChevronRight size={16} className="ui-icon-sidebar" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col h-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <AutomationPanel
              modules={modules}
              setModules={setModules}
              activeLinkModuleId={activeLinkModuleId}
              setActiveLinkModuleId={setActiveLinkModuleId}
              moduleOutputs={moduleOutputs}
              targetOutputs={targetOutputs}
              simTime={simTime}
            />
          </div>
        </div>
      )}
    </div>
  );
};
