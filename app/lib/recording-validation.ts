/**
 * Recording Validation Layer
 *
 * Pre-flight checks before starting a recording
 */

import { RecordingMode } from "../types";
import { checkStorageQuota } from "./recording-storage";
import { RECORDING_CONSTANTS } from "../components/editor/RecordingPanel/constants";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all prerequisites before starting a recording
 */
export async function validateRecordingPrerequisites(
  mode: RecordingMode,
  sourceId?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if window.electronAPI exists
  if (typeof window === "undefined" || !window.electronAPI) {
    errors.push("Electron API not available. Recording requires Electron.");
    return { isValid: false, errors, warnings };
  }

  // Check screen recording permission (macOS only)
  try {
    const permissionStatus =
      await window.electronAPI.recording.checkPermission();

    if (!permissionStatus.granted) {
      if (permissionStatus.message) {
        errors.push(permissionStatus.message);
      } else {
        errors.push("Screen recording permission not granted.");
      }
    }
  } catch (error) {
    warnings.push(
      "Unable to check screen recording permission. Will attempt to record anyway."
    );
  }

  // Check storage quota
  const estimatedSize = estimateRecordingSize(RECORDING_CONSTANTS.MAX_DURATION);
  const storageCheck = await checkStorageQuota(estimatedSize);

  if (!storageCheck.available) {
    if (storageCheck.message) {
      errors.push(storageCheck.message);
    } else {
      errors.push("Insufficient storage space for recording.");
    }
  } else if (storageCheck.percentUsed > 80) {
    warnings.push(
      `Storage is ${storageCheck.percentUsed.toFixed(
        0
      )}% full. Consider freeing up space.`
    );
  }

  // Check MediaRecorder API support
  if (typeof MediaRecorder === "undefined") {
    errors.push("MediaRecorder API not supported in this browser.");
  } else {
    // Check codec support
    const codecSupported = RECORDING_CONSTANTS.PREFERRED_CODECS.some((codec) =>
      MediaRecorder.isTypeSupported(codec)
    );

    if (!codecSupported) {
      errors.push("No supported video codec found. Recording may not work.");
    }
  }

  // Validate source ID if provided
  if (mode === RecordingMode.SCREEN && sourceId) {
    // Source validation will happen during stream acquisition
    // No validation needed here
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Estimate recording size based on duration
 *
 * Rough estimate: 5 Mbps bitrate
 */
function estimateRecordingSize(durationMs: number): number {
  const durationSeconds = durationMs / 1000;
  const bitrate = RECORDING_CONSTANTS.VIDEO_BITRATE;
  const estimatedBytes = (bitrate / 8) * durationSeconds;

  // Add 10% buffer
  return estimatedBytes * 1.1;
}

/**
 * Validate screen source availability
 */
export async function validateScreenSource(sourceId: string): Promise<boolean> {
  try {
    const sources = await window.electronAPI.recording.getScreenSources();
    return sources.some((source) => source.id === sourceId);
  } catch (error) {
    console.error("[Validation] Error validating screen source:", error);
    return false;
  }
}

/**
 * Get best supported codec
 */
export function getBestSupportedCodec(): string | null {
  for (const codec of RECORDING_CONSTANTS.PREFERRED_CODECS) {
    if (MediaRecorder.isTypeSupported(codec)) {
      return codec;
    }
  }
  return null;
}
