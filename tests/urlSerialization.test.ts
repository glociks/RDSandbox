import { describe, it, expect } from 'vitest';
import { encodeSceneStateToUrl, decodeSceneStateFromUrl } from '../utils/urlSerialization';
import { DEFAULT_PARAMS } from '../constants';
import { SceneState } from '../types';

describe('URL Serialization & Compression Engine', () => {
  it('should roundtrip encode and decode full scene state with high fidelity', async () => {
    const originalState: SceneState = {
      params: {
        ...DEFAULT_PARAMS,
        feedRate: 0.055,
        kOff: 0.85,
        reliefLighting: { enabled: true, bump: 1.5, specular: 2.0, lightAngle: 45, fresnel: 0.6 }
      },
      effects: [
        {
          id: 'fx_flow_1',
          type: 'flow',
          name: 'Flow',
          enabled: true,
          params: { flowX: 0.2, flowY: -0.1 }
        }
      ],
      continuousSeeds: [
        {
          id: 'cseed_1',
          name: 'Noise Seed',
          type: 'perlin',
          enabled: true,
          isMinimized: false,
          opacity: 0.75,
          blendMode: 'add',
          x: 0.1,
          y: -0.2,
          scaleX: 1.2,
          scaleY: 1.2,
          rotation: 45,
          blendIf: { enabled: false, points: [{ pos: 0, val: 0, id: '1' }, { pos: 1, val: 1, id: '2' }], smoothness: 0.1 }
        }
      ],
      customColorConfig: {
        mode: 'scalar',
        scalarGradient: [{ pos: 0, color: '#000000' }, { pos: 1, color: '#ff0055' }],
        rgbMultipliers: { r: 1, g: 1, b: 1 },
        rgbBias: { r: 0, g: 0, b: 0 }
      },
      automation: [],
      stabilizer: {
        enabled: false,
        targetDensity: 6.0,
        strength: 0.5,
        adjustKOff: true,
        adjustKRec: false,
        adjustKOn: false,
        adjustFeed: false,
      },
    };

    const encoded = await encodeSceneStateToUrl(originalState);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = await decodeSceneStateFromUrl(encoded);
    expect(decoded).toBeDefined();
    expect(decoded.params.feedRate).toBeCloseTo(0.055, 3);
    expect(decoded.params.kOff).toBeCloseTo(0.85, 3);
    expect(decoded.effects?.length).toBe(1);
    expect(decoded.effects?.[0].params.flowX).toBeCloseTo(0.2, 3);
    expect(decoded.continuousSeeds?.length).toBe(1);
    expect(decoded.continuousSeeds?.[0].opacity).toBeCloseTo(0.75, 3);
    expect(decoded.customColorConfig?.scalarGradient?.[1].color).toBe('#ff0055');
  });

  it('rejects empty or excessively large payloads gracefully', async () => {
    await expect(decodeSceneStateFromUrl('')).rejects.toThrow();
    const oversized = 'a'.repeat(30001);
    await expect(decodeSceneStateFromUrl(oversized)).rejects.toThrow();
  });
});
