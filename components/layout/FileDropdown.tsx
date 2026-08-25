
import React, { useRef } from 'react';
import { FileText, ChevronDown, Download, Save, Upload, Link, RotateCcw, Settings } from 'lucide-react';
import { Button } from '../ui/Shared';
import { ClickOutside } from '../ui/ClickOutside';

interface FileDropdownProps {
  side: 'left' | 'right' | 'top';
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  onExportSnapshot: () => void;
  onSavePreset?: () => void;
  onImportPreset?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPreset?: () => void;
  onShareLink?: () => void;
  onOpenGlobalSettings?: () => void;
  onResetAll?: () => void;
}

export const FileDropdown: React.FC<FileDropdownProps> = ({
  side,
  isOpen,
  onToggle,
  onExportSnapshot,
  onSavePreset,
  onImportPreset,
  onExportPreset,
  onShareLink,
  onOpenGlobalSettings,
  onResetAll
}) => {
  const presetInput = useRef<HTMLInputElement>(null);

  return (
    <div className="relative pointer-events-auto z-50">
      {/* Hidden Persistent Preset Input */}
      {onImportPreset && (
        <input
          id="file-dropdown-import-preset"
          name="file-dropdown-import-preset"
          aria-label="Import Preset JSON"
          ref={presetInput}
          type="file"
          className="hidden"
          accept=".json"
          onChange={(e) => {
            onImportPreset(e);
            onToggle(false);
          }}
        />
      )}

      <ClickOutside onClickOutside={() => isOpen && onToggle(false)}>
        <Button
          variant="ghost"
          size="xs"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggle(!isOpen);
          }}
          className="gap-1 relative z-50 text-zinc-400 hover:text-zinc-200"
        >
          {side === 'top' ? 'File' : <FileText size={12} />} <ChevronDown size={10} />
        </Button>

        {isOpen && (
          <div className="ui-topbar-dropdown absolute top-full left-0 mt-1 w-52 z-[100] space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
            <button
              className="ui-topbar-dropdown-item text-zinc-200"
              onClick={() => {
                onExportSnapshot();
                onToggle(false);
              }}
            >
              <Download size={12} className="text-zinc-400" /> Save Snapshot as Image
            </button>

            <div className="ui-topbar-dropdown-divider" />

            {onSavePreset && (
              <button
                className="ui-topbar-dropdown-item text-zinc-300"
                onClick={() => {
                  onSavePreset();
                  onToggle(false);
                }}
              >
                <Save size={12} className="text-zinc-400" /> Save Current Preset...
              </button>
            )}

            {onImportPreset && (
              <button
                className="ui-topbar-dropdown-item text-zinc-300"
                onClick={() => presetInput.current?.click()}
              >
                <Upload size={12} className="text-zinc-400" /> Import Preset...
              </button>
            )}

            {onExportPreset && (
              <button
                className="ui-topbar-dropdown-item text-zinc-300"
                onClick={() => {
                  onExportPreset();
                  onToggle(false);
                }}
              >
                <Download size={12} className="text-zinc-400" /> Export Current Preset...
              </button>
            )}

            {onShareLink && (
              <button
                className="ui-topbar-dropdown-item !text-emerald-400"
                onClick={() => {
                  onShareLink();
                  onToggle(false);
                }}
              >
                <Link size={12} /> Share as Link
              </button>
            )}

            <div className="ui-topbar-dropdown-divider" />

            {onOpenGlobalSettings && (
              <button
                className="ui-topbar-dropdown-item text-zinc-300"
                onClick={() => {
                  onOpenGlobalSettings();
                  onToggle(false);
                }}
              >
                <Settings size={12} className="text-zinc-400" /> Settings
              </button>
            )}
          </div>
        )}
      </ClickOutside>
    </div>
  );
};
