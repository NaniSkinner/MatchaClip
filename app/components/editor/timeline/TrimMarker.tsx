"use client";

import React, { useState, useRef, useEffect } from "react";
import { MediaFile } from "@/app/types";
import {
  sourceTimeToClipRelativePixels,
  clipRelativePixelsToSourceTime,
} from "@/app/lib/timeline-coordinates";

interface TrimMarkerProps {
  type: "in" | "out";
  clip: MediaFile;
  onDragStart?: () => void;
  onDrag: (sourceTime: number) => void;
  onDragEnd?: () => void;
  isActive: boolean;
  timelineZoom: number;
}

export default function TrimMarker({
  type,
  clip,
  onDrag,
  onDragStart,
  onDragEnd,
  isActive,
  timelineZoom,
}: TrimMarkerProps) {
  // All hooks MUST be called unconditionally at the top
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const markerRef = useRef<HTMLDivElement>(null);

  const color = type === "in" ? "#D4E7C5" : "#B4A7D6"; // matcha-green for in, purple for out
  const label = type === "in" ? "IN" : "OUT";

  // CRITICAL: Calculate pixel position from SOURCE TIME
  // Recalculate on every render to respond to Redux updates
  const sourceTime = type === "in" ? clip.startTime : clip.endTime;
  const clipDuration = clip.positionEnd - clip.positionStart;
  const clipWidth = clipDuration * timelineZoom;

  const position = sourceTimeToClipRelativePixels(
    sourceTime,
    clip,
    timelineZoom
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      // Get the clip element (parent of marker)
      const clipElement = markerRef.current?.closest(".timeline-clip");
      if (!clipElement) return;

      const clipRect = clipElement.getBoundingClientRect();

      // Calculate position relative to clip's left edge
      const relativeX = e.clientX - clipRect.left - dragOffset;

      // Constrain within clip boundaries
      const constrainedX = Math.max(0, Math.min(relativeX, clipWidth));

      // CRITICAL: Convert pixel position to SOURCE TIME
      const newSourceTime = clipRelativePixelsToSourceTime(
        constrainedX,
        clip,
        timelineZoom
      );

      if (newSourceTime !== null) {
        onDrag(newSourceTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragOffset,
    clip,
    clipWidth,
    onDrag,
    onDragEnd,
    timelineZoom,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset(0);
    onDragStart?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Conditional rendering MUST come after all hooks
  if (!isActive) return null;

  // If mapping failed, don't render
  if (position === null) {
    console.error(`Failed to map ${type} marker for clip ${clip.id}`);
    return null;
  }

  return (
    <div
      ref={markerRef}
      className="absolute top-0 bottom-0 z-40 cursor-ew-resize group"
      style={{
        left: `${position - 6}px`,
        width: "16px",
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleClick}
    >
      {/* Vertical line */}
      <div
        className={`h-full mx-auto transition-all ${
          isDragging ? "opacity-100 w-1.5" : "opacity-100 w-1 group-hover:w-1.5"
        }`}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}, 0 0 10px ${color}`,
        }}
      />

      {/* Triangle handle at top */}
      <div
        className={`absolute -top-1 left-1/2 -translate-x-1/2 transition-all ${
          isDragging ? "scale-125" : "scale-100 group-hover:scale-110"
        }`}
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `10px solid ${color}`,
          filter: `drop-shadow(0 0 3px ${color})`,
        }}
      />

      {/* Label */}
      <div
        className={`absolute top-11 left-1/2 -translate-x-1/2 text-[11px] font-bold px-2 py-0.5 rounded transition-all ${
          isDragging
            ? "opacity-100 scale-110"
            : "opacity-90 group-hover:opacity-100 group-hover:scale-105"
        }`}
        style={{
          backgroundColor: color,
          color: "#000",
          boxShadow: `0 2px 4px rgba(0,0,0,0.3)`,
        }}
      >
        {label}
      </div>

      {/* Timecode tooltip on hover - shows SOURCE TIME */}
      <div
        className={`absolute top-12 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none transition-opacity ${
          isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
        }}
      >
        {formatTime(sourceTime)}
      </div>
    </div>
  );
}

/**
 * Formats time in seconds to MM:SS.mmm format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0").slice(0, 1)}`;
}
