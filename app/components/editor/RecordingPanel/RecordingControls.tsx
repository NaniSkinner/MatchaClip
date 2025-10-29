"use client";
import { Square } from "lucide-react";
import { useAppSelector } from "../../../store";
import RecordingTimer from "./RecordingTimer";

interface RecordingControlsProps {
  onStop: () => void;
}

/**
 * RecordingControls Component
 *
 * Shows recording status, timer, and stop button
 */
export default function RecordingControls({ onStop }: RecordingControlsProps) {
  const { isRecording, startTime, selectedSource } = useAppSelector(
    (state) => state.recording
  );

  return (
    <div className="space-y-6">
      {/* Recording Indicator */}
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400">REC</span>
        <span className="text-sm text-gray-400">Recording...</span>
      </div>

      {/* Source Info */}
      {selectedSource && (
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Recording Source</p>
          <p className="text-sm text-white truncate">{selectedSource.name}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase">
            {selectedSource.type}
          </p>
        </div>
      )}

      {/* Timer */}
      {isRecording && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Duration</p>
          <RecordingTimer startTime={startTime} isRecording={isRecording} />
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
