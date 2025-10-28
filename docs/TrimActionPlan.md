# Fixing the Trim Markers: Timeline vs Source Video Conflict

**Issue Date**: 2025-10-28  
**Problem**: Trim markers caught between timeline position and source video time  
**Status**: ✅ Steps 1-3 COMPLETED - Ready for Testing  
**Last Updated**: 2025-10-28

## Implementation Status

- ✅ **STEP 1**: Updated data model with separate timeline/source spaces, added Redux trim actions
- ✅ **STEP 2**: Created coordinate conversion utilities (`timeline-coordinates.ts`)
- ✅ **STEP 3**: Fixed TrimMarker component with proper coordinate mapping
- ✅ **FINAL FIX**: Fixed Redux Immer mutations for proper state updates (2025-10-28)
- ⏳ **STEP 4-8**: Pending (Player integration, keyboard shortcuts, export)

---

## What Was Implemented (Steps 1-3)

### Files Created:

- `/app/lib/timeline-coordinates.ts` - Complete coordinate conversion system

### Files Modified:

- `/app/types/index.ts` - Added clear documentation for timeline vs source spaces
- `/app/store/slices/projectSlice.ts` - Added `setTrimStart`, `setTrimEnd`, `clearTrim` actions
- `/app/components/editor/timeline/TrimMarker.tsx` - Complete rewrite with proper mapping
- `/app/components/editor/timeline/elements-timeline/VideoTimeline.tsx` - Use new coordinate system
- `/app/components/editor/timeline/elements-timeline/AudioTimline.tsx` - Use new coordinate system
- `/app/components/editor/timeline/elements-timeline/ImageTimeline.tsx` - Use new coordinate system

### Key Changes:

1. **Coordinate Conversion System**:

   - `timelinePositionToSourceTime()` - Maps timeline seconds → source video seconds
   - `sourceTimeToTimelinePosition()` - Maps source video seconds → timeline seconds
   - `sourceTimeToClipRelativePixels()` - Maps source time → pixel position within clip
   - `clipRelativePixelsToSourceTime()` - Maps pixel position → source time (for dragging)

2. **TrimMarker Component**:

   - Now takes full `clip` object instead of just position
   - Calculates its own pixel position from `clip.startTime` or `clip.endTime`
   - Returns source time (not pixels) in `onDrag` callback
   - Shows SOURCE TIME in tooltip (not timeline time)

3. **Redux Actions**:
   - `setTrimStart({ clipId, sourceSeconds })` - Updates clip's startTime
   - `setTrimEnd({ clipId, sourceSeconds })` - Updates clip's endTime
   - `clearTrim(clipId)` - Resets trim to full video duration
   - All actions include proper constraints (min 0.1s gap between in/out points)

### Testing Instructions:

1. **Load the app and add a video clip to the timeline**
2. **Select the clip** (click on it) - trim markers should appear
3. **Check marker positions**:
   - IN marker should be at left edge (if untrimmed)
   - OUT marker should be at right edge (if untrimmed)
   - Hover to see source time in tooltip
4. **Drag IN marker**:
   - Should move smoothly within clip bounds
   - Can't go past OUT marker (0.1s minimum gap)
   - Watch console for any coordinate mapping errors
5. **Drag OUT marker**:
   - Should move smoothly within clip bounds
   - Can't go before IN marker (0.1s minimum gap)
6. **Check Redux state**:
   - Open Redux DevTools
   - Look for `setTrimStart` and `setTrimEnd` actions
   - Verify `startTime` and `endTime` update in the clip object
7. **Verify playback** (if player is connected):
   - Video should start at trimmed in-point
   - Video should stop at trimmed out-point

### What's Working Now (2025-10-28):

- ✅ Trim markers appear and are draggable
- ✅ Redux state updates properly with Immer direct mutations
- ✅ Smooth real-time dragging (CapCut/iMovie style)
- ✅ Coordinate conversion between timeline and source video time
- ✅ Visual feedback with trim overlays

### Known Limitations (Steps 4-8 will address):

- ❌ Video playback may not respect trim points yet (needs Player.tsx update)
- ❌ Keyboard shortcuts (I/O keys) not implemented yet
- ❌ Export won't use trim points yet (needs FFmpeg update)
- ❌ No visual debug overlay yet

---

## Problem Analysis

You've identified the core issue perfectly. Let me break it down:

```
Timeline:     [==== Clip occupies 0s to 20s ====]
Source Video: [========= 25 seconds long =========]
Trim Markers: ??? Which time system do they use ???
```

**The Fundamental Conflict:**

1. Clip has a `positionStart` on the timeline (e.g., 0s)
2. Clip has a fixed `width` on the timeline (20s worth of pixels)
3. Source video is 25s long
4. Trim markers need to operate in SOURCE VIDEO TIME, not timeline time
5. Visual position on screen is in TIMELINE SPACE

**Current Issues:**

- IN marker doesn't work because `startTime` doesn't affect `positionStart`
- OUT marker position is ambiguous (timeline 17s vs source 17s)
- Blob URL errors suggest file reference problems
- Player starts at timeline 0, always playing from source time 0

---

## Solution Architecture

### Core Concept: Separate Timeline Space from Source Space

```typescript
// Timeline Space (where clip sits on timeline)
interface TimelinePosition {
  positionStart: number; // Where clip starts on timeline (seconds)
  positionEnd: number; // Where clip ends on timeline (seconds)
  width: number; // Visual width in pixels
}

// Source Space (which part of video to play)
interface SourceTrim {
  trimStart: number; // Start time in SOURCE video (seconds)
  trimEnd: number; // End time in SOURCE video (seconds)
  sourceDuration: number; // Total source video length (seconds)
}

// Complete Clip Model
interface Clip {
  id: string;
  src: string;

  // Timeline position (FIXED for your approach)
  positionStart: number; // Timeline position (e.g., 0s)
  positionEnd: number; // Timeline position (e.g., 20s)

  // Source video trim (VARIABLE - what trim markers control)
  trimStart: number; // Source video time (e.g., 0s)
  trimEnd: number; // Source video time (e.g., 25s)
  sourceDuration: number; // Total source length (e.g., 25s)

  // Derived properties
  get timelineDuration(): number;

  get trimmedDuration(): number;

  get playbackRate(): number;
  // Speed adjustment to fit trimmed source into timeline space
}
```

---

## Step-by-Step Fix

## STEP 1: Update Your Clip Data Model (2 hours)

### 1.1 Define Correct Clip Interface

**File**: `/app/types/clip.ts` or `/app/store/project.ts`

```typescript
export interface Clip {
  id: string;
  src: string; // Video file source
  blobUrl?: string; // Blob URL for video element

  // === TIMELINE SPACE (Fixed Position) ===
  positionStart: number; // Seconds on timeline where clip starts
  positionEnd: number; // Seconds on timeline where clip ends
  track: number; // Which track (0, 1, 2, etc.)

  // === SOURCE SPACE (Trim Points) ===
  trimStart: number; // Seconds into SOURCE video (trim in-point)
  trimEnd: number; // Seconds into SOURCE video (trim out-point)
  sourceDuration: number; // Total duration of source video file

  // === VISUAL (Konva) ===
  x: number; // Pixel position on canvas
  y: number; // Pixel position on canvas
  width: number; // Pixel width on canvas
  height: number; // Pixel height on canvas
}

// Helper to calculate derived values
export function getClipDerivedValues(clip: Clip) {
  return {
    // How long the clip occupies on timeline
    timelineDuration: clip.positionEnd - clip.positionStart,

    // How much source video is being played
    trimmedDuration: clip.trimEnd - clip.trimStart,

    // Speed adjustment needed (usually ~1.0)
    playbackRate:
      (clip.trimEnd - clip.trimStart) / (clip.positionEnd - clip.positionStart),

    // Percentage of source video being used
    trimPercentage:
      ((clip.trimEnd - clip.trimStart) / clip.sourceDuration) * 100,
  };
}
```

### 1.2 Update Zustand Store with Correct Actions

**File**: `/app/store/project.ts`

```typescript
interface ProjectState {
  clips: Clip[];

  // === TRIM ACTIONS (operate in SOURCE VIDEO TIME) ===
  setTrimStart: (clipId: string, sourceSeconds: number) => void;
  setTrimEnd: (clipId: string, sourceSeconds: number) => void;
  clearTrim: (clipId: string) => void;

  // === POSITION ACTIONS (operate in TIMELINE TIME) ===
  moveClip: (clipId: string, newPositionStart: number) => void;
  resizeClip: (clipId: string, newPositionEnd: number) => void;
}

const useProjectStore = create<ProjectState>((set, get) => ({
  clips: [],

  // CRITICAL: Trim actions work in SOURCE VIDEO TIME
  setTrimStart: (clipId, sourceSeconds) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) return clip;

        // Constrain to valid range in SOURCE space
        const newTrimStart = Math.max(
          0,
          Math.min(sourceSeconds, clip.trimEnd - 0.1) // Leave 0.1s minimum
        );

        return { ...clip, trimStart: newTrimStart };
      }),
    })),

  setTrimEnd: (clipId, sourceSeconds) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) return clip;

        // Constrain to valid range in SOURCE space
        const newTrimEnd = Math.min(
          clip.sourceDuration,
          Math.max(sourceSeconds, clip.trimStart + 0.1) // Leave 0.1s minimum
        );

        return { ...clip, trimEnd: newTrimEnd };
      }),
    })),

  clearTrim: (clipId) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId
          ? { ...clip, trimStart: 0, trimEnd: clip.sourceDuration }
          : clip
      ),
    })),

  // Timeline position changes (separate from trim)
  moveClip: (clipId, newPositionStart) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) return clip;

        const duration = clip.positionEnd - clip.positionStart;
        return {
          ...clip,
          positionStart: newPositionStart,
          positionEnd: newPositionStart + duration,
          x: secondsToPixels(newPositionStart), // Update Konva position
        };
      }),
    })),
}));
```

---

## STEP 2: Fix Timeline-to-Source Coordinate Mapping (3 hours)

### 2.1 Create Coordinate Conversion Utilities

**File**: `/app/lib/timeline-coordinates.ts`

```typescript
// Constants
export const PIXELS_PER_SECOND = 50; // Adjust based on your zoom level

// === TIMELINE SPACE CONVERSIONS ===

export function secondsToPixels(seconds: number, zoom: number = 1): number {
  return seconds * PIXELS_PER_SECOND * zoom;
}

export function pixelsToSeconds(pixels: number, zoom: number = 1): number {
  return pixels / (PIXELS_PER_SECOND * zoom);
}

// === SOURCE VIDEO MAPPING ===

/**
 * Maps a position on the TIMELINE to a time in the SOURCE VIDEO
 * This is THE KEY function for trim markers
 */
export function timelinePositionToSourceTime(
  timelinePosition: number, // Position on timeline (seconds)
  clip: Clip
): number {
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
  const trimmedDuration = clip.trimEnd - clip.trimStart;
  const sourceTime = clip.trimStart + percentageThrough * trimmedDuration;

  return sourceTime;
}

/**
 * Maps a time in the SOURCE VIDEO to a position on the TIMELINE
 * Inverse of above - used for positioning trim markers
 */
export function sourceTimeToTimelinePosition(
  sourceTime: number, // Time in source video (seconds)
  clip: Clip
): number {
  // Constrain to trimmed range
  if (sourceTime < clip.trimStart || sourceTime > clip.trimEnd) {
    return null;
  }

  // How far into the trimmed portion are we?
  const offsetIntoTrim = sourceTime - clip.trimStart;

  // What percentage through the trim is this?
  const trimmedDuration = clip.trimEnd - clip.trimStart;
  const percentageThrough = offsetIntoTrim / trimmedDuration;

  // Map to timeline position
  const clipDuration = clip.positionEnd - clip.positionStart;
  const timelinePosition =
    clip.positionStart + percentageThrough * clipDuration;

  return timelinePosition;
}

/**
 * Convert SOURCE TIME to PIXEL position on canvas
 * This is what trim markers need!
 */
export function sourceTimeToPixels(
  sourceTime: number,
  clip: Clip,
  zoom: number = 1
): number {
  const timelinePosition = sourceTimeToTimelinePosition(sourceTime, clip);
  if (timelinePosition === null) return null;

  return secondsToPixels(timelinePosition, zoom);
}

/**
 * Convert PIXEL position to SOURCE TIME
 * This is what drag handlers need!
 */
export function pixelsToSourceTime(
  pixels: number,
  clip: Clip,
  zoom: number = 1
): number {
  const timelinePosition = pixelsToSeconds(pixels, zoom);
  return timelinePositionToSourceTime(timelinePosition, clip);
}
```

### 2.2 Add Visual Debugging Helper

```typescript
// lib/debug-coordinates.ts
export function debugClipCoordinates(clip: Clip, playheadPosition?: number) {
  console.group(`🎬 Clip: ${clip.id}`);

  console.log("📍 Timeline Space:");
  console.log(`  Position: ${clip.positionStart}s → ${clip.positionEnd}s`);
  console.log(`  Duration: ${clip.positionEnd - clip.positionStart}s`);
  console.log(
    `  Pixels: ${secondsToPixels(clip.positionStart)} → ${secondsToPixels(
      clip.positionEnd
    )}`
  );

  console.log("\n🎥 Source Video Space:");
  console.log(`  Trim: ${clip.trimStart}s → ${clip.trimEnd}s`);
  console.log(`  Trimmed Duration: ${clip.trimEnd - clip.trimStart}s`);
  console.log(`  Total Source: ${clip.sourceDuration}s`);

  console.log("\n🎯 Mapping:");
  const playbackRate =
    (clip.trimEnd - clip.trimStart) / (clip.positionEnd - clip.positionStart);
  console.log(`  Playback Rate: ${playbackRate.toFixed(3)}x`);

  if (playheadPosition !== undefined) {
    const sourceTime = timelinePositionToSourceTime(playheadPosition, clip);
    console.log(`\n▶️ At playhead ${playheadPosition}s:`);
    console.log(`  Playing source time: ${sourceTime?.toFixed(2)}s`);
  }

  console.groupEnd();
}
```

---

## STEP 3: Fix Trim Marker Component (4 hours)

### 3.1 Create Proper TrimMarker Component

**File**: `/app/components/Timeline/TrimMarker.tsx`

```typescript
import React, { useState } from "react";
import { Group, Line, RegularPolygon, Label, Tag, Text } from "react-konva";
import {
  sourceTimeToPixels,
  pixelsToSourceTime,
} from "@/lib/timeline-coordinates";
import { useProjectStore } from "@/store/project";
import Konva from "konva";

interface TrimMarkerProps {
  clip: Clip;
  type: "in" | "out";
  zoom?: number;
}

export const TrimMarker: React.FC<TrimMarkerProps> = ({
  clip,
  type,
  zoom = 1,
}) => {
  const { setTrimStart, setTrimEnd } = useProjectStore();
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // CRITICAL: Get pixel position from SOURCE TIME
  const sourceTime = type === "in" ? clip.trimStart : clip.trimEnd;
  const pixelX = sourceTimeToPixels(sourceTime, clip, zoom);

  // If mapping failed, don't render
  if (pixelX === null) {
    console.error(`Failed to map ${type} marker for clip ${clip.id}`);
    return null;
  }

  // Colors
  const color = type === "in" ? "#D4E7C5" : "#B4A7D6"; // Matcha / Lavender

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Get new pixel position
    const newPixelX = e.target.x();

    // CRITICAL: Convert pixel position to SOURCE TIME
    const newSourceTime = pixelsToSourceTime(newPixelX, clip, zoom);

    if (newSourceTime === null) return;

    // Update store with SOURCE TIME (not timeline time!)
    if (type === "in") {
      setTrimStart(clip.id, newSourceTime);
    } else {
      setTrimEnd(clip.id, newSourceTime);
    }
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    // Calculate bounds in SOURCE space, then convert to pixels
    let minSourceTime: number;
    let maxSourceTime: number;

    if (type === "in") {
      minSourceTime = 0;
      maxSourceTime = clip.trimEnd - 0.1; // Stay before out point
    } else {
      minSourceTime = clip.trimStart + 0.1; // Stay after in point
      maxSourceTime = clip.sourceDuration;
    }

    const minPixel = sourceTimeToPixels(minSourceTime, clip, zoom) || 0;
    const maxPixel =
      sourceTimeToPixels(maxSourceTime, clip, zoom) || clip.width;

    return {
      x: Math.max(minPixel, Math.min(pos.x, maxPixel)),
      y: 0, // Lock vertical movement
    };
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Group
      x={pixelX}
      y={0}
      draggable
      dragBoundFunc={dragBoundFunc}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      onDragMove={handleDragMove}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => !isDragging && setShowTooltip(false)}
    >
      {/* Vertical line */}
      <Line
        points={[0, 0, 0, clip.height]}
        stroke={color}
        strokeWidth={isDragging ? 3 : 2}
        shadowBlur={isDragging ? 10 : 0}
        shadowColor={color}
      />

      {/* Triangle handle */}
      <RegularPolygon
        sides={3}
        radius={8}
        fill={color}
        rotation={type === "in" ? 90 : -90}
        y={type === "in" ? 0 : clip.height}
        opacity={isDragging ? 1 : 0.8}
      />

      {/* Tooltip showing SOURCE TIME */}
      {(showTooltip || isDragging) && (
        <Label x={5} y={-30}>
          <Tag fill="black" opacity={0.8} cornerRadius={3} />
          <Text
            text={`${type === "in" ? "IN" : "OUT"}: ${formatTime(sourceTime)}`}
            fontSize={11}
            fill="white"
            padding={5}
            fontFamily="monospace"
          />
        </Label>
      )}
    </Group>
  );
};
```

### 3.2 Add Trim Markers to TimelineClip

**File**: `/app/components/Timeline/TimelineClip.tsx`

```typescript
import { TrimMarker } from "./TrimMarker";
import { sourceTimeToPixels } from "@/lib/timeline-coordinates";

export const TimelineClip: React.FC<{ clip: Clip }> = ({ clip }) => {
  // Render dimmed overlays for trimmed portions
  const renderTrimOverlays = () => {
    // Calculate pixel positions for trim points
    const trimStartPixel = sourceTimeToPixels(clip.trimStart, clip, zoom);
    const trimEndPixel = sourceTimeToPixels(clip.trimEnd, clip, zoom);

    if (trimStartPixel === null || trimEndPixel === null) return null;

    // Relative to clip's x position
    const relativeStartPixel = trimStartPixel - clip.x;
    const relativeEndPixel = trimEndPixel - clip.x;

    return (
      <Group>
        {/* Before trim start (if trimmed from beginning) */}
        {clip.trimStart > 0 && (
          <Rect
            x={0}
            y={0}
            width={relativeStartPixel}
            height={clip.height}
            fill="gray"
            opacity={0.6}
          />
        )}

        {/* After trim end (if trimmed from end) */}
        {clip.trimEnd < clip.sourceDuration && (
          <Rect
            x={relativeEndPixel}
            y={0}
            width={clip.width - relativeEndPixel}
            height={clip.height}
            fill="gray"
            opacity={0.6}
          />
        )}
      </Group>
    );
  };

  return (
    <Group x={clip.x} y={clip.y}>
      {/* Clip background */}
      <Rect
        width={clip.width}
        height={clip.height}
        fill="#2D3748"
        cornerRadius={4}
        stroke="#4A5568"
        strokeWidth={1}
      />

      {/* Clip content (thumbnail, waveform, etc.) */}
      {/* ... your existing clip rendering ... */}

      {/* Trim overlays */}
      {renderTrimOverlays()}

      {/* Trim markers - CRITICAL: Pass whole clip object */}
      <TrimMarker clip={clip} type="in" zoom={zoom} />
      <TrimMarker clip={clip} type="out" zoom={zoom} />
    </Group>
  );
};
```

---

## STEP 4: Fix Video Playback Integration (3 hours)

### 4.1 Update Video Player to Use Trim Points

**File**: `/app/components/VideoPlayer.tsx` or wherever your Remotion Player is

```typescript
import { useEffect, useRef } from "react";
import { Player } from "@remotion/player";
import { useProjectStore } from "@/store/project";
import { timelinePositionToSourceTime } from "@/lib/timeline-coordinates";

export const VideoPlayer: React.FC = () => {
  const { clips, playheadPosition } = useProjectStore();
  const playerRef = useRef<PlayerRef>(null);

  // Find which clip the playhead is currently on
  const currentClip = clips.find(
    (clip) =>
      playheadPosition >= clip.positionStart &&
      playheadPosition < clip.positionEnd
  );

  useEffect(() => {
    if (!currentClip || !playerRef.current) return;

    // CRITICAL: Convert timeline position to source time
    const sourceTime = timelinePositionToSourceTime(
      playheadPosition,
      currentClip
    );

    if (sourceTime === null) {
      console.warn("Playhead outside clip bounds");
      return;
    }

    // Seek video to correct source time
    const videoElement = playerRef.current
      .getContainerNode()
      ?.querySelector("video");
    if (videoElement) {
      videoElement.currentTime = sourceTime;
    }
  }, [currentClip, playheadPosition]);

  // Monitor playback and stop at trim end
  useEffect(() => {
    if (!currentClip) return;

    const checkTrimEnd = () => {
      const videoElement = playerRef.current
        ?.getContainerNode()
        ?.querySelector("video");
      if (!videoElement) return;

      // If video reaches trim end, stop
      if (videoElement.currentTime >= currentClip.trimEnd) {
        videoElement.pause();
        videoElement.currentTime = currentClip.trimStart;
      }
    };

    const intervalId = setInterval(checkTrimEnd, 16); // ~60fps
    return () => clearInterval(intervalId);
  }, [currentClip]);

  if (!currentClip) {
    return <div>No clip selected</div>;
  }

  return (
    <Player
      ref={playerRef}
      component={YourComposition}
      inputProps={{
        clip: currentClip,
        // Pass trim points to Remotion
        trimStart: currentClip.trimStart,
        trimEnd: currentClip.trimEnd,
      }}
      durationInFrames={Math.ceil(
        (currentClip.trimEnd - currentClip.trimStart) * 30
      )} // Assuming 30fps
      fps={30}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
    />
  );
};
```

### 4.2 Update Remotion Composition

**File**: `/app/remotion/Composition.tsx`

```typescript
import { Html5Video, Sequence } from "remotion";

interface CompositionProps {
  clip: Clip;
  trimStart: number;
  trimEnd: number;
}

export const VideoComposition: React.FC<CompositionProps> = ({
  clip,
  trimStart,
  trimEnd,
}) => {
  const trimmedDuration = trimEnd - trimStart;

  return (
    <Sequence from={0} durationInFrames={trimmedDuration * 30}>
      <Html5Video
        src={clip.blobUrl || clip.src}
        // CRITICAL: Use Remotion's built-in trim props
        startFrom={Math.floor(trimStart * 30)} // Convert to frames
        endAt={Math.floor(trimEnd * 30)} // Convert to frames
        style={{ width: "100%", height: "100%" }}
      />
    </Sequence>
  );
};
```

---

## STEP 5: Fix Blob URL Issue (1 hour)

### 5.1 Ensure Blob URLs are Created and Stored

**File**: `/app/lib/media-storage.ts`

```typescript
export async function storeVideoFile(file: File): Promise<string> {
  // Create blob URL that persists
  const blobUrl = URL.createObjectURL(file);

  // Also store in IndexedDB for persistence
  await indexedDB.put("videos", {
    id: generateId(),
    blob: file,
    blobUrl: blobUrl,
    fileName: file.name,
    size: file.size,
    type: file.type,
    createdAt: Date.now(),
  });

  return blobUrl;
}

// CRITICAL: Don't revoke blob URLs until component unmounts
export function revokeBlobUrl(url: string) {
  URL.revokeObjectURL(url);
}
```

### 5.2 Update Clip Creation to Store Blob URL

**File**: `/app/store/project.ts`

```typescript
addClip: async (file: File, positionStart: number) => {
  // Get video metadata first
  const metadata = await getVideoMetadata(file);

  // Store file and get blob URL
  const blobUrl = await storeVideoFile(file);

  const newClip: Clip = {
    id: generateId(),
    src: file.name,
    blobUrl: blobUrl, // CRITICAL: Store this!

    // Timeline position (fixed)
    positionStart: positionStart,
    positionEnd: positionStart + 20, // Default 20s timeline span
    track: 0,

    // Source trim (initially untrimmed)
    trimStart: 0,
    trimEnd: metadata.duration,
    sourceDuration: metadata.duration,

    // Konva position
    x: secondsToPixels(positionStart),
    y: 0,
    width: secondsToPixels(20),
    height: 60,
  };

  set((state) => ({
    clips: [...state.clips, newClip],
  }));
};
```

### 5.3 Extract Video Metadata Utility

```typescript
// lib/video-metadata.ts
export function getVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  framerate: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        framerate: 30, // Default, hard to get actual FPS from browser
      });

      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}
```

---

## STEP 6: Update Keyboard Shortcuts (1 hour)

### 6.1 Fix Keyboard Shortcuts to Use Source Time

**File**: `/app/hooks/useTimelineShortcuts.ts`

```typescript
import { useEffect } from "react";
import { useProjectStore } from "@/store/project";
import { timelinePositionToSourceTime } from "@/lib/timeline-coordinates";
import { toast } from "react-hot-toast";

export function useTimelineShortcuts() {
  const {
    clips,
    selectedClipId,
    playheadPosition,
    setTrimStart,
    setTrimEnd,
    clearTrim,
  } = useProjectStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!selectedClipId) return;

      const selectedClip = clips.find((c) => c.id === selectedClipId);
      if (!selectedClip) return;

      switch (e.key.toLowerCase()) {
        case "i": {
          e.preventDefault();

          // CRITICAL: Convert timeline position to SOURCE TIME
          const sourceTime = timelinePositionToSourceTime(
            playheadPosition,
            selectedClip
          );

          if (sourceTime === null) {
            toast.error("Playhead not on selected clip");
            return;
          }

          setTrimStart(selectedClipId, sourceTime);
          toast.success(
            `In-point set at ${sourceTime.toFixed(2)}s (source video)`
          );
          break;
        }

        case "o": {
          e.preventDefault();

          // CRITICAL: Convert timeline position to SOURCE TIME
          const sourceTime = timelinePositionToSourceTime(
            playheadPosition,
            selectedClip
          );

          if (sourceTime === null) {
            toast.error("Playhead not on selected clip");
            return;
          }

          setTrimEnd(selectedClipId, sourceTime);
          toast.success(
            `Out-point set at ${sourceTime.toFixed(2)}s (source video)`
          );
          break;
        }

        case "x": {
          e.preventDefault();
          clearTrim(selectedClipId);
          toast.success("Trim cleared");
          break;
        }

        case "[": {
          // Jump playhead to IN point
          e.preventDefault();
          const timelinePos = sourceTimeToTimelinePosition(
            selectedClip.trimStart,
            selectedClip
          );
          if (timelinePos !== null) {
            useProjectStore.getState().setPlayheadPosition(timelinePos);
          }
          break;
        }

        case "]": {
          // Jump playhead to OUT point
          e.preventDefault();
          const timelinePos = sourceTimeToTimelinePosition(
            selectedClip.trimEnd,
            selectedClip
          );
          if (timelinePos !== null) {
            useProjectStore.getState().setPlayheadPosition(timelinePos);
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clips, selectedClipId, playheadPosition]);
}
```

---

## STEP 7: Testing & Validation (2 hours)

### 7.1 Create Test Scenarios

```typescript
// test/trim-markers.test.ts
import {
  timelinePositionToSourceTime,
  sourceTimeToTimelinePosition,
} from "@/lib/timeline-coordinates";

describe("Trim Marker Coordinate Mapping", () => {
  const testClip: Clip = {
    id: "test",
    src: "test.mp4",
    positionStart: 0, // Timeline: 0s-20s
    positionEnd: 20,
    trimStart: 0, // Source: 0s-25s (full video)
    trimEnd: 25,
    sourceDuration: 25,
    x: 0,
    y: 0,
    width: 1000, // 20s * 50px/s
    height: 60,
  };

  test("Timeline start maps to source start", () => {
    const sourceTime = timelinePositionToSourceTime(0, testClip);
    expect(sourceTime).toBe(0);
  });

  test("Timeline end maps to source end", () => {
    const sourceTime = timelinePositionToSourceTime(20, testClip);
    expect(sourceTime).toBe(25);
  });

  test("Timeline middle maps correctly", () => {
    const sourceTime = timelinePositionToSourceTime(10, testClip);
    expect(sourceTime).toBeCloseTo(12.5); // 50% through = 12.5s of 25s
  });

  test("Inverse mapping works", () => {
    const timelinePos = sourceTimeToTimelinePosition(12.5, testClip);
    expect(timelinePos).toBeCloseTo(10);
  });

  test("With trim applied", () => {
    const trimmedClip = {
      ...testClip,
      trimStart: 5, // Start from 5s in source
      trimEnd: 20, // End at 20s in source
    };

    // Timeline 0s should map to source 5s
    const sourceTime = timelinePositionToSourceTime(0, trimmedClip);
    expect(sourceTime).toBe(5);

    // Timeline 20s should map to source 20s
    const sourceTime2 = timelinePositionToSourceTime(20, trimmedClip);
    expect(sourceTime2).toBe(20);
  });
});
```

### 7.2 Add Debug Overlay

**File**: `/app/components/Timeline/DebugOverlay.tsx`

```typescript
import { useProjectStore } from "@/store/project";
import { timelinePositionToSourceTime } from "@/lib/timeline-coordinates";

export const DebugOverlay: React.FC = () => {
  const { clips, selectedClipId, playheadPosition } = useProjectStore();
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  if (!selectedClip) return null;

  const sourceTime = timelinePositionToSourceTime(
    playheadPosition,
    selectedClip
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        fontFamily: "monospace",
        fontSize: "12px",
        borderRadius: "4px",
        zIndex: 9999,
      }}
    >
      <div>
        <strong>Debug Info</strong>
      </div>
      <div>Playhead: {playheadPosition.toFixed(2)}s (timeline)</div>
      <div>Source: {sourceTime?.toFixed(2)}s (video)</div>
      <hr />
      <div>
        Timeline: {selectedClip.positionStart}s → {selectedClip.positionEnd}s
      </div>
      <div>
        Trim: {selectedClip.trimStart}s → {selectedClip.trimEnd}s
      </div>
      <div>Source Duration: {selectedClip.sourceDuration}s</div>
    </div>
  );
};
```

---

## STEP 8: Export Integration (2 hours)

### 8.1 Update FFmpeg Export to Use Trim Points

**File**: `/app/lib/ffmpeg-export.ts`

```typescript
import { FFmpeg } from "@ffmpeg/ffmpeg";

export async function exportClipWithTrim(
  clip: Clip,
  ffmpeg: FFmpeg
): Promise<Uint8Array> {
  // CRITICAL: Use SOURCE VIDEO trim points for FFmpeg
  const startTime = clip.trimStart;
  const duration = clip.trimEnd - clip.trimStart;

  // FFmpeg command for frame-accurate trim
  await ffmpeg.exec([
    "-ss",
    startTime.toFixed(6), // Start from trim in-point
    "-accurate_seek", // Frame-accurate seeking
    "-i",
    "input.mp4", // Input (already written to virtual FS)
    "-t",
    duration.toFixed(6), // Duration of trim
    "-c:v",
    "libx264", // Re-encode for accuracy
    "-preset",
    "medium",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-avoid_negative_ts",
    "make_zero", // Fix timestamp issues
    "output.mp4",
  ]);

  // Read output
  return (await ffmpeg.readFile("output.mp4")) as Uint8Array;
}
```

---

## Summary of Key Changes

### Before (Broken)

```typescript
// ❌ Mixed timeline and source time
clip.startTime = 5; // What does this mean?

// ❌ Trim markers in wrong coordinate space
<TrimMarker position={clip.startTime} />; // Timeline or source?

// ❌ No coordinate conversion
const time = dragPosition; // Wrong space!
```

### After (Fixed)

```typescript
// ✅ Separate timeline and source spaces
clip.positionStart = 0; // Timeline position
clip.trimStart = 5; // Source video time

// ✅ Trim markers in source space
<TrimMarker clip={clip} type="in" />; // Handles conversion internally

// ✅ Explicit coordinate conversion
const sourceTime = pixelsToSourceTime(dragPosition, clip);
setTrimStart(clip.id, sourceTime);
```

---

## Verification Checklist

After implementing these changes, verify:

- [ ] **Data Model**: Clip has separate `positionStart`/`positionEnd` and `trimStart`/`trimEnd`
- [ ] **Coordinate Mapping**: `timelinePositionToSourceTime()` and inverse work correctly
- [ ] **Trim Markers**: Render at correct pixel position based on source time
- [ ] **Dragging**: Converts pixels → source time → updates store → markers update
- [ ] **Playback**: Video seeks to correct source time based on timeline playhead
- [ ] **Keyboard**: I/O keys set trim points in source time
- [ ] **Blob URLs**: Stored and used consistently, no revoke errors
- [ ] **Export**: FFmpeg uses source trim points for accurate export
- [ ] **Debug**: Overlay shows both timeline and source coordinates

---

## Common Mistakes to Avoid

1. **Don't mix coordinate spaces** - Always know if you're in timeline or source space
2. **Don't forget to convert** - Use mapping functions for all coordinate transformations
3. **Don't modify `positionStart` when trimming** - Timeline position is independent of trim
4. **Don't use timestamps** - Use seconds (float) for precision, convert to frames only at render time
5. **Don't revoke blob URLs prematurely** - Only revoke when clip is deleted

---

## Expected Behavior After Fix

1. Drag IN marker left → `trimStart` decreases (shows more of video beginning)
2. Drag OUT marker left → `trimEnd` decreases (shows less of video)
3. Press I at playhead 10s (timeline) → Sets `trimStart` to corresponding source time
4. Video playback starts at `trimStart` and stops at `trimEnd`
5. Export uses `trimStart` and `trimEnd` for FFmpeg `-ss` and `-t` parameters

This architectural separation is the industry standard used by Premiere, Final Cut, DaVinci Resolve, etc. It's the only way to keep timeline and source spaces properly separated.
