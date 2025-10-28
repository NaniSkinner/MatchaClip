/**
 * Coordinate conversion utilities for timeline trim markers
 *
 * This file handles the mapping between three coordinate spaces:
 * 1. TIMELINE SPACE: Where clips sit on the timeline (seconds)
 * 2. SOURCE SPACE: Time within the source video file (seconds)
 * 3. PIXEL SPACE: Visual position on screen (pixels)
 */

import { MediaFile } from "../types";

/**
 * Convert seconds to pixels based on zoom level
 */
export function secondsToPixels(seconds: number, zoom: number): number {
  return seconds * zoom;
}

/**
 * Convert pixels to seconds based on zoom level
 */
export function pixelsToSeconds(pixels: number, zoom: number): number {
  return pixels / zoom;
}

/**
 * Maps a position on the TIMELINE to a time in the SOURCE VIDEO
 * This is THE KEY function for understanding what part of the video to play
 *
 * @param timelinePosition - Position on timeline (seconds)
 * @param clip - The media clip
 * @returns Time in source video (seconds), or null if outside clip bounds
 */
export function timelinePositionToSourceTime(
  timelinePosition: number,
  clip: MediaFile
): number | null {
  // If timeline position is outside clip bounds, return null
  if (
    timelinePosition < clip.positionStart ||
    timelinePosition > clip.positionEnd
  ) {
    return null;
  }

  // How far into the clip are we (timeline space)?
  const offsetIntoClip = timelinePosition - clip.positionStart;

  // What percentage through the clip is this?
  const clipDuration = clip.positionEnd - clip.positionStart;
  const percentageThrough = offsetIntoClip / clipDuration;

  // Map to source video time
  const trimmedDuration = clip.endTime - clip.startTime;
  const sourceTime = clip.startTime + percentageThrough * trimmedDuration;

  return sourceTime;
}

/**
 * Maps a time in the SOURCE VIDEO to a position on the TIMELINE
 * Inverse of timelinePositionToSourceTime - used for positioning trim markers
 *
 * @param sourceTime - Time in source video (seconds)
 * @param clip - The media clip
 * @returns Position on timeline (seconds), or null if outside trimmed range
 */
export function sourceTimeToTimelinePosition(
  sourceTime: number,
  clip: MediaFile
): number | null {
  // Constrain to trimmed range
  if (sourceTime < clip.startTime || sourceTime > clip.endTime) {
    return null;
  }

  // How far into the trimmed portion are we?
  const offsetIntoTrim = sourceTime - clip.startTime;

  // What percentage through the trim is this?
  const trimmedDuration = clip.endTime - clip.startTime;
  const percentageThrough = offsetIntoTrim / trimmedDuration;

  // Map to timeline position
  const clipDuration = clip.positionEnd - clip.positionStart;
  const timelinePosition =
    clip.positionStart + percentageThrough * clipDuration;

  return timelinePosition;
}

/**
 * Convert SOURCE TIME to PIXEL position on canvas
 * This is what trim markers need for visual positioning!
 *
 * @param sourceTime - Time in source video (seconds)
 * @param clip - The media clip
 * @param zoom - Timeline zoom level (pixels per second)
 * @returns Pixel position relative to timeline start, or null if invalid
 */
export function sourceTimeToPixels(
  sourceTime: number,
  clip: MediaFile,
  zoom: number
): number | null {
  const timelinePosition = sourceTimeToTimelinePosition(sourceTime, clip);
  if (timelinePosition === null) return null;

  return secondsToPixels(timelinePosition, zoom);
}

/**
 * Convert PIXEL position to SOURCE TIME
 * This is what drag handlers need when moving trim markers!
 *
 * @param pixels - Pixel position relative to timeline start
 * @param clip - The media clip
 * @param zoom - Timeline zoom level (pixels per second)
 * @returns Time in source video (seconds), or null if outside clip
 */
export function pixelsToSourceTime(
  pixels: number,
  clip: MediaFile,
  zoom: number
): number | null {
  const timelinePosition = pixelsToSeconds(pixels, zoom);
  return timelinePositionToSourceTime(timelinePosition, clip);
}

/**
 * Convert SOURCE TIME to pixel position RELATIVE TO CLIP
 * Used for positioning trim markers within the clip element
 *
 * @param sourceTime - Time in source video (seconds)
 * @param clip - The media clip
 * @param zoom - Timeline zoom level (pixels per second)
 * @returns Pixel position relative to clip's left edge, or null if invalid
 */
export function sourceTimeToClipRelativePixels(
  sourceTime: number,
  clip: MediaFile,
  zoom: number
): number | null {
  const absolutePixels = sourceTimeToPixels(sourceTime, clip, zoom);
  if (absolutePixels === null) return null;

  const clipLeft = secondsToPixels(clip.positionStart, zoom);
  return absolutePixels - clipLeft;
}

/**
 * Convert clip-relative pixel position to SOURCE TIME
 * Used when dragging trim markers within the clip
 *
 * @param relativePixels - Pixel position relative to clip's left edge
 * @param clip - The media clip
 * @param zoom - Timeline zoom level (pixels per second)
 * @returns Time in source video (seconds), or null if invalid
 */
export function clipRelativePixelsToSourceTime(
  relativePixels: number,
  clip: MediaFile,
  zoom: number
): number | null {
  const clipLeft = secondsToPixels(clip.positionStart, zoom);
  const absolutePixels = clipLeft + relativePixels;
  return pixelsToSourceTime(absolutePixels, clip, zoom);
}

/**
 * Debug helper to visualize coordinate mappings
 */
export function debugClipCoordinates(
  clip: MediaFile,
  playheadPosition?: number
) {
  console.group(`🎬 Clip: ${clip.id} (${clip.fileName})`);

  console.log("📍 Timeline Space:");
  console.log(`  Position: ${clip.positionStart}s → ${clip.positionEnd}s`);
  console.log(`  Duration: ${clip.positionEnd - clip.positionStart}s`);

  console.log("\n🎥 Source Video Space:");
  console.log(`  Trim: ${clip.startTime}s → ${clip.endTime}s`);
  console.log(`  Trimmed Duration: ${clip.endTime - clip.startTime}s`);
  console.log(`  Total Source: ${clip.duration}s`);

  console.log("\n🎯 Mapping:");
  const playbackRate =
    (clip.endTime - clip.startTime) / (clip.positionEnd - clip.positionStart);
  console.log(`  Playback Rate: ${playbackRate.toFixed(3)}x`);

  if (playheadPosition !== undefined) {
    const sourceTime = timelinePositionToSourceTime(playheadPosition, clip);
    console.log(`\n▶️ At playhead ${playheadPosition}s:`);
    console.log(`  Playing source time: ${sourceTime?.toFixed(2)}s`);
  }

  console.groupEnd();
}
