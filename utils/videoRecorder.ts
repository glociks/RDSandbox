import * as Mp4Muxer from "mp4-muxer";

/**
 * High-Performance Hardware-Accelerated Video Recorder.
 *
 * Utilizes the browser-native WebCodecs API (`VideoEncoder`, `VideoFrame`) paired with
 * `mp4-muxer` to capture, encode, and multiplex simulation frame streams directly into
 * MP4 containers on the client with zero backend dependencies.
 */
export class VideoRecorder {
  private muxer: Mp4Muxer.Muxer<Mp4Muxer.ArrayBufferTarget> | null = null;
  private encoder: VideoEncoder | null = null;
  private width: number = 0;
  private height: number = 0;
  private fps: number = 30;
  private frameCounter: number = 0;

  /**
   * Initializes the hardware video encoder with adaptive AVC/H.264 profile level selection.
   *
   * @param width - Grid width in pixels
   * @param height - Grid height in pixels
   * @param fps - Target frame rate
   */
  async start(width: number, height: number, fps: number): Promise<void> {
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.frameCounter = 0;

    if (typeof VideoEncoder === 'undefined') {
      throw new Error("WebCodecs API is not supported in this browser environment.");
    }

    this.muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: this.width,
        height: this.height,
      },
      fastStart: 'in-memory',
    });

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer?.addVideoChunk(chunk, meta),
      error: (e) => console.error("[VideoRecorder] Encoder error:", e),
    });

    // Adaptive AVC Profile & Level selection based on pixel count
    // - Level 3.1: up to 1280x720 (avc1.42001f)
    // - Level 4.2: up to 1920x1080 @ 60fps (avc1.4d002a)
    // - Level 5.1: up to 4096x2160 (avc1.4d0033)
    const pixelCount = width * height;
    let codec = 'avc1.42001f';

    if (pixelCount > 2080000) {
      codec = 'avc1.4d0033';
    } else if (pixelCount > 922000) {
      codec = 'avc1.4d002a';
    }

    try {
      await this.encoder.configure({
        codec,
        width: this.width,
        height: this.height,
        bitrate: pixelCount > 922000 ? 15_000_000 : 8_000_000,
        framerate: this.fps,
      });
    } catch {
      console.warn(`[VideoRecorder] Codec ${codec} failed, falling back to baseline high profile.`);
      await this.encoder.configure({
        codec: 'avc1.420033',
        width: this.width,
        height: this.height,
        bitrate: 10_000_000,
        framerate: this.fps,
      });
    }
  }

  /**
   * Returns true if the underlying WebCodecs VideoEncoder is configured and ready for frames.
   */
  get isConfigured(): boolean {
    return this.encoder !== null && this.encoder.state === 'configured';
  }

  /**
   * Captures a canvas frame snapshot, constructs a VideoFrame, and submits it to the encoder.
   *
   * @param canvas - Source HTMLCanvasElement
   */
  async addFrame(canvas: HTMLCanvasElement): Promise<void> {
    if (!this.encoder) return;

    const timestamp = (this.frameCounter * 1_000_000) / this.fps;
    const bitmap = await createImageBitmap(canvas);

    const frame = new VideoFrame(bitmap, {
      timestamp,
      duration: 1_000_000 / this.fps,
    });

    this.encoder.encode(frame, { keyFrame: this.frameCounter % 30 === 0 });
    frame.close();
    bitmap.close();

    this.frameCounter++;
  }

  /**
   * Flushes all queued frames, closes encoder streams, finalizes the MP4 multiplexer,
   * and triggers a client-side download.
   *
   * @param fileName - Optional file name for the downloaded MP4
   */
  async stop(fileName?: string): Promise<void> {
    if (!this.encoder || !this.muxer) return;

    await this.encoder.flush();
    this.encoder.close();
    this.encoder = null;

    this.muxer.finalize();

    const { buffer } = this.muxer.target;
    this.download(buffer, fileName);

    this.muxer = null;
  }

  /**
   * Triggers a browser download of the multiplexed MP4 buffer.
   */
  private download(buffer: ArrayBuffer, fileName?: string): void {
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    const cleanName = fileName && fileName.trim() ? fileName.trim() : `mcrd_render_${Date.now()}`;
    a.download = cleanName.toLowerCase().endsWith('.mp4') ? cleanName : `${cleanName}.mp4`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
