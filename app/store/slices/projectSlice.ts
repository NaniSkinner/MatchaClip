import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TextElement,
  MediaFile,
  ActiveElement,
  ExportConfig,
} from "../../types";
import { ProjectState } from "../../types";
import { sanitizeMediaFile } from "../../utils/utils";

export const initialState: ProjectState = {
  id: crypto.randomUUID(),
  projectName: "",
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  mediaFiles: [],
  textElements: [],
  currentTime: 0,
  isPlaying: false,
  isMuted: false,
  duration: 0,
  zoomLevel: 1,
  timelineZoom: 100,
  enableMarkerTracking: true,
  activeSection: "media",
  activeElement: null,
  activeElementIndex: 0,
  inPoint: null,
  outPoint: null,
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  aspectRatio: "16:9",
  history: [],
  future: [],
  exportSettings: {
    resolution: "1080p",
    quality: "high",
    speed: "fastest",
    fps: 30,
    format: "mp4",
    includeSubtitles: false,
  },
};

const calculateTotalDuration = (
  mediaFiles: MediaFile[],
  textElements: TextElement[]
): number => {
  // Filter out invalid values and only include valid numbers
  const mediaDurations = mediaFiles
    .map((v) => v.positionEnd)
    .filter((d) => typeof d === "number" && !isNaN(d) && isFinite(d));
  const textDurations = textElements
    .map((v) => v.positionEnd)
    .filter((d) => typeof d === "number" && !isNaN(d) && isFinite(d));

  // Calculate max duration, defaulting to 1 if no valid durations exist
  const maxDuration = Math.max(0, ...mediaDurations, ...textDurations);
  return maxDuration > 0 ? maxDuration : 1;
};

const projectStateSlice = createSlice({
  name: "projectState",
  initialState,
  reducers: {
    setMediaFiles: (state, action: PayloadAction<MediaFile[]>) => {
      state.mediaFiles = action.payload;
      // Calculate duration based on the last video's end time
      state.duration = calculateTotalDuration(
        state.mediaFiles,
        state.textElements
      );
    },
    setProjectName: (state, action: PayloadAction<string>) => {
      state.projectName = action.payload;
    },
    setProjectId: (state, action: PayloadAction<string>) => {
      state.id = action.payload;
    },
    setProjectCreatedAt: (state, action: PayloadAction<string>) => {
      state.createdAt = action.payload;
    },
    setProjectLastModified: (state, action: PayloadAction<string>) => {
      state.lastModified = action.payload;
    },

    setTextElements: (state, action: PayloadAction<TextElement[]>) => {
      state.textElements = action.payload;
      state.duration = calculateTotalDuration(
        state.mediaFiles,
        state.textElements
      );
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setActiveSection: (state, action: PayloadAction<ActiveElement>) => {
      state.activeSection = action.payload;
    },
    setActiveElement: (state, action: PayloadAction<ActiveElement | null>) => {
      state.activeElement = action.payload;
    },
    setActiveElementIndex: (state, action: PayloadAction<number>) => {
      state.activeElementIndex = action.payload;
    },
    setFilesID: (state, action: PayloadAction<string[]>) => {
      state.filesID = action.payload;
    },
    setExportSettings: (state, action: PayloadAction<ExportConfig>) => {
      state.exportSettings = action.payload;
    },
    setResolution: (state, action: PayloadAction<string>) => {
      state.exportSettings.resolution = action.payload;
    },
    setQuality: (state, action: PayloadAction<string>) => {
      state.exportSettings.quality = action.payload;
    },
    setSpeed: (state, action: PayloadAction<string>) => {
      state.exportSettings.speed = action.payload;
    },
    setFps: (state, action: PayloadAction<number>) => {
      state.exportSettings.fps = action.payload;
    },
    setTimelineZoom: (state, action: PayloadAction<number>) => {
      state.timelineZoom = action.payload;
    },
    setMarkerTrack: (state, action: PayloadAction<boolean>) => {
      state.enableMarkerTracking = action.payload;
    },
    // Special reducer for rehydrating state from IndexedDB
    rehydrate: (state, action: PayloadAction<ProjectState>) => {
      // Sanitize all media files to prevent NaN values from corrupted state
      const sanitizedPayload = {
        ...action.payload,
        mediaFiles: action.payload.mediaFiles.map(sanitizeMediaFile),
        // Sanitize in/out points to prevent NaN from corrupting playback
        inPoint:
          typeof action.payload.inPoint === "number" &&
          !isNaN(action.payload.inPoint) &&
          isFinite(action.payload.inPoint)
            ? action.payload.inPoint
            : null,
        outPoint:
          typeof action.payload.outPoint === "number" &&
          !isNaN(action.payload.outPoint) &&
          isFinite(action.payload.outPoint)
            ? action.payload.outPoint
            : null,
      };
      return { ...state, ...sanitizedPayload };
    },
    createNewProject: (state) => {
      return { ...initialState };
    },
    // === TRIM ACTIONS (operate in SOURCE VIDEO TIME) ===
    setTrimStart: (
      state,
      action: PayloadAction<{ clipId: string; sourceSeconds: number }>
    ) => {
      const { clipId, sourceSeconds } = action.payload;
      const clip = state.mediaFiles.find((c) => c.id === clipId);
      if (!clip) return;

      // Constrain: can't be negative, can't exceed out-point minus 0.1s
      const newStartTime = Math.max(
        0,
        Math.min(sourceSeconds, clip.endTime - 0.1)
      );

      // Direct mutation - Immer handles immutability
      clip.startTime = newStartTime;
    },
    setTrimEnd: (
      state,
      action: PayloadAction<{ clipId: string; sourceSeconds: number }>
    ) => {
      const { clipId, sourceSeconds } = action.payload;
      const clip = state.mediaFiles.find((c) => c.id === clipId);
      if (!clip) return;

      const duration = clip.duration || clip.endTime - clip.startTime;
      // Constrain: can't be less than in-point plus 0.1s, can't exceed duration
      const newEndTime = Math.max(
        clip.startTime + 0.1,
        Math.min(sourceSeconds, duration)
      );

      // Direct mutation - Immer handles immutability
      clip.endTime = newEndTime;
    },
    clearTrim: (state, action: PayloadAction<string>) => {
      const clipId = action.payload;
      const clip = state.mediaFiles.find((c) => c.id === clipId);
      if (clip && clip.duration) {
        clip.startTime = 0;
        clip.endTime = clip.duration;
      }
    },
    // === GLOBAL IN/OUT POINTS (Premiere Pro style) ===
    setInPoint: (state, action: PayloadAction<number | null>) => {
      state.inPoint = action.payload;
    },
    setOutPoint: (state, action: PayloadAction<number | null>) => {
      state.outPoint = action.payload;
    },
    clearInOutPoints: (state) => {
      state.inPoint = null;
      state.outPoint = null;
    },
  },
});

export const {
  setMediaFiles,
  setTextElements,
  setCurrentTime,
  setProjectName,
  setIsPlaying,
  setFilesID,
  setExportSettings,
  setResolution,
  setQuality,
  setSpeed,
  setFps,
  setMarkerTrack,
  setIsMuted,
  setActiveSection,
  setActiveElement,
  setActiveElementIndex,
  setTimelineZoom,
  rehydrate,
  createNewProject,
  setTrimStart,
  setTrimEnd,
  clearTrim,
  setInPoint,
  setOutPoint,
  clearInOutPoints,
} = projectStateSlice.actions;

export default projectStateSlice.reducer;
