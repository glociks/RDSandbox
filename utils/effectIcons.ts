import {
  Atom,
  FlaskConical,
  Move,
  Compass,
  Wind,
  ArrowDown,
  Grid3x3,
  Zap,
  Snowflake,
  Footprints,
  Palette,
  Cuboid,
  Activity,
  Orbit,
  Flame,
  Droplets,
  Dna,
  Bug,
  Waves,
  Sparkles,
  Settings2,
  Sprout,
  Shapes,
  Grid,
  FunctionSquare,
  Type,
  Image as ImageIcon,
  Video,
  Camera
} from 'lucide-react';
import { EffectType, ContinuousSeedType } from '../types';

/**
 * Single source of truth mapping for Effect icons.
 */
export const EFFECT_ICON_MAP: Record<EffectType, any> = {
  // Core physics & reactions
  physics: Atom,
  grayScott: FlaskConical,
  reactionKinetics: Activity,
  quantumPhase: Orbit,
  excitable: Waves,
  soca: Zap,
  surfaceTension: Droplets,

  // Fluid dynamics & mechanics
  flow: Move,
  vortex: Compass,
  turbulence: Wind,
  gravity: ArrowDown,
  lga: Wind,
  lbm: Wind,
  thermalConvection: Flame,

  // Cellular automata & ALife
  gol: Grid3x3,
  fractal: Snowflake,
  walker: Footprints,
  crystalSnowflake: Snowflake,
  lenia: Dna,
  physarum: Bug,

  // System control & signal processing
  stabilizer: Zap,
  chromatic: Palette,
  sharpen: Zap,
  multiDim: Cuboid,
  electricArcs: Zap
};

/**
 * Returns the matching Lucide icon for an effect type.
 */
export function getEffectIcon(type: EffectType) {
  return EFFECT_ICON_MAP[type] || Settings2;
}

/**
 * Single source of truth mapping for Seed icons.
 */
export const SEED_ICON_MAP: Record<ContinuousSeedType, any> = {
  random: Dna,
  shapes: Shapes,
  perlin: Sprout,
  grid: Grid,
  math: FunctionSquare,
  text: Type,
  image: ImageIcon,
  video: Video,
  webcam: Camera
};

/**
 * Returns the matching Lucide icon for a seed type.
 */
export function getSeedIcon(type: ContinuousSeedType) {
  return SEED_ICON_MAP[type] || Sprout;
}
