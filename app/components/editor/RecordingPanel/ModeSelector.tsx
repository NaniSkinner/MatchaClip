"use client";
import { Monitor, Camera, PictureInPicture2 } from "lucide-react";
import { useAppDispatch } from "../../../store";
import { setRecordingMode } from "../../../store/slices/recordingSlice";
import { RecordingMode } from "../../../types";

/**
 * ModeSelector Component
 *
 * Displays recording mode options (Screen, Webcam, PiP)
 * Only Screen mode is enabled in Phase 1
 */
export default function ModeSelector() {
  const dispatch = useAppDispatch();

  const handleModeSelect = (mode: RecordingMode) => {
    dispatch(setRecordingMode(mode));
  };

  const modes = [
    {
      id: RecordingMode.SCREEN,
      name: "Screen Recording",
      description: "Capture your screen or window",
      icon: Monitor,
      enabled: true,
    },
    {
      id: RecordingMode.WEBCAM,
      name: "Webcam",
      description: "Record from your camera",
      icon: Camera,
      enabled: true,
    },
    {
      id: RecordingMode.PIP,
      name: "Picture-in-Picture",
      description: "Screen + webcam overlay",
      icon: PictureInPicture2,
      enabled: true,
      comingSoon: false,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-300 mb-4">
        Select Recording Mode
      </h3>

      {modes.map((mode) => {
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            onClick={() => handleModeSelect(mode.id)}
            disabled={!mode.enabled}
            className={`
              w-full p-4 rounded-lg border-2 transition-all
              ${
                mode.enabled
                  ? "border-gray-700 hover:border-purple-500 hover:bg-gray-800/50 cursor-pointer"
                  : "border-gray-800 cursor-not-allowed opacity-50"
              }
              relative group
            `}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`
                p-2 rounded-lg
                ${mode.enabled ? "bg-purple-500/10" : "bg-gray-800"}
              `}
              >
                <Icon
                  size={20}
                  className={`
                  ${mode.enabled ? "text-purple-400" : "text-gray-600"}
                `}
                />
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h4
                    className={`
                    text-sm font-medium
                    ${mode.enabled ? "text-white" : "text-gray-500"}
                  `}
                  >
                    {mode.name}
                  </h4>
                  {mode.comingSoon && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p
                  className={`
                  text-xs mt-1
                  ${mode.enabled ? "text-gray-400" : "text-gray-600"}
                `}
                >
                  {mode.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}

      <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400">
        <strong>Phase 3:</strong> All recording modes now available!
        Picture-in-Picture combines screen + webcam overlay.
      </div>
    </div>
  );
}
