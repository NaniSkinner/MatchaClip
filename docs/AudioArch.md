graph TB
subgraph "User Interface Layer"
RecPanel[Recording Panel]
AudioUI[Audio Source Selector]
WebcamUI[Webcam Selector]
VUMeters[VU Meters]
Preview[Camera Preview]
Controls[Recording Controls]
end

    subgraph "State Management - Zustand Store"
        RecSlice[Recording Slice]
        AudioConfig[Audio Configuration]
        WebcamConfig[Webcam Configuration]
        StreamState[Stream State]
    end

    subgraph "Device Management"
        AudioEnum[Audio Device Enumerator]
        CameraEnum[Camera Device Enumerator]
        PermMgr[Permission Manager]
    end

    subgraph "Media Capture Layer"
        ScreenCap[Screen Capture<br/>getDisplayMedia]
        MicCap[Microphone Capture<br/>getUserMedia]
        SysAudio[System Audio<br/>ScreenCaptureKit]
        WebcamCap[Webcam Capture<br/>getUserMedia]
    end

    subgraph "Audio Processing Pipeline"
        AudioCtx[Web Audio Context]
        MicSource[Mic Source Node]
        SysSource[System Audio Source]
        MicGain[Mic Gain Node]
        SysGain[System Gain Node]
        Analyzer[Analyser Node]
        Mixer[Audio Mixer<br/>Destination Node]
    end

    subgraph "Stream Management"
        StreamCoord[Stream Coordinator]
        StreamCombiner[Stream Combiner]
        SyncMgr[Synchronization Manager]
    end

    subgraph "Recording Engine"
        RecSession[Recording Session]
        MediaRec[MediaRecorder API]
        BlobProc[Blob Processor]
    end

    subgraph "Storage Layer"
        IDB[(IndexedDB)]
        RecMeta[Recording Metadata]
    end

    subgraph "External APIs"
        WebAPI[Browser Media APIs]
        ElectronIPC[Electron IPC<br/>macOS System Audio]
    end

    %% UI to State
    RecPanel --> RecSlice
    AudioUI --> AudioConfig
    WebcamUI --> WebcamConfig
    Controls --> RecSlice

    %% State to Device Management
    RecSlice --> AudioEnum
    RecSlice --> CameraEnum
    RecSlice --> PermMgr

    %% Device Management to Capture
    PermMgr --> MicCap
    PermMgr --> WebcamCap
    PermMgr --> ScreenCap
    AudioEnum --> MicCap
    CameraEnum --> WebcamCap

    %% Capture to Streams
    ScreenCap --> StreamState
    MicCap --> StreamState
    SysAudio --> StreamState
    WebcamCap --> StreamState

    %% Screen Capture gets System Audio on macOS
    ScreenCap -.->|includes audio track| SysAudio

    %% Audio Processing Pipeline
    MicCap --> AudioCtx
    SysAudio --> AudioCtx
    AudioCtx --> MicSource
    AudioCtx --> SysSource
    MicSource --> MicGain
    SysSource --> SysGain
    MicGain --> Mixer
    SysGain --> Mixer
    MicSource --> Analyzer
    SysSource --> Analyzer

    %% VU Meters from Analyzer
    Analyzer --> VUMeters

    %% Preview from Webcam
    WebcamCap --> Preview

    %% Stream Coordination
    StreamState --> StreamCoord
    Mixer --> StreamCoord
    StreamCoord --> StreamCombiner
    StreamCombiner --> SyncMgr

    %% Recording Flow
    SyncMgr --> RecSession
    RecSession --> MediaRec
    MediaRec --> BlobProc
    BlobProc --> IDB
    BlobProc --> RecMeta
    RecMeta --> IDB

    %% External Dependencies
    WebAPI -.->|provides APIs| ScreenCap
    WebAPI -.->|provides APIs| MicCap
    WebAPI -.->|provides APIs| WebcamCap
    ElectronIPC -.->|macOS only| SysAudio

    %% Styling
    classDef ui fill:#E8F4F8,stroke:#4A90A4,stroke-width:2px
    classDef state fill:#FFF4E6,stroke:#F59E0B,stroke-width:2px
    classDef device fill:#F3E8FF,stroke:#B4A7D6,stroke-width:2px
    classDef capture fill:#D4E7C5,stroke:#86B36A,stroke-width:2px
    classDef audio fill:#FFE4E6,stroke:#F43F5E,stroke-width:2px
    classDef stream fill:#DBEAFE,stroke:#3B82F6,stroke-width:2px
    classDef recording fill:#FEF3C7,stroke:#F59E0B,stroke-width:2px
    classDef storage fill:#E0E7FF,stroke:#6366F1,stroke-width:2px

    class RecPanel,AudioUI,WebcamUI,VUMeters,Preview,Controls ui
    class RecSlice,AudioConfig,WebcamConfig,StreamState state
    class AudioEnum,CameraEnum,PermMgr device
    class ScreenCap,MicCap,SysAudio,WebcamCap capture
    class AudioCtx,MicSource,SysSource,MicGain,SysGain,Analyzer,Mixer audio
    class StreamCoord,StreamCombiner,SyncMgr stream
    class RecSession,MediaRec,BlobProc recording
    class IDB,RecMeta storage
