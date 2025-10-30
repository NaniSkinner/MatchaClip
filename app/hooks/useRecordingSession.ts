import { useState, useCallback, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  addRecordedChunk,
  setMediaRecorder,
  setError,
  stopRecording,
  pauseRecording as pauseRecordingAction,
  resumeRecording as resumeRecordingAction,
  setCurrentScreen,
  addRecording,
  setMicrophoneStream,
  setSystemAudioStream,
  setRecordingStream,
} from "../store/slices/recordingSlice";
import { RecordingMetadata } from "../types";
import {
  RECORDING_CONSTANTS,
  RECORDING_MESSAGES,
} from "../components/editor/RecordingPanel/constants";
import { getBestSupportedCodec } from "../lib/recording-validation";
import { saveRecording } from "../lib/recording-storage";
import { VideoCompositor } from "../lib/video-compositor";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

interface RecordingStartOptions {
  sourceId?: string; // For screen recording (Electron desktopCapturer)
  mode: "screen" | "webcam" | "pip";
  webcamStream?: MediaStream | null; // For webcam recording or PiP overlay
}

interface UseRecordingSessionReturn {
  startRecording: (options: RecordingStartOptions) => Promise<void>;
  stopRecordingAndSave: () => Promise<RecordingMetadata | null>;
  cancelRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  isRecording: boolean;
  error: string | null;
}

/**
 * useRecordingSession Hook
 *
 * Manages the MediaRecorder lifecycle for screen and webcam recording
 */
export function useRecordingSession(): UseRecordingSessionReturn {
  const dispatch = useAppDispatch();
  const {
    startTime,
    audioConfig,
    mode: recordingMode,
    webcamConfig,
    pipConfig,
    totalPausedDuration,
    pauseCount,
    isPaused,
  } = useAppSelector((state) => state.recording);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [warningShown, setWarningShown] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemAudioStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<VideoCompositor | null>(null);

  /**
   * Auto-stop check interval
   * Phase 4: Check recording time (excluding paused duration) against max duration
   */
  useEffect(() => {
    if (!isRecording || !startTime) {
      setWarningShown(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const recordingTime = elapsedTime - totalPausedDuration;

      // Show warning at 30 seconds remaining (4:30 mark)
      if (
        !warningShown &&
        recordingTime >= RECORDING_CONSTANTS.MAX_DURATION - 30000 &&
        recordingTime < RECORDING_CONSTANTS.MAX_DURATION
      ) {
        toast("30 seconds remaining", { icon: "⚠️" });
        setWarningShown(true);
      }

      // Auto-stop when recording time reaches max duration
      if (recordingTime >= RECORDING_CONSTANTS.MAX_DURATION) {
        console.log(
          "[Recording] Auto-stopping at max recording duration:",
          recordingTime,
          "ms"
        );
        toast(RECORDING_MESSAGES.MAX_DURATION_REACHED);
        stopRecordingAndSave();
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [isRecording, startTime, totalPausedDuration, warningShown]);

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
   * Start recording from a specific source (screen or webcam)
   */
  const startRecording = useCallback(
    async (options: RecordingStartOptions) => {
      try {
        setErrorState(null);
        const { mode, sourceId, webcamStream } = options;

        console.log(`[Recording] Starting ${mode} recording...`);

        // Get the best supported codec
        const mimeType = getBestSupportedCodec();
        if (!mimeType) {
          throw new Error("No supported video codec found");
        }

        let videoStream: MediaStream;

        // === SCREEN RECORDING MODE ===
        if (mode === "screen") {
          if (!sourceId) {
            throw new Error("Screen recording requires a sourceId");
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

          videoStream = await navigator.mediaDevices.getUserMedia(constraints);

          // Extract system audio track from screen capture (macOS)
          const systemAudioTrack = videoStream.getAudioTracks()[0];
          if (systemAudioTrack && audioConfig.systemAudioEnabled) {
            const systemStream = new MediaStream([systemAudioTrack]);
            systemAudioStreamRef.current = systemStream;
            dispatch(setSystemAudioStream(systemStream));
            console.log("[Recording] System audio track captured");
          }
        }
        // === WEBCAM RECORDING MODE ===
        else if (mode === "webcam") {
          if (!webcamStream) {
            throw new Error("Webcam recording requires a webcamStream");
          }

          console.log("[Recording] Using webcam stream from Redux");
          videoStream = webcamStream;

          // System audio doesn't make sense for webcam-only mode, but user can enable it
          // We'll allow it but it will only work on macOS with screen capture
          if (audioConfig.systemAudioEnabled) {
            console.warn(
              "[Recording] System audio enabled for webcam mode - this will not capture any audio"
            );
            // Could optionally capture screen audio even in webcam mode if user wants
          }
        }
        // === PIP RECORDING MODE ===
        else if (mode === "pip") {
          if (!sourceId) {
            throw new Error("PiP recording requires a screen sourceId");
          }
          if (!webcamStream) {
            throw new Error("PiP recording requires a webcamStream");
          }

          console.log("[Recording] Starting PiP composition...");

          // Get screen stream via navigator.mediaDevices (same as screen recording)
          const pipConstraints: any = {
            audio: audioConfig.systemAudioEnabled
              ? {
                  mandatory: {
                    chromeMediaSource: "desktop",
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
            pipConstraints
          );
          if (!screenStream) {
            throw new Error("Failed to get screen stream for PiP");
          }

          // Get screen dimensions (default to 1920x1080 if not available)
          const screenVideoTrack = screenStream.getVideoTracks()[0];
          const settings = screenVideoTrack?.getSettings();
          const screenWidth = settings?.width || 1920;
          const screenHeight = settings?.height || 1080;

          console.log(
            "[Recording] Screen dimensions:",
            screenWidth,
            "x",
            screenHeight
          );

          // Create compositor
          const compositor = new VideoCompositor(
            screenWidth,
            screenHeight,
            pipConfig
          );
          compositor.setScreenStream(screenStream);
          compositor.setWebcamStream(webcamStream);

          // Start compositing and get output stream
          videoStream = compositor.start();
          compositorRef.current = compositor;

          console.log("[Recording] PiP compositor initialized");

          // Handle system audio from screen capture (macOS)
          const systemAudioTrack = screenStream.getAudioTracks()[0];
          if (systemAudioTrack && audioConfig.systemAudioEnabled) {
            const systemStream = new MediaStream([systemAudioTrack]);
            systemAudioStreamRef.current = systemStream;
            dispatch(setSystemAudioStream(systemStream));
            console.log("[Recording] System audio track captured from screen");
          }
        } else {
          throw new Error(`Unknown recording mode: ${mode}`);
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
          videoStream,
          micStream,
          mode === "screen" && systemAudioStreamRef.current
            ? systemAudioStreamRef.current
            : null
        );

        mediaStreamRef.current = combinedStream;

        // Store recording stream for live preview
        dispatch(setRecordingStream(combinedStream));
        console.log("[Recording] Recording stream set for preview");

        // Create MediaRecorder
        const recorderOptions = {
          mimeType,
          videoBitsPerSecond: RECORDING_CONSTANTS.VIDEO_BITRATE,
        };

        const recorder = new MediaRecorder(combinedStream, recorderOptions);
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

        console.log(
          `[Recording] ${mode} recording started with codec:`,
          mimeType
        );
        toast.success(RECORDING_MESSAGES.RECORDING_STARTED);
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
        const elapsedTime = startTime ? Date.now() - startTime : 0;
        const actualRecordingDuration = elapsedTime - totalPausedDuration;

        console.log(
          `[Recording] Total elapsed: ${elapsedTime}ms, Paused: ${totalPausedDuration}ms, Actual: ${actualRecordingDuration}ms, Pause count: ${pauseCount}`
        );

        // Generate metadata
        const recordingId = uuidv4();
        const now = Date.now();

        // Determine recording type and resolution
        const recordingType = recordingMode || "screen";
        const resolution =
          recordingType === "webcam"
            ? webcamConfig.resolution
            : RECORDING_CONSTANTS.DEFAULT_RESOLUTION;
        const fps =
          recordingType === "webcam"
            ? webcamConfig.frameRate
            : RECORDING_CONSTANTS.DEFAULT_FPS;

        // Generate recording name based on type
        let recordingName = "";
        if (recordingType === "webcam") {
          recordingName = "Webcam";
        } else if (recordingType === "pip") {
          recordingName = "PiP";
        } else {
          recordingName = "Screen";
        }

        const metadata: RecordingMetadata = {
          id: recordingId,
          name: `${recordingName} Recording ${new Date(now).toLocaleString()}`,
          type: recordingType,
          duration: elapsedTime, // Total elapsed time
          size: videoBlob.size,
          createdAt: now,
          resolution,
          fps,
          // Phase 4: Pause/Resume metadata
          pauseCount: pauseCount,
          totalPausedDuration: totalPausedDuration,
          actualRecordingDuration: actualRecordingDuration,
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
   * Pause recording (Phase 4)
   */
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      console.warn("[Recording] Cannot pause: not recording");
      return;
    }

    try {
      recorder.pause();
      dispatch(pauseRecordingAction());
      toast("Recording paused", { icon: "⏸️" });
      console.log("[Recording] Paused");
    } catch (err) {
      console.error("[Recording] Failed to pause:", err);
      toast.error("Failed to pause recording");
    }
  }, [dispatch]);

  /**
   * Resume recording (Phase 4)
   */
  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") {
      console.warn("[Recording] Cannot resume: not paused");
      return;
    }

    try {
      recorder.resume();
      dispatch(resumeRecordingAction());
      toast.success("Recording resumed");
      console.log("[Recording] Resumed");
    } catch (err) {
      console.error("[Recording] Failed to resume:", err);
      toast.error("Failed to resume recording");
    }
  }, [dispatch]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (
      recorder &&
      (recorder.state === "recording" || recorder.state === "paused")
    ) {
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
    // Clean up compositor (PiP mode)
    if (compositorRef.current) {
      compositorRef.current.cleanup();
      compositorRef.current = null;
      console.log("[Recording] Compositor cleaned up");
    }

    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Clear recording stream from Redux
    dispatch(setRecordingStream(null));

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
    pauseRecording,
    resumeRecording,
    isRecording,
    error,
  };
}
