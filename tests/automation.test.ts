import { describe, it, expect } from 'vitest';
import { processAutomation } from '../utils/automation';
import { AutomationModule } from '../types';
import { DEFAULT_PARAMS } from '../constants';

describe('Automation & Modulation Routing Bus', () => {
  it('returns unmodified parameters when automation module list is empty', () => {
    const { nextParams, moduleOutputs, targetOutputs } = processAutomation([], DEFAULT_PARAMS, 1.0);
    expect(nextParams.feedRate).toBe(DEFAULT_PARAMS.feedRate);
    expect(Object.keys(moduleOutputs).length).toBe(0);
    expect(Object.keys(targetOutputs).length).toBe(0);
  });

  it('evaluates Sine LFO modulation accurately across time', () => {
    const lfoModule: AutomationModule = {
      id: 'mod_lfo_1',
      type: 'lfo',
      name: 'Sine LFO',
      enabled: true,
      isMinimized: false,
      gain: 1.0,
      offset: 0.0,
      minVal: -1.0,
      maxVal: 1.0,
      useMapping: false,
      bpm: 60, // 1 Hz
      frequency: 1.0,
      targets: [
        { id: 'trg_1', paramKey: 'feedRate', gain: 0.01, offset: 0 }
      ],
      lfo: { shape: 'sine', width: 0.5, phase: 0, smoothness: 0.5 }
    };

    // At t = 0, sin(0) = 0
    const res0 = processAutomation([lfoModule], DEFAULT_PARAMS, 0.0);
    expect(res0.moduleOutputs['mod_lfo_1']).toBeCloseTo(0, 3);
    expect(res0.nextParams.feedRate).toBeCloseTo(DEFAULT_PARAMS.feedRate, 3);

    // At t = 0.25s (90 deg), sin(pi/2) = 1.0
    const resQuarter = processAutomation([lfoModule], DEFAULT_PARAMS, 0.25);
    expect(resQuarter.moduleOutputs['mod_lfo_1']).toBeCloseTo(1.0, 3);
    expect(resQuarter.nextParams.feedRate).toBeCloseTo(DEFAULT_PARAMS.feedRate + 0.01, 3);
  });

  it('evaluates Step Sequencer modulation across discrete steps', () => {
    const seqModule: AutomationModule = {
      id: 'mod_seq_1',
      type: 'sequencer',
      name: '4-Step Sequencer',
      enabled: true,
      isMinimized: false,
      gain: 1.0,
      offset: 0.0,
      minVal: 0.0,
      maxVal: 1.0,
      useMapping: false,
      bpm: 60,
      frequency: 1.0,
      targets: [],
      sequencer: { steps: [0.1, 0.5, 0.9, 0.3], count: 4, smoothness: 0.0 }
    };

    // Step 0 (t = 0.2)
    const res0 = processAutomation([seqModule], DEFAULT_PARAMS, 0.2);
    expect(res0.moduleOutputs['mod_seq_1']).toBeCloseTo(0.1, 3);

    // Step 1 (t = 1.2)
    const res1 = processAutomation([seqModule], DEFAULT_PARAMS, 1.2);
    expect(res1.moduleOutputs['mod_seq_1']).toBeCloseTo(0.5, 3);

    // Step 2 (t = 2.2)
    const res2 = processAutomation([seqModule], DEFAULT_PARAMS, 2.2);
    expect(res2.moduleOutputs['mod_seq_1']).toBeCloseTo(0.9, 3);
  });

  it('evaluates Keyframe interpolation with jump, linear, and ease curves', () => {
    const keyframeModule: AutomationModule = {
      id: 'mod_kf_1',
      type: 'keyframe',
      name: 'Keyframe Curve',
      enabled: true,
      isMinimized: false,
      gain: 1.0,
      offset: 0.0,
      minVal: 0.0,
      maxVal: 10.0,
      useMapping: false,
      bpm: 60,
      frequency: 1.0,
      targets: [],
      keyframe: {
        timelineLength: 60,
        loop: false,
        keyframes: [
          { t: 0, val: 0.0, type: 'linear' },
          { t: 60, val: 10.0, type: 'linear' }
        ],
        editor: {}
      }
    };

    // At frame 0 (t = 0), value is 0.0
    const res0 = processAutomation([keyframeModule], DEFAULT_PARAMS, 0.0);
    expect(res0.moduleOutputs['mod_kf_1']).toBeCloseTo(0.0, 2);

    // At frame 30 (t = 0.5), value is 5.0
    const resMid = processAutomation([keyframeModule], DEFAULT_PARAMS, 0.5);
    expect(resMid.moduleOutputs['mod_kf_1']).toBeCloseTo(5.0, 2);

    // At frame 60 (t = 1.0), value is 10.0
    const resEnd = processAutomation([keyframeModule], DEFAULT_PARAMS, 1.0);
    expect(resEnd.moduleOutputs['mod_kf_1']).toBeCloseTo(10.0, 2);
  });

  it('disabled modules produce zero output and do not alter simulation parameters', () => {
    const disabledMod: AutomationModule = {
      id: 'mod_disabled',
      type: 'lfo',
      name: 'Disabled LFO',
      enabled: false,
      isMinimized: false,
      gain: 10.0,
      offset: 5.0,
      minVal: 0.0,
      maxVal: 100.0,
      useMapping: false,
      bpm: 120,
      frequency: 2.0,
      targets: [
        { id: 'trg_1', paramKey: 'kOff', gain: 5.0, offset: 2.0 }
      ],
      lfo: { shape: 'sine', width: 0.5, phase: 0 }
    };

    const res = processAutomation([disabledMod], DEFAULT_PARAMS, 1.0);
    expect(res.moduleOutputs['mod_disabled']).toBe(0);
    expect(res.nextParams.kOff).toBe(DEFAULT_PARAMS.kOff);
  });
});
