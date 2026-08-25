import { SceneState, ContinuousSeed, EffectInstance, AutomationModule, InitialSeedConfig, StabilizerConfig, CustomColorConfig, ReliefLightingConfig } from '../types';
import { DEFAULT_PARAMS, EFFECT_INFO } from '../defaultParams';
import { generateId } from './idGenerator';

/**
 * Compresses a JSON string using the CompressionStream API.
 */
async function compressData(jsonString: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(jsonString));
      controller.close();
    },
  });

  const compressedStream = stream.pipeThrough(new CompressionStream('deflate-raw'));
  const reader = compressedStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Decompresses a Uint8Array back to a JSON string using the DecompressionStream API.
 */
async function decompressData(compressedData: Uint8Array, maxBytes: number = 51200): Promise<string> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(compressedData);
      controller.close();
    },
  });

  const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = decompressedStream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalLength += value.length;
      if (totalLength > maxBytes) {
        reader.releaseLock();
        throw new Error(`Decompressed payload exceeds maximum allowed size (${maxBytes} bytes).`);
      }
      chunks.push(value);
    }
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  const dec = new TextDecoder();
  return dec.decode(result);
}

/**
 * Converts a Uint8Array to a Base64 URL-safe string.
 */
function uint8ToBase64Url(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a Base64 URL-safe string to a Uint8Array.
 */
function base64UrlToUint8(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const uint8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}

function diffParams(params: Record<string, unknown> | undefined): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  if (!params) return diff;
  const defaultRecord = DEFAULT_PARAMS as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(params)) {
    const defVal = defaultRecord[k];
    if (defVal === undefined) {
      diff[k] = v;
    } else if (JSON.stringify(v) !== JSON.stringify(defVal)) {
      diff[k] = typeof v === 'number' ? Number(v.toFixed(4)) : v;
    }
  }
  return diff;
}

function cleanSeed(s: ContinuousSeed): Partial<ContinuousSeed> {
  const clean: Partial<ContinuousSeed> = { id: s.id, type: s.type };
  if (s.name) clean.name = s.name;
  if (s.enabled !== undefined && !s.enabled) clean.enabled = s.enabled;
  if (s.isStartingSeed) clean.isStartingSeed = true;
  if (s.opacity !== undefined && s.opacity !== 1) clean.opacity = Number(s.opacity.toFixed(3));
  if (s.blendMode && s.blendMode !== 'replace') clean.blendMode = s.blendMode;
  if (s.x) clean.x = Number(s.x.toFixed(3));
  if (s.y) clean.y = Number(s.y.toFixed(3));
  if (s.scaleX !== undefined && s.scaleX !== 1) clean.scaleX = Number(s.scaleX.toFixed(3));
  if (s.scaleY !== undefined && s.scaleY !== 1) clean.scaleY = Number(s.scaleY.toFixed(3));
  if (s.rotation) clean.rotation = Math.round(s.rotation);
  if (s.seedConfig) clean.seedConfig = s.seedConfig;
  if (s.blendIf?.enabled) clean.blendIf = s.blendIf;
  return clean;
}

function cleanEffect(e: EffectInstance): Partial<EffectInstance> {
  const clean: Partial<EffectInstance> = { id: e.id, type: e.type };
  if (e.name) clean.name = e.name;
  if (e.enabled !== undefined && !e.enabled) clean.enabled = false;
  if (e.params && Object.keys(e.params).length > 0) {
    clean.params = {};
    for (const [k, v] of Object.entries(e.params)) {
      clean.params[k] = typeof v === 'number' ? Number((v as number).toFixed(4)) : v;
    }
  }
  return clean;
}

/**
 * Encodes the SceneState into a URL-safe, compressed base64 string using ultra-compact delta encoding.
 */
export async function encodeSceneStateToUrl(state: SceneState): Promise<string> {
  try {
    const pDiff = diffParams(state.params as unknown as Record<string, unknown>);
    const compact: Record<string, unknown> = { _d: 1 };
    if (Object.keys(pDiff).length > 0) compact.p = pDiff;
    if (state.effects && state.effects.length > 0) compact.e = state.effects.map(cleanEffect);
    if (state.automation && state.automation.length > 0) compact.a = state.automation;
    if (state.stabilizer && state.stabilizer.enabled) compact.s = state.stabilizer;
    if (state.gridSize && JSON.stringify(state.gridSize) !== '256' && JSON.stringify(state.gridSize) !== '{"width":256,"height":256}') {
      compact.g = state.gridSize;
    }
    if (state.seedConfig) compact.sc = state.seedConfig;
    if (state.continuousSeeds && state.continuousSeeds.length > 0) {
      compact.cs = state.continuousSeeds.map(cleanSeed);
    }
    if (state.customColorConfig) compact.cc = state.customColorConfig;
    if (state.reliefLighting) compact.rl = state.reliefLighting;

    const jsonString = JSON.stringify(compact);
    const compressed = await compressData(jsonString);
    return uint8ToBase64Url(compressed);
  } catch (err) {
    console.error("Error encoding scene state:", err);
    throw err;
  }
}

function sanitizeObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
  }
  return clean;
}

export async function decodeSceneStateFromUrl(urlPayload: string): Promise<SceneState> {
  try {
    if (!urlPayload || typeof urlPayload !== 'string' || urlPayload.length > 30000) {
      throw new Error('Invalid URL preset payload length.');
    }
    const compressed = base64UrlToUint8(urlPayload);
    const jsonString = await decompressData(compressed, 51200);
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Decoded preset payload is not a valid object.');
    }
    const sanitized = sanitizeObject(parsed) as Record<string, unknown>;

    // Schema Validation: Ensure basic structural integrity
    if (sanitized._d === 1) {
      if (sanitized.p !== undefined && (typeof sanitized.p !== 'object' || sanitized.p === null)) {
        throw new Error('Malformed params payload in preset URL.');
      }
      if (sanitized.e !== undefined && !Array.isArray(sanitized.e)) {
        throw new Error('Malformed effects payload in preset URL.');
      }
      if (sanitized.a !== undefined && !Array.isArray(sanitized.a)) {
        throw new Error('Malformed automation payload in preset URL.');
      }
      if (sanitized.cs !== undefined && !Array.isArray(sanitized.cs)) {
        throw new Error('Malformed continuous seeds payload in preset URL.');
      }

      const pObj = (sanitized.p || {}) as Record<string, unknown>;
      const restoredParams = { ...DEFAULT_PARAMS, ...pObj };
      const rawSeeds = Array.isArray(sanitized.cs) ? (sanitized.cs as Record<string, unknown>[]) : [];
      const restoredSeeds: ContinuousSeed[] = rawSeeds.map((s) => ({
        id: (s.id as string) || generateId('cseed'),
        name: (s.name as string) || `${s.type ? String(s.type).charAt(0).toUpperCase() + String(s.type).slice(1) : 'Random'} Seed`,
        type: (s.type as ContinuousSeed['type']) || 'random',
        enabled: (s.enabled as boolean) ?? true,
        isMinimized: false,
        opacity: (s.opacity as number) ?? 1.0,
        blendMode: (s.blendMode as ContinuousSeed['blendMode']) || 'replace',
        x: (s.x as number) ?? 0,
        y: (s.y as number) ?? 0,
        scaleX: (s.scaleX as number) ?? 1.0,
        scaleY: (s.scaleY as number) ?? 1.0,
        rotation: (s.rotation as number) ?? 0,
        blendIf: (s.blendIf as ContinuousSeed['blendIf']) || { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 },
        seedConfig: s.seedConfig as InitialSeedConfig | undefined,
        isStartingSeed: (s.isStartingSeed as boolean) ?? false
      }));

      const rawEffects = Array.isArray(sanitized.e) ? (sanitized.e as Record<string, unknown>[]) : [];
      const effectInfoMap = EFFECT_INFO as Record<string, { name: string } | undefined>;
      const restoredEffects: EffectInstance[] = rawEffects.map((e) => {
        const effectType = (e.type as EffectInstance['type']) || 'flow';
        const defaultName = effectInfoMap[effectType]?.name || `${effectType ? effectType.charAt(0).toUpperCase() + effectType.slice(1) : 'Effect'}`;
        return {
          id: (e.id as string) || generateId('eff'),
          type: effectType,
          name: (e.name as string) || defaultName,
          enabled: (e.enabled as boolean) ?? true,
          isMinimized: false,
          params: (e.params as Record<string, unknown>) || {}
        };
      });

      return {
        params: restoredParams,
        effects: restoredEffects,
        automation: (sanitized.a as AutomationModule[]) || [],
        stabilizer: (sanitized.s as StabilizerConfig) || { enabled: false, targetDensity: 6.0, strength: 1.0, adjustKOff: true, adjustKRec: true, adjustKOn: false, adjustFeed: false },
        gridSize: sanitized.g as SceneState['gridSize'],
        seedConfig: sanitized.sc as InitialSeedConfig | undefined,
        continuousSeeds: restoredSeeds,
        customColorConfig: sanitized.cc as CustomColorConfig | undefined,
        reliefLighting: sanitized.rl as ReliefLightingConfig | undefined
      };
    }

    return sanitized as unknown as SceneState;
  } catch (err) {
    console.error("Error decoding scene state:", err);
    throw err;
  }
}
