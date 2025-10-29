/**
 * Audio Permissions Module
 *
 * Handles microphone permission requests and validation
 */

export enum AudioPermissionError {
  DENIED = "PERMISSION_DENIED",
  NOT_FOUND = "DEVICE_NOT_FOUND",
  NOT_ALLOWED = "NOT_ALLOWED_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
}

/**
 * Request microphone permission from the user
 * @returns Promise<boolean> - true if permission granted
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    // Request permission by attempting to access microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Immediately stop the stream - we just needed permission
    stream.getTracks().forEach((track) => track.stop());

    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return false;
  }
}

/**
 * Check if microphone permission has been granted
 * Uses the Permissions API if available
 */
export async function checkMicrophonePermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  try {
    // Try using Permissions API
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return result.state as "granted" | "denied" | "prompt";
    }

    // Fallback: Try to enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasLabels = devices.some(
      (device) => device.kind === "audioinput" && device.label !== ""
    );

    // If we have labels, permission was granted
    return hasLabels ? "granted" : "prompt";
  } catch (error) {
    console.error("Error checking microphone permission:", error);
    return "prompt";
  }
}
