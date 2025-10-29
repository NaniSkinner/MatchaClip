"use client";

import React, { useRef, useState } from "react";
import { useAppSelector } from "@/app/store";
import { setInPoint, setOutPoint } from "@/app/store/slices/projectSlice";
import { useDispatch } from "react-redux";
import { formatTime } from "@/app/utils/utils";
import toast from "react-hot-toast";

interface InOutMarkersProps {
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

const InOutMarkers: React.FC<InOutMarkersProps> = ({ timelineRef }) => {
  const { inPoint, outPoint, timelineZoom, duration } = useAppSelector(
    (state) => state.projectState
  );
  const dispatch = useDispatch();
  const [draggingMarker, setDraggingMarker] = useState<"in" | "out" | null>(
    null
  );

  // Sanitize in/out points to prevent NaN from breaking rendering
  const safeInPoint =
    typeof inPoint === "number" && !isNaN(inPoint) && isFinite(inPoint)
      ? inPoint
      : null;
  const safeOutPoint =
    typeof outPoint === "number" && !isNaN(outPoint) && isFinite(outPoint)
      ? outPoint
      : null;

  const handleMarkerDragStart = (
    e: React.MouseEvent,
    markerType: "in" | "out"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingMarker(markerType);
  };

  React.useEffect(() => {
    if (!draggingMarker || !timelineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollOffset = timelineRef.current.scrollLeft;
      const offsetX = e.clientX - rect.left + scrollOffset;
      const newTime = Math.max(0, Math.min(duration, offsetX / timelineZoom));

      if (draggingMarker === "in") {
        // Validate: in-point must be before out-point
        if (safeOutPoint === null || newTime < safeOutPoint) {
          dispatch(setInPoint(newTime));
        } else {
          toast.error("In-point must be before out-point");
        }
      } else if (draggingMarker === "out") {
        // Validate: out-point must be after in-point
        if (safeInPoint === null || newTime > safeInPoint) {
          dispatch(setOutPoint(newTime));
        } else {
          toast.error("Out-point must be after in-point");
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingMarker(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    draggingMarker,
    dispatch,
    timelineZoom,
    safeInPoint,
    safeOutPoint,
    duration,
    timelineRef,
  ]);

  const handleRightClick = (e: React.MouseEvent, markerType: "in" | "out") => {
    e.preventDefault();
    if (markerType === "in") {
      dispatch(setInPoint(null));
      toast.success("In-point cleared");
    } else {
      dispatch(setOutPoint(null));
      toast.success("Out-point cleared");
    }
  };

  return (
    <div className="in-out-markers absolute top-0 left-0 right-0 h-full pointer-events-none z-40">
      {/* Shaded region before in-point */}
      {safeInPoint !== null && (
        <div
          className="absolute top-0 bottom-0 bg-black opacity-20 pointer-events-none"
          style={{
            left: 0,
            width: `${safeInPoint * timelineZoom}px`,
          }}
        />
      )}

      {/* Shaded region after out-point */}
      {safeOutPoint !== null && (
        <div
          className="absolute top-0 bottom-0 bg-black opacity-20 pointer-events-none"
          style={{
            left: `${safeOutPoint * timelineZoom}px`,
            right: 0,
          }}
        />
      )}

      {/* In-point marker */}
      {safeInPoint !== null && (
        <div
          className="absolute top-0 pointer-events-auto cursor-ew-resize group"
          style={{
            left: `${safeInPoint * timelineZoom}px`,
            transform: "translateX(-50%)",
          }}
          onMouseDown={(e) => handleMarkerDragStart(e, "in")}
          onContextMenu={(e) => handleRightClick(e, "in")}
          title={`In-point: ${formatTime(safeInPoint)}`}
        >
          {/* Vertical line */}
          <div className="absolute top-0 w-[2px] h-full bg-green-500" />

          {/* Top marker (bracket) */}
          <div className="absolute top-0 left-0 -translate-x-1/2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="fill-green-500"
            >
              {/* Downward pointing triangle/bracket */}
              <path d="M 2 0 L 2 6 L 4 6 L 4 2 L 16 2 L 16 6 L 18 6 L 18 0 Z" />
              <path d="M 8 6 L 10 10 L 12 6 Z" />
            </svg>
          </div>

          {/* Tooltip on hover */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            In: {formatTime(safeInPoint)}
            <div className="text-[10px] text-gray-200 mt-1">
              Right-click to clear
            </div>
          </div>
        </div>
      )}

      {/* Out-point marker */}
      {safeOutPoint !== null && (
        <div
          className="absolute top-0 pointer-events-auto cursor-ew-resize group"
          style={{
            left: `${safeOutPoint * timelineZoom}px`,
            transform: "translateX(-50%)",
          }}
          onMouseDown={(e) => handleMarkerDragStart(e, "out")}
          onContextMenu={(e) => handleRightClick(e, "out")}
          title={`Out-point: ${formatTime(safeOutPoint)}`}
        >
          {/* Vertical line */}
          <div className="absolute top-0 w-[2px] h-full bg-red-500" />

          {/* Top marker (bracket) */}
          <div className="absolute top-0 left-0 -translate-x-1/2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="fill-red-500"
            >
              {/* Downward pointing triangle/bracket */}
              <path d="M 2 0 L 2 6 L 4 6 L 4 2 L 16 2 L 16 6 L 18 6 L 18 0 Z" />
              <path d="M 8 6 L 10 10 L 12 6 Z" />
            </svg>
          </div>

          {/* Tooltip on hover */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Out: {formatTime(safeOutPoint)}
            <div className="text-[10px] text-gray-200 mt-1">
              Right-click to clear
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InOutMarkers;
