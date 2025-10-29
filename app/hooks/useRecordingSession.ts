import { useState, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  addRecordedChunk,
  setMediaRecorder,
  setError,
  stopRecording,
  setCurrentScreen,
  addRecording,
  setMicrophoneStream,
  setSystemAudioStream,
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
  const { startTime, audioConfig } = useAppSelector((state) => state.recording);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemAudioStreamRef = useRef<MediaStream | null>(null);

  /**
   * Combine video and audio streams using Web Audio API
   */
  const combineStreams = async (
    videoStream: MediaStream,
    micStream: MediaStream | null,
    systemStream: MediaStream | null
  ): Promise<MediaStream> => {
    // Get video track
    const videoTrack = videoStream.getVideoTracks()[0];

    // If no audio streams, just return video
    if (!micStream && !systemStream) {
      return new MediaStream([videoTrack]);
    }

    // If only one audio source, combine it directly
    if (micStream && !systemStream) {
      const audioTrack = micStream.getAudioTracks()[0];
      return new MediaStream([videoTrack, audioTrack]);
    }

    if (!micStream && systemStream) {
      const audioTrack = systemStream.getAudioTracks()[0];
      return new MediaStream([videoTrack, audioTrack]);
    }

    // Mix both audio sources using Web Audio API
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const destination = audioContext.createMediaStreamDestination();

      // Add microphone with gain control
      if (micStream) {
        const micSource = audioContext.createMediaStreamSource(micStream);
        const micGain = audioContext.createGain();
        micGain.gain.value = audioConfig.microphoneGain / 100;
        micSource.connect(micGain);
        micGain.connect(destination);
      }

      // Add system audio with gain control
      if (systemStream) {
        const sysSource = audioContext.createMediaStreamSource(systemStream);
        const sysGain = audioContext.createGain();
        sysGain.gain.value = audioConfig.systemAudioGain / 100;
        sysSource.connect(sysGain);
        sysGain.connect(destination);
      }

      // Combine video with mixed audio
      const mixedAudioTrack = destination.stream.getAudioTracks()[0];
      return new MediaStream([videoTrack, mixedAudioTrack]);
    } catch (err) {
      console.error("[Recording] Failed to mix audio:", err);
      // Fallback: just use microphone if mixing fails
      const fallbackAudioTrack =
        micStream?.getAudioTracks()[0] || systemStream?.getAudioTracks()[0];
      return new MediaStream([videoTrack, fallbackAudioTrack!]);
    }
  };

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

        // Get screen stream from Electron using getUserMedia
        // The sourceId comes from desktopCapturer
        // Only request system audio if enabled (macOS feature)
        const constraints: any = {
          audio: audioConfig.systemAudioEnabled
            ? {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: sourceId,
                },
              }
            : false,
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

        const screenStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        // Extract system audio track from screen capture (macOS)
        const systemAudioTrack = screenStream.getAudioTracks()[0];
        if (systemAudioTrack && audioConfig.systemAudioEnabled) {
          const systemStream = new MediaStream([systemAudioTrack]);
          systemAudioStreamRef.current = systemStream;
          dispatch(setSystemAudioStream(systemStream));
          console.log("[Recording] System audio track captured");
        }

        // Get microphone stream if enabled
        let micStream: MediaStream | null = null;
        if (audioConfig.microphoneEnabled && audioConfig.selectedMicId) {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: audioConfig.selectedMicId,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false,
              },
            });
            micStreamRef.current = micStream;
            dispatch(setMicrophoneStream(micStream));
            console.log("[Recording] Microphone stream captured");
          } catch (err) {
            console.error("[Recording] Failed to capture microphone:", err);
            toast.error("Failed to capture microphone");
          }
        }

        // Combine video and audio streams
        const combinedStream = await combineStreams(
          screenStream,
          micStream,
          systemAudioTrack ? systemAudioStreamRef.current : null
        );

        mediaStreamRef.current = combinedStream;

        // Create MediaRecorder
        const options = {
          mimeType,
          videoBitsPerSecond: RECORDING_CONSTANTS.VIDEO_BITRATE,
        };

        const recorder = new MediaRecorder(combinedStream, options);
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
    [dispatch, audioConfig]
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

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      dispatch(setMicrophoneStream(null));
    }

    // Stop system audio stream
    if (systemAudioStreamRef.current) {
      systemAudioStreamRef.current.getTracks().forEach((track) => track.stop());
      systemAudioStreamRef.current = null;
      dispatch(setSystemAudioStream(null));
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
