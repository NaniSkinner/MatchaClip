/**
 * Permissions Module
 *
 * Handles screen recording permission checks for macOS
 */

import { systemPreferences } from "electron";
import { PermissionStatus } from "./types";

/**
 * Check screen recording permission status
 *
 * Note: On macOS, we can't programmatically request screen recording permission.
 * The user must grant it in System Preferences.
 *
 * @returns Promise resolving to permission status
 */
export async function checkScreenRecordingPermission(): Promise<PermissionStatus> {
  try {
    // On macOS, check media access permission
    if (process.platform === "darwin") {
      const status = systemPreferences.getMediaAccessStatus("screen");

      if (status === "granted") {
        return {
          granted: true,
          canRequest: false,
        };
      }

      if (status === "denied") {
        return {
          granted: false,
          canRequest: false,
          message:
            "Screen recording permission denied. Please enable it in System Preferences > Privacy & Security > Screen Recording",
        };
      }

      // Status is "not-determined" or "restricted"
      return {
        granted: false,
        canRequest: true,
        message:
          "Screen recording permission not yet determined. The system will prompt you when you attempt to record.",
      };
    }

    // On other platforms, assume permission is granted
    return {
      granted: true,
      canRequest: false,
    };
  } catch (error) {
    console.error(
      "[Permissions] Error checking screen recording permission:",
      error
    );
    return {
      granted: false,
      canRequest: false,
      message: "Unable to check screen recording permission",
    };
  }
}

/**
 * Request screen recording permission
 *
 * Note: On macOS, this cannot directly request permission.
 * The permission dialog appears when the user first attempts to use desktopCapturer.
 *
 * @returns Promise resolving to permission status
 */
export async function requestScreenRecordingPermission(): Promise<PermissionStatus> {
  // Simply return current status
  // The actual permission request happens when desktopCapturer is first used
  return await checkScreenRecordingPermission();
}
