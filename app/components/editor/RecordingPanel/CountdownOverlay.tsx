"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAppDispatch } from "../../../store";
import {
  setCurrentScreen,
  resetRecordingState,
} from "../../../store/slices/recordingSlice";
import { RECORDING_CONSTANTS } from "./constants";

interface CountdownOverlayProps {
  onCountdownComplete: () => void;
}

/**
 * CountdownOverlay Component
 *
 * Full-screen countdown (3-2-1) before recording starts
 * Can be cancelled with ESC or Cancel button
 */
export default function CountdownOverlay({
  onCountdownComplete,
}: CountdownOverlayProps) {
  const dispatch = useAppDispatch();
  const [count, setCount] = useState<number>(
    RECORDING_CONSTANTS.COUNTDOWN_SECONDS
  );

  useEffect(() => {
    if (count === 0) {
      onCountdownComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onCountdownComplete]);

  const handleCancel = () => {
    dispatch(setCurrentScreen("screen-selector"));
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center">
      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded transition-colors"
        aria-label="Cancel countdown"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Countdown Display */}
      <div className="text-center">
        {count > 0 ? (
          <div className="animate-scale-in">
            <div className="text-9xl font-bold text-white mb-4">{count}</div>
            <p className="text-xl text-gray-400">
              Recording will start soon...
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="text-5xl font-bold text-purple-500 mb-4">
              Recording...
            </div>
          </div>
        )}
      </div>

      {/* Instruction */}
      <div className="absolute bottom-8 text-center w-full">
        <p className="text-sm text-gray-500">
          Press <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">ESC</kbd>{" "}
          to cancel
        </p>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(1.2);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-in;
        }
      `}</style>
    </div>
  );
}
