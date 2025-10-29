import { Player, PlayerRef } from "@remotion/player";
import Composition from "./sequence/composition";
import { useAppSelector, useAppDispatch } from "@/app/store";
import { useRef, useEffect } from "react";
import { setIsPlaying } from "@/app/store/slices/projectSlice";
import { useDispatch } from "react-redux";

const fps = 30;

// Helper function to validate if a value is a valid number (not null, NaN, or Infinity)
const isValidNumber = (value: number | null): value is number => {
  return (
    value !== null &&
    typeof value === "number" &&
    !isNaN(value) &&
    isFinite(value)
  );
};

export const PreviewPlayer = () => {
  const projectState = useAppSelector((state) => state.projectState);
  const { duration, currentTime, isPlaying, isMuted, inPoint, outPoint } =
    projectState;
  const playerRef = useRef<PlayerRef>(null);
  const dispatch = useDispatch();

  // update frame when current time with marker
  useEffect(() => {
    const frame = Math.round(currentTime * fps);
    if (playerRef.current && !isPlaying) {
      playerRef.current.pause();
      playerRef.current.seekTo(frame);
    }
  }, [currentTime, fps]);

  useEffect(() => {
    playerRef?.current?.addEventListener("play", () => {
      dispatch(setIsPlaying(true));
    });
    playerRef?.current?.addEventListener("pause", () => {
      dispatch(setIsPlaying(false));
    });
    return () => {
      playerRef?.current?.removeEventListener("play", () => {
        dispatch(setIsPlaying(true));
      });
      playerRef?.current?.removeEventListener("pause", () => {
        dispatch(setIsPlaying(false));
      });
    };
  }, [playerRef]);

  // to control with keyboard and handle in-point start
  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      // If we have a valid in-point and current time is before it, seek to in-point
      if (isValidNumber(inPoint) && currentTime < inPoint) {
        playerRef.current.seekTo(Math.round(inPoint * fps));
      }
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying, inPoint, currentTime]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unmute();
    }
  }, [isMuted]);

  // Monitor for out-point during playback and auto-stop
  useEffect(() => {
    if (!isPlaying || !isValidNumber(outPoint) || !playerRef.current) return;

    const checkOutPoint = () => {
      if (playerRef.current) {
        const currentFrame = playerRef.current.getCurrentFrame();
        const currentSeconds = currentFrame / fps;

        // Stop at out-point
        if (currentSeconds >= outPoint) {
          playerRef.current.pause();
          playerRef.current.seekTo(Math.round(outPoint * fps));
          dispatch(setIsPlaying(false));
        }
      }
    };

    // Check every 100ms for smooth stopping
    const intervalId = setInterval(checkOutPoint, 100);
    return () => clearInterval(intervalId);
  }, [isPlaying, outPoint, fps, dispatch]);

  return (
    <Player
      ref={playerRef}
      component={Composition}
      inputProps={{}}
      durationInFrames={Math.max(1, Math.floor(duration * fps) + 1)}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={fps}
      style={{ width: "100%", height: "100%" }}
      controls
      clickToPlay={false}
      acknowledgeRemotionLicense
    />
  );
};
