/**
 * Audio Device Enumeration Module
 *
 * Handles detection and enumeration of audio input devices
 */

import { AudioDevice } from "../types";

/**
 * Get all available audio input devices
 * @returns Promise<AudioDevice[]> - list of audio input devices
 */
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label:
          device.label ||
          `Microphone ${index + 1} (${device.deviceId.slice(0, 8)})`,
        kind: device.kind as "audioinput",
        groupId: device.groupId,
      }));
  } catch (error) {
    console.error("Failed to enumerate audio devices:", error);
    return [];
  }
}

/**
 * Watch for audio device changes (plug/unplug)
 * @param callback - Function to call when devices change
 * @returns Cleanup function to remove listener
 */
export function watchAudioDeviceChanges(callback: () => void): () => void {
  navigator.mediaDevices.addEventListener("devicechange", callback);

  return () => {
    navigator.mediaDevices.removeEventListener("devicechange", callback);
  };
}

/**
 * Get default audio input device
 * @returns Promise<AudioDevice | null>
 */
export async function getDefaultAudioDevice(): Promise<AudioDevice | null> {
  const devices = await getAudioInputDevices();

  if (devices.length === 0) return null;

  // Look for default device (empty deviceId means default)
  const defaultDevice = devices.find((d) => d.deviceId === "default");
  if (defaultDevice) return defaultDevice;

  // Otherwise return first device
  return devices[0];
}

/**
 * Check if any audio input devices are available
 */
export async function hasAudioInputDevices(): Promise<boolean> {
  const devices = await getAudioInputDevices();
  return devices.length > 0;
}
