"use client";

import FfmpegRender from "./FfmpegRender";
import RenderOptions from "./RenderOptions";

/**
 * Ffmpeg Export Component
 * Now uses native FFmpeg via Electron IPC instead of FFmpeg.wasm
 */
export default function Ffmpeg() {
  return (
    <div className="flex flex-col justify-center items-center py-2">
      <RenderOptions />
      <FfmpegRender />
    </div>
  );
}
