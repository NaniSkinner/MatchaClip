import React from "react";
import { AbsoluteFill, Img, Sequence } from "remotion";
import { MediaFile } from "@/app/types";

const REMOTION_SAFE_FRAME = 0;

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  editableTextId?: string | null;
  currentTime?: number;
}

const calculateFrames = (
  display: { from: number; to: number },
  fps: number
) => {
  const from = display.from * fps;
  const to = display.to * fps;
  const durationInFrames = Math.max(1, to - from);
  return { from, durationInFrames };
};

interface ImageSequenceItemProps {
  item: MediaFile;
  options: SequenceItemOptions;
}

export const ImageSequenceItem: React.FC<ImageSequenceItemProps> = ({
  item,
  options,
}) => {
  const { fps } = options;

  const { from, durationInFrames } = calculateFrames(
    {
      from: item.positionStart,
      to: item.positionEnd,
    },
    fps
  );

  // Ensure width and height are valid numbers
  const safeWidth =
    typeof item.width === "number" && !isNaN(item.width) ? item.width : 1920;
  const safeHeight =
    typeof item.height === "number" && !isNaN(item.height) ? item.height : 1080;

  // Ensure crop dimensions are valid numbers (protect against NaN from corrupted state)
  const crop = item.crop || {
    x: 0,
    y: 0,
    width: safeWidth,
    height: safeHeight,
  };

  const safeCropWidth =
    typeof crop.width === "number" && !isNaN(crop.width)
      ? crop.width
      : safeWidth;
  const safeCropHeight =
    typeof crop.height === "number" && !isNaN(crop.height)
      ? crop.height
      : safeHeight;
  const safeCropX = typeof crop.x === "number" && !isNaN(crop.x) ? crop.x : 0;
  const safeCropY = typeof crop.y === "number" && !isNaN(crop.y) ? crop.y : 0;

  // Don't render if there's no valid src
  if (!item.src) {
    return null;
  }

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames + REMOTION_SAFE_FRAME}
      style={{ pointerEvents: "none" }}
    >
      <AbsoluteFill
        data-track-item="transition-element"
        className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
        style={{
          pointerEvents: "auto",
          top: item.y || 0,
          left: item.x || 0,
          width: safeCropWidth,
          height: safeCropHeight,
          // transform: item?.transform || "none",
          opacity: item?.opacity !== undefined ? item.opacity / 100 : 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: safeWidth,
            height: safeHeight,
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <Img
            style={{
              pointerEvents: "none",
              top: -safeCropY || 0,
              left: -safeCropX || 0,
              width: safeWidth,
              height: safeHeight,
              position: "absolute",
              zIndex: item.zIndex || 0,
            }}
            data-id={item.id}
            src={item.src}
          />
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};
