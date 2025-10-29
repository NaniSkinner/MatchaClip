"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, AlertCircle, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setAvailableCameras,
  setWebcamConfig,
  setWebcamStream,
  setCurrentScreen,
  setRecordingMode,
} from "../../../store/slices/recordingSlice";
import {
  getCameraDevices,
  requestCameraPermission,
  checkCameraPermission,
} from "../../../lib/camera-devices";
import AudioSourceSelector from "./AudioSourceSelector";

/**
 * WebcamSelector Component
 *
 * Provides webcam device selection with live preview
 * Includes audio source selection and quality settings
 */
export default function WebcamSelector() {
  const dispatch = useAppDispatch();
  const { webcamConfig, availableCameras, webcamStream } = useAppSelector(
    (state) => state.recording
  );

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [error, setError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // Load camera devices on mount
  useEffect(() => {
    loadCameraDevices();
  }, []);

  // Start/stop preview when selected camera changes
  useEffect(() => {
    if (!webcamConfig.selectedCameraId) {
      stopPreview();
      return;
    }

    // Check if we already have a stream in Redux (e.g., from before unmounting)
    if (webcamStream && previewStreamRef.current !== webcamStream) {
      console.log("[WebcamSelector] Reusing existing stream from Redux");
      previewStreamRef.current = webcamStream;
      setPreviewStream(webcamStream);

      if (videoRef.current) {
        videoRef.current.srcObject = webcamStream;
        videoRef.current.play().catch((err) => {
          console.error(
            "[WebcamSelector] Failed to play existing stream:",
            err
          );
        });
      }
      return;
    }

    // Only start new preview if we don't have an existing stream
    if (!webcamStream) {
      startPreview();
    }

    // Cleanup: Don't stop the stream - it persists in Redux for recording
    return () => {
      console.log(
        "[WebcamSelector] Component unmounting (stream preserved in Redux)"
      );
    };
  }, [
    webcamConfig.selectedCameraId,
    webcamConfig.resolution.width,
    webcamConfig.resolution.height,
    webcamStream, // Add webcamStream as dependency
  ]);

  /**
   * Load available cameras
   */
  const loadCameraDevices = async () => {
    setIsLoadingDevices(true);
    setError(null);

    try {
      // Check current permission status
      const permStatus = await checkCameraPermission();
      setPermissionStatus(permStatus);

      // If not granted, request permission
      if (permStatus !== "granted") {
        const granted = await requestCameraPermission();
        setPermissionStatus(granted ? "granted" : "denied");

        if (!granted) {
          dispatch(setAvailableCameras([]));
          setError("Camera permission denied. Please enable camera access.");
          setIsLoadingDevices(false);
          return;
        }
      }

      // Get camera devices
      const cameras = await getCameraDevices();
      dispatch(setAvailableCameras(cameras));

      if (cameras.length === 0) {
        setError("No cameras detected. Please connect a webcam.");
      }
    } catch (err) {
      console.error("Failed to load camera devices:", err);
      setError("Failed to load cameras. Please try again.");
      dispatch(setAvailableCameras([]));
    } finally {
      setIsLoadingDevices(false);
    }
  };

  /**
   * Start camera preview
   */
  const startPreview = async () => {
    if (!webcamConfig.selectedCameraId) {
      console.log("[WebcamSelector] No camera selected, skipping preview");
      return;
    }

    console.log(
      "[WebcamSelector] Starting preview for camera:",
      webcamConfig.selectedCameraId
    );
    setIsLoadingPreview(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: webcamConfig.selectedCameraId },
          width: { ideal: webcamConfig.resolution.width },
          height: { ideal: webcamConfig.resolution.height },
          frameRate: { ideal: webcamConfig.frameRate },
        },
        audio: false, // Audio handled separately
      });

      console.log("[WebcamSelector] Got camera stream:", {
        tracks: stream.getVideoTracks().length,
        active: stream.active,
        trackSettings: stream.getVideoTracks()[0]?.getSettings(),
      });

      previewStreamRef.current = stream;
      setPreviewStream(stream);

      // Store stream in Redux so it persists across component unmounts
      dispatch(setWebcamStream(stream));

      if (videoRef.current) {
        console.log("[WebcamSelector] Setting stream to video element");
        videoRef.current.srcObject = stream;

        // Ensure video plays and log any playback issues
        try {
          await videoRef.current.play();
          console.log("[WebcamSelector] Video playing successfully");
        } catch (playErr) {
          console.error("[WebcamSelector] Play failed:", playErr);
          throw playErr;
        }
      } else {
        console.error("[WebcamSelector] videoRef.current is null!");
      }
    } catch (err) {
      console.error("[WebcamSelector] Failed to start camera preview:", err);
      setError(
        `Unable to access camera: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Stop camera preview
   */
  const stopPreview = () => {
    console.log("[WebcamSelector] Stopping preview");

    // Pause video first to prevent autoplay errors
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }

    // Stop all tracks
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }

    // Clear the video source after pausing
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setPreviewStream(null);
    dispatch(setWebcamStream(null)); // Clear Redux state too
  };

  /**
   * Handle camera selection change
   */
  const handleCameraSelect = (deviceId: string) => {
    dispatch(setWebcamConfig({ selectedCameraId: deviceId }));
  };

  /**
   * Handle resolution change
   */
  const handleResolutionChange = (resolution: string) => {
    const [width, height] = resolution.split("x").map(Number);
    dispatch(setWebcamConfig({ resolution: { width, height } }));
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    stopPreview();
    dispatch(setRecordingMode(null));
    dispatch(setCurrentScreen("mode-selector"));
  };

  /**
   * Handle start recording
   */
  const handleStartRecording = () => {
    if (!webcamConfig.selectedCameraId) {
      setError("Please select a camera first");
      return;
    }

    console.log("[WebcamSelector] Starting recording flow");

    // Don't stop preview - we need the camera stream for recording!
    // Just hide the video element by moving to countdown screen
    // The actual recording implementation (Task 6) will use previewStreamRef.current

    dispatch(setCurrentScreen("countdown"));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Webcam Recording
        </h3>
        <p className="text-sm text-gray-400">
          Select your camera and configure audio sources
        </p>
      </div>

      {/* Camera Preview */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
        {/* Video element - always rendered so ref is available */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ backgroundColor: "#000" }}
        />

        {/* Loading overlay */}
        {isLoadingPreview && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !isLoadingPreview && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center p-6 max-w-md">
              <AlertCircle className="w-16 h-16 mx-auto mb-3 text-red-500" />
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button
                onClick={loadCameraDevices}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Placeholder overlay - shown when no stream */}
        {!previewStream && !isLoadingPreview && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-900 z-10">
            <div className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-3" />
              <p className="text-sm">Select a camera to preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Camera Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Camera</label>
        {isLoadingDevices ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading cameras...</span>
          </div>
        ) : permissionStatus === "denied" ? (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Camera permission denied</p>
              <p className="text-red-400/80 mt-1">
                Please grant camera permission in your system settings
              </p>
            </div>
          </div>
        ) : availableCameras.length === 0 ? (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">No cameras detected</p>
              <p className="text-yellow-400/80 mt-1">
                Please connect a webcam or check permissions
              </p>
            </div>
          </div>
        ) : (
          <select
            value={webcamConfig.selectedCameraId || ""}
            onChange={(e) => handleCameraSelect(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-700 rounded-lg 
                     bg-gray-800 text-gray-200
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     transition-colors"
          >
            <option value="">Select Camera</option>
            {availableCameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Resolution Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Video Quality
        </label>
        <select
          value={`${webcamConfig.resolution.width}x${webcamConfig.resolution.height}`}
          onChange={(e) => handleResolutionChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-700 rounded-lg 
                   bg-gray-800 text-gray-200
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   transition-colors"
        >
          <option value="1920x1080">1080p (1920×1080) - High Quality</option>
          <option value="1280x720">720p (1280×720) - Standard</option>
          <option value="640x480">480p (640×480) - Lower Quality</option>
        </select>
      </div>

      {/* Audio Source Selector */}
      <div className="pt-4 border-t border-gray-800">
        <AudioSourceSelector />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-800">
        <button
          onClick={handleBack}
          className="flex-1 py-3 px-4 border border-gray-700 rounded-lg
                   hover:bg-gray-800 transition-colors
                   text-gray-300 font-medium"
        >
          Back
        </button>
        <button
          onClick={handleStartRecording}
          disabled={
            !webcamConfig.selectedCameraId || isLoadingPreview || !!error
          }
          className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-medium rounded-lg transition-colors
                   flex items-center justify-center gap-2"
        >
          {isLoadingPreview ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Start Recording
            </>
          )}
        </button>
      </div>
    </div>
  );
}
