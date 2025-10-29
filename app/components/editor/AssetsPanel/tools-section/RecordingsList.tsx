"use client";
import { useEffect, useState } from "react";
import { Trash2, Download, Video, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../../store";
import {
  setRecordings,
  removeRecording,
} from "../../../../store/slices/recordingSlice";
import { setMediaFiles } from "../../../../store/slices/projectSlice";
import { storeFile } from "../../../../store";
import {
  getAllRecordingsMetadata,
  getRecording,
  deleteRecording,
} from "../../../../lib/recording-storage";
import { RecordingMetadata } from "../../../../types";
import toast from "react-hot-toast";

/**
 * RecordingsList Component
 *
 * Displays saved screen recordings in the Assets Library
 * Allows adding to timeline and deleting recordings
 */
export default function RecordingsList() {
  const dispatch = useAppDispatch();
  const recordings = useAppSelector((state) => state.recording.recordings);
  const { mediaFiles } = useAppSelector((state) => state.projectState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      const recordingsList = await getAllRecordingsMetadata();
      dispatch(setRecordings(recordingsList));
    } catch (error) {
      console.error("[RecordingsList] Error loading recordings:", error);
      toast.error("Failed to load recordings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToTimeline = async (recording: RecordingMetadata) => {
    try {
      // Get the full recording from IndexedDB
      const fullRecording = await getRecording(recording.id);
      if (!fullRecording) {
        toast.error("Recording not found");
        return;
      }

      // Store the recording blob as a file in the main files storage
      const fileId = crypto.randomUUID();
      const mediaId = crypto.randomUUID();

      // Convert blob to File object for storage
      const file = new File([fullRecording.blob], recording.name, {
        type: fullRecording.blob.type || "video/webm",
      });

      await storeFile(file, fileId);

      // Create a blob URL for the video
      const blobUrl = URL.createObjectURL(fullRecording.blob);

      // Extract duration from the video
      let actualDuration = recording.duration / 1000 || 30; // Convert ms to seconds
      console.log(
        "[RecordingsList] Recording metadata duration:",
        recording.duration,
        "ms =",
        actualDuration,
        "seconds"
      );

      try {
        const videoElement = document.createElement("video");
        videoElement.preload = "metadata";
        videoElement.src = blobUrl;

        // Wait for video metadata to load with a longer timeout
        await new Promise<void>((resolve, reject) => {
          let resolved = false;

          videoElement.onloadedmetadata = () => {
            if (!resolved) {
              resolved = true;
              if (videoElement.duration && isFinite(videoElement.duration)) {
                actualDuration = videoElement.duration;
                console.log(
                  "[RecordingsList] Extracted video duration:",
                  actualDuration,
                  "seconds"
                );
              } else {
                console.warn(
                  "[RecordingsList] Video duration is invalid:",
                  videoElement.duration
                );
              }
              resolve();
            }
          };

          videoElement.onerror = (e) => {
            if (!resolved) {
              resolved = true;
              console.error(
                "[RecordingsList] Error loading video metadata:",
                e
              );
              resolve(); // Use fallback duration
            }
          };

          // Increase timeout to 10 seconds for larger files
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.warn(
                "[RecordingsList] Video metadata load timeout, using fallback duration"
              );
              resolve();
            }
          }, 10000);
        });
      } catch (error) {
        console.error(
          "[RecordingsList] Error extracting video duration:",
          error
        );
      }

      console.log(
        "[RecordingsList] Final duration to use:",
        actualDuration,
        "seconds"
      );

      // Find the last position of video clips on the timeline
      const videoClips = mediaFiles.filter((clip) => clip.type === "video");
      const lastEnd =
        videoClips.length > 0
          ? Math.max(...videoClips.map((f) => f.positionEnd))
          : 0;

      console.log(
        "[RecordingsList] Last video clip ends at:",
        lastEnd,
        "seconds"
      );
      console.log(
        "[RecordingsList] New clip will start at:",
        lastEnd,
        "and end at:",
        lastEnd + actualDuration
      );

      // Create the media file object
      const updatedMedia = [...mediaFiles];
      updatedMedia.push({
        id: mediaId,
        fileName: recording.name,
        fileId: fileId,
        startTime: 0,
        endTime: actualDuration,
        duration: actualDuration,
        src: blobUrl,
        positionStart: lastEnd,
        positionEnd: lastEnd + actualDuration,
        includeInMerge: true,
        x: 0,
        y: 0,
        width: recording.resolution.width,
        height: recording.resolution.height,
        rotation: 0,
        opacity: 100,
        crop: {
          x: 0,
          y: 0,
          width: recording.resolution.width,
          height: recording.resolution.height,
        },
        playbackSpeed: 1,
        volume: 100,
        type: "video",
        zIndex: 0,
      });

      dispatch(setMediaFiles(updatedMedia));
      toast.success("Recording added to timeline");
    } catch (error) {
      console.error("[RecordingsList] Error adding to timeline:", error);
      toast.error("Failed to add recording to timeline");
    }
  };

  const handleDelete = async (recording: RecordingMetadata) => {
    if (!confirm(`Delete "${recording.name}"?`)) {
      return;
    }

    try {
      await deleteRecording(recording.id);
      dispatch(removeRecording(recording.id));
      toast.success("Recording deleted");
    } catch (error) {
      console.error("[RecordingsList] Error deleting recording:", error);
      toast.error("Failed to delete recording");
    }
  };

  const handleDownload = async (recording: RecordingMetadata) => {
    try {
      const fullRecording = await getRecording(recording.id);
      if (!fullRecording) {
        toast.error("Recording not found");
        return;
      }

      // Create a download link
      const blobUrl = URL.createObjectURL(fullRecording.blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${recording.name}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast.success("Recording downloaded");
    } catch (error) {
      console.error("[RecordingsList] Error downloading recording:", error);
      toast.error("Failed to download recording");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-2" />
        <p className="text-xs text-gray-500">Loading recordings...</p>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-8">
        <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400 mb-1">No recordings yet</p>
        <p className="text-xs text-gray-600">
          Click the Record button to start
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recordings.map((recording) => (
        <div
          key={recording.id}
          className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
        >
          {/* Recording Info */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate font-medium">
                {recording.name}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatDate(recording.createdAt)}
                </span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-500">
                  {formatSize(recording.size)}
                </span>
              </div>
            </div>
          </div>

          {/* Resolution & FPS */}
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
              {recording.resolution.width}x{recording.resolution.height}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
              {recording.fps} FPS
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleAddToTimeline(recording)}
              className="flex-1 py-1.5 px-3 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium text-white transition-colors"
            >
              Add to Timeline
            </button>
            <button
              onClick={() => handleDownload(recording)}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              title="Download"
            >
              <Download size={14} className="text-gray-300" />
            </button>
            <button
              onClick={() => handleDelete(recording)}
              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
