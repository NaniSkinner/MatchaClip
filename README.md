# ClipForge

> A powerful desktop video editor built with Electron, Next.js 15, and React 19

<div align="center">

**Gauntlet Cohort 3 • Week 3 Project**

Built by [Nani Skinner](https://github.com/NaniSkinner) • [@NaniSkinner](https://x.com/NaniSkinner)

</div>

---

## Overview

ClipForge is a cross-platform desktop video editing application that brings professional-grade editing capabilities to your fingertips. Built as a Week 3 project for Gauntlet Cohort 3, ClipForge demonstrates the power of modern web technologies in creating native desktop experiences.

### Tech Stack

- **Framework**: Electron 39.0.0 + Next.js 15.5 (custom integration)
- **UI**: React 19.2.0 + Tailwind CSS v4.1.16
- **Video Preview**: Remotion 4.0.369 (real-time composition)
- **Rendering**: Native FFmpeg via fluent-ffmpeg (high-quality exports up to 1080p)
- **State Management**: Redux Toolkit 2.7.0
- **Storage**: IndexedDB (client-side project persistence)
- **Language**: TypeScript 5.9.3

### Why Desktop?

Unlike web-based editors, ClipForge runs natively on your machine, providing:

- No upload/download times - work with local files directly
- Complete offline functionality
- Better performance with large video files
- Native OS integration (file dialogs, menus, etc.)
- Privacy - your projects never leave your computer

---

## Features

### Recording Capabilities

- **Screen Recording**: Capture your entire screen or specific windows at up to 1080p @ 30fps
- **Webcam Recording**: Record directly from your camera with device selection
- **Picture-in-Picture**: Combine screen recording with webcam overlay for professional tutorials
- **Audio Capture**: Record microphone input and system audio
- **Recording Controls**: Professional countdown timer, pause/resume, and recording timer
- **Auto-save to Library**: Recorded videos automatically added to your assets library

### Core Editing

- **Real-time Preview**: See your edits instantly with Remotion's powerful composition engine
- **Multi-track Timeline**: Organize video, audio, images, and text on separate tracks
- **Precise Controls**: Frame-accurate trimming, splitting, and arrangement
- **Non-destructive Editing**: Original files remain untouched

### Media Support

- **Videos**: MP4, WebM, and more
- **Audio**: MP3, WAV, background music tracks
- **Images**: PNG, JPG, GIF overlays
- **Text**: Customizable text elements with full styling

### Advanced Features

- **Element Properties**: Adjust position, opacity, z-index, and volume per layer
- **Split & Duplicate**: Quickly manipulate timeline elements
- **Keyboard Shortcuts**: Fast workflow with play/pause, timeline navigation, split (S), duplicate (D)
- **Project Management**: Create, save, and manage multiple projects locally
- **Export Options**: Render to MP4 with quality/speed presets (up to 1080p)

### Data Persistence

- **IndexedDB Storage**: Projects stored locally in your browser's database
- **Auto-save**: Changes are automatically saved as you work
- **Fast Loading**: Instant access to all your projects

---

## Installation

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Bun** (recommended) or npm/yarn/pnpm

  ```bash
  # Install Bun (macOS/Linux)
  curl -fsSL https://bun.sh/install | bash

  # Or use npm (comes with Node.js)
  ```

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/NaniSkinner/clipforge.git
   cd clipforge
   ```

2. **Install dependencies**

   ```bash
   bun install
   # or: npm install
   ```

3. **Run in development mode**

   ```bash
   bun run electron:dev
   # or: npm run electron:dev
   ```

   This will:

   - Start the Next.js development server
   - Compile Electron TypeScript files
   - Launch the ClipForge desktop app with hot reloading

---

## Building

### Development

```bash
bun run electron:dev
```

Launches the app with DevTools open and hot module reloading.

### Production Build

Build installers for your platform:

```bash
# Build for your current OS
bun run electron:build

# Or build for specific platforms:
bun run electron:build:mac    # macOS (.dmg, .zip)
bun run electron:build:win    # Windows (.exe)
bun run electron:build:linux  # Linux (.AppImage, .deb)
```

Installers will be created in the `dist/` directory.

---

## Project Structure

```
clipforge/
├── app/                      # Next.js App Router
│   ├── (pages)/             # Page routes
│   │   └── projects/[id]/   # Dynamic project editor
│   ├── components/          # React components
│   │   ├── editor/          # Core editor components
│   │   │   ├── RecordingPanel/  # Screen/webcam/PiP recording
│   │   │   ├── timeline/        # Timeline & playhead
│   │   │   ├── player/          # Remotion preview player
│   │   │   └── render/          # FFmpeg export
│   ├── store/              # Redux state management
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (audio, camera, storage)
│   └── globals.css         # Tailwind v4 config
├── electron/                # Electron source
│   ├── main.ts             # Main process
│   ├── preload.ts          # Preload script (IPC bridge)
│   ├── recording/          # Screen capture & permissions
│   └── utils/              # Native FFmpeg integration
├── public/                  # Static assets
├── electron-builder.json    # Build configuration
├── next.config.js          # Next.js config (standalone mode)
└── package.json            # Dependencies & scripts
```

---

## Architecture

### Electron + Next.js Integration

ClipForge uses a **custom Electron integration** (not Nextron) to support Next.js 15:

- **Renderer Process**: Next.js 15.5 app with React 19
- **Main Process**: Electron manages windows, lifecycle, and system integration
- **Standalone Output**: Next.js builds a self-contained server bundled with Electron
- **Dynamic Routes**: `/projects/[id]` loads project data from IndexedDB at runtime

### Why Not Nextron?

Nextron v9.x doesn't support Next.js 15 ([GitHub issue #520](https://github.com/saltyshiomix/nextron/issues/520)). Our custom integration provides:

- Full Next.js 15 & React 19 support
- Better control over build process
- Simpler configuration
- Modern tooling (Bun, Tailwind v4)

### Data Flow

**Recording Workflow:**

1. User selects recording mode (Screen/Webcam/PiP) in RecordingPanel
2. Electron main process handles screen/camera permissions via IPC
3. MediaRecorder captures streams, stores chunks in memory
4. On stop, video Blob saved to IndexedDB via recording-storage lib
5. Recorded video automatically added to project assets

**Editing Workflow:**

1. User interacts with Next.js UI in Electron window
2. Video editing operations update Redux state
3. Projects auto-save to IndexedDB (browser storage API)
4. Dynamic routes load project data at runtime
5. Remotion generates real-time preview
6. Native FFmpeg (via Electron IPC) renders final video export

---

## Development Notes

### Key Configuration

- **Sandbox disabled** in Electron to support IndexedDB and native recording APIs
- **Context isolation enabled** for security (preload script bridges main/renderer)
- **Native FFmpeg binaries** bundled via ffmpeg-static for fast, reliable exports
- **Standalone output** bundles minimal Next.js server with Electron
- **No static export** - dynamic routes require runtime server

### Debugging

- DevTools auto-open in development mode
- Check `electron/dist/` for compiled main process
- Use Redux DevTools for state inspection
- Console logs appear in both terminal and DevTools

---

## Contributing

Contributions are welcome! This project was built as part of Gauntlet Cohort 3, but improvements and bug fixes are always appreciated.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Technical Highlights

### Modern Stack

- **React 19**: Latest React with improved performance
- **Next.js 15**: App Router, Turbopack (dev), standalone builds
- **Tailwind v4**: CSS-first configuration with `@theme` directive
- **TypeScript 5.9**: Full type safety across the stack

### Performance

- **Native FFmpeg**: 10-100x faster than WASM with no memory constraints
- **IndexedDB**: Fast local storage for projects and media metadata
- **Remotion**: Efficient real-time video composition
- **Hot Reloading**: Fast development iteration

### Cross-Platform

- **macOS**: Native .dmg and .zip installers
- **Windows**: NSIS installer and portable .exe
- **Linux**: AppImage and .deb packages

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgments

- **Gauntlet Cohort 3** for the challenge and learning opportunity
- **Remotion** for the incredible video composition framework
- **FFmpeg** team for their powerful multimedia framework
- The open-source community for amazing tools and libraries

---

## Author

**Nani Skinner**

- GitHub: [@NaniSkinner](https://github.com/NaniSkinner)
- X/Twitter: [@NaniSkinner](https://x.com/NaniSkinner)

Built for Gauntlet Cohort 3 • Week 3 Project

---

<div align="center">

**[⬆ Back to Top](#clipforge)**

</div>
