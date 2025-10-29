/**
 * Camera Device Management
 *
 * Handles webcam/camera device enumeration, permissions, and capabilities.
 * Provides utilities for camera device selection and configuration.
 */

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: "videoinput";
  groupId: string;
  facingMode?: "user" | "environment";
}

export interface CameraCapabilities {
  width: { min: number; max: number };
  height: { min: number; max: number };
  frameRate: { min: number; max: number };
}

/**
 * Get all available camera/video input devices
 * @returns Array of camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
        kind: "videoinput" as const,
        groupId: device.groupId,
        // Try to detect facing mode from label (heuristic)
        facingMode:
          device.label?.toLowerCase().includes("front") ||
          device.label?.toLowerCase().includes("facetime")
            ? "user"
            : device.label?.toLowerCase().includes("back")
            ? "environment"
            : undefined,
      }));
  } catch (error) {
    console.error("Failed to enumerate camera devices:", error);
    return [];
  }
}

/**
 * Request camera permission from the user
 * @returns Promise that resolves to true if permission granted
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    // Stop the stream immediately - we just needed permission
    stream.getTracks().forEach((track) => track.stop());

    return true;
  } catch (error) {
    console.error("Camera permission denied:", error);
    return false;
  }
}

/**
 * Check current camera permission status
 * Note: This is a best-effort check. Full permission state API not widely supported.
 * @returns Permission status string
 */
export async function checkCameraPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  try {
    // Try to get permission state if API is available
    if ("permissions" in navigator) {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      return result.state as "granted" | "denied" | "prompt";
    }

    // Fallback: Use getCameraDevices to check if we have permission
    const cameras = await getCameraDevices();

    // If we have labels, we likely have permission
    if (cameras.length > 0 && cameras[0].label) {
      return "granted";
    }

    // If we have devices but no labels, permission not granted yet
    return "prompt";
  } catch (error) {
    console.error("Failed to check camera permission:", error);
    return "denied";
  }
}

/**
 * Watch for camera device changes (hot-plug detection)
 * @param callback Function to call when devices change
 * @returns Cleanup function to stop watching
 */
export function watchCameraDeviceChanges(callback: () => void): () => void {
  const handleDeviceChange = () => {
    console.log("Camera devices changed");
    callback();
  };

  navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

  return () => {
    navigator.mediaDevices.removeEventListener(
      "devicechange",
      handleDeviceChange
    );
  };
}

/**
 * Get the default/first available camera
 * @returns First camera device or null if none available
 */
export async function getDefaultCamera(): Promise<CameraDevice | null> {
  const cameras = await getCameraDevices();
  return cameras.length > 0 ? cameras[0] : null;
}

/**
 * Check if any cameras are available
 * @returns True if at least one camera is available
 */
export async function isCameraAvailable(): Promise<boolean> {
  const cameras = await getCameraDevices();
  return cameras.length > 0;
}

/**
 * Get camera capabilities for a specific device
 * Note: This requires an active stream to query capabilities
 * @param deviceId Camera device ID
 * @returns Camera capabilities or null if unavailable
 */
export async function getCameraCapabilities(
  deviceId: string
): Promise<CameraCapabilities | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId },
    });

    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    // Stop the stream
    stream.getTracks().forEach((t) => t.stop());

    if (
      !capabilities.width ||
      !capabilities.height ||
      !capabilities.frameRate
    ) {
      return null;
    }

    return {
      width: {
        min: (capabilities.width as any).min || 640,
        max: (capabilities.width as any).max || 1920,
      },
      height: {
        min: (capabilities.height as any).min || 480,
        max: (capabilities.height as any).max || 1080,
      },
      frameRate: {
        min: (capabilities.frameRate as any).min || 15,
        max: (capabilities.frameRate as any).max || 60,
      },
    };
  } catch (error) {
    console.error("Failed to get camera capabilities:", error);
    return null;
  }
}

/**
 * Test if a camera device is still available
 * @param deviceId Camera device ID to test
 * @returns True if the camera is still available
 */
export async function isCameraStillAvailable(
  deviceId: string
): Promise<boolean> {
  const cameras = await getCameraDevices();
  return cameras.some((camera) => camera.deviceId === deviceId);
}
