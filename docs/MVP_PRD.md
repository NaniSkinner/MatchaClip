# ClipForge MVP - Missing Features & Tasks

**Document Version**: 1.0  
**Last Updated**: 2025-10-28  
**Status**: In Progress

---

## Overview

This document tracks all missing features required to complete the ClipForge MVP as specified in `MVP_PRD.md`. The current application already includes multi-clip timeline support, basic media import, and FFmpeg export. This task list focuses on completing the remaining MVP requirements.

**Current Status**:

- ✅ Desktop application launches (Electron)
- ✅ File picker video import
- ✅ Multi-track timeline view
- ✅ Video preview with Remotion Player
- ✅ Basic timeline controls and playback
- ✅ FFmpeg video export
- ⚠️ Missing: Drag & drop import
- ⚠️ Missing: Visual trim markers with keyboard shortcuts
- ⚠️ Missing: Electron menu bar integration
- ⚠️ Missing: Comprehensive file validation & error handling

---

## Task Categories

1. [Desktop Integration](#1-desktop-integration)
2. [Import Features](#2-import-features)
3. [Trim Controls & Visual Markers](#3-trim-controls--visual-markers)
4. [Error Handling & Validation](#4-error-handling--validation)
5. [Quality Assurance & Testing](#5-quality-assurance--testing)

---

## 1. Desktop Integration

### 1.1 Electron Menu Bar

**Priority**: High  
**PRD Reference**: Section 10.1 (Main Process), Section 3.2 (Import)  
**Status**: Not Started

**Objective**: Implement native menu bar with File, Edit, View, and Help menus as specified in the MVP PRD.

**Acceptance Criteria**:

- Native menu bar appears in application
- File menu includes Import Video (Cmd/Ctrl+O) and Export (Cmd/Ctrl+E)
- Menu actions trigger appropriate application functions
- Platform-specific menu behavior (macOS vs Windows/Linux)

**Subtasks**:

- [ ] **1.1.1 Create Menu Template in Main Process**

  - File: `/electron/main.ts`
  - Add Menu import from Electron
  - Create `createMenuTemplate()` function with File, Edit, View, Help sections
  - Implement File menu items:
    - Import Video (Cmd/Ctrl+O)
    - Export (Cmd/Ctrl+E)
    - Separator
    - Quit (role: 'quit')
  - Implement Edit menu:
    - Undo (role: 'undo')
    - Redo (role: 'redo')
    - Cut/Copy/Paste
  - Implement View menu:
    - Reload, Toggle DevTools
    - Zoom controls
    - Toggle fullscreen
  - Implement Help menu:
    - Documentation link
    - About ClipForge

- [ ] **1.1.2 Set Up IPC Communication**

  - File: `/electron/main.ts`
  - Add IPC handlers for menu actions:
    - `menu-import`: Trigger import dialog
    - `menu-export`: Trigger export dialog
  - Send events to renderer process via `mainWindow.webContents.send()`

- [ ] **1.1.3 Update Preload Script**

  - File: `/electron/preload.ts`
  - Expose menu event listeners to renderer:
    - `onMenuImport(callback)`
    - `onMenuExport(callback)`
  - Add file dialog methods:
    - `showOpenDialog(options)` → returns file paths
    - `showSaveDialog(options)` → returns save path

- [ ] **1.1.4 Connect Menu Actions to React App**

  - File: `/app/(pages)/projects/[id]/page.tsx`
  - Add useEffect hooks to listen for menu events
  - Trigger file upload input on `menu-import` event
  - Trigger export modal/dialog on `menu-export` event

- [ ] **1.1.5 Platform-Specific Menu Handling**
  - File: `/electron/main.ts`
  - Detect platform: `process.platform`
  - macOS: Add app menu with app name
  - Windows/Linux: Standard menu structure
  - Test menu bar on all platforms

**Files to Modify**:

- `/electron/main.ts` (add Menu implementation)
- `/electron/preload.ts` (expose IPC methods)
- `/app/(pages)/projects/[id]/page.tsx` (listen for menu events)

**Testing**:

- [ ] Menu bar appears on macOS, Windows, Linux
- [ ] Cmd/Ctrl+O opens import dialog
- [ ] Cmd/Ctrl+E triggers export
- [ ] Menu items respond correctly
- [ ] DevTools toggle works

---

### 1.2 Native File Dialogs

**Priority**: High  
**PRD Reference**: Section 3.2 (Video Import), Section 3.6 (Export)  
**Status**: Not Started

**Objective**: Implement native OS file dialogs for importing and exporting videos.

**Acceptance Criteria**:

- Native file picker opens for import with MP4/MOV filter
- Native save dialog opens for export with default filename
- File paths correctly passed between Electron and React

**Subtasks**:

- [ ] **1.2.1 Add Dialog Import to Main Process**

  - File: `/electron/main.ts`
  - Import `dialog` from Electron
  - Create `handleFileOpen` IPC handler
  - Configure dialog options:
    - title: "Import Video"
    - filters: [{ name: 'Videos', extensions: ['mp4', 'mov'] }]
    - properties: ['openFile']
  - Return selected file path(s)

- [ ] **1.2.2 Add Save Dialog Handler**

  - File: `/electron/main.ts`
  - Create `handleFileSave` IPC handler
  - Configure save dialog options:
    - title: "Export Video"
    - defaultPath: "ClipForge_Export.mp4"
    - filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
  - Return selected save path

- [ ] **1.2.3 Register IPC Handlers**

  - File: `/electron/main.ts`
  - In `app.whenReady()`, add:
    - `ipcMain.handle('dialog:open', handleFileOpen)`
    - `ipcMain.handle('dialog:save', handleFileSave)`

- [ ] **1.2.4 Update Preload to Expose Dialogs**

  - File: `/electron/preload.ts`
  - Add to `electronAPI`:
    - `openFileDialog: () => ipcRenderer.invoke('dialog:open')`
    - `saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:save', defaultName)`

- [ ] **1.2.5 Integrate with Import Component**

  - File: `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
  - Add button to trigger native dialog via `window.electronAPI.openFileDialog()`
  - Handle returned file paths
  - Convert paths to File objects
  - Process as normal file upload

- [ ] **1.2.6 Integrate with Export Component**
  - File: `/app/components/editor/render/Ffmpeg/Export.tsx` (or equivalent)
  - Before export starts, call `window.electronAPI.saveFileDialog()`
  - Use returned path as export destination
  - Show success notification with path

**Files to Modify**:

- `/electron/main.ts` (dialog handlers)
- `/electron/preload.ts` (expose dialog methods)
- `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx` (native import)
- `/app/components/editor/render/Ffmpeg/Export.tsx` (native export save)

**Testing**:

- [ ] Native dialog opens with correct filters
- [ ] Selected files can be imported
- [ ] Save dialog suggests correct default name
- [ ] Export saves to selected location
- [ ] User can cancel dialogs without errors

---

## 2. Import Features

### 2.1 Drag & Drop Import

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

- [ ] **2.1.1 Create DragDropZone Component**

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

- [ ] **2.1.2 Add File Validation Logic**

  - In DragDropZone component
  - Create `validateFiles(files: FileList)` function:
    - Check MIME types: 'video/mp4', 'video/quicktime'
    - Check file extensions: '.mp4', '.mov'
    - Check file size: max 2GB per file
    - Return: `{ valid: File[], invalid: File[] }`
  - Show error toast for invalid files

- [ ] **2.1.3 Integrate with Media Library**

  - File: `/app/components/editor/AssetsPanel/tools-section/MediaList.tsx`
  - Add DragDropZone above file list
  - Connect to existing `storeFile()` flow
  - Process valid files through existing upload logic
  - Update filesID state with new files

- [ ] **2.1.4 Add Drop Overlay for Main Canvas**

  - File: `/app/(pages)/projects/[id]/page.tsx`
  - Add full-screen drop zone overlay
  - Shows when user drags files anywhere over app window
  - Overlay message: "Drop video files to import"
  - Forward dropped files to MediaList component

- [ ] **2.1.5 Handle Multiple File Drops**
  - Process all valid files in dropped FileList
  - Show progress indicator for multiple files
  - Display summary: "Imported 3 of 4 files (1 invalid format)"

**Files to Create**:

- `/app/components/editor/AssetsPanel/DragDropZone.tsx`

**Files to Modify**:

- `/app/components/editor/AssetsPanel/tools-section/MediaList.tsx` (integrate DragDropZone)
- `/app/(pages)/projects/[id]/page.tsx` (full-screen overlay)

**Testing**:

- [ ] Drop single MP4 file → imports successfully
- [ ] Drop single MOV file → imports successfully
- [ ] Drop AVI/MKV file → shows error, rejects
- [ ] Drop multiple files → all valid files import
- [ ] Drop zone shows correct visual feedback
- [ ] Drag & drop works alongside file picker

---

### 2.2 File Format Validation

**Priority**: High  
**PRD Reference**: Section 3.2.1 (File Handling), Section 8.1 (Import Errors)  
**Status**: Partial (needs enhancement)

**Objective**: Validate uploaded files against supported formats (MP4, MOV) with clear error messages.

**Acceptance Criteria**:

- Only MP4 and MOV files accepted
- Clear error messages for unsupported formats
- File size validation (max 2GB)
- Corrupted file detection
- User-friendly error toast notifications

**Subtasks**:

- [ ] **2.2.1 Create File Validation Utility**

  - Location: Create `/app/utils/fileValidation.ts`
  - Implement `validateVideoFile(file: File)` function:
    ```typescript
    interface ValidationResult {
      valid: boolean;
      error?:
        | "UNSUPPORTED_FORMAT"
        | "FILE_TOO_LARGE"
        | "CORRUPTED_FILE"
        | "UNKNOWN_ERROR";
      message?: string;
    }
    ```
  - Check MIME type: `['video/mp4', 'video/quicktime']`
  - Check file extension
  - Check file size: max 2,147,483,648 bytes (2GB)
  - Return validation result

- [ ] **2.2.2 Add Metadata Extraction Validation**

  - File: `/app/utils/fileValidation.ts`
  - Use Remotion's `@remotion/media-parser` to verify file integrity
  - Extract: duration, fps, width, height, codec
  - If parsing fails → mark as corrupted
  - Return metadata with validation result

- [ ] **2.2.3 Update Import Flow with Validation**

  - File: `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
  - Call `validateVideoFile()` for each uploaded file
  - Show specific error messages:
    - "Unsupported format. Please use MP4 or MOV files."
    - "File exceeds maximum size limit of 2GB."
    - "This video file appears to be corrupted."
    - "Unable to read file. Please try again."
  - Only proceed with valid files

- [ ] **2.2.4 Add Loading State for Validation**

  - Show spinner while validating files
  - Message: "Validating video file..."
  - Prevent duplicate uploads during validation

- [ ] **2.2.5 Create Error Message Constants**
  - File: `/app/utils/errorMessages.ts`
  - Define all user-facing error messages
  - Import and use consistently across components

**Files to Create**:

- `/app/utils/fileValidation.ts`
- `/app/utils/errorMessages.ts`

**Files to Modify**:

- `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx` (add validation)
- `/app/components/editor/AssetsPanel/DragDropZone.tsx` (add validation)

**Testing**:

- [ ] Upload MP4 → validation passes
- [ ] Upload MOV → validation passes
- [ ] Upload AVI → shows unsupported format error
- [ ] Upload 3GB file → shows size limit error
- [ ] Upload corrupted file → shows corrupted file error
- [ ] Error messages are clear and actionable

---

## 3. Trim Controls & Visual Markers

### 3.1 Visual Trim Markers on Timeline

**Priority**: High  
**PRD Reference**: Section 3.5 (Trim Functionality)  
**Status**: Not Started

**Objective**: Add visual in-point and out-point markers on the timeline to clearly show trim boundaries.

**Acceptance Criteria**:

- In-point marker visible at clip start trim position
- Out-point marker visible at clip end trim position
- Markers are draggable to adjust trim points
- Trimmed regions appear grayed out
- Active clip region is highlighted
- Markers work with existing startTime/endTime system

**Subtasks**:

- [ ] **3.1.1 Create TrimMarker Component**

  - Location: Create `/app/components/editor/timeline/TrimMarker.tsx`
  - Props: `type: 'in' | 'out'`, `position: number`, `onDrag: (newPos) => void`
  - Visual design:
    - In-marker: Green bracket with "IN" label
    - Out-marker: Red bracket with "OUT" label
    - Height: Match timeline track height
    - Draggable handle at bracket edge
  - Z-index above timeline elements

- [ ] **3.1.2 Add Trim Markers to VideoTimeline**

  - File: `/app/components/editor/timeline/elements-timeline/VideoTimeline.tsx`
  - For each video clip, render:
    - TrimMarker at `clip.startTime * timelineZoom` (in-point)
    - TrimMarker at `clip.endTime * timelineZoom` (out-point)
  - Markers positioned absolutely within timeline
  - Only show markers when clip is selected

- [ ] **3.1.3 Add Visual Trim Overlay**

  - File: `/app/components/editor/timeline/elements-timeline/VideoTimeline.tsx`
  - Add semi-transparent gray overlay for trimmed regions:
    - Before in-point: `0` to `startTime`
    - After out-point: `endTime` to `clip.duration`
  - Active region: Full opacity
  - Trimmed regions: 40% opacity with striped pattern

- [ ] **3.1.4 Implement Drag Behavior for Markers**

  - File: `/app/components/editor/timeline/TrimMarker.tsx`
  - Use drag event handlers
  - Calculate new time position: `dragPosition / timelineZoom`
  - Constraints:
    - In-point: min 0, max (outPoint - 0.1s)
    - Out-point: min (inPoint + 0.1s), max clip.duration
  - Update clip's `startTime` or `endTime` via Redux

- [ ] **3.1.5 Add Trim Duration Display**

  - Show trim duration below selected clip
  - Format: "Trim: 00:10.5 / 01:30.0" (trimmed duration / total duration)
  - Update in real-time as markers are dragged

- [ ] **3.1.6 Extend to Audio/Image Timelines**
  - Apply same trim marker system to:
    - `/app/components/editor/timeline/elements-timeline/AudioTimeline.tsx`
    - `/app/components/editor/timeline/elements-timeline/ImageTimeline.tsx`
  - Use consistent styling across all track types

**Files to Create**:

- `/app/components/editor/timeline/TrimMarker.tsx`

**Files to Modify**:

- `/app/components/editor/timeline/elements-timeline/VideoTimeline.tsx`
- `/app/components/editor/timeline/elements-timeline/AudioTimeline.tsx`
- `/app/components/editor/timeline/elements-timeline/ImageTimeline.tsx`

**Testing**:

- [ ] Trim markers appear when clip selected
- [ ] In-marker can be dragged within valid range
- [ ] Out-marker can be dragged within valid range
- [ ] Trimmed regions are visually grayed out
- [ ] Trim duration updates correctly
- [ ] Markers sync with video preview

---

### 3.2 Keyboard Shortcuts for Trim Controls

**Priority**: High  
**PRD Reference**: Section 3.5 (Keyboard Shortcuts)  
**Status**: Partial (needs I/O/X shortcuts)

**Objective**: Implement keyboard shortcuts for trim operations as specified in MVP PRD.

**Acceptance Criteria**:

- `I` key: Set in-point at current playhead position
- `O` key: Set out-point at current playhead position
- `X` key: Clear both trim points (reset to full clip)
- `[` key: Jump playhead to in-point
- `]` key: Jump playhead to out-point
- Shortcuts work only when a clip is selected

**Subtasks**:

- [ ] **3.2.1 Add Trim Keyboard Shortcuts**

  - File: `/app/components/editor/keys/GlobalKeyHandlerProps.tsx`
  - Add new key handlers:
    - `I`: Call `handleSetInPoint()`
    - `O`: Call `handleSetOutPoint()`
    - `X`: Call `handleClearTrimPoints()`
    - `[`: Call `handleJumpToInPoint()`
    - `]`: Call `handleJumpToOutPoint()`
  - Prevent shortcuts when typing in text inputs

- [ ] **3.2.2 Implement Set In-Point Function**

  - File: `/app/components/editor/timeline/Timline.tsx`
  - Create `handleSetInPoint()`:
    ```typescript
    const handleSetInPoint = () => {
      if (!activeElement || activeElement !== "media") return;
      const clip = mediaFiles[activeElementIndex];
      const newStartTime = Math.min(
        currentTime - clip.positionStart,
        clip.endTime - 0.1
      );
      // Update clip.startTime
      dispatch(
        updateMediaFile({ ...clip, startTime: Math.max(0, newStartTime) })
      );
      toast.success("In-point set");
    };
    ```
  - Ensure in-point doesn't exceed out-point

- [ ] **3.2.3 Implement Set Out-Point Function**

  - File: `/app/components/editor/timeline/Timline.tsx`
  - Create `handleSetOutPoint()`:
    ```typescript
    const handleSetOutPoint = () => {
      if (!activeElement || activeElement !== "media") return;
      const clip = mediaFiles[activeElementIndex];
      const sourceDuration = clip.endTime - clip.startTime;
      const newEndTime = Math.max(
        currentTime - clip.positionStart,
        clip.startTime + 0.1
      );
      dispatch(
        updateMediaFile({
          ...clip,
          endTime: Math.min(sourceDuration, newEndTime),
        })
      );
      toast.success("Out-point set");
    };
    ```
  - Ensure out-point doesn't precede in-point

- [ ] **3.2.4 Implement Clear Trim Points Function**

  - File: `/app/components/editor/timeline/Timline.tsx`
  - Create `handleClearTrimPoints()`:
    ```typescript
    const handleClearTrimPoints = () => {
      if (!activeElement || activeElement !== "media") return;
      const clip = mediaFiles[activeElementIndex];
      dispatch(
        updateMediaFile({ ...clip, startTime: 0, endTime: clip.duration })
      );
      toast.success("Trim points cleared");
    };
    ```

- [ ] **3.2.5 Implement Jump to Trim Points**

  - File: `/app/components/editor/timeline/Timline.tsx`
  - Create `handleJumpToInPoint()`:
    ```typescript
    const handleJumpToInPoint = () => {
      if (!activeElement || activeElement !== "media") return;
      const clip = mediaFiles[activeElementIndex];
      dispatch(setCurrentTime(clip.positionStart + clip.startTime));
    };
    ```
  - Create `handleJumpToOutPoint()` similarly

- [ ] **3.2.6 Pass Handlers to GlobalKeyHandler**

  - File: `/app/components/editor/timeline/Timline.tsx`
  - Update GlobalKeyHandlerProps to accept new handlers
  - Pass all trim functions as props

- [ ] **3.2.7 Add Visual Feedback**
  - Show keyboard shortcut hints in UI
  - Tooltip on trim markers: "Drag to adjust, or press I/O at playhead"
  - Brief highlight animation when shortcuts used

**Files to Modify**:

- `/app/components/editor/keys/GlobalKeyHandlerProps.tsx`
- `/app/components/editor/timeline/Timline.tsx`

**Testing**:

- [ ] Press `I` at playhead → in-point set correctly
- [ ] Press `O` at playhead → out-point set correctly
- [ ] Press `X` → trim points reset to full clip
- [ ] Press `[` → playhead jumps to in-point
- [ ] Press `]` → playhead jumps to out-point
- [ ] Shortcuts don't fire when typing in text fields
- [ ] Toast notifications appear for each action
- [ ] Shortcuts only work when clip is selected

---

### 3.3 Trim Constraints & Validation

**Priority**: Medium  
**PRD Reference**: Section 3.5 (Constraints)  
**Status**: Partial (needs minimum duration enforcement)

**Objective**: Enforce trim constraints to prevent invalid trim ranges.

**Acceptance Criteria**:

- Minimum clip duration: 0.1 seconds (3 frames at 30fps)
- In-point cannot exceed out-point
- Out-point cannot precede in-point
- Trim points constrained to clip boundaries
- Visual feedback when constraint reached

**Subtasks**:

- [ ] **3.3.1 Add Minimum Duration Constant**

  - File: `/app/utils/constants.ts` (create if doesn't exist)
  - Define: `export const MIN_CLIP_DURATION = 0.1; // seconds`
  - Define: `export const MIN_CLIP_FRAMES = 3; // at 30fps`

- [ ] **3.3.2 Add Validation to Trim Updates**

  - File: `/app/components/editor/timeline/elements-timeline/VideoTimeline.tsx`
  - In `handleLeftResize()` and `handleRightResize()`:
    - Check: `newEndTime - newStartTime >= MIN_CLIP_DURATION`
    - If violated: clamp to minimum duration
    - Show toast: "Minimum clip duration is 0.1 seconds"

- [ ] **3.3.3 Add Boundary Validation**

  - Prevent in-point from going below 0
  - Prevent out-point from exceeding clip.duration
  - Visual indicator when boundary reached (marker turns orange)

- [ ] **3.3.4 Add Real-Time Validation Feedback**
  - As user drags trim marker, show:
    - Current trim duration
    - Warning color if approaching minimum
    - Hard stop at minimum duration

**Files to Create**:

- `/app/utils/constants.ts` (if doesn't exist)

**Files to Modify**:

- `/app/components/editor/timeline/elements-timeline/VideoTimeline.tsx`
- `/app/components/editor/timeline/TrimMarker.tsx`

**Testing**:

- [ ] Cannot trim clip below 0.1 seconds
- [ ] In-point stops at out-point - 0.1s
- [ ] Out-point stops at in-point + 0.1s
- [ ] Warning shown when constraint reached
- [ ] Constraints work for all media types

---

## 4. Error Handling & Validation

### 4.1 Comprehensive Import Error Handling

**Priority**: High  
**PRD Reference**: Section 8.1 (Import Errors)  
**Status**: Partial (needs enhancement)

**Objective**: Provide clear, actionable error messages for all import failure scenarios.

**Acceptance Criteria**:

- Specific error messages for each failure type
- User-friendly language (no technical jargon)
- Toast notifications with appropriate styling
- Error recovery suggestions
- Logging for debugging

**Subtasks**:

- [ ] **4.1.1 Create Error Types Enum**

  - File: `/app/utils/errorTypes.ts`
  - Define all possible error codes:
    ```typescript
    export enum ImportErrorCode {
      UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
      FILE_TOO_LARGE = "FILE_TOO_LARGE",
      CORRUPTED_FILE = "CORRUPTED_FILE",
      READ_ERROR = "READ_ERROR",
      STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
      UNKNOWN_ERROR = "UNKNOWN_ERROR",
    }
    ```

- [ ] **4.1.2 Create Error Message Mapper**

  - File: `/app/utils/errorMessages.ts`
  - Map error codes to user messages:
    ```typescript
    export const getImportErrorMessage = (code: ImportErrorCode): string => {
      switch (code) {
        case ImportErrorCode.UNSUPPORTED_FORMAT:
          return "Unsupported format. Please use MP4 or MOV files.";
        case ImportErrorCode.FILE_TOO_LARGE:
          return "File exceeds maximum size limit of 2GB.";
        // ... etc
      }
    };
    ```

- [ ] **4.1.3 Implement Try-Catch in Import Flow**

  - File: `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
  - Wrap file processing in try-catch:
    ```typescript
    try {
      await validateVideoFile(file);
      await storeFile(file, fileId);
    } catch (error) {
      const errorCode = determineErrorCode(error);
      toast.error(getImportErrorMessage(errorCode));
      console.error("Import failed:", error);
    }
    ```

- [ ] **4.1.4 Add Error Recovery Options**

  - For quota exceeded: Suggest clearing old projects
  - For corrupted files: Suggest re-exporting from source
  - For unsupported formats: List supported formats
  - Add "Learn More" links in error toasts

- [ ] **4.1.5 Implement Error Logging**
  - Log all errors to console with context
  - Include: error type, file info, timestamp
  - In future: Can be extended to crash reporting service

**Files to Create**:

- `/app/utils/errorTypes.ts`
- `/app/utils/errorMessages.ts`

**Files to Modify**:

- `/app/components/editor/AssetsPanel/AddButtons/UploadMedia.tsx`
- `/app/components/editor/AssetsPanel/DragDropZone.tsx`
- `/app/utils/fileValidation.ts`

**Testing**:

- [ ] Each error type shows correct message
- [ ] Messages are user-friendly
- [ ] Errors are logged to console
- [ ] App doesn't crash on any error type
- [ ] Recovery suggestions are helpful

---

### 4.2 Export Error Handling

**Priority**: High  
**PRD Reference**: Section 8.2 (Export Errors)  
**Status**: Partial (needs enhancement)

**Objective**: Handle all export failure scenarios with clear error messages.

**Acceptance Criteria**:

- Specific errors for FFmpeg failures
- Disk space validation before export
- Export cancellation support
- Progress preservation on failure
- Clear success/failure notifications

**Subtasks**:

- [ ] **4.2.1 Create Export Error Types**

  - File: `/app/utils/errorTypes.ts`
  - Add export error codes:
    ```typescript
    export enum ExportErrorCode {
      FFMPEG_INIT_FAILED = "FFMPEG_INIT_FAILED",
      EXPORT_CANCELLED = "EXPORT_CANCELLED",
      DISK_FULL = "DISK_FULL",
      WRITE_PERMISSION_DENIED = "WRITE_PERMISSION_DENIED",
      ENCODING_FAILED = "ENCODING_FAILED",
      NO_VIDEO_LOADED = "NO_VIDEO_LOADED",
      INVALID_TRIM_RANGE = "INVALID_TRIM_RANGE",
    }
    ```

- [ ] **4.2.2 Add Pre-Export Validation**

  - File: `/app/components/editor/render/Ffmpeg/FfmpegRender.tsx`
  - Before export starts, validate:
    - At least one media file exists
    - Trim points are valid
    - Output path is writable (if available from Electron)
  - Show specific error if validation fails

- [ ] **4.2.3 Wrap FFmpeg Execution in Try-Catch**

  - File: `/app/components/editor/render/Ffmpeg/FfmpegRender.tsx`
  - Catch FFmpeg errors:
    - Init errors
    - Encoding errors
    - Memory errors
  - Map to specific error codes
  - Show user-friendly messages

- [ ] **4.2.4 Add Export Cancellation**

  - Track export cancellation state
  - Terminate FFmpeg process on cancel
  - Clean up temporary files
  - Show "Export cancelled" message (info, not error)

- [ ] **4.2.5 Add Success Notification**
  - On successful export:
    - Toast: "Export complete! Saved to [filename]"
    - Option to "Open Folder" (via Electron)
    - Option to "Export Another"

**Files to Modify**:

- `/app/utils/errorTypes.ts`
- `/app/components/editor/render/Ffmpeg/FfmpegRender.tsx`
- `/app/components/editor/render/Ffmpeg/Export.tsx`

**Testing**:

- [ ] Export with no media → shows specific error
- [ ] Export with invalid trim → shows specific error
- [ ] FFmpeg failure → shows clear error message
- [ ] Cancel export → cleans up properly
- [ ] Successful export → shows success with options

---

### 4.3 Storage Error Handling

**Priority**: Medium  
**PRD Reference**: Section 8.3 (Storage Errors)  
**Status**: Partial (needs quota handling)

**Objective**: Handle IndexedDB storage errors gracefully.

**Acceptance Criteria**:

- Quota exceeded errors caught and explained
- Suggest clearing space
- Prevent data loss on storage failure
- Auto-save failures are visible to user

**Subtasks**:

- [ ] **4.3.1 Add Quota Check Utility**

  - File: `/app/utils/storageUtils.ts` (create if doesn't exist)
  - Implement `checkStorageQuota()`:
    - Uses `navigator.storage.estimate()`
    - Returns available space and usage percentage
  - Implement `hasEnoughSpace(requiredBytes)`:
    - Check if enough space for new file

- [ ] **4.3.2 Check Space Before Storing Files**

  - File: `/app/store/index.ts`
  - In `storeFile()`, check quota first:
    ```typescript
    const hasSpace = await hasEnoughSpace(file.size);
    if (!hasSpace) {
      throw new Error("STORAGE_QUOTA_EXCEEDED");
    }
    ```

- [ ] **4.3.3 Handle QuotaExceededError**

  - File: `/app/store/index.ts`
  - In `storeProject()` and `storeFile()`:
    - Catch `QuotaExceededError`
    - Show user-friendly message:
      - "Storage quota exceeded. Please delete old projects or files."
    - Suggest: "Manage Storage" button → opens projects page

- [ ] **4.3.4 Add Storage Management UI**

  - File: `/app/(pages)/projects/page.tsx`
  - Show storage usage indicator
  - Display: "Using 1.2 GB of 5 GB available"
  - Option to delete old projects
  - Clear IndexedDB cache button

- [ ] **4.3.5 Handle Auto-Save Failures**
  - File: `/app/(pages)/projects/[id]/page.tsx`
  - In auto-save useEffect:
    - Catch storage errors
    - Show persistent warning: "Failed to auto-save project"
    - Retry save on next change
    - Don't block user workflow

**Files to Create**:

- `/app/utils/storageUtils.ts`

**Files to Modify**:

- `/app/store/index.ts`
- `/app/(pages)/projects/page.tsx`
- `/app/(pages)/projects/[id]/page.tsx`

**Testing**:

- [ ] Quota check works correctly
- [ ] Shows warning before running out of space
- [ ] QuotaExceededError caught and handled
- [ ] User can manage storage from UI
- [ ] Auto-save failures are visible

---

## 5. Quality Assurance & Testing

### 5.1 Platform Testing

**Priority**: High  
**PRD Reference**: Section 9 (Testing Requirements), Section 10.3 (Build)  
**Status**: Not Started

**Objective**: Ensure application works correctly on all target platforms.

**Acceptance Criteria**:

- Builds successfully on macOS, Windows, Linux
- All features work on each platform
- Platform-specific issues documented
- Installers work correctly

**Subtasks**:

- [ ] **5.1.1 macOS Testing**

  - Build .dmg installer: `bun run electron:build:mac`
  - Test on macOS 10.13+ (High Sierra or later)
  - Verify:
    - [ ] Application launches
    - [ ] Menu bar appears correctly
    - [ ] File dialogs work
    - [ ] Import video (file picker + drag & drop)
    - [ ] Timeline playback
    - [ ] Trim functionality
    - [ ] Export to MP4
    - [ ] Keyboard shortcuts work
  - Check code signing (if applicable)
  - Test .dmg installation process

- [ ] **5.1.2 Windows Testing**

  - Build .exe installer: `bun run electron:build:win`
  - Test on Windows 10+
  - Verify all features (same as macOS list)
  - Check for SmartScreen warnings
  - Test installer and uninstaller
  - Verify app icon appears correctly

- [ ] **5.1.3 Linux Testing**

  - Build .AppImage: `bun run electron:build:linux`
  - Test on Ubuntu 18.04+
  - Verify all features
  - Check codec compatibility
  - Test on other distros if possible (Fedora, Arch)

- [ ] **5.1.4 Document Platform-Specific Issues**
  - File: `/docs/platform-issues.md` (create)
  - List any known issues per platform
  - Workarounds or limitations
  - Required system dependencies

**Testing Locations**:

- Ideally test on actual hardware for each platform
- Use VMs as fallback

**Deliverables**:

- [ ] Working installers for all platforms
- [ ] Platform testing checklist completed
- [ ] Known issues documented

---

### 5.2 Performance Testing

**Priority**: Medium  
**PRD Reference**: Section 7 (Performance Considerations), Section 12.2 (Quality)  
**Status**: Not Started

**Objective**: Ensure application meets performance requirements specified in PRD.

**Acceptance Criteria**:

- Application launches in under 3 seconds
- Video import completes in under 10 seconds (100MB file)
- Timeline scrubbing at 60fps
- Playback starts within 1 second
- Export progress updates every second

**Subtasks**:

- [ ] **5.2.1 Test Application Launch Time**

  - Measure time from icon click to app ready
  - Target: < 3 seconds
  - Test on all platforms
  - Profile slow startup areas

- [ ] **5.2.2 Test Import Performance**

  - Test with 100MB MP4 file
  - Measure time from file select to timeline appear
  - Target: < 10 seconds
  - Test with various file sizes

- [ ] **5.2.3 Test Timeline Performance**

  - Monitor FPS during timeline scrubbing
  - Use browser dev tools performance profiler
  - Target: 60fps
  - Test with multiple clips on timeline

- [ ] **5.2.4 Test Playback Performance**

  - Measure time from play button to first frame
  - Target: < 1 second
  - Test with different video resolutions

- [ ] **5.2.5 Test Export Performance**

  - Verify progress updates every 1 second
  - Test with various export settings
  - Measure overall export time
  - Test with 5-minute video

- [ ] **5.2.6 Memory Usage Monitoring**
  - Monitor RAM usage during operation
  - Check for memory leaks
  - Test with large video files
  - Verify cleanup on project close

**Tools**:

- Chrome DevTools Performance tab
- Activity Monitor (macOS) / Task Manager (Windows)
- Electron DevTools

**Deliverables**:

- [ ] Performance test results documented
- [ ] Performance targets met or issues logged
- [ ] Optimization recommendations (if needed)

---

### 5.3 Feature Integration Testing

**Priority**: High  
**PRD Reference**: Section 9.1 (Critical Test Cases)  
**Status**: Not Started

**Objective**: Test all features work together correctly end-to-end.

**Acceptance Criteria**:

- Complete user workflows function correctly
- No conflicts between features
- State persists correctly across actions

**Subtasks**:

- [ ] **5.3.1 Complete Import-to-Export Workflow**

  - Test full workflow:
    1. Launch application
    2. Import video via file picker
    3. Video appears in timeline
    4. Play video
    5. Set trim in-point (I key)
    6. Set trim out-point (O key)
    7. Verify trim markers visible
    8. Export video
    9. Verify exported file plays correctly
  - Repeat with drag & drop import

- [ ] **5.3.2 Test Multi-Clip Workflow**

  - Import multiple videos
  - Trim each clip differently
  - Arrange on timeline
  - Export final video
  - Verify all trims applied correctly

- [ ] **5.3.3 Test Project Persistence**

  - Create project with clips
  - Set trim points
  - Close application
  - Reopen application
  - Open project
  - Verify all state restored:
    - Clips in correct positions
    - Trim points preserved
    - Timeline state correct

- [ ] **5.3.4 Test Error Recovery**

  - Trigger various errors intentionally
  - Verify app doesn't crash
  - Verify user can continue working
  - Test with:
    - Invalid file import
    - Storage quota exceeded
    - Export failure

- [ ] **5.3.5 Test Keyboard Shortcuts Integration**
  - Test all shortcuts work correctly:
    - Playback: Space, J/K/L
    - Trim: I, O, X, [, ]
    - Split: S
    - Delete: Del
    - Duplicate: D
  - Verify no conflicts
  - Test in various UI states

**Deliverables**:

- [ ] Integration test checklist completed
- [ ] All critical workflows pass
- [ ] Issues logged and prioritized

---

### 5.4 User Acceptance Testing

**Priority**: Medium  
**PRD Reference**: Section 12.1 (Success Criteria)  
**Status**: Not Started

**Objective**: Verify application meets MVP success criteria from user perspective.

**Acceptance Criteria**:

- All MVP gates passed (Section 12.1)
- User can complete tasks intuitively
- No critical bugs blocking usage

**Subtasks**:

- [ ] **5.4.1 Verify MVP Gates**

  - Test all "Must Have" items from PRD Section 12.1:
    - [ ] ✓ Desktop application launches successfully
    - [ ] ✓ File picker opens and accepts MP4/MOV files
    - [ ] ✓ Drag & drop works for video import
    - [ ] ✓ Timeline displays imported video clip
    - [ ] ✓ Video preview plays imported clip
    - [ ] ✓ Trim handles can be positioned on timeline
    - [ ] ✓ Trim in/out points affect playback
    - [ ] ✓ Export button generates MP4 file
    - [ ] ✓ Exported file plays in external player
    - [ ] ✓ Application can be packaged as native app

- [ ] **5.4.2 Usability Testing**

  - Test with fresh users (if possible)
  - Observe without instruction
  - Note confusion points
  - Gather feedback on:
    - Import process
    - Trim controls
    - Export flow
    - Overall experience

- [ ] **5.4.3 Edge Case Testing**

  - Test with very short clips (< 1 second)
  - Test with very long clips (> 1 hour)
  - Test with 4K resolution videos
  - Test with various aspect ratios
  - Test with audio-only files
  - Test rapid user actions

- [ ] **5.4.4 Document Known Limitations**
  - File: Update `/docs/MVP_PRD.md` Section 13
  - List actual limitations discovered
  - Note any deviations from original scope
  - Document workarounds if needed

**Deliverables**:

- [ ] MVP gates verification checklist
- [ ] User feedback summary
- [ ] Known limitations updated
- [ ] Go/No-Go recommendation for MVP release

---

## 6. Documentation Updates

### 6.1 Update README

**Priority**: Low  
**PRD Reference**: Section 15 (Development Environment)  
**Status**: Needs Update

**Subtasks**:

- [ ] **6.1.1 Update Feature List**

  - File: `/README.md`
  - Add newly implemented features:
    - Drag & drop import
    - Visual trim markers
    - Keyboard shortcuts (I/O/X/[/])
    - Native file dialogs

- [ ] **6.1.2 Add Keyboard Shortcuts Section**

  - Document all shortcuts:
    - Playback controls
    - Trim controls
    - Timeline operations
  - Format as clear table

- [ ] **6.1.3 Update Installation Instructions**
  - Add download links for installers (when available)
  - Document system requirements
  - Add troubleshooting section

**Deliverables**:

- [ ] README.md updated with new features

---

### 6.2 Create User Guide

**Priority**: Low  
**Status**: Not Started

**Subtasks**:

- [ ] **6.2.1 Create Basic User Guide**

  - File: Create `/docs/user-guide.md`
  - Sections:
    - Getting Started
    - Importing Videos
    - Trimming Clips
    - Exporting Videos
    - Keyboard Shortcuts
    - Troubleshooting

- [ ] **6.2.2 Add Screenshots**
  - Capture key UI states
  - Add to `/docs/images/`
  - Embed in user guide

**Deliverables**:

- [ ] User guide document created
- [ ] Screenshots added

---

## Progress Tracking

### Overall MVP Completion

**Legend**:

- ❌ Not Started
- 🟡 In Progress
- ✅ Complete

| Category                   | Status | Progress |
| -------------------------- | ------ | -------- |
| 1. Desktop Integration     | ❌     | 0%       |
| 1.1 Electron Menu Bar      | ❌     | 0/5      |
| 1.2 Native File Dialogs    | ❌     | 0/6      |
| 2. Import Features         | ❌     | 0%       |
| 2.1 Drag & Drop Import     | ❌     | 0/5      |
| 2.2 File Format Validation | ❌     | 0/5      |
| 3. Trim Controls           | ❌     | 0%       |
| 3.1 Visual Trim Markers    | ❌     | 0/6      |
| 3.2 Keyboard Shortcuts     | ❌     | 0/7      |
| 3.3 Trim Constraints       | ❌     | 0/4      |
| 4. Error Handling          | ❌     | 0%       |
| 4.1 Import Error Handling  | ❌     | 0/5      |
| 4.2 Export Error Handling  | ❌     | 0/5      |
| 4.3 Storage Error Handling | ❌     | 0/5      |
| 5. Quality Assurance       | ❌     | 0%       |
| 5.1 Platform Testing       | ❌     | 0/4      |
| 5.2 Performance Testing    | ❌     | 0/6      |
| 5.3 Integration Testing    | ❌     | 0/5      |
| 5.4 User Acceptance        | ❌     | 0/4      |
| 6. Documentation           | ❌     | 0%       |
| 6.1 Update README          | ❌     | 0/3      |
| 6.2 Create User Guide      | ❌     | 0/2      |

**Total Tasks**: 97 subtasks across 6 main categories  
**Completed**: 0  
**Overall Progress**: 0%

---

## Priority Roadmap

### Phase 1: Core MVP Features (Weeks 1-2)

**Goal**: Complete essential missing features

1. Drag & Drop Import (2.1)
2. File Format Validation (2.2)
3. Visual Trim Markers (3.1)
4. Trim Keyboard Shortcuts (3.2)
5. Import Error Handling (4.1)
6. Export Error Handling (4.2)

### Phase 2: Desktop Integration (Week 3)

**Goal**: Complete native desktop experience

1. Electron Menu Bar (1.1)
2. Native File Dialogs (1.2)
3. Trim Constraints (3.3)
4. Storage Error Handling (4.3)

### Phase 3: Quality & Polish (Week 4)

**Goal**: Testing and refinement

1. Platform Testing (5.1)
2. Performance Testing (5.2)
3. Integration Testing (5.3)
4. User Acceptance Testing (5.4)

### Phase 4: Documentation (Week 5)

**Goal**: Complete documentation

1. Update README (6.1)
2. Create User Guide (6.2)

---

## Notes & Decisions

### Design Decisions

1. **Multi-Clip Support**: Decided to keep existing multi-clip functionality rather than simplifying to single-clip MVP. This provides more value to users while still meeting all MVP requirements.

2. **Trim Markers**: Using in-point/out-point markers alongside existing timeline resize functionality. Markers provide visual clarity while resize handles offer precision.

3. **Keyboard Shortcuts**: Adding I/O/X/[/] shortcuts as specified in PRD while keeping existing shortcuts (S/D/Del) for enhanced workflow.

4. **Error Handling**: Comprehensive error handling from the start to ensure good UX and easier debugging.

### Technical Constraints

1. **File Size Limit**: 2GB per file (IndexedDB and memory constraints)
2. **Supported Formats**: MP4 and MOV only for MVP
3. **Export Format**: MP4 only (can add more formats post-MVP)
4. **Platform Support**: macOS 10.13+, Windows 10+, Ubuntu 18.04+

### Future Enhancements (Post-MVP)

From PRD Section 14, these features are **not** in MVP scope:

- Multiple video clips (already implemented!)
- Audio tracks (already implemented!)
- Text overlays (already implemented!)
- Effects and transitions
- Color correction
- Undo/redo (history stack exists but needs UI)
- Project templates
- Cloud storage
- Collaboration features

---

## Contact & Questions

For questions about this task list or MVP scope:

- Review `/docs/MVP_PRD.md` for detailed requirements
- Check `/docs/architecture.md` for technical architecture
- Consult development team for clarifications

---

**Document End**
