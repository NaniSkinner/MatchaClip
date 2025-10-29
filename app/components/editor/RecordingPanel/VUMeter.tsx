"use client";

import { useEffect, useRef, useState } from "react";
import { AudioAnalyzer } from "@/app/lib/audio-analyzer";

interface VUMeterProps {
  stream: MediaStream | null;
  label: string;
  barCount?: number;
}

/**
 * VU Meter Component - Waveform Style
 *
 * Displays real-time audio levels as animated vertical bars (like Premiere Pro).
 * Shows visual feedback with color coding:
 * - Green (0-70%): Normal levels
 * - Yellow (70-90%): High levels
 * - Red (90-100%): Clipping risk
 */
export const VUMeter: React.FC<VUMeterProps> = ({
  stream,
  label,
  barCount = 32,
}) => {
  const [frequencyBars, setFrequencyBars] = useState<number[]>(
    new Array(barCount).fill(0)
  );
  const [level, setLevel] = useState(0);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  useEffect(() => {
    if (!stream) {
      analyzerRef.current?.cleanup();
      analyzerRef.current = null;
      setFrequencyBars(new Array(barCount).fill(0));
      setLevel(0);
      return;
    }

    try {
      const analyzer = new AudioAnalyzer(stream);
      analyzerRef.current = analyzer;

      analyzer.startMonitoring((newLevel) => {
        setLevel(newLevel);
        const bars = analyzer.getFrequencyBars(barCount);
        setFrequencyBars(bars);
      });

      return () => {
        analyzer.cleanup();
      };
    } catch (error) {
      console.error("Failed to create audio analyzer:", error);
    }
  }, [stream, barCount]);

  /**
   * Get color for a bar based on its height (vibrant spectrogram colors)
   */
  const getBarColor = (barHeight: number) => {
    if (barHeight > 0.9) return "bg-red-500";
    if (barHeight > 0.7) return "bg-orange-500";
    if (barHeight > 0.5) return "bg-yellow-400";
    if (barHeight > 0.3) return "bg-lime-400";
    if (barHeight > 0.15) return "bg-green-500";
    return "bg-emerald-600";
  };

  const getLevelStatus = () => {
    if (level > 0.9) return "⚠️ Clipping!";
    if (level > 0.7) return "High";
    if (level > 0.3) return "Good";
    if (level > 0.05) return "Low";
    return "Silent";
  };

  return (
    <div className="space-y-2">
      {/* Label and Level Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-300">{label}</span>
        <span className="flex items-center gap-2">
          <span
            className={
              level > 0.9
                ? "text-red-400 font-bold"
                : level > 0.7
                ? "text-yellow-400 font-semibold"
                : "text-emerald-400"
            }
          >
            {Math.round(level * 100)}%
          </span>
          <span className="text-gray-500">({getLevelStatus()})</span>
        </span>
      </div>

      {/* Waveform Bars - Spectrogram Style */}
      <div className="relative h-20 bg-black rounded-lg overflow-hidden border border-gray-800">
        <div className="flex items-end justify-start gap-px h-full p-1">
          {frequencyBars.map((barHeight, index) => {
            // Always show at least 5% height so bars are visible
            const displayHeight = Math.max(5, barHeight * 100);
            const barColor = getBarColor(barHeight);

            return (
              <div
                key={index}
                className="flex-1 relative min-w-[2px]"
                style={{ height: "100%" }}
              >
                {/* Bar with glow effect */}
                <div
                  className={`absolute bottom-0 w-full transition-all duration-100 ease-out ${barColor}`}
                  style={{
                    height: `${displayHeight}%`,
                    filter:
                      barHeight > 0.3
                        ? `drop-shadow(0 0 4px ${
                            barHeight > 0.7
                              ? "rgba(250, 204, 21, 0.6)"
                              : "rgba(52, 211, 153, 0.6)"
                          })`
                        : "none",
                  }}
                />

                {/* Peak indicator */}
                {barHeight > 0.5 && (
                  <div
                    className="absolute w-full h-[1.5px] bg-white/90"
                    style={{
                      bottom: `${displayHeight}%`,
                      transition: "bottom 100ms ease-out",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Grid lines for visual reference */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-[25%] w-full h-px bg-gray-700/30" />
          <div className="absolute bottom-[50%] w-full h-px bg-gray-700/50" />
          <div className="absolute bottom-[75%] w-full h-px bg-gray-700/30" />
        </div>
      </div>

      {/* Clipping Warning */}
      {level > 0.9 && (
        <div className="flex items-start gap-1.5 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          <svg
            className="w-3 h-3 mt-0.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Audio too loud - reduce gain or move away from mic</span>
        </div>
      )}
    </div>
  );
};
