/**
 * Electron Recording Types
 *
 * Type definitions for Electron recording modules
 */

export interface ElectronScreenSource {
  id: string;
  name: string;
  thumbnail: string; // base64 data URL
  type: "screen" | "window";
}

export interface PermissionStatus {
  granted: boolean;
  canRequest: boolean;
  message?: string;
}
