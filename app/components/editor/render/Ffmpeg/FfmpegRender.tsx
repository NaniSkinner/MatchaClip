"use client";
import { useEffect, useRef, useState } from "react";
import { getFile, useAppSelector } from "@/app/store";
import Image from "next/image";
import { extractConfigs } from "@/app/utils/extractConfigs";
import { mimeToExt } from "@/app/types";
import { toast } from "react-hot-toast";
import { useNativeFFmpegExport } from "@/app/hooks/useNativeFFmpegExport";

interface FileUploaderProps {
  // Keeping these for backward compatibility but won't use them
  loadFunction?: () => Promise<void>;
  loadFfmpeg?: boolean;
  ffmpeg?: any;
  logMessages?: string;
}
export default function FfmpegRender({}: FileUploaderProps) {
  const { mediaFiles, projectName, exportSettings, duration, textElements } =
    useAppSelector((state) => state.projectState);
  const totalDuration = duration;
  const [showModal, setShowModal] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Use native FFmpeg hook
  const { exportVideo, progress, isExporting, error, isFFmpegAvailable } =
    useNativeFFmpegExport();

  // Show error toast when export error occurs
  useEffect(() => {
    if (error) {
      toast.error(`Export failed: ${error}`);
    }
  }, [error]);

  const handleCloseModal = () => {
    setShowModal(false);
    setIsRendering(false);
    setExportedFilePath(null);
  };

  const render = async () => {
    // Validate that we have content to render
    if (mediaFiles.length === 0 && textElements.length === 0) {
      toast.error(
        "No media or text elements to export. Please add content first."
      );
      return;
    }

    // Validate that all media files are accessible
    for (const media of mediaFiles) {
      try {
        const file = await getFile(media.fileId);
        if (!file) {
          toast.error(
            `Media file "${media.fileName}" is missing. Cannot export.`
          );
          return;
        }
      } catch (error) {
        console.error(`Failed to access file ${media.fileId}:`, error);
        toast.error(
          `Cannot access media file "${media.fileName}". Cannot export.`
        );
        return;
      }
    }

    // Validate duration
    if (!totalDuration || totalDuration <= 0) {
      toast.error(
        "Invalid project duration. Please ensure your media has valid timing."
      );
      return;
    }

    setShowModal(true);
    setIsRendering(true);

    const renderFunction = async () => {
      const params = extractConfigs(exportSettings);

      try {
        const filters = [];
        const overlays = [];
        const inputs = [];
        const audioDelays = [];
        const mediaFilesToExport: Array<{
          filename: string;
          data: ArrayBuffer;
        }> = [];

        // Create base black background
        filters.push(
          `color=c=black:size=1920x1080:d=${totalDuration.toFixed(3)}[base]`
        );
        // Sort videos by zIndex ascending (lowest drawn first)
        const sortedMediaFiles = [...mediaFiles].sort(
          (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
        );

        for (let i = 0; i < sortedMediaFiles.length; i++) {
          // timing
          const { startTime, positionStart, positionEnd } = sortedMediaFiles[i];
          const duration = positionEnd - positionStart;

          // Validate timing values
          if (isNaN(duration) || duration <= 0) {
            throw new Error(
              `Invalid duration for media file "${sortedMediaFiles[i].fileName}"`
            );
          }

          // get the file data and prepare for export
          const fileData = await getFile(sortedMediaFiles[i].fileId);
          if (!fileData) {
            throw new Error(`File not found: ${sortedMediaFiles[i].fileName}`);
          }
          const buffer = await fileData.arrayBuffer();
          const ext =
            mimeToExt[fileData.type as keyof typeof mimeToExt] ||
            fileData.type.split("/")[1];

          // Add to media files array for IPC
          mediaFilesToExport.push({
            filename: `input${i}.${ext}`,
            data: buffer,
          });

          // TODO: currently we have to write same file if it's used more than once in different clips the below approach is a good start to change this
          // let wroteFiles = new Map<string, string>();
          // const { fileId, type } = sortedMediaFiles[i];
          // let inputFilename: string;

          // if (wroteFiles.has(fileId)) {
          //     inputFilename = wroteFiles.get(fileId)!;
          // } else {
          //     const fileData = await getFile(fileId);
          //     const buffer = await fileData.arrayBuffer();
          //     const ext = mimeToExt[fileData.type as keyof typeof mimeToExt] || fileData.type.split('/')[1];
          //     inputFilename = `input_${fileId}.${ext}`;
          //     await ffmpeg.writeFile(inputFilename, new Uint8Array(buffer));
          //     wroteFiles.set(fileId, inputFilename);
          // }

          if (sortedMediaFiles[i].type === "image") {
            inputs.push(
              "-loop",
              "1",
              "-t",
              duration.toFixed(3),
              "-i",
              `input${i}.${ext}`
            );
          } else {
            inputs.push("-i", `input${i}.${ext}`);
          }

          const visualLabel = `visual${i}`;
          const audioLabel = `audio${i}`;

          // Shift clip to correct place on timeline (video)
          if (sortedMediaFiles[i].type === "video") {
            filters.push(
              `[${i}:v]trim=start=${startTime.toFixed(
                3
              )}:duration=${duration.toFixed(3)},scale=${
                sortedMediaFiles[i].width
              }:${
                sortedMediaFiles[i].height
              }:force_original_aspect_ratio=decrease,pad=${
                sortedMediaFiles[i].width
              }:${
                sortedMediaFiles[i].height
              }:(ow-iw)/2:(oh-ih)/2:black,setpts=PTS-STARTPTS+${positionStart.toFixed(
                3
              )}/TB[${visualLabel}]`
            );
          }
          if (sortedMediaFiles[i].type === "image") {
            filters.push(
              `[${i}:v]scale=${sortedMediaFiles[i].width}:${
                sortedMediaFiles[i].height
              }:force_original_aspect_ratio=decrease,pad=${
                sortedMediaFiles[i].width
              }:${
                sortedMediaFiles[i].height
              }:(ow-iw)/2:(oh-ih)/2:black,setpts=PTS+${positionStart.toFixed(
                3
              )}/TB[${visualLabel}]`
            );
          }

          // Apply opacity
          if (
            sortedMediaFiles[i].type === "video" ||
            sortedMediaFiles[i].type === "image"
          ) {
            const alpha = Math.min(
              Math.max((sortedMediaFiles[i].opacity || 100) / 100, 0),
              1
            );
            filters.push(
              `[${visualLabel}]format=yuva420p,colorchannelmixer=aa=${alpha}[${visualLabel}]`
            );
          }

          // Store overlay range that matches shifted time
          if (
            sortedMediaFiles[i].type === "video" ||
            sortedMediaFiles[i].type === "image"
          ) {
            overlays.push({
              label: visualLabel,
              x: sortedMediaFiles[i].x,
              y: sortedMediaFiles[i].y,
              start: positionStart.toFixed(3),
              end: positionEnd.toFixed(3),
            });
          }

          // Audio: trim, then delay (in ms)
          if (
            sortedMediaFiles[i].type === "audio" ||
            sortedMediaFiles[i].type === "video"
          ) {
            const delayMs = Math.round(positionStart * 1000);
            const volume =
              sortedMediaFiles[i].volume !== undefined
                ? sortedMediaFiles[i].volume / 100
                : 1;
            filters.push(
              `[${i}:a]atrim=start=${startTime.toFixed(
                3
              )}:duration=${duration.toFixed(
                3
              )},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${volume}[${audioLabel}]`
            );
            audioDelays.push(`[${audioLabel}]`);
          }
        }

        // Apply overlays in z-index order
        let lastLabel = "base";
        if (overlays.length > 0) {
          for (let i = 0; i < overlays.length; i++) {
            const { label, start, end, x, y } = overlays[i];
            const nextLabel = i === overlays.length - 1 ? "outv" : `tmp${i}`;
            filters.push(
              `[${lastLabel}][${label}]overlay=${x}:${y}:enable='between(t\\,${start}\\,${end})'[${nextLabel}]`
            );
            lastLabel = nextLabel;
          }
        }

        // Load and prepare fonts
        const fontsToExport: Array<{ filename: string; data: ArrayBuffer }> =
          [];
        if (textElements.length > 0) {
          let fontNames = ["Arial", "Inter", "Lato"];
          for (let i = 0; i < fontNames.length; i++) {
            const font = fontNames[i];
            const res = await fetch(`/fonts/${font}.ttf`);
            const fontBuf = await res.arrayBuffer();
            fontsToExport.push({
              filename: `font${font}.ttf`,
              data: fontBuf,
            });
          }
          // Apply text
          for (let i = 0; i < textElements.length; i++) {
            const text = textElements[i];
            const label = i === textElements.length - 1 ? "outv" : `text${i}`;
            const escapedText = text.text
              .replace(/:/g, "\\:")
              .replace(/'/g, "\\\\'");
            const alpha = Math.min(Math.max((text.opacity ?? 100) / 100, 0), 1);
            const color = text.color?.includes("@")
              ? text.color
              : `${text.color || "white"}@${alpha}`;
            filters.push(
              `[${lastLabel}]drawtext=fontfile=font${
                text.font
              }.ttf:text='${escapedText}':x=${text.x}:y=${text.y}:fontsize=${
                text.fontSize || 24
              }:fontcolor=${color}:enable='between(t\\,${
                text.positionStart
              }\\,${text.positionEnd})'[${label}]`
            );
            lastLabel = label;
          }
        }

        // Mix all audio tracks
        if (audioDelays.length > 0) {
          const audioMix = audioDelays.join("");
          filters.push(
            `${audioMix}amix=inputs=${audioDelays.length}:normalize=0[outa]`
          );
        }

        // Ensure [outv] label exists (in case no overlays/text were added)
        if (!filters.some((f) => f.includes("[outv]"))) {
          filters.push("[base]format=yuv420p,setsar=1[outv]");
        }

        // Final filter_complex
        const complexFilter = filters.join("; ");
        console.log("=== RENDER DEBUG ===");
        console.log("Total duration:", totalDuration);
        console.log("Number of media files:", sortedMediaFiles.length);
        console.log("Audio tracks:", audioDelays.length);
        console.log("Text elements:", textElements.length);
        console.log("All filters:", filters);
        console.log("Complex filter:", complexFilter);

        // Force overwrite with -y to prevent WASM prompt failures
        const ffmpegArgs = ["-y", ...inputs];

        ffmpegArgs.push("-filter_complex", complexFilter, "-map", "[outv]");

        // Audio policy: map + encode if exists, disable with -an if not
        if (audioDelays.length > 0) {
          ffmpegArgs.push(
            "-map",
            "[outa]",
            "-shortest",
            "-c:a",
            "aac",
            "-b:a",
            params.audioBitrate,
            "-ar",
            "44100"
          );
        } else {
          ffmpegArgs.push("-an");
        }

        // Video codec and QuickTime-compatible container settings
        ffmpegArgs.push(
          "-c:v",
          "libx264",
          "-profile:v",
          "main",
          "-level",
          "4.0",
          "-pix_fmt",
          "yuv420p",
          "-preset",
          params.preset,
          "-crf",
          params.crf.toString(),
          "-movflags",
          "+faststart",
          "-t",
          totalDuration.toFixed(3)
          // Note: output path is passed separately to IPC handler
        );

        console.log("FFmpeg command:", ffmpegArgs.join(" "));

        // Call native FFmpeg export via Electron IPC
        console.log("[Native Export] Starting native FFmpeg export...");
        const outputPath = await exportVideo(
          ffmpegArgs,
          mediaFilesToExport,
          fontsToExport,
          `${projectName}.mp4`
        );

        console.log(
          "[Native Export] Export completed successfully:",
          outputPath
        );
        return outputPath;
      } catch (err) {
        console.error("FFmpeg processing error:", err);
        throw new Error(
          `FFmpeg failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };

    // Run the function and handle the result/error
    try {
      const outputPath = await renderFunction();
      setExportedFilePath(outputPath);
      setIsRendering(false);
      toast.success(`Video exported successfully to: ${outputPath}`);
    } catch (err) {
      toast.error("Failed to render video");
      console.error("Failed to render video:", err);
      setIsRendering(false);
    }
  };

  return (
    <>
      {/* Render Button */}
      <button
        onClick={() => render()}
        className={`inline-flex items-center p-3 bg-white hover:bg-[#ccc] rounded-lg disabled:opacity-50 text-gray-900 font-bold transition-all transform`}
        disabled={
          !isFFmpegAvailable ||
          isRendering ||
          isExporting ||
          (mediaFiles.length === 0 && textElements.length === 0)
        }
      >
        {(!isFFmpegAvailable || isRendering || isExporting) && (
          <span className="animate-spin mr-2">
            <svg
              viewBox="0 0 1024 1024"
              focusable="false"
              data-icon="loading"
              width="1em"
              height="1em"
            >
              <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
            </svg>
          </span>
        )}
        <p>
          {!isFFmpegAvailable
            ? "Loading FFmpeg..."
            : isRendering || isExporting
            ? "Exporting..."
            : "Export Video"}
        </p>
      </button>

      {/* Render Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-9999">
          <div className="bg-black rounded-xl shadow-lg p-6 max-w-xl w-full">
            {/* Title and close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {isRendering ? "Rendering..." : `${projectName}`}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-white text-4xl font-bold hover:text-red-400"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {isRendering || isExporting ? (
              <div>
                <div className="bg-black p-4 rounded">
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Export Progress</span>
                      <span className="text-sm font-bold">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                      <div
                        className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Using native FFmpeg for faster, more reliable export...
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {exportedFilePath && (
                  <div className="bg-green-900 p-4 rounded mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Export Complete!
                    </h3>
                    <p className="text-sm text-gray-300 mb-2">
                      Video saved to:
                    </p>
                    <p className="text-xs font-mono bg-black p-2 rounded break-all">
                      {exportedFilePath}
                    </p>
                    <button
                      onClick={() => {
                        // Copy path to clipboard
                        navigator.clipboard.writeText(exportedFilePath);
                        toast.success("Path copied to clipboard!");
                      }}
                      className="mt-3 inline-flex items-center p-2 bg-white hover:bg-gray-200 rounded text-gray-900 text-sm font-medium"
                    >
                      Copy Path
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
