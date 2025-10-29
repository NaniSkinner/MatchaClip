/**
 * VideoCompositor
 *
 * Combines screen capture and webcam streams into a single Picture-in-Picture video
 * using HTML5 Canvas API. Composites frames at 30fps for smooth recording.
 */

export interface PiPLayout {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size: "small" | "medium" | "large";
}

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement;
  private webcamVideo: HTMLVideoElement;
  private outputStream: MediaStream | null = null;
  private animationId: number | null = null;
  private layout: PiPLayout;
  private isCompositing = false;

  constructor(width: number, height: number, layout: PiPLayout) {
    // Create offscreen canvas for compositing
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true, // Better performance
    });

    if (!ctx) {
      throw new Error("Failed to get canvas 2D context");
    }

    this.ctx = ctx;
    this.layout = layout;

    // Create video elements for streams
    this.screenVideo = document.createElement("video");
    this.screenVideo.autoplay = true;
    this.screenVideo.muted = true;
    this.screenVideo.playsInline = true;

    this.webcamVideo = document.createElement("video");
    this.webcamVideo.autoplay = true;
    this.webcamVideo.muted = true;
    this.webcamVideo.playsInline = true;

    console.log("[VideoCompositor] Initialized", { width, height, layout });
  }

  /**
   * Set the screen capture stream
   */
  setScreenStream(stream: MediaStream): void {
    this.screenVideo.srcObject = stream;
    console.log("[VideoCompositor] Screen stream set");
  }

  /**
   * Set the webcam stream
   */
  setWebcamStream(stream: MediaStream): void {
    this.webcamVideo.srcObject = stream;
    console.log("[VideoCompositor] Webcam stream set");
  }

  /**
   * Update the PiP layout configuration
   */
  setLayout(layout: PiPLayout): void {
    this.layout = layout;
    console.log("[VideoCompositor] Layout updated", layout);
  }

  /**
   * Start compositing and return the output stream
   */
  start(): MediaStream {
    if (this.isCompositing) {
      console.warn("[VideoCompositor] Already compositing");
      return this.outputStream!;
    }

    // Capture stream from canvas at 30fps
    this.outputStream = this.canvas.captureStream(30);
    this.isCompositing = true;

    // Start compositing loop
    this.compositeFrame();

    console.log("[VideoCompositor] Compositing started");
    return this.outputStream;
  }

  /**
   * Stop compositing
   */
  stop(): void {
    if (!this.isCompositing) return;

    this.isCompositing = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    console.log("[VideoCompositor] Compositing stopped");
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.stop();

    // Stop output stream
    if (this.outputStream) {
      this.outputStream.getTracks().forEach((track) => track.stop());
      this.outputStream = null;
    }

    // Clear video sources (don't stop them - they're owned by parent)
    this.screenVideo.srcObject = null;
    this.webcamVideo.srcObject = null;

    console.log("[VideoCompositor] Cleaned up");
  }

  /**
   * Main compositing loop - called every frame
   */
  private compositeFrame = (): void => {
    if (!this.isCompositing) return;

    try {
      // Clear canvas
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw screen layer (full canvas)
      this.drawScreen();

      // Draw webcam overlay
      this.drawWebcam();

      // Schedule next frame
      this.animationId = requestAnimationFrame(this.compositeFrame);
    } catch (err) {
      console.error("[VideoCompositor] Frame composition error:", err);
      // Continue compositing even if one frame fails
      this.animationId = requestAnimationFrame(this.compositeFrame);
    }
  };

  /**
   * Draw the screen video (background layer)
   */
  private drawScreen(): void {
    if (this.screenVideo.readyState < 2) return; // Not ready

    try {
      this.ctx.drawImage(
        this.screenVideo,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
    } catch (err) {
      // Video might not be ready yet, skip this frame
    }
  }

  /**
   * Draw the webcam video (overlay layer)
   */
  private drawWebcam(): void {
    if (this.webcamVideo.readyState < 2) return; // Not ready

    try {
      const rect = this.calculateWebcamRect();

      // Save context state
      this.ctx.save();

      // Create rounded rectangle clip path
      this.roundRect(rect.x, rect.y, rect.width, rect.height, 12);
      this.ctx.clip();

      // Draw webcam video
      this.ctx.drawImage(
        this.webcamVideo,
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );

      // Restore context
      this.ctx.restore();

      // Draw border
      this.ctx.strokeStyle = "#a855f7"; // Purple border
      this.ctx.lineWidth = 3;
      this.roundRect(rect.x, rect.y, rect.width, rect.height, 12);
      this.ctx.stroke();

      // Optional: Add subtle shadow
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    } catch (err) {
      // Video might not be ready yet, skip this frame
    }
  }

  /**
   * Calculate webcam rectangle based on layout configuration
   */
  private calculateWebcamRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const padding = 20; // pixels from edge
    const webcamWidth = this.getWebcamWidth();
    const webcamHeight = (webcamWidth * 9) / 16; // Maintain 16:9 aspect ratio

    let x = padding;
    let y = padding;

    switch (this.layout.position) {
      case "top-left":
        x = padding;
        y = padding;
        break;
      case "top-right":
        x = this.canvas.width - webcamWidth - padding;
        y = padding;
        break;
      case "bottom-left":
        x = padding;
        y = this.canvas.height - webcamHeight - padding;
        break;
      case "bottom-right":
        x = this.canvas.width - webcamWidth - padding;
        y = this.canvas.height - webcamHeight - padding;
        break;
    }

    return { x, y, width: webcamWidth, height: webcamHeight };
  }

  /**
   * Get webcam width based on size setting
   */
  private getWebcamWidth(): number {
    const baseWidth = this.canvas.width;

    switch (this.layout.size) {
      case "small":
        return baseWidth * 0.15; // 15%
      case "medium":
        return baseWidth * 0.2; // 20%
      case "large":
        return baseWidth * 0.25; // 25%
      default:
        return baseWidth * 0.2;
    }
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }
}
