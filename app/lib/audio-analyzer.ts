/**
 * Audio Level Analyzer
 *
 * Uses Web Audio API to analyze audio stream levels in real-time.
 * Provides smooth, performant audio level monitoring for VU meters.
 */

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyzerNode: AnalyserNode;
  private dataArray: Uint8Array<ArrayBuffer>;
  private animationId: number | null = null;

  constructor(stream: MediaStream) {
    this.audioContext = new AudioContext();
    this.analyzerNode = this.audioContext.createAnalyser();

    // FFT size of 256 provides good balance between performance and accuracy
    this.analyzerNode.fftSize = 256;

    // Smoothing for more natural meter movement
    this.analyzerNode.smoothingTimeConstant = 0.8;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyzerNode);

    this.dataArray = new Uint8Array(
      this.analyzerNode.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;
  }

  /**
   * Get current audio level (0-1)
   * @returns Normalized audio level between 0 and 1
   */
  getLevel(): number {
    this.analyzerNode.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    return average / 255; // Normalize to 0-1
  }

  /**
   * Get frequency spectrum data for waveform visualization
   * Returns array of normalized values (0-1) for multiple frequency bands
   * @param barCount Number of bars to display (default 12)
   * @returns Array of normalized frequency values
   */
  getFrequencyBars(barCount: number = 12): number[] {
    this.analyzerNode.getByteFrequencyData(this.dataArray);

    const bars: number[] = [];
    const samplesPerBar = Math.floor(this.dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;

      // Get average for this frequency band
      let sum = 0;
      for (let j = start; j < end && j < this.dataArray.length; j++) {
        sum += this.dataArray[j];
      }
      const average = sum / samplesPerBar;
      bars.push(average / 255); // Normalize to 0-1
    }

    return bars;
  }

  /**
   * Start monitoring audio levels
   * @param callback Called on each frame with current level (0-1)
   */
  startMonitoring(callback: (level: number) => void): void {
    const monitor = () => {
      const level = this.getLevel();
      callback(level);
      this.animationId = requestAnimationFrame(monitor);
    };
    monitor();
  }

  /**
   * Stop monitoring audio levels
   */
  stopMonitoring(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Clean up resources
   * IMPORTANT: Always call this when done to prevent memory leaks
   */
  cleanup(): void {
    this.stopMonitoring();
    if (this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
  }
}
