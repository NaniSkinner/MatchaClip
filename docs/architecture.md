# Architecture

# ClipForge MVP - Architecture Diagram

**Document Version**: 1.0  
**Last Updated**: 2025-10-28

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Desktop Layer - Electron"
        EM[Main Process<br/>electron/main.ts]
        EP[Preload Script<br/>electron/preload.ts]
        EM -->|IPC Bridge| EP

        subgraph "Native OS APIs"
            Menu[Menu Bar]
            Dialog[File Dialogs]
            FS[File System]
        end

        EM --> Menu
        EM --> Dialog
        EM --> FS
    end

    subgraph "Application Layer - Next.js"
        subgraph "Pages"
            ProjectPage[Project Editor<br/>pages/projects/id]
            HomePage[Home/Projects List]
        end

        subgraph "Core Components"
            Timeline[Timeline Container<br/>Konva.js Canvas]
            Player[Video Player<br/>Remotion Player]
            Assets[Assets Panel<br/>Media Library]
            Export[Export Module<br/>FFmpeg Integration]
        end

        subgraph "UI Components"
            TrimMarker[Trim Markers]
            DragDrop[Drag & Drop Zone]
            Controls[Playback Controls]
            MenuUI[Menu Event Handlers]
        end

        ProjectPage --> Timeline
        ProjectPage --> Player
        ProjectPage --> Assets
        ProjectPage --> Export

        Timeline --> TrimMarker
        Assets --> DragDrop
        Timeline --> Controls
        ProjectPage --> MenuUI
    end

    subgraph "State Management Layer"
        Store[Zustand Store<br/>store/project.ts]
        ClipState[Clip State<br/>trimIn, trimOut, position]
        ProjectState[Project State<br/>clips, timeline, settings]

        Store --> ClipState
        Store --> ProjectState
    end

    subgraph "Business Logic Layer"
        subgraph "Media Processing"
            Validation[File Validation<br/>lib/file-validation.ts]
            MediaStorage[Media Storage<br/>lib/media-storage.ts]
            VideoMeta[Video Metadata<br/>Extraction]
        end

        subgraph "Trim Logic"
            TrimConstraints[Trim Constraints<br/>lib/trim-constraints.ts]
            TrimCalculations[Trim Calculations]
        end

        subgraph "Error Handling"
            ImportErrors[Import Error Handler<br/>lib/error-handler.ts]
            ExportErrors[Export Error Handler<br/>lib/export-error-handler.ts]
            StorageManager[Storage Manager<br/>lib/storage-manager.ts]
        end

        subgraph "Keyboard System"
            Shortcuts[Keyboard Shortcuts<br/>hooks/useKeyboardShortcuts.ts]
        end
    end

    subgraph "Storage Layer"
        subgraph "Local Storage"
            IDB[(IndexedDB<br/>Video Files)]
            LocalDB[(LocalStorage<br/>Preferences)]
        end

        subgraph "Cloud Storage"
            Firestore[(Firestore<br/>Project Metadata)]
        end
    end

    subgraph "External Services"
        FFmpeg[FFmpeg.wasm<br/>Video Export Engine]
        Browser[Browser APIs<br/>Video Element, Canvas]
    end

    %% Data Flow - User Actions
    EP -->|IPC Events| ProjectPage
    MenuUI -->|Menu Actions| EM
    DragDrop -->|Files| Validation

    %% Data Flow - Import
    Validation -->|Valid Files| MediaStorage
    MediaStorage -->|Store Blob| IDB
    MediaStorage -->|Extract Metadata| VideoMeta
    VideoMeta -->|Update State| Store

    %% Data Flow - State Management
    Timeline -->|User Actions| Store
    Player -->|Playback State| Store
    TrimMarker -->|Trim Changes| TrimConstraints
    TrimConstraints -->|Validated Trim| Store
    Store -->|State Updates| Timeline
    Store -->|State Updates| Player

    %% Data Flow - Export
    Export -->|Get Project Data| Store
    Store -->|Clips & Settings| Export
    Export -->|Render Commands| FFmpeg
    IDB -->|Video Data| Export
    FFmpeg -->|Encoded Video| FS

    %% Data Flow - Persistence
    Store -->|Save Project| Firestore
    Firestore -->|Load Project| Store

    %% Data Flow - Playback
    IDB -->|Video Blobs| Player
    Player -->|Render| Browser
    Store -->|Trim Points| Player

    %% Error Handling Flow
    MediaStorage -.->|Errors| ImportErrors
    Export -.->|Errors| ExportErrors
    IDB -.->|Quota Errors| StorageManager
    ImportErrors -.->|User Notification| ProjectPage
    ExportErrors -.->|User Notification| ProjectPage

    %% Keyboard Shortcuts
    Shortcuts -->|Trim Actions| TrimMarker
    Shortcuts -->|Playback Actions| Controls
    Shortcuts -->|Timeline Actions| Timeline

    style EM fill:#e1f5ff
    style Store fill:#fff4e1
    style IDB fill:#f0f0f0
    style Firestore fill:#f0f0f0
    style FFmpeg fill:#ffe1f5
    style Timeline fill:#e8f5e1
    style Player fill:#e8f5e1
```

---

## Component Interaction Diagram

```mermaid
sequenceDiagram
    participant User
    participant ElectronMain
    participant React
    participant Store
    participant Validation
    participant IndexedDB
    participant Timeline
    participant Player
    participant FFmpeg
    participant FileSystem

    Note over User,FileSystem: Import Flow
    User->>ElectronMain: Drag & Drop / Menu Import
    ElectronMain->>React: IPC: File Paths
    React->>Validation: Validate Files
    Validation->>React: Validation Result
    React->>IndexedDB: Store Video Blob
    IndexedDB->>Store: Update File Reference
    Store->>Timeline: Add Clip to Timeline

    Note over User,FileSystem: Trim Flow
    User->>Timeline: Drag Trim Marker
    Timeline->>Store: Update Trim Points (I/O keys)
    Store->>Player: Update Playback Range
    Player->>User: Preview Trimmed Video

    Note over User,FileSystem: Export Flow
    User->>React: Click Export
    React->>ElectronMain: IPC: Open Save Dialog
    ElectronMain->>React: Save Path
    React->>Store: Get Project Data
    Store->>React: Clips + Trim Points
    React->>IndexedDB: Fetch Video Blobs
    IndexedDB->>React: Video Data
    React->>FFmpeg: Render with Trim Points
    FFmpeg->>FileSystem: Write MP4 File
    FileSystem->>User: Export Complete
```

---

## State Management Architecture

```mermaid
graph LR
    subgraph "Zustand Store Structure"
        PS[Project State]
        CS[Clips State]
        TS[Timeline State]
        PS --> CS
        PS --> TS

        CS --> C1[Clip 1<br/>id, src, trimIn, trimOut]
        CS --> C2[Clip 2<br/>id, src, trimIn, trimOut]
        CS --> C3[Clip N...]

        TS --> TL[Timeline Config<br/>duration, fps, zoom]
        TS --> PH[Playhead Position]
        TS --> SEL[Selected Clips]
    end

    subgraph "Actions"
        A1[addClip]
        A2[updateClip]
        A3[deleteClip]
        A4[setTrimPoints]
        A5[updatePlayhead]
        A6[selectClip]
    end

    subgraph "Components Subscribe"
        Timeline
        Player
        Export
        Assets
    end

    A1 --> CS
    A2 --> CS
    A3 --> CS
    A4 --> CS
    A5 --> TS
    A6 --> TS

    CS -.->|onChange| Timeline
    CS -.->|onChange| Player
    CS -.->|onChange| Export
    TS -.->|onChange| Timeline
    TS -.->|onChange| Player
```

---

## File Organization

```mermaid
graph TD
    Root[ClipForge Project Root]

    Root --> Electron[electron/]
    Root --> App[app/]
    Root --> Lib[app/lib/]
    Root --> Components[app/components/]
    Root --> Store[app/store/]
    Root --> Docs[docs/]

    Electron --> MainTS[main.ts<br/>Menu, IPC, Dialogs]
    Electron --> PreloadTS[preload.ts<br/>IPC Bridge]

    App --> Pages[pages/projects/id/<br/>Project Editor]

    Components --> Editor[editor/]
    Editor --> TimelineComp[Timeline/<br/>Timeline, Clip, TrimMarker]
    Editor --> PlayerComp[VideoPlayer.tsx]
    Editor --> AssetsComp[AssetsPanel/<br/>Media, Upload, DragDrop]
    Editor --> RenderComp[render/Ffmpeg/<br/>Export, Context]

    Lib --> FileVal[file-validation.ts]
    Lib --> MediaStore[media-storage.ts]
    Lib --> TrimConst[trim-constraints.ts]
    Lib --> ErrorH[error-handler.ts]
    Lib --> ExportErr[export-error-handler.ts]
    Lib --> StorageMgr[storage-manager.ts]

    Store --> ProjectStore[project.ts<br/>Zustand Store]

    Docs --> PRD[MVP_PRD.md]
    Docs --> Tasks[MVP_Tasks 1,2,3]
    Docs --> Arch[architecture.md]
```

---

## Data Flow Patterns

### Import Pattern

```mermaid
flowchart LR
    A[User Drops File] --> B{Validate}
    B -->|Invalid| C[Show Error]
    B -->|Valid| D[Extract Metadata]
    D --> E[Store in IndexedDB]
    E --> F[Update Store]
    F --> G[Render in Timeline]
```

### Trim Pattern

```mermaid
flowchart LR
    A[User Drags Marker] --> B{Check Constraints}
    B -->|Invalid| C[Clamp Position]
    B -->|Valid| D[Update Clip State]
    C --> D
    D --> E[Update Timeline UI]
    D --> F[Update Player Range]
```

### Export Pattern

```mermaid
flowchart LR
    A[User Clicks Export] --> B[Open Save Dialog]
    B --> C[Get Project Data]
    C --> D[Fetch Video Blobs]
    D --> E[Apply Trim Points]
    E --> F[Render with FFmpeg]
    F --> G[Write to File]
    G --> H[Show Success]
```

---

## Technology Stack

```mermaid
graph TB
    subgraph "Desktop Runtime"
        Electron[Electron 27+<br/>Desktop Wrapper]
        Node[Node.js<br/>File System Access]
    end

    subgraph "Frontend Framework"
        Next[Next.js 14<br/>React Framework]
        React[React 18<br/>UI Library]
        TS[TypeScript<br/>Type Safety]
    end

    subgraph "UI & Rendering"
        Konva[Konva.js<br/>Canvas Timeline]
        Remotion[Remotion Player<br/>Video Preview]
        Tailwind[Tailwind CSS<br/>Styling]
    end

    subgraph "State & Storage"
        Zustand[Zustand<br/>State Management]
        IDB[IndexedDB<br/>Local Video Storage]
        Firebase[Firebase/Firestore<br/>Project Metadata]
    end

    subgraph "Video Processing"
        FFmpegWasm[FFmpeg.wasm<br/>Video Export]
        WebCodecs[Web Codecs API<br/>Video Decoding]
    end

    Electron --> Next
    Next --> React
    React --> Konva
    React --> Remotion
    React --> Zustand
    Zustand --> IDB
    Zustand --> Firebase
    React --> FFmpegWasm
```

---

## Error Handling Flow

```mermaid
graph TD
    subgraph "Error Sources"
        E1[File Import Errors]
        E2[Storage Quota Errors]
        E3[Export Errors]
        E4[Validation Errors]
    end

    subgraph "Error Handlers"
        H1[ImportErrorHandler]
        H2[StorageManager]
        H3[ExportErrorHandler]
        H4[ValidationHandler]
    end

    subgraph "User Feedback"
        T1[Toast Notifications]
        D1[Error Dialogs]
        R1[Retry Actions]
        L1[Error Logging]
    end

    E1 --> H1
    E2 --> H2
    E3 --> H3
    E4 --> H4

    H1 --> T1
    H2 --> D1
    H3 --> T1
    H4 --> T1

    H1 --> R1
    H2 --> R1
    H3 --> R1

    H1 --> L1
    H2 --> L1
    H3 --> L1
    H4 --> L1
```

---

## Keyboard Shortcuts System

```mermaid
graph LR
    subgraph "Keyboard Input"
        K1[I - Set In-Point]
        K2[O - Set Out-Point]
        K3[X - Clear Trim]
        K4[Space - Play/Pause]
        K5[S - Split Clip]
        K6[Del - Delete]
    end

    subgraph "Shortcuts Hook"
        Hook[useKeyboardShortcuts]
    end

    subgraph "Actions"
        A1[setTrimIn]
        A2[setTrimOut]
        A3[clearTrim]
        A4[togglePlay]
        A5[splitClip]
        A6[deleteClip]
    end

    subgraph "Store Updates"
        Store[Zustand Store]
    end

    K1 --> Hook
    K2 --> Hook
    K3 --> Hook
    K4 --> Hook
    K5 --> Hook
    K6 --> Hook

    Hook --> A1
    Hook --> A2
    Hook --> A3
    Hook --> A4
    Hook --> A5
    Hook --> A6

    A1 --> Store
    A2 --> Store
    A3 --> Store
    A4 --> Store
    A5 --> Store
    A6 --> Store
```

---

## Notes

### Architecture Principles

1. **Separation of Concerns**: Clear boundaries between Electron, React, business logic, and storage
2. **Unidirectional Data Flow**: User actions → Store → UI updates
3. **Error Boundaries**: Comprehensive error handling at each layer
4. **State Management**: Centralized Zustand store for all application state
5. **Performance**: Async operations, optimistic updates, efficient rendering

### Key Design Decisions

- **Electron for Desktop**: Native OS integration, file system access, menu bar
- **IndexedDB for Media**: Large video files stored locally, not in memory
- **Firestore for Projects**: Cloud sync for project metadata only
- **FFmpeg.wasm for Export**: Client-side video encoding, no server needed
- **Konva.js for Timeline**: High-performance canvas rendering
- **Remotion for Preview**: React-based video composition

### Data Flow Principles

- User interactions captured by React components
- Validation happens before state updates
- Store notifies components of state changes
- Components re-render based on store updates
- Async operations (import, export) show progress
- Errors caught and displayed with recovery options

---

**Related Documents**:

- [MVP_PRD.md](MVP_PRD.md) - Product Requirements
- [MVP_Tasks1.md](MVP_Tasks1.md) - Implementation Tasks Part 1
- [MVP_Tasks2.md](MVP_Tasks2.md) - Implementation Tasks Part 2
- [MVP_Tasks3.md](MVP_Tasks3.md) - Implementation Tasks Part 3
