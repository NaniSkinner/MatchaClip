export type MediaType = "video" | "audio" | "image" | "unknown";

export interface UploadedFile {
  id: string;
  file: File;
  type?: MediaType;
  src?: string;
}

export interface MediaFile {
  id: string;
  fileName: string;
  fileId: string;
  type: MediaType;

  // === SOURCE SPACE (Trim Points - which part of source video to play) ===
  startTime: number; // trim in-point within the source video (seconds)
  endTime: number; // trim out-point within the source video (seconds)
  duration?: number; // total duration of the source video (seconds)

  // === TIMELINE SPACE (Where clip sits on timeline) ===
  positionStart: number; // position in the final video timeline (seconds)
  positionEnd: number; // end position in the final video timeline (seconds)

  // === OTHER PROPERTIES ===
  src?: string;
  includeInMerge: boolean;
  playbackSpeed: number;
  volume: number;
  zIndex: number;

  // Optional visual settings
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;

  // Effects
  crop?: { x: number; y: number; width: number; height: number };
}

export interface TextElement {
  id: string;
  text: string; // The actual text content
  includeInMerge?: boolean;

  // Timing
  positionStart: number; // When text appears in final video
  positionEnd: number; // When text disappears

  // Position & Size (canvas-based)
  x: number;
  y: number;
  width?: number;
  height?: number;

  // Styling
  font?: string; // Font family (e.g., 'Arial', 'Roboto')
  fontSize?: number; // Font size in pixels
  color?: string; // Text color (hex or rgba)
  backgroundColor?: string; // Background behind text
  align?: "left" | "center" | "right"; // Horizontal alignment
  zIndex?: number; // Layering

  // Effects
  opacity?: number; // Transparency (0 to 1)
  rotation?: number; // Rotation in degrees
  fadeInDuration?: number; // Seconds to fade in
  fadeOutDuration?: number; // Seconds to fade out
  animation?: "slide-in" | "zoom" | "bounce" | "none"; // Optional animation

  // Runtime only (not persisted)
  visible?: boolean; // Internal flag for rendering logic
}

export type ExportFormat = "mp4" | "webm" | "gif" | "mov";

export interface ExportConfig {
  resolution: string;
  quality: string;
  speed: string;
  fps: number; // TODO: add this as an option
  format: ExportFormat; // TODO: add this as an option
  includeSubtitles: boolean; // TODO: add this as an option
}

export type ActiveElement = "media" | "text" | "export";

export interface ProjectState {
  id: string;
  mediaFiles: MediaFile[];
  textElements: TextElement[];
  filesID?: string[];
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  duration: number;
  zoomLevel: number;
  timelineZoom: number;
  enableMarkerTracking: boolean;
  projectName: string;
  createdAt: string;
  lastModified: string;
  activeSection: ActiveElement;
  activeElement: ActiveElement | null;
  activeElementIndex: number;

  // Global timeline in/out points (Premiere Pro style)
  inPoint: number | null; // Global in-point in seconds, null if not set
  outPoint: number | null; // Global out-point in seconds, null if not set

  resolution: { width: number; height: number };
  fps: number;
  aspectRatio: string;
  history: ProjectState[]; // stack for undo
  future: ProjectState[]; // stack for redo
  exportSettings: ExportConfig;
}

export const mimeToExt = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-quicktime": "mov",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  // TODO: Add more as needed
};

// ===== RECORDING TYPES =====

export enum RecordingMode {
  SCREEN = "screen",
  WEBCAM = "webcam",
  PIP = "pip",
}

export interface ScreenSource {
  id: string;
  name: string;
  thumbnailUrl: string;
  type: "screen" | "window";
}

export interface RecordingMetadata {
  id: string;
  name: string;
  type: "screen" | "webcam" | "pip";
  duration: number;
  size: number;
  createdAt: number;
  thumbnailUrl?: string;
  resolution: { width: number; height: number };
  fps: number;
  // Phase 4: Pause/Resume tracking
  pauseCount?: number;
  totalPausedDuration?: number; // milliseconds
  actualRecordingDuration?: number; // duration excluding paused time
}

export interface RecordingSettings {
  maxDuration: number; // milliseconds (300000 = 5 min)
  fps: number; // 30
  videoBitsPerSecond: number;
  resolution: { width: number; height: number };
}

// ===== AUDIO & WEBCAM TYPES (Phase 2) =====

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
  groupId: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: "videoinput";
  groupId: string;
  facingMode?: "user" | "environment";
}

export interface AudioConfiguration {
  microphoneEnabled: boolean;
  systemAudioEnabled: boolean;
  microphoneGain: number; // 0-100
  systemAudioGain: number; // 0-100
  selectedMicId: string | null;
}

export interface WebcamConfiguration {
  enabled: boolean;
  selectedCameraId: string | null;
  resolution: { width: number; height: number };
  frameRate: number;
}

export interface PiPConfiguration {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size: "small" | "medium" | "large";
}

export interface RecordingState {
  // UI State
  isPanelOpen: boolean;
  currentScreen:
    | "mode-selector"
    | "screen-selector"
    | "webcam-selector"
    | "pip-configurator"
    | "countdown"
    | "recording"
    | "success";

  // Recording State
  isRecording: boolean;
  isPaused: boolean;
  mode: RecordingMode | null;
  selectedSource: ScreenSource | null;
  availableSources: ScreenSource[];

  // Timing
  startTime: number | null;
  elapsedTime: number; // milliseconds

  // Phase 4: Pause/Resume tracking
  pausedAt: number | null; // timestamp when paused
  totalPausedDuration: number; // cumulative paused time in milliseconds
  pauseCount: number; // number of times paused in current session

  // Media
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];

  // Storage
  recordings: RecordingMetadata[];

  // Error handling
  error: string | null;

  // Audio Configuration (Phase 2)
  audioConfig: AudioConfiguration;
  availableMicrophones: AudioDevice[];
  microphoneStream: MediaStream | null;
  systemAudioStream: MediaStream | null;

  // Webcam Configuration (Phase 2)
  webcamConfig: WebcamConfiguration;
  availableCameras: CameraDevice[];
  webcamStream: MediaStream | null;

  // PiP Configuration (Phase 3)
  pipConfig: PiPConfiguration;

  // Recording Stream (for live preview)
  recordingStream: MediaStream | null;
}
