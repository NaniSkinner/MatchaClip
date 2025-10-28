# ClipForge MVP - Tasks Part 1: Core MVP Features

**Document Version**: 1.0  
**Last Updated**: 2025-10-28  
**Status**: In Progress  
**Phase**: Phase 1 (Weeks 1-2)

---

## Overview

This document contains **Phase 1: Core MVP Features** - the essential missing features required to complete the ClipForge MVP. Focus areas include drag & drop import, file validation, visual trim markers, keyboard shortcuts, and core error handling.

**Current Status**:

- ✅ Desktop application launches (Electron)
- ✅ File picker video import
- ✅ Multi-track timeline view
- ✅ Video preview with Remotion Player
- ✅ Basic timeline controls and playback
- ✅ FFmpeg video export
- ⚠️ Missing: Drag & drop import
- ⚠️ Missing: Visual trim markers with keyboard shortcuts
- ⚠️ Missing: Comprehensive file validation & error handling

---

## Task Categories (Phase 1)

1. [Import Features](#1-import-features)
2. [Trim Controls & Visual Markers](#2-trim-controls--visual-markers)
3. [Core Error Handling](#3-core-error-handling)

---

## 1. Import Features

### 1.1 Drag & Drop Import

**Priority**: High  
**PRD Reference**: Section 3.2 (Video Import)  
**Status**: Not Started

**Objective**: Enable users to drag and drop video files (MP4, MOV) from their file system directly into the application.

**Acceptance Criteria**:

- Drag & drop zone visible and intuitive
- Visual feedback during drag-over
- Accepts MP4 and MOV files
- Rejects invalid file types with error message
- Multiple files can be dropped at once

**Subtasks**:

- [ ] **1.1.1 Create DragDropZone Component**

  - Location: Create `/app/components/editor/AssetsPanel/DragDropZone.tsx`
  - Implement drag event handlers:
    - `onDragEnter`: Set hover state, prevent default
    - `onDragOver`: Prevent default, show drop allowed cursor
    - `onDragLeave`: Clear hover state
    - `onDrop`: Process dropped files
  - Add visual states:
    - Default: Dashed border with upload icon
    - Hover: Highlighted border, "Drop files here" message
    - Invalid: Red border for invalid files
  - Styling: Match existing design system (matcha-green accents)

- [ ] **1.1.2 Add File Validation Logic**

  - In DragDropZone component
  - Create `validateFiles(files: FileList)` function:
    - Check MIME types: 'video/mp4', 'video/quicktime'
    - Check file extensions: '.mp4', '.mov'
    - Check file size: max 2GB per file
    - Return: `{ valid: File[], invalid: File[] }`
  - Show error toast for invalid files

- [ ] **1.1.3 Integrate with Media Library**

  - File: `/app/components/editor/AssetsPanel/tools-section/MediaList.tsx`
  - Add DragDropZone above file list
  - Connect to existing `storeFile()` flow
  - Process valid files through existing upload logic
  - Update filesID state with new files

- [ ] **1.1.4 Add Drop Overlay for Main Canvas**

  - File: `/app/(pages)/projects/[id]/page.tsx`
  - Add full-screen drop zone overlay
  - Shows when user drags files anywhere over app window
  - Overlay message: "Drop video files to import"
  - Forward dropped files to MediaList component

- [ ] **1.1.5 Handle Multiple File Drops**
  - Process all valid files in dropped FileList
  - Show progress indicator for multiple files
  - Display summary: "Imported 3 of 4 files (1 invalid format)"

**Files to Create**:

- `/app/components/editor/AssetsPanel/DragDropZone.tsx`

**Files to Modify**:

- `/app/components/editor/AssetsPanel/tools-section/MediaList.tsx`
- `/app/(pages)/projects/[id]/page.tsx`

**Testing**:

- [ ] Drag & drop zone shows hover state
- [ ] Valid files (MP4, MOV) are accepted
- [ ] Invalid files show error message
- [ ] Multiple files can be dropped
- [ ] Files appear in media library after drop
- [ ] Drop works from Finder/Explorer

---

### 1.2 File Format Validation

**Priority**: High  
**PRD Reference**: Section 3.2 (Video Import)  
**Status**: Not Started

**Objective**: Implement comprehensive validation for imported video files including format, codec, and metadata checks.

**Acceptance Criteria**:

- Files validated before import
- Clear error messages for unsupported formats
- Validation checks: format, codec, resolution, duration
- Invalid files rejected gracefully

**Subtasks**:

- [ ] **1.2.1 Create File Validation Utility**

  - Location: Create `/app/lib/file-validation.ts`
  - Export `validateVideoFile(file: File)` function
  - Return type:
    ```typescript
    {
      valid: boolean;
      errors: string[];
      warnings: string[];
      metadata?: {
        format: string;
        codec: string;
        resolution: string;
        duration: number;
        fileSize: number;
      }
    }
    ```
  - Validation checks:
    - File extension: .mp4, .mov only
    - MIME type: video/mp4, video/quicktime
    - File size: max 2GB
    - File not corrupted (basic check)

- [ ] **1.2.2 Add Video Metadata Extraction**

  - Use browser's Video element to extract metadata
  - Create temporary video element: `document.createElement('video')`
  - Load file as blob URL: `URL.createObjectURL(file)`
  - Extract on 'loadedmetadata' event:
    - Duration: `video.duration`
    - Resolution: `video.videoWidth x video.videoHeight`
    - Check for video track existence
  - Clean up blob URL after extraction
  - Handle timeout if metadata doesn't load (5 seconds)

- [ ] **1.2.3 Integrate Validation into Upload Flow**

  - File: `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
  - Import `validateVideoFile` utility
  - Validate each file before `storeFile()` call
  - If invalid:
    - Show error toast with specific issue
    - Don't proceed with upload
    - Log error for debugging
  - If valid but with warnings:
    - Show warning toast (e.g., "Large file size")
    - Proceed with upload

- [ ] **1.2.4 Create Error Toast Component**

  - File: `/app/components/editor/ToastNotifications.tsx` (or similar)
  - Add specific error messages:
    - "Invalid file format. Only MP4 and MOV files are supported."
    - "File too large. Maximum size is 2GB."
    - "Unable to read video file. It may be corrupted."
    - "No video track found in file."
  - Toast should be dismissible
  - Auto-dismiss after 5 seconds

- [ ] **1.2.5 Add Validation Tests**
  - Test with valid MP4 file
  - Test with valid MOV file
  - Test with invalid format (.avi, .mkv)
  - Test with file > 2GB
  - Test with corrupted file
  - Test with audio-only file

**Files to Create**:

- `/app/lib/file-validation.ts`

**Files to Modify**:

- `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
- `/app/components/editor/AssetsPanel/DragDropZone.tsx` (integrate validation)
- `/app/components/editor/ToastNotifications.tsx`

**Testing**:

- [ ] Valid files pass validation
- [ ] Invalid format rejected with message
- [ ] Large files rejected with message
- [ ] Corrupted files rejected gracefully
- [ ] Validation happens before storage
- [ ] Error messages are clear and helpful

---

## 2. Trim Controls & Visual Markers

### 2.1 Visual Trim Markers

**Priority**: High  
**PRD Reference**: Section 3.3 (Trimming)  
**Status**: Not Started

**Objective**: Add visual in-point and out-point markers on timeline clips with interactive positioning.

**Acceptance Criteria**:

- In-point and out-point markers visible on clips
- Markers can be dragged to set trim points
- Visual differentiation from clip edges
- Markers constrain to clip boundaries
- Trimmed area visually distinguished

**Subtasks**:

- [ ] **2.1.1 Design Trim Marker UI**

  - Markers: Vertical bars with triangular handles
  - In-point: Left side, green accent (#D4E7C5)
  - Out-point: Right side, purple accent (#B4A7D6)
  - Dimmed area: Gray overlay at 50% opacity on trimmed regions
  - Active marker: Highlighted with border
  - Marker labels: Show timecode on hover

- [ ] **2.1.2 Create TrimMarker Component**

  - Location: Create `/app/components/editor/Timeline/TrimMarker.tsx`
  - Props:
    - `type: 'in' | 'out'`
    - `position: number` (frame number)
    - `clipDuration: number`
    - `onPositionChange: (newPosition: number) => void`
    - `isActive: boolean`
  - Render:
    - Vertical line indicator
    - Draggable handle
    - Timecode tooltip
  - Implement drag handlers:
    - `onMouseDown`: Start drag
    - `onMouseMove`: Update position
    - `onMouseUp`: Commit change

- [ ] **2.1.3 Add Markers to TimelineClip**

  - File: `/app/components/editor/Timeline/TimelineClip.tsx`
  - Import TrimMarker component
  - Add state:
    - `inPoint: number` (default: 0)
    - `outPoint: number` (default: clip.duration)
  - Render markers:
    - Left marker: In-point
    - Right marker: Out-point
  - Add dimmed overlay for trimmed regions:
    - Before in-point: gray overlay
    - After out-point: gray overlay

- [ ] **2.1.4 Implement Marker Dragging Logic**

  - In TrimMarker component:
    - Track mouse position relative to timeline
    - Convert pixel position to frame number
    - Constrain to clip boundaries:
      - In-point: 0 to out-point
      - Out-point: in-point to clip.duration
    - Update clip trim data via callback
    - Snap to nearest frame

- [ ] **2.1.5 Store Trim Points in Clip Data**

  - File: `/app/store/project.ts` (or clip state management)
  - Update `Clip` interface to include:
    - `trimIn: number` (frame)
    - `trimOut: number` (frame)
  - Update `updateClip()` action:
    - Accept trim point updates
    - Sync to Firestore (if needed)
  - Default values:
    - trimIn: 0
    - trimOut: clip.frames (or duration)

- [ ] **2.1.6 Update Playback to Respect Trim Points**
  - File: `/app/components/editor/VideoPlayer.tsx` (or playback logic)
  - When playing clip:
    - Start at `clip.trimIn` frame
    - Stop at `clip.trimOut` frame
  - Update export logic:
    - Only export frames between trimIn and trimOut
    - Adjust timeline composition

**Files to Create**:

- `/app/components/editor/Timeline/TrimMarker.tsx`

**Files to Modify**:

- `/app/components/editor/Timeline/TimelineClip.tsx`
- `/app/store/project.ts`
- `/app/components/editor/VideoPlayer.tsx`
- `/app/components/editor/render/Ffmpeg/Export.tsx`

**Testing**:

- [ ] Markers appear on clips
- [ ] Markers can be dragged
- [ ] In-point constrained to out-point
- [ ] Out-point constrained to in-point
- [ ] Trimmed areas visually dimmed
- [ ] Playback respects trim points
- [ ] Export respects trim points

---

### 2.2 Trim Keyboard Shortcuts

**Priority**: High  
**PRD Reference**: Section 3.3 (Trimming), Section 5 (Shortcuts)  
**Status**: Not Started

**Objective**: Implement keyboard shortcuts for setting trim points: I (in-point), O (out-point), X (clear), [ (jump to in), ] (jump to out).

**Acceptance Criteria**:

- I key sets in-point at playhead
- O key sets out-point at playhead
- X key clears both trim points
- [ key jumps playhead to in-point
- ] key jumps playhead to out-point
- Shortcuts work when timeline is focused

**Subtasks**:

- [ ] **2.2.1 Create Keyboard Shortcuts Hook**

  - Location: Create `/app/hooks/useKeyboardShortcuts.ts`
  - Export `useTimelineShortcuts(callbacks)` hook
  - Listen for key events: 'keydown'
  - Map keys to actions:
    - I: Set in-point
    - O: Set out-point
    - X: Clear trim
    - [: Jump to in
    - ]: Jump to out
  - Prevent default browser actions
  - Check if focused element allows shortcuts (not input/textarea)

- [ ] **2.2.2 Implement Set In-Point (I)**

  - File: `/app/components/editor/Timeline/TimelineContainer.tsx` (or similar)
  - On 'I' key press:
    - Get current playhead position (frame)
    - Get selected clip (or clip under playhead)
    - If clip exists:
      - Set clip.trimIn = playheadPosition - clip.start
      - Constrain to [0, clip.trimOut]
      - Update clip state
    - Show toast: "In-point set at [timecode]"

- [ ] **2.2.3 Implement Set Out-Point (O)**

  - On 'O' key press:
    - Get current playhead position (frame)
    - Get selected clip (or clip under playhead)
    - If clip exists:
      - Set clip.trimOut = playheadPosition - clip.start
      - Constrain to [clip.trimIn, clip.duration]
      - Update clip state
    - Show toast: "Out-point set at [timecode]"

- [ ] **2.2.4 Implement Clear Trim (X)**

  - On 'X' key press:
    - Get selected clip
    - If clip exists:
      - Set clip.trimIn = 0
      - Set clip.trimOut = clip.duration
      - Update clip state
    - Show toast: "Trim cleared"

- [ ] **2.2.5 Implement Jump to In-Point ([)**

  - On '[' key press:
    - Get selected clip
    - If clip exists and has trimIn:
      - Move playhead to clip.start + clip.trimIn
      - Update playhead position
    - If no trim point: no action

- [ ] **2.2.6 Implement Jump to Out-Point (])**

  - On ']' key press:
    - Get selected clip
    - If clip exists and has trimOut:
      - Move playhead to clip.start + clip.trimOut
      - Update playhead position
    - If no trim point: no action

- [ ] **2.2.7 Add Visual Feedback**
  - Show shortcut hints in UI:
    - Tooltip on trim markers: "Press I/O to set"
    - Timeline help overlay: Show all shortcuts
  - Toast notifications for trim actions
  - Highlight active marker when shortcut used

**Files to Create**:

- `/app/hooks/useKeyboardShortcuts.ts`

**Files to Modify**:

- `/app/components/editor/Timeline/TimelineContainer.tsx`
- `/app/store/project.ts` (clip trim actions)
- `/app/components/editor/ToastNotifications.tsx`

**Testing**:

- [ ] I key sets in-point at playhead
- [ ] O key sets out-point at playhead
- [ ] X key clears trim points
- [ ] [ key jumps to in-point
- [ ] ] key jumps to out-point
- [ ] Shortcuts work only when timeline focused
- [ ] Shortcuts don't trigger in text inputs
- [ ] Toast notifications appear

---

## 3. Core Error Handling

### 3.1 Import Error Handling

**Priority**: High  
**PRD Reference**: Section 16.3 (Error Handling)  
**Status**: Not Started

**Objective**: Implement comprehensive error handling for video import process with user-friendly messages.

**Acceptance Criteria**:

- All import errors caught and handled gracefully
- Clear error messages displayed to user
- Application remains stable after errors
- Errors logged for debugging

**Subtasks**:

- [ ] **3.1.1 Create Error Handler Utility**

  - Location: Create `/app/lib/error-handler.ts`
  - Export `handleImportError(error: Error, context?: string)` function
  - Error types enum:
    - FILE_TOO_LARGE
    - INVALID_FORMAT
    - CORRUPTED_FILE
    - STORAGE_FULL
    - NETWORK_ERROR
    - UNKNOWN_ERROR
  - Map error types to user messages
  - Log errors to console with stack trace
  - Show appropriate toast notification

- [ ] **3.1.2 Add Try-Catch to File Upload**

  - File: `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
  - Wrap `storeFile()` call in try-catch
  - Catch specific errors:
    - QuotaExceededError: Storage full
    - TypeError: Invalid file
    - NetworkError: Upload failed
  - Call `handleImportError()` with caught error
  - Reset upload state on error

- [ ] **3.1.3 Handle IndexedDB Errors**

  - File: `/app/lib/media-storage.ts` (or similar)
  - Wrap IndexedDB operations in try-catch:
    - `put()`: Store file
    - `get()`: Retrieve file
    - `delete()`: Remove file
  - Specific error handling:
    - QuotaExceededError: Check available space, suggest cleanup
    - InvalidStateError: Database not ready, retry
    - NotFoundError: File doesn't exist
  - Return error objects instead of throwing

- [ ] **3.1.4 Add Import Progress Tracking**

  - Show progress bar during import
  - States: Validating → Storing → Processing → Complete
  - Display current state to user
  - Cancel button to abort import
  - On error: Reset to ready state

- [ ] **3.1.5 Create Error Recovery UI**
  - Show retry button on recoverable errors
  - "Clear Cache" button if storage full
  - "Report Issue" link for unexpected errors
  - Display helpful suggestions:
    - "Try a smaller file"
    - "Check available disk space"
    - "Ensure file is not corrupted"

**Files to Create**:

- `/app/lib/error-handler.ts`

**Files to Modify**:

- `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
- `/app/lib/media-storage.ts`
- `/app/components/editor/ToastNotifications.tsx`

**Testing**:

- [ ] Large file (>2GB) shows error
- [ ] Invalid format shows error
- [ ] Storage full shows error with suggestion
- [ ] Network error shows retry option
- [ ] All errors logged to console
- [ ] App remains stable after errors

---

### 3.2 Export Error Handling

**Priority**: High  
**PRD Reference**: Section 16.3 (Error Handling)  
**Status**: Not Started

**Objective**: Implement robust error handling for video export process including FFmpeg errors.

**Acceptance Criteria**:

- Export errors caught and reported
- FFmpeg errors parsed and displayed
- Export can be retried
- Partial exports cleaned up

**Subtasks**:

- [ ] **3.2.1 Create Export Error Handler**

  - Location: Create `/app/lib/export-error-handler.ts`
  - Export `handleExportError(error: Error, context?: ExportContext)` function
  - Export error types:
    - FFMPEG_ERROR
    - INSUFFICIENT_MEMORY
    - DISK_FULL
    - ENCODING_FAILED
    - INVALID_SETTINGS
  - Parse FFmpeg error messages:
    - Extract meaningful error from stderr
    - Simplify technical messages for users
  - Return recovery suggestions

- [ ] **3.2.2 Add Try-Catch to Export Process**

  - File: `/app/components/editor/render/Ffmpeg/Export.tsx`
  - Wrap FFmpeg execution in try-catch
  - Capture stderr output
  - Detect common FFmpeg errors:
    - "Encoder not found": Codec issue
    - "Invalid data": Input file corrupted
    - "Cannot allocate memory": Out of memory
  - Call `handleExportError()` on failure

- [ ] **3.2.3 Implement Export Retry Logic**

  - Add retry button in export dialog
  - Track retry count (max 3 attempts)
  - On retry:
    - Clear previous error state
    - Reset progress bar
    - Restart export process
  - Suggest different settings on repeated failures:
    - Lower resolution
    - Different codec
    - Reduce quality

- [ ] **3.2.4 Clean Up Failed Exports**

  - Delete partial export files on error
  - Clear temporary FFmpeg files
  - Release file handles
  - Reset export state in UI
  - Prevent multiple simultaneous exports

- [ ] **3.2.5 Add Export Validation**
  - Pre-flight checks before export:
    - Check available disk space (estimate needed)
    - Verify all clips have valid sources
    - Ensure FFmpeg is loaded
    - Validate export settings
  - Show warning if issues detected
  - Block export if critical issues

**Files to Create**:

- `/app/lib/export-error-handler.ts`

**Files to Modify**:

- `/app/components/editor/render/Ffmpeg/Export.tsx`
- `/app/components/editor/render/Ffmpeg/FfmpegContext.tsx`

**Testing**:

- [ ] FFmpeg errors caught and displayed
- [ ] Export can be retried after error
- [ ] Partial files cleaned up on failure
- [ ] Out of memory error handled
- [ ] Invalid settings show error
- [ ] Pre-flight validation works

---

## Progress Tracking (Phase 1)

**Legend**:

- ❌ Not Started
- 🟡 In Progress
- ✅ Complete

| Task                       | Status | Progress |
| -------------------------- | ------ | -------- |
| 1. Import Features         | ✅     | 100%     |
| 1.1 Drag & Drop Import     | ✅     | 5/5      |
| 1.2 File Format Validation | ✅     | 5/5      |
| 2. Trim Controls           | ❌     | 0%       |
| 2.1 Visual Trim Markers    | ❌     | 0/6      |
| 2.2 Keyboard Shortcuts     | ❌     | 0/7      |
| 3. Core Error Handling     | 🟡     | 33%      |
| 3.1 Import Error Handling  | ✅     | 5/5      |
| 3.2 Export Error Handling  | ❌     | 0/5      |

**Phase 1 Total Tasks**: 33 subtasks  
**Completed**: 15  
**Phase 1 Progress**: 45%

---

## Priority Order

**Week 1 Focus**:

1. Drag & Drop Import (1.1) - 2-3 days
2. File Format Validation (1.2) - 1-2 days
3. Import Error Handling (3.1) - 1-2 days

**Week 2 Focus**:

1. Visual Trim Markers (2.1) - 2-3 days
2. Trim Keyboard Shortcuts (2.2) - 1-2 days
3. Export Error Handling (3.2) - 1-2 days

---

## Technical Notes

### File Size Constraints

- Maximum file size: 2GB
- Rationale: IndexedDB and browser memory limits
- Post-MVP: Consider chunked storage for larger files

### Trim Points Storage

- Store as frame numbers, not timestamps
- Ensures precision at any framerate
- Convert to timecode for display only

### Keyboard Shortcut Conflicts

- Ensure trim shortcuts (I/O/X/[/]) don't conflict with:
  - Existing shortcuts: S (split), D (duplicate), Del (delete)
  - Browser shortcuts: Cmd+I, Cmd+O
- Use event.preventDefault() when appropriate

---

**Next**: Continue with [MVP_Tasks2.md](MVP_Tasks2.md) for Desktop Integration (Phase 2)
