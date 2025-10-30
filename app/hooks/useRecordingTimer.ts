import { useEffect, useState } from "react";
import { RECORDING_CONSTANTS } from "../components/editor/RecordingPanel/constants";

interface UseRecordingTimerReturn {
  elapsedTime: number; // milliseconds (total elapsed)
  recordingTime: number; // milliseconds (actual recording time, excluding paused)
  elapsedFormatted: string; // "MM:SS"
  recordingFormatted: string; // "MM:SS" (actual recording time)
  progress: number; // 0-100 (based on recording time)
  timeRemaining: number; // milliseconds
  isNearEnd: boolean; // true when < 30 seconds remaining
}

/**
 * useRecordingTimer Hook
 *
 * Manages recording timer state and formatting
 * Phase 4: Excludes paused duration from recording time
 */
export function useRecordingTimer(
  startTime: number | null,
  isRecording: boolean,
  isPaused: boolean,
  totalPausedDuration: number,
  maxDuration: number = RECORDING_CONSTANTS.MAX_DURATION
): UseRecordingTimerReturn {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isRecording || !startTime) {
      setElapsedTime(0);
      return;
    }

    // Don't update timer while paused
    if (isPaused) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
    }, 100); // Update every 100ms for smoother progress bar

    return () => clearInterval(interval);
  }, [isRecording, isPaused, startTime]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate actual recording time (exclude paused duration)
  const recordingTime = Math.max(0, elapsedTime - totalPausedDuration);

  // Progress and time remaining based on recording time (not elapsed time)
  const progress = Math.min((recordingTime / maxDuration) * 100, 100);
  const timeRemaining = Math.max(0, maxDuration - recordingTime);
  const isNearEnd = timeRemaining < 30000; // Less than 30 seconds

  return {
    elapsedTime,
    recordingTime,
    elapsedFormatted: formatTime(elapsedTime),
    recordingFormatted: formatTime(recordingTime),
    progress,
    timeRemaining,
    isNearEnd,
  };
}
