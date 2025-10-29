// app/hooks/useNativeFFmpegExport.ts
"use client";

import { useState, useCallback, useEffect } from "react";

interface ExportProgress {
  percent: number;
  currentFps: number;
  timemark: string;
}

interface UseNativeFFmpegExportReturn {
  exportVideo: (
    ffmpegArgs: string[],
    mediaFiles: Array<{ filename: string; data: ArrayBuffer }>,
    fonts: Array<{ filename: string; data: ArrayBuffer }>,
    outputFilename?: string
  ) => Promise<string>;
  progress: number;
  isExporting: boolean;
  error: string | null;
  isFFmpegAvailable: boolean;
}

export function useNativeFFmpegExport(): UseNativeFFmpegExportReturn {
  const [progress, setProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFFmpegAvailable, setIsFFmpegAvailable] = useState<boolean>(false);

  // Check if we're in Electron environment
  const isElectron = typeof window !== "undefined" && window.electronAPI;

  // Check FFmpeg availability on mount
  useEffect(() => {
    const checkFFmpeg = async () => {
      if (isElectron) {
        try {
          const result = await window.electronAPI.checkFFmpeg();
          setIsFFmpegAvailable(result.available);
          if (!result.available) {
            console.error("[FFmpeg] Not available:", result.error);
          }
        } catch (err) {
          console.error("[FFmpeg] Check failed:", err);
          setIsFFmpegAvailable(false);
        }
      } else {
        console.warn("[FFmpeg] Not in Electron environment");
        setIsFFmpegAvailable(false);
      }
    };

    checkFFmpeg();
  }, [isElectron]);

  // Listen for progress updates
  useEffect(() => {
    if (isElectron) {
      window.electronAPI.onExportProgress((progressData: ExportProgress) => {
        setProgress(Math.min(progressData.percent, 100));
      });
    }

    return () => {
      if (isElectron) {
        window.electronAPI.removeExportProgressListener();
      }
    };
  }, [isElectron]);

  const exportVideo = useCallback(
    async (
      ffmpegArgs: string[],
      mediaFiles: Array<{ filename: string; data: ArrayBuffer }>,
      fonts: Array<{ filename: string; data: ArrayBuffer }>,
      outputFilename?: string
    ): Promise<string> => {
      if (!isElectron) {
        throw new Error(
          "Native FFmpeg is only available in Electron environment"
        );
      }

      if (!isFFmpegAvailable) {
        throw new Error("FFmpeg is not available");
      }

      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        console.log("[Export] Starting native FFmpeg export...");
        console.log("[Export] FFmpeg args:", ffmpegArgs);
        console.log("[Export] Media files:", mediaFiles.length);
        console.log("[Export] Fonts:", fonts.length);

        const result = await window.electronAPI.exportVideo({
          ffmpegArgs,
          mediaFiles,
          fonts,
          outputFilename,
        });

        console.log("[Export] Export completed:", result);
        setProgress(100);
        return result.outputPath;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Export failed";
        setError(errorMessage);
        console.error("[Export] Export error:", err);
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    [isElectron, isFFmpegAvailable]
  );

  return {
    exportVideo,
    progress,
    isExporting,
    error,
    isFFmpegAvailable,
  };
}
