import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  RecordingState,
  RecordingMode,
  ScreenSource,
  RecordingMetadata,
  AudioConfiguration,
  AudioDevice,
  CameraDevice,
  WebcamConfiguration,
  PiPConfiguration,
} from "../../types";

const initialState: RecordingState = {
  // UI State
  isPanelOpen: false,
  currentScreen: "mode-selector",

  // Recording State
  isRecording: false,
  isPaused: false,
  mode: null,
  selectedSource: null,
  availableSources: [],

  // Timing
  startTime: null,
  elapsedTime: 0,

  // Phase 4: Pause/Resume tracking
  pausedAt: null,
  totalPausedDuration: 0,
  pauseCount: 0,

  // Media
  mediaRecorder: null,
  recordedChunks: [],

  // Storage
  recordings: [],

  // Error handling
  error: null,

  // Audio Configuration (Phase 2)
  audioConfig: {
    microphoneEnabled: false,
    systemAudioEnabled: false,
    microphoneGain: 100, // 100%
    systemAudioGain: 100, // 100%
    selectedMicId: null,
  },
  availableMicrophones: [],
  microphoneStream: null,
  systemAudioStream: null,

  // Webcam Configuration (Phase 2)
  webcamConfig: {
    enabled: false,
    selectedCameraId: null,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
  },
  availableCameras: [],
  webcamStream: null,

  // PiP Configuration (Phase 3)
  pipConfig: {
    position: "bottom-right",
    size: "medium",
  },

  // Recording Stream (for live preview)
  recordingStream: null,
};

const recordingSlice = createSlice({
  name: "recording",
  initialState,
  reducers: {
    // Panel controls
    openPanel: (state) => {
      state.isPanelOpen = true;
      state.currentScreen = "mode-selector";
      state.error = null;
    },
    closePanel: (state) => {
      state.isPanelOpen = false;
      state.currentScreen = "mode-selector";
      state.mode = null;
      state.selectedSource = null;
      state.error = null;
    },
    setCurrentScreen: (
      state,
      action: PayloadAction<RecordingState["currentScreen"]>
    ) => {
      state.currentScreen = action.payload;
    },

    // Mode selection
    setRecordingMode: (state, action: PayloadAction<RecordingMode | null>) => {
      state.mode = action.payload;
      // Route to appropriate selector based on mode
      if (action.payload === "webcam") {
        state.currentScreen = "webcam-selector";
      } else if (action.payload === "screen") {
        state.currentScreen = "screen-selector";
      } else if (action.payload === "pip") {
        state.currentScreen = "pip-configurator";
      } else {
        // null mode - back to mode selector
        state.currentScreen = "mode-selector";
      }
    },

    // Source selection
    setAvailableSources: (state, action: PayloadAction<ScreenSource[]>) => {
      state.availableSources = action.payload;
    },
    setSelectedSource: (state, action: PayloadAction<ScreenSource>) => {
      state.selectedSource = action.payload;
    },

    // Recording lifecycle
    startRecording: (state) => {
      state.isRecording = true;
      state.startTime = Date.now();
      state.elapsedTime = 0;
      state.recordedChunks = [];
      state.currentScreen = "recording";
      // Reset pause tracking for new recording
      state.isPaused = false;
      state.pausedAt = null;
      state.totalPausedDuration = 0;
      state.pauseCount = 0;
    },
    stopRecording: (state) => {
      state.isRecording = false;
      state.isPaused = false;
      state.mediaRecorder = null;
      // Keep pause tracking data for metadata generation
    },
    pauseRecording: (state) => {
      if (state.isRecording && !state.isPaused) {
        state.isPaused = true;
        state.pausedAt = Date.now();
      }
    },
    resumeRecording: (state) => {
      if (state.isRecording && state.isPaused && state.pausedAt) {
        state.isPaused = false;
        const pauseDuration = Date.now() - state.pausedAt;
        state.totalPausedDuration += pauseDuration;
        state.pauseCount += 1;
        state.pausedAt = null;
      }
    },

    // Timer updates
    updateElapsedTime: (state, action: PayloadAction<number>) => {
      state.elapsedTime = action.payload;
    },

    // Chunk management
    addRecordedChunk: (state, action: PayloadAction<Blob>) => {
      state.recordedChunks.push(action.payload);
    },
    clearRecordedChunks: (state) => {
      state.recordedChunks = [];
    },

    // MediaRecorder management
    setMediaRecorder: (state, action: PayloadAction<MediaRecorder | null>) => {
      // Note: MediaRecorder is not serializable, but Redux Toolkit's
      // serializableCheck is disabled in the store config
      state.mediaRecorder = action.payload;
    },

    // Recordings management
    addRecording: (state, action: PayloadAction<RecordingMetadata>) => {
      state.recordings.unshift(action.payload); // Add to start
    },
    removeRecording: (state, action: PayloadAction<string>) => {
      state.recordings = state.recordings.filter(
        (rec) => rec.id !== action.payload
      );
    },
    setRecordings: (state, action: PayloadAction<RecordingMetadata[]>) => {
      state.recordings = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Reset state
    resetRecordingState: (state) => {
      return {
        ...initialState,
        recordings: state.recordings, // Preserve recordings list
        // Reset pause tracking
        isPaused: false,
        pausedAt: null,
        totalPausedDuration: 0,
        pauseCount: 0,
      };
    },

    // ===== AUDIO ACTIONS (Phase 2) =====

    // Set available microphones
    setAvailableMicrophones: (state, action: PayloadAction<AudioDevice[]>) => {
      state.availableMicrophones = action.payload;

      // Auto-select first device if none selected and devices available
      if (
        !state.audioConfig.selectedMicId &&
        action.payload.length > 0 &&
        action.payload[0]
      ) {
        state.audioConfig.selectedMicId = action.payload[0].deviceId;
      }
    },

    // Update audio configuration
    setAudioConfig: (
      state,
      action: PayloadAction<Partial<AudioConfiguration>>
    ) => {
      state.audioConfig = {
        ...state.audioConfig,
        ...action.payload,
      };
    },

    // Set microphone stream
    setMicrophoneStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.microphoneStream = action.payload;
    },

    // Set system audio stream
    setSystemAudioStream: (
      state,
      action: PayloadAction<MediaStream | null>
    ) => {
      state.systemAudioStream = action.payload;
    },

    // ===== WEBCAM ACTIONS (Phase 2) =====

    // Set available cameras
    setAvailableCameras: (state, action: PayloadAction<CameraDevice[]>) => {
      state.availableCameras = action.payload;

      // Auto-select first camera if none selected and cameras available
      if (
        !state.webcamConfig.selectedCameraId &&
        action.payload.length > 0 &&
        action.payload[0]
      ) {
        state.webcamConfig.selectedCameraId = action.payload[0].deviceId;
      }
    },

    // Update webcam configuration
    setWebcamConfig: (
      state,
      action: PayloadAction<Partial<WebcamConfiguration>>
    ) => {
      state.webcamConfig = {
        ...state.webcamConfig,
        ...action.payload,
      };
    },

    // Set webcam stream
    setWebcamStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.webcamStream = action.payload;
    },

    // ===== PIP ACTIONS (Phase 3) =====

    // Update PiP configuration
    setPipConfig: (state, action: PayloadAction<Partial<PiPConfiguration>>) => {
      state.pipConfig = {
        ...state.pipConfig,
        ...action.payload,
      };
    },

    // Set recording stream (for live preview)
    setRecordingStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.recordingStream = action.payload;
    },
  },
});

export const {
  openPanel,
  closePanel,
  setCurrentScreen,
  setRecordingMode,
  setAvailableSources,
  setSelectedSource,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  updateElapsedTime,
  addRecordedChunk,
  clearRecordedChunks,
  setMediaRecorder,
  addRecording,
  removeRecording,
  setRecordings,
  setError,
  resetRecordingState,
  // Audio actions
  setAvailableMicrophones,
  setAudioConfig,
  setMicrophoneStream,
  setSystemAudioStream,
  // Webcam actions
  setAvailableCameras,
  setWebcamConfig,
  setWebcamStream,
  // PiP actions
  setPipConfig,
  setRecordingStream,
} = recordingSlice.actions;

export default recordingSlice.reducer;
