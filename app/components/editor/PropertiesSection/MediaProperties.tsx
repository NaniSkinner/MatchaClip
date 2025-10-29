"use client";

import { useAppSelector } from "../../../store";
import { setMediaFiles } from "../../../store/slices/projectSlice";
import { MediaFile } from "../../../types";
import { useAppDispatch } from "../../../store";

export default function MediaProperties() {
  const { mediaFiles, activeElementIndex } = useAppSelector(
    (state) => state.projectState
  );
  const mediaFile = mediaFiles[activeElementIndex];
  const dispatch = useAppDispatch();
  const onUpdateMedia = (id: string, updates: Partial<MediaFile>) => {
    dispatch(
      setMediaFiles(
        mediaFiles.map((media) =>
          media.id === id ? { ...media, ...updates } : media
        )
      )
    );
  };

  if (!mediaFile) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {/* Source Video */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Source Video
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Start (s)
              </label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.startTime}
                min={0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    startTime: Number(e.target.value),
                    endTime: mediaFile.endTime,
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                End (s)
              </label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.endTime}
                min={mediaFile.startTime}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    startTime: mediaFile.startTime,
                    endTime: Number(e.target.value),
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
          </div>
        </div>
        {/* Timing Position */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Timing Position
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Start (s)
              </label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.positionStart}
                min={0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    positionStart: Number(e.target.value),
                    positionEnd:
                      Number(e.target.value) +
                      (mediaFile.positionEnd - mediaFile.positionStart),
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                End (s)
              </label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.positionEnd}
                min={mediaFile.positionStart}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    positionEnd: Number(e.target.value),
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
          </div>
        </div>
        {/* Visual Properties */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Visual Properties
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                X Position
              </label>
              <input
                type="number"
                step="10"
                value={mediaFile.x || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { x: Number(e.target.value) })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Y Position
              </label>
              <input
                type="number"
                step="10"
                value={mediaFile.y || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { y: Number(e.target.value) })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Width</label>
              <input
                type="number"
                step="10"
                value={mediaFile.width || 100}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { width: Number(e.target.value) })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Height</label>
              <input
                type="number"
                step="10"
                value={mediaFile.height || 100}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    height: Number(e.target.value),
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Z-Index
              </label>
              <input
                type="number"
                value={mediaFile.zIndex || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    zIndex: Number(e.target.value),
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Opacity ({mediaFile.opacity}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={mediaFile.opacity}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    opacity: Number(e.target.value),
                  })
                }
                className="w-full h-1 bg-[#2A2A2A] border border-[#3F3F3F] rounded accent-[#9333EA] mt-2"
              />
            </div>
          </div>
        </div>
        {/* Audio Properties */}
        {(mediaFile.type === "video" || mediaFile.type === "audio") && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Audio Properties
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Volume ({mediaFile.volume}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={mediaFile.volume}
                  onChange={(e) =>
                    onUpdateMedia(mediaFile.id, {
                      volume: Number(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-[#2A2A2A] border border-[#3F3F3F] rounded accent-[#9333EA]"
                />
              </div>
              {/* TODO: Add playback speed */}
              {/* <div>
                            <label className="block text-sm">Speed</label>
                            <input
                                type="number"
                                min="0.1"
                                max="4"
                                step="0.1"
                                value={mediaFile.playbackSpeed || 1}
                                onChange={(e) => onUpdateMedia(mediaFile.id, { playbackSpeed: Number(e.target.value) })}
                                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
                            />
                        </div> */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
