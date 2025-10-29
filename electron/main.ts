import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import {
  initializeFFmpeg,
  executeFFmpegCommand,
  getVideoMetadata,
  createTempDirectory,
  writeTempFile,
  cleanupTempFiles,
} from "./utils/ffmpeg-native";
import {
  getScreenSources,
  validateScreenSource,
} from "./recording/screen-capture";
import {
  checkScreenRecordingPermission,
  requestScreenRecordingPermission,
} from "./recording/permissions";
import * as fs from "fs";
import * as path from "path";

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let nextServerProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === "development";
const port = process.env.PORT || 3000;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for IndexedDB and FFmpeg WASM
      webSecurity: true,
    },
    show: false, // Don't show until ready
  });

  // Show window when ready to avoid visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in browser instead of Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Load the app
  if (isDev) {
    // In development, connect to the Next.js dev server
    mainWindow.loadURL(`http://localhost:${port}`);
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, start a local Next.js server and connect to it
    // This is required because we have dynamic routes that can't use static export
    startNextServer();
    mainWindow.loadURL(`http://localhost:${port}`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) return; // Dev server is already running separately

  // Start Next.js production server
  // We bundle the built Next.js app with Electron and run it locally
  const nextPath = join(process.resourcesPath, "app");

  nextServerProcess = spawn(
    "node",
    [
      join(nextPath, "node_modules", "next", "dist", "bin", "next"),
      "start",
      "-p",
      String(port),
    ],
    {
      cwd: nextPath,
      stdio: "inherit",
    }
  );

  nextServerProcess.on("error", (error) => {
    console.error("Failed to start Next.js server:", error);
  });
}

function stopNextServer() {
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize FFmpeg
  try {
    initializeFFmpeg();
    console.log("[App] FFmpeg initialized successfully");
  } catch (error) {
    console.error("[App] Failed to initialize FFmpeg:", error);
  }

  createWindow();
  setupIpcHandlers();

  app.on("activate", () => {
    // On macOS, re-create a window when dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopNextServer();
    app.quit();
  }
});

// Clean up before quit
app.on("before-quit", () => {
  stopNextServer();
});

// Handle any uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

// Setup IPC Handlers for video export
function setupIpcHandlers() {
  // IPC Handler: Export Video with complex FFmpeg command
  ipcMain.handle(
    "export-video",
    async (event, { ffmpegArgs, mediaFiles, fonts, outputFilename }) => {
      let tempDir: string | null = null;
      const tempFiles: string[] = [];

      try {
        // Create temp directory
        tempDir = createTempDirectory();
        console.log("[IPC] Created temp directory:", tempDir);

        // Write media files to temp directory
        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];
          const buffer = Buffer.from(media.data);
          const tempFilePath = writeTempFile(buffer, media.filename, tempDir);
          tempFiles.push(tempFilePath);
          console.log(`[IPC] Wrote temp file: ${media.filename}`);
        }

        // Write font files to temp directory
        for (const font of fonts) {
          const buffer = Buffer.from(font.data);
          const tempFilePath = writeTempFile(buffer, font.filename, tempDir);
          tempFiles.push(tempFilePath);
          console.log(`[IPC] Wrote font file: ${font.filename}`);
        }

        // Get output path from user
        const result = await dialog.showSaveDialog(mainWindow!, {
          title: "Export Video",
          defaultPath: outputFilename || `video-${Date.now()}.mp4`,
          filters: [
            { name: "MP4 Video", extensions: ["mp4"] },
            { name: "MOV Video", extensions: ["mov"] },
          ],
        });

        if (result.canceled || !result.filePath) {
          throw new Error("Export cancelled by user");
        }

        const outputPath = result.filePath;

        // Update FFmpeg args to use temp directory paths
        const updatedArgs = ffmpegArgs.map((arg: string) => {
          // Replace input file references with temp directory paths
          // Check if arg starts with "input" and contains a file extension (has a dot)
          if (arg.startsWith("input") && arg.includes(".")) {
            return path.join(tempDir!, arg);
          }
          // Replace font file references with temp directory paths
          if (arg.startsWith("font") && arg.includes(".")) {
            return path.join(tempDir!, arg);
          }
          return arg;
        });

        console.log("[IPC] Starting FFmpeg export...");
        console.log("[IPC] Args:", updatedArgs);

        // Execute FFmpeg command
        await executeFFmpegCommand(updatedArgs, outputPath, {
          onProgress: (progress) => {
            // Send progress updates to renderer
            mainWindow?.webContents.send("export-progress", progress);
          },
        });

        // Clean up temp files
        cleanupTempFiles(tempFiles);
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }

        return { success: true, outputPath };
      } catch (error) {
        // Clean up temp files on error
        if (tempFiles.length > 0) {
          cleanupTempFiles(tempFiles);
        }
        if (tempDir && fs.existsSync(tempDir)) {
          try {
            fs.rmdirSync(tempDir);
          } catch (e) {
            console.warn("[IPC] Failed to remove temp directory:", e);
          }
        }
        throw error;
      }
    }
  );

  // IPC Handler: Select Export Location (optional, for pre-selecting location)
  ipcMain.handle("select-export-location", async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: "Export Video",
      defaultPath: `video-${Date.now()}.mp4`,
      filters: [
        { name: "MP4 Video", extensions: ["mp4"] },
        { name: "MOV Video", extensions: ["mov"] },
      ],
    });

    return result.filePath;
  });

  // IPC Handler: Get Video Metadata
  ipcMain.handle("get-video-metadata", async (event, filePath) => {
    return await getVideoMetadata(filePath);
  });

  // IPC Handler: Check FFmpeg availability
  ipcMain.handle("check-ffmpeg", async () => {
    try {
      // Simple check - try to get version
      return { available: true };
    } catch (error) {
      return { available: false, error: String(error) };
    }
  });

  // ===== RECORDING IPC HANDLERS =====

  // IPC Handler: Get screen sources
  ipcMain.handle("recording:get-screen-sources", async () => {
    try {
      console.log("[IPC] Getting screen sources...");
      const sources = await getScreenSources();
      console.log(`[IPC] Returning ${sources.length} sources`);
      return sources;
    } catch (error) {
      console.error("[IPC] Error getting screen sources:", error);
      throw error;
    }
  });

  // IPC Handler: Check screen recording permission
  ipcMain.handle("recording:check-permission", async () => {
    try {
      console.log("[IPC] Checking screen recording permission...");
      const status = await checkScreenRecordingPermission();
      console.log("[IPC] Permission status:", status);
      return status;
    } catch (error) {
      console.error("[IPC] Error checking permission:", error);
      throw error;
    }
  });

  // IPC Handler: Request screen recording permission
  ipcMain.handle("recording:request-permission", async () => {
    try {
      console.log("[IPC] Requesting screen recording permission...");
      const status = await requestScreenRecordingPermission();
      console.log("[IPC] Permission status:", status);
      return status;
    } catch (error) {
      console.error("[IPC] Error requesting permission:", error);
      throw error;
    }
  });
}
