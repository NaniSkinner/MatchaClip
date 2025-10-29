"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  Monitor,
  Camera,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setCurrentScreen,
  setRecordingMode,
  setSelectedSource,
  setAvailableSources,
  setAvailableCameras,
  setWebcamConfig,
  setWebcamStream,
  setPipConfig,
} from "../../../store/slices/recordingSlice";
import {
  getCameraDevices,
  requestCameraPermission,
} from "../../../lib/camera-devices";
import AudioSourceSelector from "./AudioSourceSelector";

/**
 * PiPConfigurator Component
 *
 * Configures Picture-in-Picture recording:
 * - Screen source selection
 * - Camera selection
 * - Layout configuration (position + size)
 * - Audio configuration
 * - Live preview of PiP layout
 */
export default function PiPConfigurator() {
  const dispatch = useAppDispatch();
  const {
    availableSources,
    selectedSource,
    availableCameras,
    webcamConfig,
    webcamStream,
    pipConfig,
  } = useAppSelector((state) => state.recording);

  // Screen sources state
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  // Camera state
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Preview refs
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  // Load screen sources on mount
  useEffect(() => {
    if (availableSources.length === 0) {
      loadScreenSources();
    }
  }, []);

  // Load cameras on mount
  useEffect(() => {
    if (availableCameras.length === 0) {
      loadCameras();
    }
  }, []);

  // Setup webcam preview when selected
  useEffect(() => {
    if (webcamConfig.selectedCameraId && !webcamStream) {
      startWebcamPreview();
    } else if (webcamStream && webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = webcamStream;
      webcamVideoRef.current.play().catch(console.error);
    }
  }, [webcamConfig.selectedCameraId, webcamStream]);

  /**
   * Load available screen sources
   */
  const loadScreenSources = async () => {
    setIsLoadingSources(true);
    setSourcesError(null);

    try {
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }

      const sources = await window.electronAPI.recording.getScreenSources();

      if (!sources) {
        throw new Error("Failed to get screen sources");
      }

      dispatch(
        setAvailableSources(
          sources.map((source: any) => ({
            id: source.id,
            name: source.name,
            thumbnailUrl: source.thumbnail,
            type: source.type as "screen" | "window",
          }))
        )
      );
    } catch (err) {
      console.error("[PiPConfigurator] Failed to load screen sources:", err);
      setSourcesError("Failed to load screen sources. Please try again.");
    } finally {
      setIsLoadingSources(false);
    }
  };

  /**
   * Load available cameras
   */
  const loadCameras = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);

    try {
      const granted = await requestCameraPermission();
      if (!granted) {
        setCameraError("Camera permission denied");
        dispatch(setAvailableCameras([]));
        setIsLoadingCamera(false);
        return;
      }

      const cameras = await getCameraDevices();
      dispatch(setAvailableCameras(cameras));

      if (cameras.length === 0) {
        setCameraError("No cameras detected");
      }
    } catch (err) {
      console.error("[PiPConfigurator] Failed to load cameras:", err);
      setCameraError("Failed to load cameras");
      dispatch(setAvailableCameras([]));
    } finally {
      setIsLoadingCamera(false);
    }
  };

  /**
   * Start webcam preview
   */
  const startWebcamPreview = async () => {
    if (!webcamConfig.selectedCameraId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: webcamConfig.selectedCameraId },
          width: { ideal: webcamConfig.resolution.width },
          height: { ideal: webcamConfig.resolution.height },
        },
        audio: false,
      });

      dispatch(setWebcamStream(stream));

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }
    } catch (err) {
      console.error("[PiPConfigurator] Failed to start webcam preview:", err);
      setCameraError("Failed to start camera preview");
    }
  };

  /**
   * Handle screen source selection
   */
  const handleScreenSelect = (source: (typeof availableSources)[0]) => {
    dispatch(setSelectedSource(source));
  };

  /**
   * Handle camera selection
   */
  const handleCameraSelect = (cameraId: string) => {
    dispatch(setWebcamConfig({ selectedCameraId: cameraId }));
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    dispatch(setRecordingMode(null));
    dispatch(setCurrentScreen("mode-selector"));
  };

  /**
   * Handle PiP position change
   */
  const handlePositionChange = (position: typeof pipConfig.position) => {
    dispatch(setPipConfig({ position }));
  };

  /**
   * Handle PiP size change
   */
  const handleSizeChange = (size: typeof pipConfig.size) => {
    dispatch(setPipConfig({ size }));
  };

  /**
   * Handle start recording
   */
  const handleStartRecording = () => {
    if (!selectedSource || !webcamConfig.selectedCameraId) {
      return;
    }

    console.log("[PiPConfigurator] Starting PiP recording", pipConfig);
    dispatch(setCurrentScreen("countdown"));
  };

  /**
   * Get position for webcam overlay in preview
   */
  const getWebcamPositionClass = () => {
    const baseClass = "absolute ";
    switch (pipConfig.position) {
      case "top-left":
        return baseClass + "top-4 left-4";
      case "top-right":
        return baseClass + "top-4 right-4";
      case "bottom-left":
        return baseClass + "bottom-4 left-4";
      case "bottom-right":
        return baseClass + "bottom-4 right-4";
      default:
        return baseClass + "bottom-4 right-4";
    }
  };

  /**
   * Get size class for webcam overlay
   */
  const getWebcamSizeClass = () => {
    switch (pipConfig.size) {
      case "small":
        return "w-1/6"; // ~15%
      case "medium":
        return "w-1/5"; // ~20%
      case "large":
        return "w-1/4"; // ~25%
      default:
        return "w-1/5";
    }
  };

  const canStartRecording = selectedSource && webcamConfig.selectedCameraId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Picture-in-Picture Setup
        </h3>
        <p className="text-sm text-gray-400">
          Combine screen recording with webcam overlay
        </p>
      </div>

      {/* PiP Preview */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Preview</label>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-700">
          {/* Screen preview placeholder */}
          {selectedSource ? (
            <img
              src={selectedSource.thumbnailUrl}
              alt="Screen preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto mb-2" />
                <p className="text-sm">Select a screen source</p>
              </div>
            </div>
          )}

          {/* Webcam overlay */}
          {webcamStream && (
            <div
              className={`${getWebcamPositionClass()} ${getWebcamSizeClass()} aspect-video`}
            >
              <video
                ref={webcamVideoRef}
                className="w-full h-full object-cover rounded-lg border-2 border-purple-500 shadow-lg"
                autoPlay
                playsInline
                muted
              />
            </div>
          )}

          {/* Webcam placeholder */}
          {!webcamStream && webcamConfig.selectedCameraId && (
            <div
              className={`${getWebcamPositionClass()} ${getWebcamSizeClass()} aspect-video bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center`}
            >
              <Camera className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>
      </div>

      {/* Screen Source Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Screen Source
        </label>

        {isLoadingSources ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading sources...</span>
          </div>
        ) : sourcesError ? (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{sourcesError}</p>
              <button
                onClick={loadScreenSources}
                className="mt-1 text-red-300 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {availableSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleScreenSelect(source)}
                className={`
                  p-2 rounded-lg border-2 transition-all text-left
                  ${
                    selectedSource?.id === source.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-700 hover:border-gray-600"
                  }
                `}
              >
                <img
                  src={source.thumbnailUrl}
                  alt={source.name}
                  className="w-full aspect-video object-cover rounded mb-1"
                />
                <p className="text-xs text-gray-300 truncate">{source.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Camera Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Camera</label>

        {isLoadingCamera ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading cameras...</span>
          </div>
        ) : cameraError ? (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{cameraError}</p>
              <button
                onClick={loadCameras}
                className="mt-1 text-red-300 underline hover:no-underline"
              >
                Retry
              </button>
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

      {/* Layout Configuration */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-gray-300">
          Webcam Position
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "top-left", label: "Top Left" },
            { value: "top-right", label: "Top Right" },
            { value: "bottom-left", label: "Bottom Left" },
            { value: "bottom-right", label: "Bottom Right" },
          ].map((pos) => (
            <button
              key={pos.value}
              onClick={() => handlePositionChange(pos.value as any)}
              className={`
                py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium
                ${
                  pipConfig.position === pos.value
                    ? "border-purple-500 bg-purple-500/10 text-purple-300"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }
              `}
            >
              {pos.label}
            </button>
          ))}
        </div>

        <label className="text-sm font-medium text-gray-300 block mt-4">
          Webcam Size
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "small", label: "Small (15%)" },
            { value: "medium", label: "Medium (20%)" },
            { value: "large", label: "Large (25%)" },
          ].map((size) => (
            <button
              key={size.value}
              onClick={() => handleSizeChange(size.value as any)}
              className={`
                py-2 px-3 rounded-lg border-2 transition-all text-xs font-medium
                ${
                  pipConfig.size === size.value
                    ? "border-purple-500 bg-purple-500/10 text-purple-300"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }
              `}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Configuration */}
      <div className="pt-4 border-t border-gray-800">
        <AudioSourceSelector />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-800">
        <button
          onClick={handleBack}
          className="flex-1 py-3 px-4 border border-gray-700 rounded-lg
                   hover:bg-gray-800 transition-colors
                   text-gray-300 font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleStartRecording}
          disabled={!canStartRecording}
          className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-medium rounded-lg transition-colors"
        >
          Start Recording
        </button>
      </div>
    </div>
  );
}
