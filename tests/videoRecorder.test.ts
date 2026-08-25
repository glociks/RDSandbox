import { describe, it, expect } from 'vitest';
import { VideoRecorder } from '../utils/videoRecorder';

describe('VideoRecorder Hardware Acceleration Engine', () => {
  it('instantiates cleanly with isConfigured initially false', () => {
    const recorder = new VideoRecorder();
    expect(recorder.isConfigured).toBe(false);
  });

  it('throws informative error when VideoEncoder is not available in node/mock test env', async () => {
    const recorder = new VideoRecorder();
    await expect(recorder.start(640, 480, 30)).rejects.toThrow(
      'WebCodecs API is not supported in this browser environment.'
    );
  });
});
