graph TB
subgraph "UI Layer - React Components"
RP[RecordingPanel<br/>Container]
MS[ModeSelector<br/>Screen/Webcam/PiP]
SS[ScreenSelector<br/>Window Picker]
RC[RecordingControls<br/>Start/Stop]
RT[RecordingTimer<br/>Timer + Progress]
CO[CountdownOverlay<br/>3-2-1 Countdown]
SI[StorageIndicator<br/>Storage Usage]
RB[RecordButton<br/>Assets Sidebar]
RL[RecordingsList<br/>Assets Library]
end

    subgraph "State Management - Zustand"
        Store[Recording Store<br/>recordingSlice.ts]
        State[State:<br/>- isRecording<br/>- recordingMode<br/>- selectedSource<br/>- sessionId<br/>- elapsedTime<br/>- streams]
        Actions[Actions:<br/>- openPanel<br/>- startRecording<br/>- stopRecording<br/>- updateElapsedTime]
    end

    subgraph "Recording Logic"
        RS[RecordingSession<br/>Class]
        MR[MediaRecorder API<br/>Browser Native]
        Chunks[Video Chunks<br/>Blob Array]
    end

    subgraph "Electron Layer - Main Process"
        IPC[IPC Handlers<br/>ipcMain]
        SC[Screen Capture<br/>screen-capture.ts]
        DC[desktopCapturer API<br/>Electron Native]
        Perm[Permissions<br/>permissions.ts]
    end

    subgraph "Storage Layer"
        IDB[IndexedDB<br/>clipforge-recordings]
        StorageAPI[recording-storage.ts<br/>- saveRecording<br/>- getRecording<br/>- checkStorageQuota]
        Thumb[Thumbnail Generator<br/>Canvas API]
    end

    subgraph "Validation & Utils"
        Val[recording-validation.ts<br/>- checkPermissions<br/>- validateStorage<br/>- validateSource]
    end

    subgraph "Custom Hooks"
        HSess[useRecordingSession<br/>Lifecycle Management]
        HTimer[useRecordingTimer<br/>Timer Logic]
        HShort[useRecordingShortcuts<br/>Keyboard Shortcuts]
    end

    %% UI Component Relationships
    RB -->|Opens| RP
    RP -->|Renders| MS
    RP -->|Renders| SS
    RP -->|Renders| RC
    RP -->|Renders| RT
    RP -->|Renders| SI
    RP -->|Shows| CO
    RL -->|Displays| IDB

    %% State Management Flow
    RP -.->|Reads/Updates| Store
    MS -.->|Reads/Updates| Store
    SS -.->|Reads/Updates| Store
    RC -.->|Reads/Updates| Store
    RT -.->|Reads/Updates| Store
    RL -.->|Reads| Store

    Store -->|Contains| State
    Store -->|Contains| Actions

    %% Custom Hooks Integration
    RP -.->|Uses| HSess
    RT -.->|Uses| HTimer
    RP -.->|Uses| HShort
    HSess -.->|Updates| Store
    HTimer -.->|Updates| Store

    %% Recording Flow
    Actions -->|Initiates| RS
    RS -->|Creates| MR
    MR -->|Collects| Chunks
    RS -->|Stops & Combines| Chunks

    %% Electron IPC Communication
    SS -->|getSources| IPC
    Actions -->|startScreenCapture| IPC
    IPC -->|Calls| SC
    SC -->|Uses| DC
    IPC -->|Checks| Perm

    %% Storage Flow
    RS -->|Save Blob| StorageAPI
    StorageAPI -->|Writes to| IDB
    StorageAPI -->|Generates| Thumb
    StorageAPI -->|Checks| Val

    %% Validation Flow
    Actions -->|Pre-flight| Val
    Val -->|Checks| Perm
    Val -->|Checks| StorageAPI

    %% Data Flow Annotations
    SC -.->|Returns Sources<br/>+ Thumbnails| SS
    MR -.->|Returns Blob| RS
    RS -.->|Returns assetId| Actions
    IDB -.->|Returns Recordings| RL

    %% Styling
    classDef uiClass fill:#D4E7C5,stroke:#333,stroke-width:2px,color:#000
    classDef stateClass fill:#B4A7D6,stroke:#333,stroke-width:2px,color:#000
    classDef logicClass fill:#FFE5B4,stroke:#333,stroke-width:2px,color:#000
    classDef electronClass fill:#87CEEB,stroke:#333,stroke-width:2px,color:#000
    classDef storageClass fill:#FFB6C1,stroke:#333,stroke-width:2px,color:#000
    classDef utilClass fill:#98FB98,stroke:#333,stroke-width:2px,color:#000
    classDef hookClass fill:#DDA0DD,stroke:#333,stroke-width:2px,color:#000

    class RP,MS,SS,RC,RT,CO,SI,RB,RL uiClass
    class Store,State,Actions stateClass
    class RS,MR,Chunks logicClass
    class IPC,SC,DC,Perm electronClass
    class IDB,StorageAPI,Thumb storageClass
    class Val utilClass
    class HSess,HTimer,HShort hookClass
