import { PresetData, SceneState, SimulationParams, EffectInstance, InitialSeedConfig, StabilizerConfig, ContinuousSeed, CustomColorConfig, GridDimensions } from '../types';
import { convertParamsToEffects, getDefaultInitialSeeds } from '../constants';
import { generateId } from './idGenerator';
import { McRDSolver } from './solver';
import { PresetLoadSettings } from '../components/modals/PresetLoadModal';

export type { PresetLoadSettings };

export interface PresetApplyTarget {
  setParams: (params: SimulationParams | ((prev: SimulationParams) => SimulationParams)) => void;
  setEffects: (effects: EffectInstance[] | ((prev: EffectInstance[]) => EffectInstance[])) => void;
  setSeedConfig: (config: InitialSeedConfig) => void;
  setStabilizeConfig: (config: StabilizerConfig) => void;
  setCustomColorConfig: (config: CustomColorConfig) => void;
  setGridSize: (size: GridDimensions) => void;
  setContinuousSeeds: (seeds: ContinuousSeed[] | ((prev: ContinuousSeed[]) => ContinuousSeed[])) => void;
  setAutomationModules: (modules: any[] | ((prev: any[]) => any[])) => void;
  solver: McRDSolver;
  handleParamChange: (key: keyof SimulationParams, value: any) => void;
  reset: (overrideSeeds?: ContinuousSeed[], overrideParams?: SimulationParams, overrideEffects?: EffectInstance[]) => void;
}

export function applyPresetDirectly(data: PresetData | SceneState, target: PresetApplyTarget): void {
  if (data.params) target.setParams(data.params);

  let targetEffects: EffectInstance[] | undefined = undefined;
  if (data.effects && data.effects.length > 0) {
    targetEffects = data.effects;
    target.setEffects(data.effects);
  } else if (data.params) {
    targetEffects = convertParamsToEffects(data.params, data.stabilizer || data.stabilizeConfig);
    target.setEffects(targetEffects);
  }

  if (data.seedConfig) target.setSeedConfig(data.seedConfig);

  const stab = data.stabilizer || data.stabilizeConfig;
  if (stab) target.setStabilizeConfig(stab);

  if (data.customColorConfig) {
    target.setCustomColorConfig(data.customColorConfig);
  } else if (data.params?.colorMap === 'custom') {
    target.setCustomColorConfig({
      mode: 'scalar',
      scalarGradient: [
        { pos: 0.0, color: '#000000' },
        { pos: 0.5, color: '#6366f1' },
        { pos: 1.0, color: '#ffffff' }
      ],
      rgbMultipliers: { r: 1.0, g: 1.0, b: 1.0 },
      rgbBias: { r: 0, g: 0, b: 0 }
    });
  }

  if (data.reliefLighting) {
    target.handleParamChange('reliefLighting', data.reliefLighting);
  }

  if (data.gridSize) {
    target.setGridSize(data.gridSize);
    target.solver.resize(data.gridSize.width, data.gridSize.height, data.params?.totalDensity || 0.5);
  }

  let finalSeeds: ContinuousSeed[] = getDefaultInitialSeeds();
  if (Array.isArray(data.continuousSeeds) && data.continuousSeeds.length > 0) {
    finalSeeds = data.continuousSeeds;
    target.setContinuousSeeds(data.continuousSeeds);
  } else if (data.seedConfig) {
    finalSeeds = [{
      id: generateId('cseed_preset'),
      name: 'Preset Initial Seed',
      type: data.seedConfig.type || 'perlin',
      enabled: true,
      isMinimized: false,
      opacity: 1.0,
      blendMode: 'add',
      x: 0,
      y: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
      isStartingSeed: true,
      seedConfig: data.seedConfig
    }];
    target.setContinuousSeeds(finalSeeds);
  } else {
    target.setContinuousSeeds(getDefaultInitialSeeds());
  }

  target.setAutomationModules(Array.isArray(data.automation) ? data.automation : []);
  target.reset(finalSeeds, data.params, targetEffects);
}

export function applyPresetWithSettings(
  data: SceneState | PresetData,
  settings: PresetLoadSettings,
  target: PresetApplyTarget
): void {
  let targetEffects: EffectInstance[] | undefined = undefined;

  // 1. Initial Seed & Physics
  if (settings.physics === 'replace') {
    if (data.params) target.setParams(data.params);
    if (data.effects && data.effects.length > 0) {
      targetEffects = data.effects;
      target.setEffects(data.effects);
    } else if (data.params) {
      targetEffects = convertParamsToEffects(data.params, data.stabilizer || data.stabilizeConfig);
      target.setEffects(targetEffects);
    }
    if (data.seedConfig) target.setSeedConfig(data.seedConfig);

    const stab = data.stabilizer || data.stabilizeConfig;
    if (stab) target.setStabilizeConfig(stab);

    if (data.customColorConfig) {
      target.setCustomColorConfig(data.customColorConfig);
    } else if (data.params?.colorMap === 'custom') {
      target.setCustomColorConfig({
        mode: 'scalar',
        scalarGradient: [
          { pos: 0.0, color: '#000000' },
          { pos: 0.5, color: '#6366f1' },
          { pos: 1.0, color: '#ffffff' }
        ],
        rgbMultipliers: { r: 1.0, g: 1.0, b: 1.0 },
        rgbBias: { r: 0, g: 0, b: 0 }
      });
    }

    if (data.reliefLighting) {
      target.handleParamChange('reliefLighting', data.reliefLighting);
    }

    if (data.gridSize) {
      target.setGridSize(data.gridSize);
      target.solver.resize(data.gridSize.width, data.gridSize.height, data.params?.totalDensity || 0.5);
    }
  }

  let finalSeeds: ContinuousSeed[] | undefined = undefined;

  // 2. Continuous Seeds
  if (settings.continuousSeeds === 'replace') {
    if (Array.isArray(data.continuousSeeds) && data.continuousSeeds.length > 0) {
      finalSeeds = data.continuousSeeds;
      target.setContinuousSeeds(data.continuousSeeds);
    } else if (data.seedConfig) {
      finalSeeds = [{
        id: generateId('cseed_preset'),
        name: 'Preset Initial Seed',
        type: data.seedConfig.type || 'perlin',
        enabled: true,
        isMinimized: false,
        opacity: 1.0,
        blendMode: 'add',
        x: 0,
        y: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        rotation: 0,
        blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
        isStartingSeed: true,
        seedConfig: data.seedConfig
      }];
      target.setContinuousSeeds(finalSeeds);
    } else {
      finalSeeds = getDefaultInitialSeeds();
      target.setContinuousSeeds(finalSeeds);
    }
  } else if (settings.continuousSeeds === 'add') {
    if (Array.isArray(data.continuousSeeds) && data.continuousSeeds.length > 0) {
      target.setContinuousSeeds(prev => {
        const freshSeeds = data.continuousSeeds!.map(s => ({
          ...s,
          id: generateId('cseed')
        }));
        return [...prev, ...freshSeeds];
      });
    }
  }

  // 3. Automation
  if (settings.automation === 'replace') {
    target.setAutomationModules(Array.isArray(data.automation) ? data.automation : []);
  } else if (settings.automation === 'add') {
    if (Array.isArray(data.automation)) {
      target.setAutomationModules(prev => [...prev, ...data.automation!]);
    }
  }

  target.reset(finalSeeds, settings.physics === 'replace' ? data.params : undefined, targetEffects);
}
