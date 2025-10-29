"use client";
import { useRecordingTimer } from "../../../hooks/useRecordingTimer";
import { RECORDING_CONSTANTS } from "./constants";

interface RecordingTimerProps {
  startTime: number | null;
  isRecording: boolean;
}

/**
 * RecordingTimer Component
 *
 * Displays elapsed time and progress bar during recording
 */
export default function RecordingTimer({
  startTime,
  isRecording,
}: RecordingTimerProps) {
  const { elapsedFormatted, progress, isNearEnd } = useRecordingTimer(
    startTime,
    isRecording
  );

  const maxTimeFormatted = "05:00"; // 5 minutes max

  // Color based on progress
  const getProgressColor = () => {
    if (progress >= 90) return "bg-red-500";
    if (progress >= 75) return "bg-orange-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-2">
      {/* Time Display */}
      <div className="flex items-center justify-between text-sm">
        <span
          className={`font-mono ${
            isNearEnd ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {elapsedFormatted}
        </span>
        <span className="text-gray-500 font-mono">{maxTimeFormatted}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${getProgressColor()}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Warning when near end */}
      {isNearEnd && (
        <p className="text-xs text-orange-400 animate-pulse">
          Recording will auto-stop at 5:00
        </p>
      )}
    </div>
  );
}
