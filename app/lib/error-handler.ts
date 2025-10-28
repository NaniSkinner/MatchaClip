import toast from "react-hot-toast";

export enum ImportErrorCode {
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  CORRUPTED_FILE = "CORRUPTED_FILE",
  READ_ERROR = "READ_ERROR",
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ImportError extends Error {
  code: ImportErrorCode;
  fileName?: string;
  context?: string;
}

/**
 * Creates an ImportError with the specified code and details
 */
export function createImportError(
  code: ImportErrorCode,
  message: string,
  fileName?: string,
  context?: string
): ImportError {
  const error = new Error(message) as ImportError;
  error.code = code;
  error.fileName = fileName;
  error.context = context;
  error.name = "ImportError";
  return error;
}

/**
 * Determines the error code from a generic error
 */
export function determineErrorCode(error: any): ImportErrorCode {
  // Check for specific error types
  if (error.name === "QuotaExceededError" || error.message?.includes("quota")) {
    return ImportErrorCode.STORAGE_QUOTA_EXCEEDED;
  }

  if (error.name === "NetworkError" || error.message?.includes("network")) {
    return ImportErrorCode.NETWORK_ERROR;
  }

  if (error.message?.includes("format") || error.message?.includes("type")) {
    return ImportErrorCode.UNSUPPORTED_FORMAT;
  }

  if (error.message?.includes("size") || error.message?.includes("large")) {
    return ImportErrorCode.FILE_TOO_LARGE;
  }

  if (
    error.message?.includes("corrupt") ||
    error.message?.includes("invalid")
  ) {
    return ImportErrorCode.CORRUPTED_FILE;
  }

  if (error.message?.includes("read") || error.message?.includes("access")) {
    return ImportErrorCode.READ_ERROR;
  }

  return ImportErrorCode.UNKNOWN_ERROR;
}

/**
 * Maps error codes to user-friendly messages
 */
export function getImportErrorMessage(code: ImportErrorCode): string {
  switch (code) {
    case ImportErrorCode.UNSUPPORTED_FORMAT:
      return "Unsupported file format. Please use MP4 or MOV files.";
    case ImportErrorCode.FILE_TOO_LARGE:
      return "File exceeds the maximum size limit of 2GB.";
    case ImportErrorCode.CORRUPTED_FILE:
      return "This video file appears to be corrupted or cannot be read.";
    case ImportErrorCode.READ_ERROR:
      return "Unable to read the file. Please check file permissions.";
    case ImportErrorCode.STORAGE_QUOTA_EXCEEDED:
      return "Storage quota exceeded. Please delete old projects or files to free up space.";
    case ImportErrorCode.NETWORK_ERROR:
      return "Network error occurred while importing the file.";
    case ImportErrorCode.UNKNOWN_ERROR:
      return "An unexpected error occurred while importing the file.";
    default:
      return "An error occurred during import.";
  }
}

/**
 * Gets recovery suggestions for an error code
 */
export function getRecoverySuggestion(code: ImportErrorCode): string | null {
  switch (code) {
    case ImportErrorCode.UNSUPPORTED_FORMAT:
      return "Convert your video to MP4 or MOV format using a video converter.";
    case ImportErrorCode.FILE_TOO_LARGE:
      return "Try compressing the video or splitting it into smaller files.";
    case ImportErrorCode.CORRUPTED_FILE:
      return "Try re-exporting the video from its original source.";
    case ImportErrorCode.STORAGE_QUOTA_EXCEEDED:
      return "Go to the projects page and delete old projects to free up space.";
    case ImportErrorCode.READ_ERROR:
      return "Ensure the file is not open in another program and try again.";
    case ImportErrorCode.NETWORK_ERROR:
      return "Check your internet connection and try again.";
    default:
      return null;
  }
}

/**
 * Main error handler for import operations
 * Logs the error and shows appropriate user notifications
 */
export function handleImportError(
  error: Error | ImportError,
  context?: string
): void {
  // Log error for debugging
  console.error("Import error:", {
    error,
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  });

  // Determine error code
  const errorCode = (error as ImportError).code || determineErrorCode(error);

  // Get user-friendly message
  const message = getImportErrorMessage(errorCode);
  const suggestion = getRecoverySuggestion(errorCode);
  const fileName = (error as ImportError).fileName;

  // Build notification message
  let notificationMessage = fileName ? `${fileName}: ${message}` : message;

  // Show error toast
  toast.error(notificationMessage, {
    duration: 5000,
  });

  // Show suggestion as a separate toast if available
  if (suggestion) {
    setTimeout(() => {
      toast(suggestion, {
        icon: "💡",
        duration: 7000,
      });
    }, 500);
  }
}

/**
 * Handles multiple import errors
 */
export function handleMultipleImportErrors(
  errors: Array<{ error: Error; fileName?: string }>
): void {
  if (errors.length === 0) return;

  if (errors.length === 1) {
    handleImportError(errors[0].error);
    return;
  }

  // Group errors by type
  const errorGroups = new Map<ImportErrorCode, number>();

  errors.forEach(({ error }) => {
    const code = (error as ImportError).code || determineErrorCode(error);
    errorGroups.set(code, (errorGroups.get(code) || 0) + 1);
  });

  // Show summary
  toast.error(`Failed to import ${errors.length} file(s)`, {
    duration: 4000,
  });

  // Show breakdown by error type
  errorGroups.forEach((count, code) => {
    const message = getImportErrorMessage(code);
    setTimeout(() => {
      toast(`${count} file(s): ${message}`, {
        icon: "ℹ️",
        duration: 5000,
      });
    }, 300);
  });
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleImportError(error as Error, context);
      return null;
    }
  };
}
