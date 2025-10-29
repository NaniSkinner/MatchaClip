"use client";

import { useEffect, useState } from "react";
import { Mic, Volume2, AlertCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setAvailableMicrophones,
  setAudioConfig,
} from "../../../store/slices/recordingSlice";
import {
  requestMicrophonePermission,
  checkMicrophonePermission,
} from "../../../lib/audio-permissions";
import { getAudioInputDevices } from "../../../lib/audio-devices";

/**
 * AudioSourceSelector Component
 *
 * Allows users to select audio input sources (microphone and system audio)
 * Shows on both screen recording and webcam recording flows
 */
export default function AudioSourceSelector() {
  const dispatch = useAppDispatch();
  const { audioConfig, availableMicrophones } = useAppSelector(
    (state) => state.recording
  );

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");

  // Detect macOS for system audio toggle
  const isMacOS =
    typeof navigator !== "undefined" &&
    (navigator.platform.includes("Mac") || navigator.userAgent.includes("Mac"));

  // Load audio devices on mount
  useEffect(() => {
    loadAudioDevices();
  }, []);

  /**
   * Load available microphones
   */
  const loadAudioDevices = async () => {
    setIsLoadingDevices(true);

    try {
      // Check current permission status
      const permStatus = await checkMicrophonePermission();
      setPermissionStatus(permStatus);

      // If not granted, request permission
      if (permStatus !== "granted") {
        const granted = await requestMicrophonePermission();
        setPermissionStatus(granted ? "granted" : "denied");

        if (!granted) {
          dispatch(setAvailableMicrophones([]));
          setIsLoadingDevices(false);
          return;
        }
      }

      // Get devices
      const devices = await getAudioInputDevices();
      dispatch(setAvailableMicrophones(devices));
    } catch (error) {
      console.error("Failed to load audio devices:", error);
      dispatch(setAvailableMicrophones([]));
    } finally {
      setIsLoadingDevices(false);
    }
  };

  /**
   * Handle microphone toggle
   */
  const handleMicrophoneToggle = (enabled: boolean) => {
    dispatch(setAudioConfig({ microphoneEnabled: enabled }));
  };

  /**
   * Handle system audio toggle
   */
  const handleSystemAudioToggle = (enabled: boolean) => {
    dispatch(setAudioConfig({ systemAudioEnabled: enabled }));
  };

  /**
   * Handle microphone device selection
   */
  const handleMicrophoneSelect = (deviceId: string) => {
    dispatch(setAudioConfig({ selectedMicId: deviceId }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Audio Sources
        </label>

        {/* Microphone Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <Mic size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-200">
              Microphone
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={audioConfig.microphoneEnabled}
              onChange={(e) => handleMicrophoneToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Microphone Selector */}
        {audioConfig.microphoneEnabled && (
          <div className="pl-2">
            {isLoadingDevices ? (
              <div className="text-xs text-gray-500 py-2">
                Loading devices...
              </div>
            ) : permissionStatus === "denied" ? (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Microphone permission denied</p>
                  <p className="text-red-400/80 mt-1">
                    Please grant permission in your system settings
                  </p>
                </div>
              </div>
            ) : availableMicrophones.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">No microphones detected</p>
                  <p className="text-yellow-400/80 mt-1">
                    Please connect a microphone or check permissions
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={audioConfig.selectedMicId || ""}
                onChange={(e) => handleMicrophoneSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-700 rounded-lg 
                         bg-gray-800 text-gray-200
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         transition-colors"
              >
                <option value="">Select Microphone</option>
                {availableMicrophones.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* System Audio Toggle (macOS only) */}
        {isMacOS && (
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <Volume2 size={18} className="text-gray-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">
                  System Audio
                </span>
                <span className="text-xs text-gray-500">macOS only</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={audioConfig.systemAudioEnabled}
                onChange={(e) => handleSystemAudioToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        )}

        {/* System Audio Info */}
        {isMacOS && audioConfig.systemAudioEnabled && (
          <div className="pl-2 flex items-start gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <p>System audio will be captured from the selected screen/window</p>
          </div>
        )}
      </div>
    </div>
  );
}
