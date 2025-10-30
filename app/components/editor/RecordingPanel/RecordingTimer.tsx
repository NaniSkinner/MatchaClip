"use client";
import { useRecordingTimer } from "../../../hooks/useRecordingTimer";
import { RECORDING_CONSTANTS } from "./constants";

interface RecordingTimerProps {
  startTime: number | null;
  isRecording: boolean;
  isPaused: boolean;
  totalPausedDuration: number;
}

/**
 * RecordingTimer Component
 *
 * Displays elapsed time and progress bar during recording
 * Phase 4: Shows actual recording time (excludes paused duration)
 */
export default function RecordingTimer({
  startTime,
  isRecording,
  isPaused,
  totalPausedDuration,
}: RecordingTimerProps) {
  const { recordingFormatted, progress, isNearEnd } = useRecordingTimer(
    startTime,
    isRecording,
    isPaused,
    totalPausedDuration
  );

  const maxTimeFormatted = "05:00"; // 5 minutes max

  // Color based on progress and paused state
  const getProgressColor = () => {
    if (isPaused) return "bg-yellow-500";
    if (progress >= 90) return "bg-red-500";
    if (progress >= 75) return "bg-orange-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Timer text color based on state
  const getTimerColor = () => {
    if (isPaused) return "text-yellow-400";
    if (isNearEnd) return "text-red-400 animate-pulse";
    return "text-white";
  };

  return (
    <div className="space-y-2">
      {/* Time Display */}
      <div className="flex items-center justify-between text-sm">
        <span className={`font-mono ${getTimerColor()}`}>
          {recordingFormatted}
          {isPaused && <span className="ml-2 text-xs">(Paused)</span>}
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
