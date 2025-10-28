export interface VideoMetadata {
  format: string;
  codec?: string;
  resolution: string;
  duration: number;
  fileSize: number;
  width: number;
  height: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: VideoMetadata;
}

/**
 * Validates a video file and extracts metadata
 * @param file - The file to validate
 * @returns ValidationResult with errors, warnings, and metadata
 */
export async function validateVideoFile(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file extension
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const validExtensions = [".mp4", ".mov"];
  if (!validExtensions.includes(extension)) {
    errors.push(
      `Invalid file extension: ${extension}. Only MP4 and MOV files are supported.`
    );
  }

  // Check MIME type
  const validMimeTypes = ["video/mp4", "video/quicktime"];
  if (!validMimeTypes.includes(file.type)) {
    errors.push(
      `Invalid MIME type: ${file.type}. Expected video/mp4 or video/quicktime.`
    );
  }

  // Check file size (2GB limit)
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
  if (file.size > maxSize) {
    errors.push(
      `File size (${formatFileSize(file.size)}) exceeds maximum limit of 2GB.`
    );
  } else if (file.size > 1 * 1024 * 1024 * 1024) {
    // Warn for files over 1GB
    warnings.push(
      `Large file size: ${formatFileSize(
        file.size
      )}. This may take longer to process.`
    );
  }

  // Check if file is not empty
  if (file.size === 0) {
    errors.push("File is empty.");
  }

  // If we already have errors, don't bother extracting metadata
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  // Extract video metadata
  try {
    const metadata = await extractVideoMetadata(file);

    // Check if video has valid dimensions
    if (metadata.width === 0 || metadata.height === 0) {
      errors.push("Video has invalid dimensions (0x0).");
    }

    // Check if video has valid duration
    if (metadata.duration === 0 || !isFinite(metadata.duration)) {
      errors.push("Video has invalid duration.");
    }

    // Warn about very high resolutions
    if (metadata.width > 3840 || metadata.height > 2160) {
      warnings.push(
        `Very high resolution (${metadata.resolution}). Export may be slow.`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  } catch (error) {
    errors.push("Unable to read video file. It may be corrupted.");
    return {
      valid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Extracts metadata from a video file using a temporary video element
 * @param file - The video file
 * @returns VideoMetadata
 */
async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    let metadataLoaded = false;

    const timeout = setTimeout(() => {
      if (!metadataLoaded) {
        URL.revokeObjectURL(url);
        video.remove();
        reject(new Error("Timeout waiting for video metadata"));
      }
    }, 5000); // 5 second timeout

    video.onloadedmetadata = () => {
      metadataLoaded = true;
      clearTimeout(timeout);

      const metadata: VideoMetadata = {
        format: file.type,
        resolution: `${video.videoWidth}x${video.videoHeight}`,
        duration: video.duration,
        fileSize: file.size,
        width: video.videoWidth,
        height: video.videoHeight,
      };

      // Clean up
      URL.revokeObjectURL(url);
      video.remove();

      resolve(metadata);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.remove();
      reject(new Error("Error loading video metadata"));
    };

    video.preload = "metadata";
    video.src = url;
  });
}

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 GB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validates multiple files at once
 * @param files - Array of files to validate
 * @returns Array of validation results
 */
export async function validateMultipleFiles(
  files: File[]
): Promise<ValidationResult[]> {
  return Promise.all(files.map((file) => validateVideoFile(file)));
}
