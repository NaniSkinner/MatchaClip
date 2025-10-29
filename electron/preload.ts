import { contextBridge, ipcRenderer } from "electron";

// Type definitions for progress data
interface ExportProgress {
  percent: number;
  currentFps: number;
  timemark: string;
}

interface ExportVideoParams {
  ffmpegArgs: string[];
  mediaFiles: Array<{ filename: string; data: ArrayBuffer }>;
  fonts: Array<{ filename: string; data: ArrayBuffer }>;
  outputFilename?: string;
}

interface ExportResult {
  success: boolean;
  outputPath: string;
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Platform info
  platform: process.platform,

  // Video Export API
  exportVideo: (params: ExportVideoParams): Promise<ExportResult> =>
    ipcRenderer.invoke("export-video", params),

  selectExportLocation: (): Promise<string | undefined> =>
    ipcRenderer.invoke("select-export-location"),

  getVideoMetadata: (filePath: string): Promise<any> =>
    ipcRenderer.invoke("get-video-metadata", filePath),

  checkFFmpeg: (): Promise<{ available: boolean; error?: string }> =>
    ipcRenderer.invoke("check-ffmpeg"),

  // Progress tracking
  onExportProgress: (callback: (progress: ExportProgress) => void) => {
    ipcRenderer.on("export-progress", (event, progress) => callback(progress));
  },

  removeExportProgressListener: () => {
    ipcRenderer.removeAllListeners("export-progress");
  },
});

// Type definitions for the exposed API
export interface ElectronAPI {
  platform: string;
  exportVideo: (params: ExportVideoParams) => Promise<ExportResult>;
  selectExportLocation: () => Promise<string | undefined>;
  getVideoMetadata: (filePath: string) => Promise<any>;
  checkFFmpeg: () => Promise<{ available: boolean; error?: string }>;
  onExportProgress: (callback: (progress: ExportProgress) => void) => void;
  removeExportProgressListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
