"use client";
import { Square } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAppSelector } from "../../../store";
import RecordingTimer from "./RecordingTimer";
import { VUMeter } from "./VUMeter";

interface RecordingControlsProps {
  onStop: () => void;
}

/**
 * RecordingControls Component
 *
 * Shows recording status, timer, and stop button
 */
export default function RecordingControls({ onStop }: RecordingControlsProps) {
  const {
    isRecording,
    startTime,
    selectedSource,
    mode,
    webcamConfig,
    availableCameras,
    audioConfig,
    microphoneStream,
    systemAudioStream,
    webcamStream,
  } = useAppSelector((state) => state.recording);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Get the current camera name for display
  const currentCamera = availableCameras.find(
    (cam) => cam.deviceId === webcamConfig.selectedCameraId
  );

  // Set up webcam preview when in webcam recording mode
  useEffect(() => {
    if (mode === "webcam" && webcamStream && videoRef.current) {
      console.log("[RecordingControls] Setting up webcam preview");
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch((err) => {
        console.error(
          "[RecordingControls] Failed to play webcam preview:",
          err
        );
      });
    }

    return () => {
      // Don't stop the stream - it's being used for recording
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [mode, webcamStream]);

  return (
    <div className="space-y-6">
      {/* Recording Indicator */}
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400">REC</span>
        <span className="text-sm text-gray-400">Recording...</span>
      </div>

      {/* Source Info - Screen Recording */}
      {mode === "screen" && selectedSource && (
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Recording Source</p>
          <p className="text-sm text-white truncate">{selectedSource.name}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase">
            {selectedSource.type}
          </p>
        </div>
      )}

      {/* Source Info - Webcam Recording */}
      {mode === "webcam" && currentCamera && (
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Recording Source</p>
          <p className="text-sm text-white truncate">{currentCamera.label}</p>
          <p className="text-xs text-gray-500 mt-1">
            {webcamConfig.resolution.width}×{webcamConfig.resolution.height} @{" "}
            {webcamConfig.frameRate}fps
          </p>
        </div>
      )}

      {/* Webcam Live Preview (during recording) */}
      {mode === "webcam" && webcamStream && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Live Preview</p>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-700">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {/* Recording indicator overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-red-600/90 rounded text-xs font-medium text-white">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC
            </div>
          </div>
        </div>
      )}

      {/* Timer */}
      {isRecording && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Duration</p>
          <RecordingTimer startTime={startTime} isRecording={isRecording} />
        </div>
      )}

      {/* Audio Level Meters (During Recording) */}
      {isRecording && (microphoneStream || systemAudioStream) && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Audio Levels</p>

          {/* Microphone VU Meter */}
          {microphoneStream && audioConfig.microphoneEnabled && (
            <VUMeter stream={microphoneStream} label="Microphone" />
          )}

          {/* System Audio VU Meter */}
          {systemAudioStream && audioConfig.systemAudioEnabled && (
            <VUMeter stream={systemAudioStream} label="System Audio" />
          )}
        </div>
      )}

      {/* Stop Button */}
      <button
        onClick={onStop}
        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium text-white flex items-center justify-center space-x-2"
      >
        <Square size={18} fill="white" />
        <span>Stop Recording</span>
      </button>

      {/* Instructions */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400">
        <p className="font-medium mb-1">Keyboard Shortcuts:</p>
        <ul className="space-y-1">
          <li>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs mr-1">
              ⌘S
            </kbd>
            Stop recording
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs mr-1">
              ESC
            </kbd>
            Close (only when not recording)
          </li>
        </ul>
      </div>
    </div>
  );
}
