import { useState, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  addRecordedChunk,
  setMediaRecorder,
  setError,
  stopRecording,
  setCurrentScreen,
  addRecording,
} from "../store/slices/recordingSlice";
import { RecordingMetadata } from "../types";
import {
  RECORDING_CONSTANTS,
  RECORDING_MESSAGES,
} from "../components/editor/RecordingPanel/constants";
import { getBestSupportedCodec } from "../lib/recording-validation";
import { saveRecording } from "../lib/recording-storage";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

interface UseRecordingSessionReturn {
  startRecording: (sourceId: string) => Promise<void>;
  stopRecordingAndSave: () => Promise<RecordingMetadata | null>;
  cancelRecording: () => void;
  isRecording: boolean;
  error: string | null;
}

/**
 * useRecordingSession Hook
 *
 * Manages the MediaRecorder lifecycle for screen recording
 */
export function useRecordingSession(): UseRecordingSessionReturn {
  const dispatch = useAppDispatch();
  const { startTime } = useAppSelector((state) => state.recording);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /**
   * Start recording from a specific source
   */
  const startRecording = useCallback(
    async (sourceId: string) => {
      try {
        setErrorState(null);

        // Get the best supported codec
        const mimeType = getBestSupportedCodec();
        if (!mimeType) {
          throw new Error("No supported video codec found");
        }

        // Get media stream from Electron using getUserMedia
        // The sourceId comes from desktopCapturer
        const constraints: any = {
          audio: false, // Phase 1: no audio
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              minWidth: RECORDING_CONSTANTS.DEFAULT_RESOLUTION.width,
              maxWidth: RECORDING_CONSTANTS.DEFAULT_RESOLUTION.width,
              minHeight: RECORDING_CONSTANTS.DEFAULT_RESOLUTION.height,
              maxHeight: RECORDING_CONSTANTS.DEFAULT_RESOLUTION.height,
              minFrameRate: RECORDING_CONSTANTS.DEFAULT_FPS,
              maxFrameRate: RECORDING_CONSTANTS.DEFAULT_FPS,
            },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;

        // Create MediaRecorder
        const options = {
          mimeType,
          videoBitsPerSecond: RECORDING_CONSTANTS.VIDEO_BITRATE,
        };

        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        // Handle data available
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
            dispatch(addRecordedChunk(event.data));
          }
        };

        // Handle recording stop
        recorder.onstop = () => {
          console.log("[Recording] MediaRecorder stopped");
        };

        // Handle errors
        recorder.onerror = (event: any) => {
          console.error("[Recording] MediaRecorder error:", event);
          const errorMsg = "Recording error occurred";
          setErrorState(errorMsg);
          dispatch(setError(errorMsg));
          cleanupRecording();
        };

        // Start recording
        recorder.start(1000); // Collect data every second
        setIsRecording(true);
        dispatch(setMediaRecorder(recorder));

        console.log("[Recording] Started with codec:", mimeType);
        toast.success(RECORDING_MESSAGES.RECORDING_STARTED);

        // Auto-stop at max duration
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            console.log("[Recording] Auto-stopping at max duration");
            toast(RECORDING_MESSAGES.MAX_DURATION_REACHED);
            stopRecordingAndSave();
          }
        }, RECORDING_CONSTANTS.MAX_DURATION);
      } catch (err: any) {
        console.error("[Recording] Failed to start:", err);
        const errorMsg = err.message || "Failed to start recording";
        setErrorState(errorMsg);
        dispatch(setError(errorMsg));
        cleanupRecording();
        throw err;
      }
    },
    [dispatch]
  );

  /**
   * Stop recording and save to storage
   */
  const stopRecordingAndSave =
    useCallback(async (): Promise<RecordingMetadata | null> => {
      try {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          return null;
        }

        // Stop the recorder
        recorder.stop();
        setIsRecording(false);
        dispatch(stopRecording());

        // Wait a bit for final dataavailable event
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Combine chunks into single blob
        const videoBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });

        console.log(
          `[Recording] Combined ${chunksRef.current.length} chunks into ${(
            videoBlob.size /
            1024 /
            1024
          ).toFixed(2)} MB blob`
        );

        // Calculate actual recording duration
        const recordingDuration = startTime ? Date.now() - startTime : 0;

        // Generate metadata
        const recordingId = uuidv4();
        const now = Date.now();
        const metadata: RecordingMetadata = {
          id: recordingId,
          name: `Screen Recording ${new Date(now).toLocaleString()}`,
          type: "screen",
          duration: recordingDuration, // Duration in milliseconds
          size: videoBlob.size,
          createdAt: now,
          resolution: RECORDING_CONSTANTS.DEFAULT_RESOLUTION,
          fps: RECORDING_CONSTANTS.DEFAULT_FPS,
        };

        // Save to IndexedDB
        await saveRecording(recordingId, metadata, videoBlob);

        // Update Redux store
        dispatch(addRecording(metadata));
        dispatch(setCurrentScreen("success"));

        toast.success(RECORDING_MESSAGES.RECORDING_STOPPED);

        // Clean up
        cleanupRecording();

        // Auto-close panel after 2 seconds
        setTimeout(() => {
          dispatch(setCurrentScreen("mode-selector"));
        }, 2000);

        return metadata;
      } catch (err: any) {
        console.error("[Recording] Failed to save:", err);
        const errorMsg =
          err.message === "STORAGE_QUOTA_EXCEEDED"
            ? "Storage full. Please delete old recordings."
            : "Failed to save recording";
        setErrorState(errorMsg);
        dispatch(setError(errorMsg));
        toast.error(errorMsg);
        cleanupRecording();
        return null;
      }
    }, [dispatch]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    setIsRecording(false);
    cleanupRecording();
    dispatch(stopRecording());
    dispatch(setCurrentScreen("screen-selector"));
  }, [dispatch]);

  /**
   * Clean up media stream and recorder
   */
  const cleanupRecording = () => {
    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Clear recorder
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  return {
    startRecording,
    stopRecordingAndSave,
    cancelRecording,
    isRecording,
    error,
  };
}
