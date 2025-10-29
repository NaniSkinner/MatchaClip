import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  RecordingState,
  RecordingMode,
  ScreenSource,
  RecordingMetadata,
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

  // Media
  mediaRecorder: null,
  recordedChunks: [],

  // Storage
  recordings: [],

  // Error handling
  error: null,
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
    setRecordingMode: (state, action: PayloadAction<RecordingMode>) => {
      state.mode = action.payload;
      state.currentScreen = "screen-selector";
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
    },
    stopRecording: (state) => {
      state.isRecording = false;
      state.mediaRecorder = null;
    },
    pauseRecording: (state) => {
      state.isPaused = true;
    },
    resumeRecording: (state) => {
      state.isPaused = false;
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
      };
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
} = recordingSlice.actions;

export default recordingSlice.reducer;
