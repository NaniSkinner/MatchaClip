import { storeProject, useAppDispatch, useAppSelector } from "@/app/store";
import { SequenceItem } from "./sequence-item";
import { MediaFile, TextElement } from "@/app/types";
import { useCurrentFrame, useVideoConfig } from "remotion";
import React, { use, useCallback, useEffect, useRef, useState } from "react";
import { setCurrentTime, setMediaFiles } from "@/app/store/slices/projectSlice";

const Composition = () => {
  const projectState = useAppSelector((state) => state.projectState);
  const { mediaFiles, textElements } = projectState;
  const frame = useCurrentFrame();
  const dispatch = useAppDispatch();

  const fps = 30; // Move before useEffect so it's accessible
  const THRESHOLD = 0.1; // Minimum change to trigger dispatch (in seconds)
  const previousTime = useRef(0); // Store previous time to track changes

  useEffect(() => {
    const currentTimeInSeconds = frame / fps;

    // Check if change exceeds threshold
    if (Math.abs(currentTimeInSeconds - previousTime.current) > THRESHOLD) {
      dispatch(setCurrentTime(currentTimeInSeconds));
      // Update previousTime to prevent infinite loop
      previousTime.current = currentTimeInSeconds;
    }
  }, [frame, dispatch]);
  return (
    <>
      {mediaFiles.map((item: MediaFile, index: number) => {
        if (!item) return null;
        const trackItem = {
          ...item,
        } as MediaFile;
        const element = SequenceItem[trackItem.type](trackItem, {
          fps,
        });
        // Clone element and add key at top level
        return React.cloneElement(element, {
          key: item.id || `media-${index}`,
        });
      })}
      {textElements.map((item: TextElement, index: number) => {
        if (!item) return null;
        const trackItem = {
          ...item,
        } as TextElement;
        const element = SequenceItem["text"](trackItem, {
          fps,
        });
        // Clone element and add key at top level
        return React.cloneElement(element, { key: item.id || `text-${index}` });
      })}
    </>
  );
};

export default Composition;
