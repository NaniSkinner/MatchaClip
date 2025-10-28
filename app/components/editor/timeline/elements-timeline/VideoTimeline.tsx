import React, { useRef, useCallback, useMemo } from "react";
import Moveable, { OnScale, OnDrag, OnResize, OnRotate } from "react-moveable";
import { useAppSelector } from "@/app/store";
import {
  setActiveElement,
  setActiveElementIndex,
  setMediaFiles,
  setTrimStart,
  setTrimEnd,
} from "@/app/store/slices/projectSlice";
import { memo, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Image from "next/image";
import Header from "../Header";
import { MediaFile } from "@/app/types";
import { debounce, throttle } from "lodash";
import TrimMarker from "../TrimMarker";
import { sourceTimeToClipRelativePixels } from "@/app/lib/timeline-coordinates";

export default function VideoTimeline() {
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { mediaFiles, activeElement, activeElementIndex, timelineZoom } =
    useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const moveableRef = useRef<Record<string, Moveable | null>>({});

  // this affect the performance cause of too much re-renders

  // const onUpdateMedia = (id: string, updates: Partial<MediaFile>) => {
  //     dispatch(setMediaFiles(mediaFiles.map(media =>
  //         media.id === id ? { ...media, ...updates } : media
  //     )));
  // };

  // TODO: this is a hack to prevent the mediaFiles from being updated too often while dragging or resizing
  const mediaFilesRef = useRef(mediaFiles);
  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  const onUpdateMedia = useMemo(
    () =>
      throttle((id: string, updates: Partial<MediaFile>) => {
        const currentFiles = mediaFilesRef.current;
        const updated = currentFiles.map((media) =>
          media.id === id ? { ...media, ...updates } : media
        );
        dispatch(setMediaFiles(updated));
      }, 16), // ~60fps for smooth dragging
    [dispatch]
  );

  const handleClick = (element: string, index: number | string) => {
    if (element === "media") {
      dispatch(setActiveElement("media") as any);
      // TODO: cause we pass id when media to find the right index i will change this later (this happens cause each timeline pass its index not index from mediaFiles array)
      const actualIndex = mediaFiles.findIndex(
        (clip) => clip.id === (index as unknown as string)
      );
      dispatch(setActiveElementIndex(actualIndex));
    }
  };

  const handleDrag = (clip: MediaFile, target: HTMLElement, left: number) => {
    // no negative left
    const constrainedLeft = Math.max(left, 0);
    const newPositionStart = constrainedLeft / timelineZoom;
    onUpdateMedia(clip.id, {
      positionStart: newPositionStart,
      positionEnd: newPositionStart - clip.positionStart + clip.positionEnd,
      endTime: Math.max(
        newPositionStart - clip.positionStart + clip.endTime,
        clip.endTime
      ),
    });

    target.style.left = `${constrainedLeft}px`;
  };

  const handleRightResize = (
    clip: MediaFile,
    target: HTMLElement,
    width: number
  ) => {
    const newPositionEnd = width / timelineZoom;

    onUpdateMedia(clip.id, {
      positionEnd: clip.positionStart + newPositionEnd,
      endTime: Math.max(clip.positionStart + newPositionEnd, clip.endTime),
    });
  };
  const handleLeftResize = (
    clip: MediaFile,
    target: HTMLElement,
    width: number
  ) => {
    const newPositionStart = width / timelineZoom;
    // Ensure we do not resize beyond the right edge of the clip
    const constrainedLeft = Math.max(
      clip.positionStart +
        (clip.positionEnd - clip.positionStart - newPositionStart),
      0
    );

    onUpdateMedia(clip.id, {
      positionStart: constrainedLeft,
      startTime: constrainedLeft,
    });
  };

  // Handle trim marker dragging - Use Redux actions
  const handleTrimInDrag = (clipId: string, sourceTime: number) => {
    dispatch(setTrimStart({ clipId, sourceSeconds: sourceTime }));
  };

  const handleTrimOutDrag = (clipId: string, sourceTime: number) => {
    dispatch(setTrimEnd({ clipId, sourceSeconds: sourceTime }));
  };

  useEffect(() => {
    for (const clip of mediaFiles) {
      moveableRef.current[clip.id]?.updateRect();
    }
  }, [timelineZoom]);

  return (
    <div className="timeline-track">
      {mediaFiles
        .filter((clip) => clip.type === "video")
        .map((clip) => {
          const clipWidth =
            (clip.positionEnd / clip.playbackSpeed -
              clip.positionStart / clip.playbackSpeed) *
            timelineZoom;
          const clipLeft = clip.positionStart * timelineZoom;
          const duration = clip.duration || clip.endTime - clip.startTime;
          const isActive =
            activeElement === "media" &&
            mediaFiles[activeElementIndex]?.id === clip.id;

          // Calculate trim marker positions using coordinate utilities
          const trimInPosition =
            sourceTimeToClipRelativePixels(
              clip.startTime,
              clip,
              timelineZoom
            ) || 0;
          const trimOutPosition =
            sourceTimeToClipRelativePixels(clip.endTime, clip, timelineZoom) ||
            clipWidth;

          return (
            <div key={clip.id} className="relative">
              <div
                key={clip.id}
                ref={(el: HTMLDivElement | null) => {
                  if (el) {
                    targetRefs.current[clip.id] = el;
                  }
                }}
                onClick={(e) => {
                  // Only handle click if not clicking on a trim marker
                  if ((e.target as HTMLElement).closest(".z-40")) return;
                  handleClick("media", clip.id);
                }}
                className={`timeline-clip absolute border border-gray-500 border-opacity-50 rounded-md top-2 h-12 bg-[#27272A] text-white text-sm flex items-center justify-center cursor-pointer overflow-visible ${
                  isActive ? "bg-[#3F3F46] border-blue-500" : ""
                }`}
                style={{
                  left: `${clipLeft}px`,
                  width: `${clipWidth}px`,
                  zIndex: clip.zIndex,
                }}
              >
                {/* Trimmed region overlays */}
                {isActive && (
                  <>
                    {/* Left trimmed region (before in-point) */}
                    {trimInPosition > 0 && (
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-gray-900 bg-opacity-60 pointer-events-none"
                        style={{
                          width: `${trimInPosition}px`,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.3) 5px, rgba(0,0,0,0.3) 10px)",
                        }}
                      />
                    )}

                    {/* Right trimmed region (after out-point) */}
                    {trimOutPosition < clipWidth && (
                      <div
                        className="absolute top-0 right-0 bottom-0 bg-gray-900 bg-opacity-60 pointer-events-none"
                        style={{
                          width: `${clipWidth - trimOutPosition}px`,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.3) 5px, rgba(0,0,0,0.3) 10px)",
                        }}
                      />
                    )}
                  </>
                )}

                {/* Clip content */}
                <Image
                  alt="Video"
                  className="h-7 w-7 min-w-6 mr-2 shrink-0 relative z-10"
                  height={30}
                  width={30}
                  src="https://www.svgrepo.com/show/532727/video.svg"
                />
                <span className="truncate text-x relative z-10">
                  {clip.fileName}
                </span>

                {/* Trim markers - now use clip object directly */}
                {isActive && (
                  <>
                    <TrimMarker
                      key={`in-${clip.id}`}
                      type="in"
                      clip={clip}
                      onDrag={(sourceTime) =>
                        handleTrimInDrag(clip.id, sourceTime)
                      }
                      isActive={isActive}
                      timelineZoom={timelineZoom}
                    />
                    <TrimMarker
                      key={`out-${clip.id}`}
                      type="out"
                      clip={clip}
                      onDrag={(sourceTime) =>
                        handleTrimOutDrag(clip.id, sourceTime)
                      }
                      isActive={isActive}
                      timelineZoom={timelineZoom}
                    />
                  </>
                )}
              </div>
              <Moveable
                ref={(el: Moveable | null) => {
                  if (el) {
                    moveableRef.current[clip.id] = el;
                  }
                }}
                target={targetRefs.current[clip.id] || null}
                container={null}
                renderDirections={
                  activeElement === "media" &&
                  mediaFiles[activeElementIndex].id === clip.id
                    ? ["w", "e"]
                    : []
                }
                draggable={true}
                throttleDrag={0}
                rotatable={false}
                onDragStart={({ target, clientX, clientY, inputEvent }) => {
                  // Prevent drag if clicking on a trim marker
                  const targetElement = inputEvent.target as HTMLElement;
                  if (targetElement.closest(".z-40")) {
                    return false;
                  }
                }}
                onDrag={({
                  target,
                  beforeDelta,
                  beforeDist,
                  left,
                  right,
                  delta,
                  dist,
                  transform,
                }: OnDrag) => {
                  handleClick("media", clip.id);
                  handleDrag(clip, target as HTMLElement, left);
                }}
                onDragEnd={({ target, isDrag, clientX, clientY }) => {}}
                /* resizable*/
                resizable={true}
                throttleResize={0}
                onResizeStart={({ target, clientX, clientY }) => {}}
                onResize={({ target, width, delta, direction }: OnResize) => {
                  if (direction[0] === 1) {
                    handleClick("media", clip.id);
                    delta[0] && (target!.style.width = `${width}px`);
                    handleRightResize(clip, target as HTMLElement, width);
                  } else if (direction[0] === -1) {
                    // TODO: handle left resize
                    // handleClick('media', clip.id)
                    // delta[0] && (target!.style.width = `${width}px`);
                    // handleLeftResize(clip, target as HTMLElement, width);
                  }
                }}
                onResizeEnd={({ target, isDrag, clientX, clientY }) => {}}
              />
            </div>
          );
        })}
    </div>
  );
}
