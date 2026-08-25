
import React, { useState, useEffect } from 'react';
import { Save, ChevronDown, X, Upload, Download } from 'lucide-react';

interface PresetBarProps {
  modeKey: string;
  defaultPresets: { name: string, params: any }[];
  currentParams: any;
  onApply: (params: any) => void;
  filterKeys?: string[]; // Keys to save/restore
}

export const PresetBar: React.FC<PresetBarProps> = ({ modeKey, defaultPresets, currentParams, onApply, filterKeys }) => {
  const [userPresets, setUserPresets] = useState<{ name: string, params: any }[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(`mcrd_presets_${modeKey}`);
    if (saved) {
      try {
        setUserPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, [modeKey]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    const paramsToSave = filterKeys ? Object.fromEntries(
      Object.entries(currentParams).filter(([k]) => filterKeys.includes(k))
    ) : currentParams;

    const newPresets = [...userPresets, { name: saveName, params: paramsToSave }];
    setUserPresets(newPresets);
    localStorage.setItem(`mcrd_presets_${modeKey}`, JSON.stringify(newPresets));
    setShowModal(false);
    setSaveName('');
    setSelected(saveName);
  };

  const handleExport = () => {
    if (!saveName.trim()) return;
    const paramsToSave = filterKeys ? Object.fromEntries(
      Object.entries(currentParams).filter(([k]) => filterKeys.includes(k))
    ) : currentParams;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      name: saveName,
      type: modeKey,
      params: paramsToSave
    }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${saveName.replace(/\s+/g, '_')}_${modeKey}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowModal(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      try {
        const data = JSON.parse(re.target?.result as string);
        if (data && data.params) {
          onApply(data.params);
          setSelected(''); // Clear selection as it's a file import
        }
      } catch (err) {
        alert("Invalid Preset File");
      }
    };
    reader.readAsText(file);
    // Reset value to allow re-importing same file
    e.target.value = '';
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelected(name);

    let preset = defaultPresets.find(p => p.name === name);
    if (!preset) preset = userPresets.find(p => p.name === name);

    if (preset) {
      onApply(preset.params);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 mb-2">
        <div className="flex-1 relative">
          <select
            id={`preset-select-${modeKey}`}
            name={`preset-select-${modeKey}`}
            aria-label="Select Preset"
            value={selected}
            onChange={handleSelect}
            className="w-full bg-zinc-900 text-[10px] text-zinc-300 h-6 px-2 rounded-sm border border-zinc-800 outline-none appearance-none cursor-pointer hover:border-zinc-700"
          >
            <option value="" disabled>Select Preset...</option>
            <optgroup label="Defaults">
              {defaultPresets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </optgroup>
            {userPresets.length > 0 && (
              <optgroup label="User Saved">
                {userPresets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
            )}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        {/* Load Button (Hidden File Input) */}
        <label className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-sm text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer" title="Load JSON">
          <Upload size={12} />
          <input type="file" id={`preset-import-${modeKey}`} name={`preset-import-${modeKey}`} aria-label="Import Preset JSON" className="hidden" accept=".json" onChange={handleImport} />
        </label>

        {/* Save/Modal Button */}
        <button
          onClick={() => setShowModal(true)}
          className="h-6 w-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-sm text-zinc-400 hover:text-indigo-400 transition-colors"
          title="Save / Export"
        >
          <Save size={12} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-72 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-md p-3 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase">Save Preset</span>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
            </div>

            <input
              autoFocus
              type="text"
              id={`preset-save-name-${modeKey}`}
              name={`preset-save-name-${modeKey}`}
              aria-label="Preset Name"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Preset Name..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={12} /> Save to Library
              </button>
              <button
                onClick={handleExport}
                disabled={!saveName.trim()}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1.5 rounded-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={12} /> Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
