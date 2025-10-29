"use client";
import { useEffect, useState } from "react";
import { Monitor, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setAvailableSources,
  setSelectedSource,
  setCurrentScreen,
  setRecordingMode,
  setError,
} from "../../../store/slices/recordingSlice";
import { ScreenSource } from "../../../types";
import Image from "next/image";

/**
 * ScreenSelector Component
 *
 * Displays available screen sources (screens and windows) with thumbnails
 * Allows user to select a source to record
 */
export default function ScreenSelector() {
  const dispatch = useAppDispatch();
  const { availableSources, selectedSource } = useAppSelector(
    (state) => state.recording
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }

      const sources = await window.electronAPI.recording.getScreenSources();

      // Convert Electron sources to app format
      const formattedSources: ScreenSource[] = sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnailUrl: source.thumbnail,
        type: source.type,
      }));

      dispatch(setAvailableSources(formattedSources));
    } catch (err) {
      const errorMsg = "Failed to load screen sources. Please try again.";
      setErrorState(errorMsg);
      dispatch(setError(errorMsg));
      console.error("Error fetching screen sources:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSourceSelect = (source: ScreenSource) => {
    dispatch(setSelectedSource(source));
  };

  const handleBack = () => {
    dispatch(setCurrentScreen("mode-selector"));
  };

  const handleStartRecording = () => {
    if (selectedSource) {
      dispatch(setCurrentScreen("countdown"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
        <p className="text-sm text-gray-400">Loading available sources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          {error}
        </div>
        <button
          onClick={fetchSources}
          className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
        <button
          onClick={handleBack}
          className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded transition-colors flex items-center justify-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Select Screen or Window
        </h3>
        <button
          onClick={fetchSources}
          className="p-1.5 hover:bg-gray-800 rounded transition-colors"
          title="Refresh sources"
        >
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
        {availableSources.map((source) => (
          <button
            key={source.id}
            onClick={() => handleSourceSelect(source)}
            className={`
              p-3 rounded-lg border-2 transition-all text-left
              ${
                selectedSource?.id === source.id
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
              }
            `}
          >
            <div className="flex items-start space-x-3">
              {/* Thumbnail */}
              <div className="relative w-20 h-14 shrink-0 rounded overflow-hidden bg-gray-800">
                <Image
                  src={source.thumbnailUrl}
                  alt={source.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Monitor size={14} className="text-gray-500 shrink-0" />
                  <span className="text-xs text-gray-500 uppercase">
                    {source.type}
                  </span>
                </div>
                <p className="text-sm text-white mt-1 truncate">
                  {source.name}
                </p>
              </div>

              {/* Selected Indicator */}
              {selectedSource?.id === source.id && (
                <div className="shrink-0">
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
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
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 pt-2">
        <button
          onClick={handleBack}
          className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded transition-colors flex items-center justify-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          onClick={handleStartRecording}
          disabled={!selectedSource}
          className={`
            flex-1 py-2 px-4 rounded transition-colors font-medium
            ${
              selectedSource
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }
          `}
        >
          Start Recording
        </button>
      </div>
    </div>
  );
}
