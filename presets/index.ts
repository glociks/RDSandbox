// Default Preset Registry for RDSandBox
import { PresetData } from '../types';

import { fractalLife } from './default/fractalLife';
import { fractalLife2 } from './default/fractalLife2';
import { meltingGrid } from './default/meltingGrid';
import { meltingGrid2 } from './default/meltingGrid2';
import { slimeSky } from './default/slimeSky';
import { glowingTurbulence } from './default/glowingTurbulence';

export const REGIME_PRESETS: PresetData[] = [
  fractalLife,
  fractalLife2,
  meltingGrid,
  meltingGrid2,
  glowingTurbulence,
  slimeSky
];

export const DEFAULT_PRESETS = REGIME_PRESETS;
export default REGIME_PRESETS;
