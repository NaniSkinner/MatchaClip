import { MediaType, MediaFile } from "../types";

export const categorizeFile = (mimeType: string): MediaType => {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  return "unknown";
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Sanitizes a MediaFile object to ensure all numeric properties are valid
 * Prevents NaN values from corrupted state (e.g., IndexedDB) from breaking rendering
 */
export const sanitizeMediaFile = (mediaFile: MediaFile): MediaFile => {
  const safeNumber = (value: number | undefined, fallback: number): number => {
    return typeof value === "number" && !isNaN(value) && isFinite(value)
      ? value
      : fallback;
  };

  // Sanitize base dimensions
  const safeWidth = safeNumber(mediaFile.width, 1920);
  const safeHeight = safeNumber(mediaFile.height, 1080);

  // Sanitize crop object if it exists
  const safeCrop = mediaFile.crop
    ? {
        x: safeNumber(mediaFile.crop.x, 0),
        y: safeNumber(mediaFile.crop.y, 0),
        width: safeNumber(mediaFile.crop.width, safeWidth),
        height: safeNumber(mediaFile.crop.height, safeHeight),
      }
    : undefined;

  return {
    ...mediaFile,
    // Visual properties
    x: safeNumber(mediaFile.x, 0),
    y: safeNumber(mediaFile.y, 0),
    width: safeWidth,
    height: safeHeight,
    opacity: safeNumber(mediaFile.opacity, 100),
    zIndex: safeNumber(mediaFile.zIndex, 0),
    rotation: safeNumber(mediaFile.rotation, 0),

    // Crop
    crop: safeCrop,

    // Playback properties
    playbackSpeed: safeNumber(mediaFile.playbackSpeed, 1),
    volume: safeNumber(mediaFile.volume, 100),

    // Timing properties
    startTime: safeNumber(mediaFile.startTime, 0),
    endTime: safeNumber(mediaFile.endTime, mediaFile.duration || 30),
    duration: safeNumber(mediaFile.duration, 30),
    positionStart: safeNumber(mediaFile.positionStart, 0),
    positionEnd: safeNumber(mediaFile.positionEnd, mediaFile.duration || 30),
  };
};
