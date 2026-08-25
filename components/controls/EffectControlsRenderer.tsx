import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EffectInstance, SimulationParams, StabilizerConfig } from '../../types';
import { ParameterControl } from '../ui/Shared';
import { FlowControls } from './FlowControls';
import { PhysicsControls } from './PhysicsControls';
import { GrayScottControls } from './GrayScottControls';
import { StabilizerControls } from './StabilizerControls';
import { GravityControls } from './GravityControls';
import { LGAControls } from './LGAControls';
import { FractalControls } from './FractalControls';
import { SoCAControls } from './SoCAControls';
import { CAControls } from './CAControls';
import { RandomWalkerControls } from './RandomWalkerControls';
import { MultiDimControls } from './MultiDimControls';
import { VortexControls } from './VortexControls';
import { ExcitableControls } from './ExcitableControls';
import { ChromaticControls } from './ChromaticControls';
import { TurbulenceControls } from './TurbulenceControls';
import { SharpenControls } from './SharpenControls';
import { ReactionKineticsControls } from './ReactionKineticsControls';
import { ElectricArcsControls } from './ElectricArcsControls';
import { QuantumPhaseControls } from './QuantumPhaseControls';
import { ThermalConvectionControls } from './ThermalConvectionControls';
import { CrystalSnowflakeControls } from './CrystalSnowflakeControls';
import { SurfaceTensionControls } from './SurfaceTensionControls';
import { LeniaControls } from './LeniaControls';
import { PhysarumControls } from './PhysarumControls';
import { LBMControls } from './LBMControls';

interface Props {
  effect: EffectInstance;
  onParamChange: (effectId: string, paramKey: string, value: any) => void;
  activeLinkModuleId?: string | null;
  linkedParams?: string[];
  automatedParams?: Record<string, number>;
  onLinkParam?: (paramKey: string) => void;
  // Fallbacks
  globalParams?: SimulationParams;
  stabilizeConfig?: StabilizerConfig;
  setStabilizeConfig?: (cfg: StabilizerConfig) => void;
  showStabilizeConfig?: boolean;
  setShowStabilizeConfig?: (v: boolean) => void;
  compact?: boolean;
}

export const EffectControlsRenderer: React.FC<Props> = ({
  effect,
  onParamChange,
  activeLinkModuleId,
  linkedParams = [],
  automatedParams = {},
  onLinkParam,
  globalParams,
  stabilizeConfig,
  setStabilizeConfig,
  showStabilizeConfig,
  setShowStabilizeConfig,
  compact = true
}) => {
  const [isCouplingOpen, setIsCouplingOpen] = useState(false);
  const prefix = `fx_${effect.id}_`;

  // Build scoped automatedParams: map both "fx_{id}_{key}" and "{key}" so controls find their automated value
  const scopedAutomatedParams: Record<string, number> = {};
  for (const [k, v] of Object.entries(automatedParams)) {
    if (typeof v === 'number') {
      if (k.startsWith(prefix)) {
        const subKey = k.substring(prefix.length);
        scopedAutomatedParams[subKey] = v;
      }
      scopedAutomatedParams[k] = v;
    }
  }

  // Build scoped linkedParams: include both with and without prefix
  const scopedLinkedParams: string[] = [];
  for (const k of linkedParams) {
    if (k.startsWith(prefix)) {
      scopedLinkedParams.push(k.substring(prefix.length));
    }
    scopedLinkedParams.push(k);
  }

  const handleScopedLinkParam = (paramKey: string) => {
    const fullKey = paramKey.startsWith(prefix) ? paramKey : `${prefix}${paramKey}`;
    if (onLinkParam) {
      onLinkParam(fullKey);
    } else {
      onParamChange(effect.id, paramKey.replace(prefix, ''), 'LINK');
    }
  };

  const handleSingleParam = (key: string, value: any) => {
    if (value === 'LINK') {
      handleScopedLinkParam(key);
      return;
    }
    onParamChange(effect.id, key, value);
  };

  // Bridge for controls expecting standard `params` object and `onChange(key, val)`
  const bridgeParams = {
    ...(globalParams || {}),
    ...effect.params
  } as SimulationParams;

  const bridgeOnChange = (key: any, value: any) => {
    handleSingleParam(key as string, value);
  };

  const commonProps = {
    params: bridgeParams,
    onChange: bridgeOnChange,
    compact,
    disabled: !effect.enabled,
    activeLinkModuleId,
    linkedParams: scopedLinkedParams,
    automatedParams: scopedAutomatedParams
  };

  const gridCouplingVal = typeof effect.params.gridCoupling === 'number'
    ? effect.params.gridCoupling
    : (effect.params.gridCoupling === false ? 0.0 : 1.0);

  const renderInner = () => {
    switch (effect.type) {
    case 'flow':
      return <FlowControls {...commonProps} />;

    case 'physics':
      return (
        <PhysicsControls
          {...commonProps}
          stabilizeConfig={stabilizeConfig}
          autoStabilize={stabilizeConfig?.enabled}
        />
      );

    case 'grayScott':
      return <GrayScottControls {...commonProps} />;

    case 'stabilizer':
      return (
        <StabilizerControls
          config={{
            enabled: effect.enabled,
            targetDensity: effect.params.targetDensity ?? 6.0,
            strength: effect.params.strength ?? 1.0,
            adjustKOff: effect.params.adjustKOff ?? true,
            adjustKRec: effect.params.adjustKRec ?? true,
            adjustKOn: effect.params.adjustKOn ?? false,
            adjustFeed: effect.params.adjustFeed ?? false
          }}
          onChange={(cfg) => {
            Object.entries(cfg).forEach(([k, v]) => onParamChange(effect.id, k, v));
            if (setStabilizeConfig) setStabilizeConfig(cfg);
          }}
          showConfig={showStabilizeConfig ?? true}
          onToggleConfig={() => setShowStabilizeConfig?.(!showStabilizeConfig)}
          compact={compact}
        />
      );

    case 'gravity':
      return <GravityControls {...commonProps} />;

    case 'lga':
      return <LGAControls {...commonProps} />;

    case 'fractal':
      return <FractalControls {...commonProps} />;

    case 'soca':
      return <SoCAControls {...commonProps} />;

    case 'gol':
      return <CAControls {...commonProps} />;

    case 'walker':
      return <RandomWalkerControls {...commonProps} />;

    case 'multiDim':
      return <MultiDimControls {...commonProps} />;

    case 'vortex':
      return (
        <VortexControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'excitable':
      return (
        <ExcitableControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'chromatic':
      return (
        <ChromaticControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'turbulence':
      return (
        <TurbulenceControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'sharpen':
      return (
        <SharpenControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'reactionKinetics':
      return (
        <ReactionKineticsControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'electricArcs':
      return (
        <ElectricArcsControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'quantumPhase':
      return (
        <QuantumPhaseControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'thermalConvection':
      return (
        <ThermalConvectionControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'crystalSnowflake':
      return (
        <CrystalSnowflakeControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'surfaceTension':
      return (
        <SurfaceTensionControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'lenia':
      return (
        <LeniaControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'physarum':
      return (
        <PhysarumControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    case 'lbm':
      return (
        <LBMControls
          params={effect.params}
          onChange={handleSingleParam}
          compact={compact}
          disabled={!effect.enabled}
          activeLinkModuleId={activeLinkModuleId}
          linkedParams={scopedLinkedParams}
          automatedParams={scopedAutomatedParams}
          onLinkParam={handleScopedLinkParam}
          prefix=""
        />
      );

    default:
      return (
        <div className="text-xs text-zinc-500 italic p-2">
          No controls available for effect type {effect.type}
        </div>
      );
    }
  };

  const isRGBMode = globalParams?.colorMap === 'rgb' || globalParams?.colorMap === 'custom';
  const gridCouplingR = typeof effect.params.gridCouplingR === 'number' ? effect.params.gridCouplingR : 1.0;
  const gridCouplingG = typeof effect.params.gridCouplingG === 'number' ? effect.params.gridCouplingG : 1.0;
  const gridCouplingB = typeof effect.params.gridCouplingB === 'number' ? effect.params.gridCouplingB : 1.0;

  return (
    <div className="space-y-2">
      {renderInner()}

      {/* Minimalistic Collapsible Bottom Grid Coupling Accordion (Closed by default) */}
      <div className="pt-1 border-t border-zinc-800/60 mt-2">
        <button
          type="button"
          onClick={() => setIsCouplingOpen(prev => !prev)}
          className="w-full flex items-center justify-between py-1 px-1.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            {isCouplingOpen ? (
              <ChevronDown size={11} className="text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight size={11} className="text-zinc-500 shrink-0" />
            )}
            <span className="font-medium text-zinc-400 text-[10px]">Grid Coupling</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-zinc-500">
              {gridCouplingVal.toFixed(2)}x
            </span>
            {Math.abs(gridCouplingVal - 1.0) > 0.01 && (
              <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
            )}
          </div>
        </button>

        {isCouplingOpen && (
          <div className="pt-1.5 px-0.5 pb-0.5 space-y-2">
            <ParameterControl
              label="Coupling Ratio"
              value={gridCouplingVal}
              min={0.0}
              max={2.0}
              step={0.05}
              onChange={(v: number) => onParamChange(effect.id, 'gridCoupling', v)}
              defaultValue={1.0}
              linkStatus={activeLinkModuleId ? (scopedLinkedParams.includes('gridCoupling') ? 'selected' : 'selectable') : undefined}
              onLink={() => handleScopedLinkParam('gridCoupling')}
              automatedValue={scopedAutomatedParams['gridCoupling']}
            />

            {isRGBMode && (
              <div className="pt-1 border-t border-zinc-800/60 space-y-1.5">
                <span className="text-[9px] text-zinc-400 font-normal">RGB Channel Coupling Multipliers</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-0.5">
                    <ParameterControl
                      label="R (U)"
                      value={gridCouplingR}
                      min={0.0}
                      max={2.0}
                      step={0.05}
                      onChange={(v: number) => onParamChange(effect.id, 'gridCouplingR', v)}
                      defaultValue={1.0}
                      linkStatus={activeLinkModuleId ? (scopedLinkedParams.includes('gridCouplingR') ? 'selected' : 'selectable') : undefined}
                      onLink={() => handleScopedLinkParam('gridCouplingR')}
                      automatedValue={scopedAutomatedParams['gridCouplingR']}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <ParameterControl
                      label="G (V)"
                      value={gridCouplingG}
                      min={0.0}
                      max={2.0}
                      step={0.05}
                      onChange={(v: number) => onParamChange(effect.id, 'gridCouplingG', v)}
                      defaultValue={1.0}
                      linkStatus={activeLinkModuleId ? (scopedLinkedParams.includes('gridCouplingG') ? 'selected' : 'selectable') : undefined}
                      onLink={() => handleScopedLinkParam('gridCouplingG')}
                      automatedValue={scopedAutomatedParams['gridCouplingG']}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <ParameterControl
                      label="B (W)"
                      value={gridCouplingB}
                      min={0.0}
                      max={2.0}
                      step={0.05}
                      onChange={(v: number) => onParamChange(effect.id, 'gridCouplingB', v)}
                      defaultValue={1.0}
                      linkStatus={activeLinkModuleId ? (scopedLinkedParams.includes('gridCouplingB') ? 'selected' : 'selectable') : undefined}
                      onLink={() => handleScopedLinkParam('gridCouplingB')}
                      automatedValue={scopedAutomatedParams['gridCouplingB']}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
