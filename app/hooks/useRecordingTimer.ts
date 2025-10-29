import { useEffect, useState } from "react";
import { RECORDING_CONSTANTS } from "../components/editor/RecordingPanel/constants";

interface UseRecordingTimerReturn {
  elapsedTime: number; // milliseconds
  elapsedFormatted: string; // "MM:SS"
  progress: number; // 0-100
  timeRemaining: number; // milliseconds
  isNearEnd: boolean; // true when < 30 seconds remaining
}

/**
 * useRecordingTimer Hook
 *
 * Manages recording timer state and formatting
 */
export function useRecordingTimer(
  startTime: number | null,
  isRecording: boolean,
  maxDuration: number = RECORDING_CONSTANTS.MAX_DURATION
): UseRecordingTimerReturn {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isRecording || !startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(Math.min(elapsed, maxDuration));
    }, 100); // Update every 100ms for smoother progress bar

    return () => clearInterval(interval);
  }, [isRecording, startTime, maxDuration]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const progress = (elapsedTime / maxDuration) * 100;
  const timeRemaining = Math.max(0, maxDuration - elapsedTime);
  const isNearEnd = timeRemaining < 30000; // Less than 30 seconds

  return {
    elapsedTime,
    elapsedFormatted: formatTime(elapsedTime),
    progress,
    timeRemaining,
    isNearEnd,
  };
}
