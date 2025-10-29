/**
 * Screen Capture Module
 *
 * Handles screen and window capture using Electron's desktopCapturer API
 */

import { desktopCapturer } from "electron";
import { ElectronScreenSource } from "./types";

/**
 * Get available screen sources (screens and windows)
 *
 * @returns Promise resolving to array of screen sources with thumbnails
 */
export async function getScreenSources(): Promise<ElectronScreenSource[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: false,
    });

    const formattedSources: ElectronScreenSource[] = sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      type: source.id.startsWith("screen:") ? "screen" : "window",
    }));

    // Filter out empty or unnamed windows
    const validSources = formattedSources.filter(
      (source) => source.name && source.name.trim() !== ""
    );

    console.log(`[Screen Capture] Found ${validSources.length} valid sources`);
    return validSources;
  } catch (error) {
    console.error("[Screen Capture] Error getting screen sources:", error);
    throw new Error("Failed to get screen sources");
  }
}

/**
 * Validate a screen source ID
 *
 * @param sourceId - The source ID to validate
 * @returns Promise resolving to true if source is valid
 */
export async function validateScreenSource(sourceId: string): Promise<boolean> {
  try {
    const sources = await getScreenSources();
    return sources.some((source) => source.id === sourceId);
  } catch (error) {
    console.error("[Screen Capture] Error validating source:", error);
    return false;
  }
}
