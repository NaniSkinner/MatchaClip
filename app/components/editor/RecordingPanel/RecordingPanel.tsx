"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  closePanel,
  startRecording,
  setError,
  setCurrentScreen,
} from "../../../store/slices/recordingSlice";
import { RECORDING_CONSTANTS } from "./constants";
import { useRecordingSession } from "../../../hooks/useRecordingSession";
import ModeSelector from "./ModeSelector";
import ScreenSelector from "./ScreenSelector";
import WebcamSelector from "./WebcamSelector";
import PiPConfigurator from "./PiPConfigurator";
import CountdownOverlay from "./CountdownOverlay";
import RecordingControls from "./RecordingControls";
import StorageIndicator from "./StorageIndicator";

/**
 * RecordingPanel Component
 *
 * Main container for the recording UI. Manages the flow from mode selection
 * through recording to saving the final video.
 */
export default function RecordingPanel() {
  const dispatch = useAppDispatch();
  const {
    isPanelOpen,
    currentScreen,
    error,
    isRecording,
    selectedSource,
    mode,
    webcamConfig,
    webcamStream,
  } = useAppSelector((state) => state.recording);
  const { startRecording: startRecordingSession, stopRecordingAndSave } =
    useRecordingSession();

  const handleClose = () => {
    // Don't allow closing while recording
    if (isRecording) return;
    dispatch(closePanel());
  };

  // Handle ESC key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPanelOpen && !isRecording) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPanelOpen, isRecording]);

  const handleCountdownComplete = async () => {
    // Check if we have the required source based on mode
    if (mode === "screen" && !selectedSource) {
      console.error("[RecordingPanel] No screen source selected");
      dispatch(
        setError("No screen source selected. Please select a screen or window.")
      );
      dispatch(setCurrentScreen("screen-selector"));
      return;
    }

    if (mode === "webcam" && !webcamConfig.selectedCameraId) {
      console.error("[RecordingPanel] No camera selected");
      dispatch(setError("No camera selected. Please select a camera."));
      dispatch(setCurrentScreen("webcam-selector"));
      return;
    }

    if (mode === "pip") {
      // PiP mode validation
      if (!selectedSource) {
        console.error("[RecordingPanel] No screen source selected for PiP");
        dispatch(setError("Please select a screen source for PiP recording."));
        dispatch(setCurrentScreen("pip-configurator"));
        return;
      }
      if (!webcamConfig.selectedCameraId) {
        console.error("[RecordingPanel] No camera selected for PiP");
        dispatch(setError("Please select a camera for PiP recording."));
        dispatch(setCurrentScreen("pip-configurator"));
        return;
      }
    }

    try {
      dispatch(startRecording());

      if (mode === "screen" && selectedSource) {
        // Screen recording mode
        await startRecordingSession({
          mode: "screen",
          sourceId: selectedSource.id,
        });
      } else if (mode === "webcam") {
        // Webcam recording mode
        console.log("[RecordingPanel] Starting webcam recording...");
        await startRecordingSession({
          mode: "webcam",
          webcamStream: webcamStream,
        });
      } else if (mode === "pip" && selectedSource) {
        // PiP recording mode with canvas compositor
        console.log("[RecordingPanel] Starting PiP recording...");
        await startRecordingSession({
          mode: "pip",
          sourceId: selectedSource.id,
          webcamStream: webcamStream,
        });
      }
    } catch (err) {
      console.error("[RecordingPanel] Failed to start recording:", err);
      dispatch(setError("Failed to start recording. Please try again."));
    }
  };

  const handleStopRecording = async () => {
    await stopRecordingAndSave();
  };

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full bg-gray-900 shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col"
        style={{ width: RECORDING_CONSTANTS.PANEL_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Record</h2>
          <button
            onClick={handleClose}
            disabled={isRecording}
            className={`p-1 rounded transition-colors ${
              isRecording
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-gray-800"
            }`}
            aria-label="Close"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Render content based on current screen */}
          {currentScreen === "mode-selector" && <ModeSelector />}
          {currentScreen === "screen-selector" && <ScreenSelector />}
          {currentScreen === "webcam-selector" && <WebcamSelector />}
          {currentScreen === "pip-configurator" && <PiPConfigurator />}
          {currentScreen === "recording" && (
            <RecordingControls onStop={handleStopRecording} />
          )}
          {currentScreen === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Recording Saved!
              </h3>
              <p className="text-sm text-gray-400">
                Your recording has been saved to the assets library.
              </p>
            </div>
          )}
        </div>

        {/* Footer (Storage Indicator) */}
        <div className="p-4 border-t border-gray-800">
          <StorageIndicator />
        </div>
      </div>

      {/* Countdown Overlay (renders above panel) */}
      {currentScreen === "countdown" && (
        <CountdownOverlay onCountdownComplete={handleCountdownComplete} />
      )}
    </>
  );
}
