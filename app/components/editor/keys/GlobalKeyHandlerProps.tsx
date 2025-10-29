"use client";
import { useAppSelector } from "@/app/store";
import { useEffect, useRef, useState } from "react";
import {
  setIsPlaying,
  setIsMuted,
  setCurrentTime,
  setMarkerTrack,
  setInPoint,
  setOutPoint,
  clearInOutPoints,
} from "@/app/store/slices/projectSlice";
import { openPanel } from "@/app/store/slices/recordingSlice";
import { useDispatch } from "react-redux";
import { useRecordingSession } from "@/app/hooks/useRecordingSession";
import toast from "react-hot-toast";

interface GlobalKeyHandlerProps {
  handleDuplicate: () => void;
  handleSplit: () => void;
  handleDelete: () => void;
}

const GlobalKeyHandler = ({
  handleDuplicate,
  handleSplit,
  handleDelete,
}: GlobalKeyHandlerProps) => {
  const projectState = useAppSelector((state) => state.projectState);
  const recordingState = useAppSelector((state) => state.recording);
  const dispatch = useDispatch();
  const { stopRecordingAndSave } = useRecordingSession();

  const { duration } = projectState;

  // Store latest state values in refs
  const isPlayingRef = useRef(projectState.isPlaying);
  const isMutedRef = useRef(projectState.isMuted);
  const currentTimeRef = useRef(projectState.currentTime);
  const enableMarkerTrackingRef = useRef(projectState.enableMarkerTracking);
  const inPointRef = useRef(projectState.inPoint);
  const outPointRef = useRef(projectState.outPoint);

  useEffect(() => {
    isPlayingRef.current = projectState.isPlaying;
    isMutedRef.current = projectState.isMuted;
    currentTimeRef.current = projectState.currentTime;
    enableMarkerTrackingRef.current = projectState.enableMarkerTracking;
    inPointRef.current = projectState.inPoint;
    outPointRef.current = projectState.outPoint;
  }, [projectState]);

  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handleClick = () => setHasInteracted(true);
    window.addEventListener("click", handleClick, { once: true });
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!hasInteracted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isTyping) return;

      // Recording shortcuts (Cmd/Ctrl + Shift + R to open panel)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyR") {
        e.preventDefault();
        dispatch(openPanel());
        toast.success("Recording panel opened");
        return;
      }

      // Stop recording (Cmd/Ctrl + S when recording)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.code === "KeyS" &&
        recordingState.isRecording
      ) {
        e.preventDefault();
        stopRecordingAndSave();
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          dispatch(setIsPlaying(!isPlayingRef.current));
          break;
        case "KeyM":
          e.preventDefault();
          dispatch(setIsMuted(!isMutedRef.current));
          break;
        case "KeyD":
          e.preventDefault();
          handleDuplicate();
          break;
        case "KeyS":
          e.preventDefault();
          handleSplit();
          break;
        case "Delete":
          e.preventDefault();
          handleDelete();
          break;
        case "KeyT":
          e.preventDefault();
          dispatch(setMarkerTrack(!enableMarkerTrackingRef.current));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isPlayingRef.current) return;
          const nextTime =
            currentTimeRef.current + 0.01 > duration
              ? 0
              : currentTimeRef.current + 0.01;
          dispatch(setCurrentTime(nextTime));
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isPlayingRef.current) return;
          const prevTime =
            currentTimeRef.current - 0.01 > duration
              ? 0
              : currentTimeRef.current - 0.01;
          dispatch(setCurrentTime(prevTime));
          break;
        case "KeyI":
          e.preventDefault();
          const newInPoint = currentTimeRef.current;
          // Validate: can't be >= outPoint if outPoint is set
          if (
            outPointRef.current === null ||
            newInPoint < outPointRef.current
          ) {
            dispatch(setInPoint(newInPoint));
            toast.success(`In-point set at ${newInPoint.toFixed(2)}s`);
          } else {
            toast.error("In-point must be before out-point");
          }
          break;
        case "KeyO":
          e.preventDefault();
          const newOutPoint = currentTimeRef.current;
          // Validate: can't be <= inPoint if inPoint is set
          if (inPointRef.current === null || newOutPoint > inPointRef.current) {
            dispatch(setOutPoint(newOutPoint));
            toast.success(`Out-point set at ${newOutPoint.toFixed(2)}s`);
          } else {
            toast.error("Out-point must be after in-point");
          }
          break;
        case "KeyX":
          e.preventDefault();
          if (inPointRef.current !== null || outPointRef.current !== null) {
            dispatch(clearInOutPoints());
            toast.success("In/Out points cleared");
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasInteracted,
    handleDelete,
    handleDuplicate,
    handleSplit,
    duration,
    dispatch,
  ]);

  return null;
};

export default GlobalKeyHandler;
