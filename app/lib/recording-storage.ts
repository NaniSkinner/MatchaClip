/**
 * Recording Storage Layer
 *
 * Handles IndexedDB storage for screen recordings
 */

import { openDB, IDBPDatabase } from "idb";
import { RecordingMetadata } from "../types";

const DB_NAME = "clipforge-recordings";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

interface RecordingDB {
  id: string;
  metadata: RecordingMetadata;
  blob: Blob;
  thumbnailBlob?: Blob;
  createdAt: number;
  updatedAt: number;
}

/**
 * Initialize the recordings database
 */
async function initDB(): Promise<IDBPDatabase> {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    },
  });
}

/**
 * Save a recording to IndexedDB
 */
export async function saveRecording(
  id: string,
  metadata: RecordingMetadata,
  blob: Blob,
  thumbnailBlob?: Blob
): Promise<void> {
  try {
    const db = await initDB();
    const now = Date.now();

    const recording: RecordingDB = {
      id,
      metadata,
      blob,
      thumbnailBlob,
      createdAt: now,
      updatedAt: now,
    };

    await db.put(STORE_NAME, recording);
    console.log(
      `[Storage] Saved recording: ${id} (${(blob.size / 1024 / 1024).toFixed(
        2
      )} MB)`
    );
  } catch (error: any) {
    if (error.name === "QuotaExceededError") {
      throw new Error("STORAGE_QUOTA_EXCEEDED");
    }
    console.error("[Storage] Error saving recording:", error);
    throw error;
  }
}

/**
 * Get a recording from IndexedDB
 */
export async function getRecording(id: string): Promise<RecordingDB | null> {
  try {
    const db = await initDB();
    const recording = await db.get(STORE_NAME, id);
    return recording || null;
  } catch (error) {
    console.error("[Storage] Error getting recording:", error);
    return null;
  }
}

/**
 * Get all recordings metadata (without blobs)
 */
export async function getAllRecordingsMetadata(): Promise<RecordingMetadata[]> {
  try {
    const db = await initDB();
    const recordings = await db.getAll(STORE_NAME);

    // Return only metadata, sorted by creation date (newest first)
    return recordings
      .map((rec) => rec.metadata)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("[Storage] Error getting recordings metadata:", error);
    return [];
  }
}

/**
 * Delete a recording from IndexedDB
 */
export async function deleteRecording(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
    console.log(`[Storage] Deleted recording: ${id}`);
  } catch (error) {
    console.error("[Storage] Error deleting recording:", error);
    throw error;
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageUsage(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  available: boolean;
}> {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        usedBytes: 0,
        quotaBytes: 0,
        percentUsed: 0,
        available: true,
      };
    }

    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage || 0;
    const quotaBytes = estimate.quota || 0;
    const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
    const available = percentUsed < 95; // Block at 95% capacity

    return {
      usedBytes,
      quotaBytes,
      percentUsed,
      available,
    };
  } catch (error) {
    console.error("[Storage] Error getting storage usage:", error);
    return {
      usedBytes: 0,
      quotaBytes: 0,
      percentUsed: 0,
      available: true,
    };
  }
}

/**
 * Check if there's enough storage quota for a recording
 */
export async function checkStorageQuota(estimatedSize: number): Promise<{
  available: boolean;
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  message?: string;
}> {
  const usage = await getStorageUsage();

  if (!usage.available) {
    return {
      ...usage,
      message:
        "Storage is almost full (95% capacity). Please delete old recordings.",
    };
  }

  const remainingBytes = usage.quotaBytes - usage.usedBytes;

  if (estimatedSize > remainingBytes) {
    return {
      ...usage,
      available: false,
      message: `Insufficient storage. Need ${(
        estimatedSize /
        1024 /
        1024
      ).toFixed(0)} MB, have ${(remainingBytes / 1024 / 1024).toFixed(
        0
      )} MB available.`,
    };
  }

  return {
    ...usage,
    available: true,
  };
}

/**
 * Update recording metadata (e.g., rename)
 */
export async function updateRecordingMetadata(
  id: string,
  updates: Partial<RecordingMetadata>
): Promise<void> {
  try {
    const db = await initDB();
    const recording = await db.get(STORE_NAME, id);

    if (!recording) {
      throw new Error(`Recording not found: ${id}`);
    }

    recording.metadata = {
      ...recording.metadata,
      ...updates,
    };
    recording.updatedAt = Date.now();

    await db.put(STORE_NAME, recording);
    console.log(`[Storage] Updated recording metadata: ${id}`);
  } catch (error) {
    console.error("[Storage] Error updating recording metadata:", error);
    throw error;
  }
}
