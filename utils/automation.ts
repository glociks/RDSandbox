/**
 * Modulation & Automation Routing Bus.
 *
 * Evaluates real-time parameter modulators (LFOs, Step Sequencers, Audio FFT,
 * Bézier Keyframes, ADSR Envelopes, and Web MIDI CC/Notes) and dynamically maps
 * output signals onto simulation parameters.
 */

import { AutomationModule, SimulationParams } from '../types';

let audioContext: AudioContext | null = null;
let filterNode: BiquadFilterNode | null = null;
let analyser: AnalyserNode | null = null;
let microphoneStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
const audioDataArray = new Uint8Array(128);

interface MidiChannelState {
  note: number;
  cc: Record<number, number>;
  lastNoteTime: number;
  lastCcTime: Record<number, number>;
}

export interface MidiDeviceInput {
  id: string;
  name?: string;
  manufacturer?: string;
  onmidimessage?: ((event: { data: Uint8Array; currentTarget?: { id?: string } }) => void) | null;
}

interface MidiAccessObject {
  inputs: Map<string, MidiDeviceInput>;
  onstatechange?: (() => void) | null;
}

// Global register tracking MIDI notes and CC values per device and channel
const midiState: Record<string, MidiChannelState> = {};
let midiAccess: MidiAccessObject | null = null;

/**
 * Initializes Web MIDI API device listeners.
 */
export const initMidi = async (): Promise<MidiDeviceInput[]> => {
  if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
    try {
      midiAccess = await (navigator as unknown as { requestMIDIAccess: () => Promise<MidiAccessObject> }).requestMIDIAccess();
      const inputs = Array.from(midiAccess.inputs.values());
      inputs.forEach((input) => {
        input.onmidimessage = handleMidiMessage;
      });

      midiAccess.onstatechange = () => {
        if (midiAccess) {
          const currentInputs = Array.from(midiAccess.inputs.values());
          currentInputs.forEach((input) => {
            input.onmidimessage = handleMidiMessage;
          });
        }
      };
      return Array.from(midiAccess.inputs.values());
    } catch (err) {
      console.warn("[Automation] MIDI access denied:", err);
      return [];
    }
  }
  return [];
};

/**
 * Returns the list of currently connected MIDI input devices.
 */
export const getMidiDevices = (): MidiDeviceInput[] => {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values());
};

const handleMidiMessage = (msg: { data: Uint8Array; currentTarget?: { id?: string } }) => {
  const data = msg.data;
  if (!data || data.length < 3) return;

  const command = data[0] >> 4;
  const channel = (data[0] & 0xf) + 1;
  const key = data[1];
  const velocity = data[2];

  const deviceId = msg.currentTarget?.id || 'unknown';
  const stateKey = `${deviceId}_${channel}`;
  if (!midiState[stateKey]) {
    midiState[stateKey] = { note: 0, cc: {}, lastNoteTime: 0, lastCcTime: {} };
  }
  const s = midiState[stateKey];

  const anyStateKey = `any_${channel}`;
  if (!midiState[anyStateKey]) {
    midiState[anyStateKey] = { note: 0, cc: {}, lastNoteTime: 0, lastCcTime: {} };
  }
  const sAny = midiState[anyStateKey];

  if (command === 9 && velocity > 0) {
    const normNote = key / 127;
    s.note = normNote;
    sAny.note = normNote;
    const now = performance.now();
    s.lastNoteTime = now;
    sAny.lastNoteTime = now;
  } else if (command === 11) {
    const normCC = velocity / 127;
    s.cc[key] = normCC;
    sAny.cc[key] = normCC;
    const now = performance.now();
    s.lastCcTime[key] = now;
    sAny.lastCcTime[key] = now;
  }
};

/**
 * Enumerates available system audio input devices.
 */
export const getAudioDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  } catch (e) {
    console.warn("[Automation] Could not enumerate audio devices:", e);
    return [];
  }
};

/**
 * Initializes the Web Audio API audio graph (Source -> BiquadFilter -> Analyser).
 */
export const initAudio = async (deviceId?: string, filterConfig?: { type: BiquadFilterType; freq: number }): Promise<void> => {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioCtx();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(t => t.stop());
  }
  if (sourceNode) {
    sourceNode.disconnect();
  }

  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
  }

  if (!filterNode) {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'allpass';
    filterNode.frequency.value = 20000;
  }

  try {
    const constraints = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true };
    microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
    sourceNode = audioContext.createMediaStreamSource(microphoneStream);

    sourceNode.connect(filterNode);
    filterNode.connect(analyser);

    if (filterConfig) {
      updateAudioFilter(filterConfig.type, filterConfig.freq);
    }
  } catch (e) {
    console.warn("[Automation] Microphone access denied or device unavailable:", e);
  }
};

/**
 * Updates the active Web Audio biquad filter frequency and type.
 */
export const updateAudioFilter = (type: string, freq: number): void => {
  if (filterNode && audioContext) {
    if (type === 'off') {
      filterNode.type = 'allpass';
    } else {
      filterNode.type = type as BiquadFilterType;
      const safeFreq = Math.max(20, Math.min(20000, freq));
      filterNode.frequency.setTargetAtTime(safeFreq, audioContext.currentTime, 0.1);
    }
  }
};

// Auto-unlock AudioContext on first user gesture (Safari & Chrome autoplay policies)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  };
  window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
  window.addEventListener('touchend', unlockAudio, { passive: true, capture: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true, capture: true });
  window.addEventListener('click', unlockAudio, { passive: true, capture: true });
}

function hash1D(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return (x - Math.floor(x)) * 2 - 1;
}

function smoothNoise1D(t: number, smoothness: number): number {
  if (smoothness <= 0.001) {
    const i = Math.floor(t);
    return hash1D(i);
  }
  const i = Math.floor(t);
  const f = t - i;
  const v0 = hash1D(i);
  const v1 = hash1D(i + 1);

  const halfWidth = Math.max(0.01, smoothness) * 0.5;
  const smoothF = Math.min(1, Math.max(0, (f - (0.5 - halfWidth)) / (2 * halfWidth)));
  const s = smoothF * smoothF * (3 - 2 * smoothF);
  return v0 + (v1 - v0) * s;
}

/**
 * Samples the microphone frequency buffer and computes the average amplitude level [0, 1].
 */
export const getAudioLevel = (): number => {
  if (!analyser) return 0;
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  analyser.getByteFrequencyData(audioDataArray);
  let sum = 0;
  for (let i = 0; i < audioDataArray.length; i++) {
    sum += audioDataArray[i];
  }
  return (sum / audioDataArray.length) / 255;
};

const processModuleCore = (mod: AutomationModule, time: number, modulesValues: Record<string, number>): number => {
  if (mod.enabled === false) return 0;

  const freq = (mod.bpm / 60) * mod.frequency;
  const phase = mod.lfo?.phase || 0;
  const t = time * freq + phase;

  switch (mod.type) {
    case 'lfo': {
      if (!mod.lfo) return 0;
      const { shape, width, smoothness = 0.5 } = mod.lfo;
      switch (shape) {
        case 'sine': return Math.sin(t * Math.PI * 2);
        case 'triangle': return Math.abs(((t * 2) % 2) - 1) * 2 - 1;
        case 'square': return ((t % 1) < width) ? 1 : -1;
        case 'noise': return smoothNoise1D(t, smoothness);
        default: return 0;
      }
    }
    case 'sequencer': {
      if (!mod.sequencer) return 0;
      const { steps, count, smoothness } = mod.sequencer;
      const stepIdx = Math.floor(t) % count;
      const nextIdx = (stepIdx + 1) % count;
      const progress = t % 1;
      const valA = steps[stepIdx];
      const valB = steps[nextIdx];
      if (smoothness > 0) {
        return valA + (valB - valA) * Math.min(1, progress / Math.max(0.01, smoothness));
      }
      return valA;
    }
    case 'audio': {
      if (!mod.audio) return 0;
      const raw = getAudioLevel();
      return raw * mod.audio.gain;
    }
    case 'keyframe': {
      if (!mod.keyframe) return 0;
      const { timelineLength, loop, keyframes } = mod.keyframe;
      if (keyframes.length === 0) return 0;

      let frame = (time * 60);
      if (loop) frame = frame % timelineLength;
      else frame = Math.min(frame, timelineLength);

      const sorted = [...keyframes].sort((a, b) => a.t - b.t);

      if (frame <= sorted[0].t) return sorted[0].val;
      if (frame >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].val;

      let prev = sorted[0];
      let next = sorted[1];

      for (let i = 0; i < sorted.length - 1; i++) {
        if (frame >= sorted[i].t && frame < sorted[i + 1].t) {
          prev = sorted[i];
          next = sorted[i + 1];
          break;
        }
      }

      const dt = next.t - prev.t;
      if (dt <= 0) return prev.val;
      const localT = (frame - prev.t) / dt;

      if (prev.type === 'jump') return prev.val;
      if (prev.type === 'linear') return prev.val + (next.val - prev.val) * localT;

      const t2 = localT * localT;
      const t3 = t2 * localT;
      const ease = 3 * t2 - 2 * t3;
      return prev.val + (next.val - prev.val) * ease;
    }
    case 'adsr': {
      if (!mod.adsr) return 0;
      const { inputSourceId, threshold, attack, decay, sustain, release } = mod.adsr;
      const inputVal = modulesValues[inputSourceId] || 0;

      const now = time;
      const triggered = inputVal > threshold;
      let output = 0;

      if (triggered && !mod.adsr.triggerState) {
        mod.adsr.triggerState = true;
        mod.adsr.triggerTime = now;
      } else if (!triggered && mod.adsr.triggerState) {
        mod.adsr.triggerState = false;
        mod.adsr.releaseTime = now;
      }

      const a = Math.max(0.01, attack / 100);
      const d = Math.max(0.01, decay / 100);
      const r = Math.max(0.01, release / 100);

      if (mod.adsr.triggerState) {
        const elapsed = now - mod.adsr.triggerTime;
        if (elapsed < a) {
          output = elapsed / a;
        } else if (elapsed < a + d) {
          const dProg = (elapsed - a) / d;
          output = 1.0 - dProg * (1.0 - sustain);
        } else {
          output = sustain;
        }
      } else {
        const elapsedRelease = now - (mod.adsr.releaseTime || 0);
        if (elapsedRelease < r) {
          const startVal = mod.adsr.lastValue !== undefined ? mod.adsr.lastValue : sustain;
          const rProg = elapsedRelease / r;
          output = startVal * (1.0 - rProg);
        } else {
          output = 0;
        }
      }

      mod.adsr.lastValue = output;
      return output;
    }
    case 'midi': {
      if (!mod.midi) return 0;
      const { deviceId, channel, type, ccNumber } = mod.midi;

      let targetStateKey = `${deviceId || 'any'}_${channel}`;

      if (channel === 0) {
        let latestTime = 0;
        let bestKey = targetStateKey;
        const searchPrefix = deviceId && deviceId !== 'any' ? `${deviceId}_` : `any_`;
        for (const key of Object.keys(midiState)) {
          if (key.startsWith(searchPrefix)) {
            const st = midiState[key];
            const tVal = type === 'note' ? st.lastNoteTime : (ccNumber !== undefined ? st.lastCcTime[ccNumber] || 0 : 0);
            if (tVal > latestTime) {
              latestTime = tVal;
              bestKey = key;
            }
          }
        }
        targetStateKey = bestKey;
      }

      if (!midiState[targetStateKey]) return 0;

      const s = midiState[targetStateKey];
      let val = 0;

      if (type === 'note') {
        val = s.note;
      } else if (type === 'cc' && ccNumber !== undefined) {
        val = s.cc[ccNumber] || 0;
      }

      return val;
    }
    default: return 0;
  }
};

/**
 * Main automation evaluation loop: calculates modulated values for all active modules
 * and applies offsets/gains to target simulation parameters.
 */
export const processAutomation = (
  modules: AutomationModule[],
  currentParams: SimulationParams,
  time: number
): {
  nextParams: SimulationParams;
  moduleOutputs: Record<string, number>;
  targetOutputs: Record<string, number>;
} => {
  const nextParams = { ...currentParams };
  const moduleOutputs: Record<string, number> = {};
  const targetOutputs: Record<string, number> = {};
  const boolAccumulator: Record<string, number> = {};

  modules.forEach(mod => {
    const raw = processModuleCore(mod, time, moduleOutputs);
    let processed = 0;

    if (mod.useMapping) {
      let norm = raw;
      if (mod.type === 'lfo') norm = (raw + 1) / 2;
      norm = Math.max(0, Math.min(1, norm));
      processed = mod.minVal + norm * (mod.maxVal - mod.minVal);
    } else {
      processed = raw * mod.gain + mod.offset;
      processed = Math.max(mod.minVal, Math.min(mod.maxVal, processed));
    }

    if (!mod.enabled) processed = 0;
    moduleOutputs[mod.id] = processed;

    if (mod.enabled) {
      mod.targets.forEach(target => {
        const key = target.paramKey as keyof SimulationParams;
        const contribution = processed * target.gain + target.offset;
        targetOutputs[`${mod.id}_${target.id}`] = contribution;

        if (typeof nextParams[key] === 'boolean') {
          if (boolAccumulator[key as string] === undefined) {
            boolAccumulator[key as string] = currentParams[key] ? 1 : 0;
          }
          boolAccumulator[key as string] += contribution;
        } else if (typeof nextParams[key] === 'number') {
          (nextParams as Record<string, unknown>)[key as string] = (nextParams[key] as number) + contribution;
        }
      });
    }
  });

  Object.keys(boolAccumulator).forEach(key => {
    (nextParams as Record<string, unknown>)[key] = boolAccumulator[key] > 0.5;
  });

  return { nextParams, moduleOutputs, targetOutputs };
};
