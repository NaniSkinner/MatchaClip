// electron/utils/ffmpeg-native.ts
import ffmpeg from "fluent-ffmpeg";
import { app } from "electron";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * Initialize FFmpeg with correct binary paths for packaged Electron app
 * This handles both development and production environments
 */
export function initializeFFmpeg(): void {
  try {
    // Get the correct path to FFmpeg binaries
    // In development: direct from node_modules
    // In production: from unpacked asar
    let ffmpegPath: string;
    let ffprobePath: string;

    if (app.isPackaged) {
      // Production: binaries are in app.asar.unpacked
      const basePath = process.resourcesPath;
      ffmpegPath = require("ffmpeg-static").replace(
        "app.asar",
        "app.asar.unpacked"
      );
      ffprobePath = require("ffprobe-static").path.replace(
        "app.asar",
        "app.asar.unpacked"
      );
    } else {
      // Development: direct from node_modules
      ffmpegPath = require("ffmpeg-static");
      ffprobePath = require("ffprobe-static").path;
    }

    // Set the binary paths
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);

    console.log("[FFmpeg] Initialized successfully");
    console.log("[FFmpeg] FFmpeg path:", ffmpegPath);
    console.log("[FFmpeg] FFprobe path:", ffprobePath);
  } catch (error) {
    console.error("[FFmpeg] Initialization failed:", error);
    throw error;
  }
}

/**
 * Export options interface
 */
export interface ExportOptions {
  onProgress?: (progress: {
    percent: number;
    currentFps: number;
    timemark: string;
  }) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  preset?:
    | "ultrafast"
    | "superfast"
    | "veryfast"
    | "faster"
    | "fast"
    | "medium"
    | "slow"
    | "slower"
    | "veryslow";
  crf?: number; // 0-51, lower is better quality (23 is default)
  videoBitrate?: string; // e.g., '1000k', '5M'
  audioBitrate?: string; // e.g., '128k'
}

/**
 * Execute a custom FFmpeg command with progress tracking
 * This is used for complex filter operations
 */
export function executeFFmpegCommand(
  args: string[],
  outputPath: string,
  options: ExportOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { onProgress, onEnd, onError } = options;

    // Get FFmpeg binary path
    const ffmpegPath = require("ffmpeg-static");

    // Build the full command with all args plus output path
    const fullArgs = [...args, outputPath];

    console.log("[FFmpeg] Starting export...");
    console.log("[FFmpeg] Binary:", ffmpegPath);
    console.log("[FFmpeg] Args:", fullArgs.join(" "));
    console.log("[FFmpeg] Output:", outputPath);

    // Spawn FFmpeg process directly for better control
    const ffmpegProcess = spawn(ffmpegPath, fullArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let ffmpegOutput = "";
    let duration: number | null = null;

    // Parse stderr for progress (FFmpeg outputs to stderr)
    ffmpegProcess.stderr.on("data", (data: Buffer) => {
      const output = data.toString();
      ffmpegOutput += output;

      // Extract duration if not yet found
      if (!duration) {
        const durationMatch = output.match(
          /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/
        );
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      }

      // Extract progress
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      const fpsMatch = output.match(/fps=\s*(\d+\.?\d*)/);

      if (timeMatch && duration && onProgress) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseFloat(timeMatch[3]);
        const currentTime = hours * 3600 + minutes * 60 + seconds;
        const percent = Math.min((currentTime / duration) * 100, 100);
        const currentFps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;

        onProgress({
          percent,
          currentFps,
          timemark: `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`,
        });
      }
    });

    // Handle process completion
    ffmpegProcess.on("close", (code: number) => {
      if (code === 0) {
        console.log("[FFmpeg] Export completed successfully");
        if (onEnd) {
          onEnd();
        }
        resolve();
      } else {
        const error = new Error(
          `FFmpeg exited with code ${code}. Output: ${ffmpegOutput.substring(
            ffmpegOutput.length - 500
          )}`
        );
        console.error("[FFmpeg] Export error:", error);
        if (onError) {
          onError(error);
        }
        reject(error);
      }
    });

    // Handle process errors
    ffmpegProcess.on("error", (err: Error) => {
      console.error("[FFmpeg] Process error:", err);
      if (onError) {
        onError(err);
      }
      reject(err);
    });
  });
}

/**
 * Get video metadata using ffprobe
 */
export function getVideoMetadata(
  filePath: string
): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

/**
 * Clean up temporary files
 */
export function cleanupTempFiles(files: string[]): void {
  files.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`[FFmpeg] Cleaned up: ${file}`);
      }
    } catch (error) {
      console.warn(`[FFmpeg] Failed to cleanup ${file}:`, error);
    }
  });
}

/**
 * Create temp directory for export operations
 */
export function createTempDirectory(): string {
  const tempDir = path.join(
    app.getPath("temp"),
    "clipforge-export-" + Date.now()
  );
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * Write blob/buffer to temp file
 */
export function writeTempFile(
  buffer: Buffer,
  filename: string,
  tempDir: string
): string {
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
