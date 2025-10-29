import { useAppSelector } from "@/app/store";
import {
  setMarkerTrack,
  setTextElements,
  setMediaFiles,
  setTimelineZoom,
  setCurrentTime,
  setIsPlaying,
  setActiveElement,
} from "@/app/store/slices/projectSlice";
import { memo, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Target, Scissors, Copy, Trash2 } from "lucide-react";
import Header from "./Header";
import VideoTimeline from "./elements-timeline/VideoTimeline";
import ImageTimeline from "./elements-timeline/ImageTimeline";
import AudioTimeline from "./elements-timeline/AudioTimline";
import TextTimeline from "./elements-timeline/TextTimeline";
import InOutMarkers from "./InOutMarkers";
import { throttle } from "lodash";
import GlobalKeyHandlerProps from "../../../components/editor/keys/GlobalKeyHandlerProps";
import toast from "react-hot-toast";
import Tooltip from "../Tooltip";
export const Timeline = () => {
  const {
    currentTime,
    timelineZoom,
    enableMarkerTracking,
    activeElement,
    activeElementIndex,
    mediaFiles,
    textElements,
    duration,
    isPlaying,
  } = useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const timelineRef = useRef<HTMLDivElement>(null);

  const throttledZoom = useMemo(
    () =>
      throttle((value: number) => {
        dispatch(setTimelineZoom(value));
      }, 100),
    [dispatch]
  );

  const handleSplit = () => {
    let element = null;
    let elements = null;
    let setElements = null;

    if (!activeElement) {
      toast.error("No element selected.");
      return;
    }

    if (activeElement === "media") {
      elements = [...mediaFiles];
      element = elements[activeElementIndex];
      setElements = setMediaFiles;

      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const { positionStart, positionEnd } = element;

      if (currentTime <= positionStart || currentTime >= positionEnd) {
        toast.error("Marker is outside the selected element bounds.");
        return;
      }

      const positionDuration = positionEnd - positionStart;

      // Media logic (uses startTime/endTime for trimming)
      const { startTime, endTime } = element;
      const sourceDuration = endTime - startTime;
      const ratio = (currentTime - positionStart) / positionDuration;
      const splitSourceOffset = startTime + ratio * sourceDuration;

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: currentTime,
        startTime,
        endTime: splitSourceOffset,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: currentTime,
        positionEnd,
        startTime: splitSourceOffset,
        endTime,
      };

      elements.splice(activeElementIndex, 1, firstPart, secondPart);
    } else if (activeElement === "text") {
      elements = [...textElements];
      element = elements[activeElementIndex];
      setElements = setTextElements;

      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const { positionStart, positionEnd } = element;

      if (currentTime <= positionStart || currentTime >= positionEnd) {
        toast.error("Marker is outside the selected element.");
        return;
      }

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: currentTime,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: currentTime,
        positionEnd,
      };

      elements.splice(activeElementIndex, 1, firstPart, secondPart);
    }

    if (elements && setElements) {
      dispatch(setElements(elements as any));
      dispatch(setActiveElement(null));
      toast.success("Element split successfully.");
    }
  };

  const handleDuplicate = () => {
    let element = null;
    let elements = null;
    let setElements = null;

    if (activeElement === "media") {
      elements = [...mediaFiles];
      element = elements[activeElementIndex];
      setElements = setMediaFiles;
    } else if (activeElement === "text") {
      elements = [...textElements];
      element = elements[activeElementIndex];
      setElements = setTextElements;
    }

    if (!element) {
      toast.error("No element selected.");
      return;
    }

    const duplicatedElement = {
      ...element,
      id: crypto.randomUUID(),
    };

    if (elements) {
      elements.splice(activeElementIndex + 1, 0, duplicatedElement as any);
    }

    if (elements && setElements) {
      dispatch(setElements(elements as any));
      dispatch(setActiveElement(null));
      toast.success("Element duplicated successfully.");
    }
  };

  const handleDelete = () => {
    // @ts-ignore
    let element = null;
    let elements = null;
    let setElements = null;

    if (activeElement === "media") {
      elements = [...mediaFiles];
      element = elements[activeElementIndex];
      setElements = setMediaFiles;
    } else if (activeElement === "text") {
      elements = [...textElements];
      element = elements[activeElementIndex];
      setElements = setTextElements;
    }

    if (!element) {
      toast.error("No element selected.");
      return;
    }

    if (elements) {
      // @ts-ignore
      elements = elements.filter((ele) => ele.id !== element.id);
    }

    if (elements && setElements) {
      dispatch(setElements(elements as any));
      dispatch(setActiveElement(null));
      toast.success("Element deleted successfully.");
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    dispatch(setIsPlaying(false));
    const rect = timelineRef.current.getBoundingClientRect();

    const scrollOffset = timelineRef.current.scrollLeft;
    const offsetX = e.clientX - rect.left + scrollOffset;

    const seconds = offsetX / timelineZoom;
    const clampedTime = Math.max(0, Math.min(duration, seconds));

    dispatch(setCurrentTime(clampedTime));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-row items-center justify-between gap-12 w-full">
        <div className="flex flex-row items-center gap-1">
          {/* Track Marker */}
          <Tooltip content="Track Marker (T)">
            <button
              onClick={() => dispatch(setMarkerTrack(!enableMarkerTracking))}
              className={`h-8 px-3 flex items-center justify-center transition-colors rounded ${
                enableMarkerTracking
                  ? "bg-[#9333EA] text-white hover:bg-[#7E22CE]"
                  : "bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A]"
              }`}
              aria-label="Track Marker"
            >
              <Target size={16} />
            </button>
          </Tooltip>
          {/* Split */}
          <Tooltip content="Split (S)">
            <button
              onClick={handleSplit}
              className="h-8 px-3 flex items-center justify-center bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A] transition-colors rounded"
              aria-label="Split"
            >
              <Scissors size={16} />
            </button>
          </Tooltip>
          {/* Duplicate */}
          <Tooltip content="Duplicate (D)">
            <button
              onClick={handleDuplicate}
              className="h-8 px-3 flex items-center justify-center bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A] transition-colors rounded"
              aria-label="Duplicate"
            >
              <Copy size={16} />
            </button>
          </Tooltip>
          {/* Delete */}
          <Tooltip content="Delete (Del)">
            <button
              onClick={handleDelete}
              className="h-8 px-3 flex items-center justify-center bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A] transition-colors rounded"
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Timeline Zoom */}
        <div className="flex flex-row justify-between items-center gap-2 mr-4">
          <label className="block text-xs font-medium text-gray-400">
            Zoom
          </label>
          <span className="text-gray-400 text-sm">-</span>
          <input
            type="range"
            min={30}
            max={120}
            step="1"
            value={timelineZoom}
            onChange={(e) => throttledZoom(Number(e.target.value))}
            className="w-[100px] h-1 bg-[#2A2A2A] border border-[#3F3F3F] shadow-sm text-white rounded focus:outline-none accent-[#9333EA]"
          />
          <span className="text-gray-400 text-sm">+</span>
        </div>
      </div>

      <div
        className="relative overflow-x-auto w-full border-t border-gray-800 bg-[#1E1D21] z-10"
        ref={timelineRef}
        onClick={handleClick}
      >
        {/* Timeline Header */}
        <Header />

        {/* Global In/Out Markers */}
        <InOutMarkers timelineRef={timelineRef} />

        <div
          className="bg-[#1E1D21]"
          style={{
            width: "100%" /* or whatever width your timeline requires */,
          }}
        >
          {/* Timeline cursor */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50"
            style={{
              left: `${currentTime * timelineZoom}px`,
            }}
          />
          {/* Timeline elements */}
          <div className="w-full">
            <div className="relative h-16 z-10">
              <VideoTimeline />
            </div>

            <div className="relative h-16 z-10">
              <AudioTimeline />
            </div>

            <div className="relative h-16 z-10">
              <ImageTimeline />
            </div>

            <div className="relative h-16 z-10">
              <TextTimeline />
            </div>
          </div>
        </div>
      </div>
      <GlobalKeyHandlerProps
        handleDuplicate={handleDuplicate}
        handleSplit={handleSplit}
        handleDelete={handleDelete}
      />
    </div>
  );
};

export default memo(Timeline);
