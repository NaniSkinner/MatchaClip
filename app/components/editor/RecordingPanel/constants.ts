/**
 * Recording Panel Constants
 *
 * Configuration constants for screen recording feature
 */

export const RECORDING_CONSTANTS = {
  // Duration limits
  MAX_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
  COUNTDOWN_SECONDS: 3,

  // Video settings
  DEFAULT_FPS: 30,
  DEFAULT_RESOLUTION: { width: 1920, height: 1080 },
  VIDEO_BITRATE: 5_000_000, // 5 Mbps

  // Storage
  MIN_STORAGE_MB: 100,
  CHUNK_SIZE: 10_000, // For progressive storage

  // UI
  PANEL_WIDTH: 400,

  // Codec options (in order of preference)
  PREFERRED_CODECS: [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=h264",
    "video/mp4",
  ],
} as const;

export const RECORDING_MESSAGES = {
  PERMISSION_DENIED: "Screen recording permission is required",
  STORAGE_FULL: "Insufficient storage space",
  SOURCE_UNAVAILABLE: "Selected source is no longer available",
  RECORDING_STARTED: "Recording started",
  RECORDING_STOPPED: "Recording saved successfully",
  MAX_DURATION_REACHED: "Maximum recording duration reached (5 minutes)",
} as const;
