"use client";

import { useState } from "react";
import { TextElement } from "../../../../types";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { setTextElements } from "../../../../store/slices/projectSlice";
import toast from "react-hot-toast";

export default function AddTextButton() {
  const [textConfig, setTextConfig] = useState<Partial<TextElement>>({
    text: "Example",
    positionStart: 0,
    positionEnd: 10,
    x: 600,
    y: 500,
    fontSize: 200,
    color: "#ff0000",
    backgroundColor: "transparent",
    align: "center",
    zIndex: 0,
    opacity: 100,
    rotation: 0,
    animation: "none",
  });
  const { textElements } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();

  const onAddText = (textElement: TextElement) => {
    dispatch(setTextElements([...textElements, textElement]));
  };

  const handleAddText = () => {
    const lastEnd =
      textElements.length > 0
        ? Math.max(...textElements.map((f) => f.positionEnd))
        : 0;

    const newTextElement: TextElement = {
      id: crypto.randomUUID(),
      text: textConfig.text || "",
      positionStart: lastEnd || 0,
      positionEnd: lastEnd + 10 || 10,
      x: textConfig.x || 0,
      y: textConfig.y || 0,
      width: textConfig.width,
      height: textConfig.height,
      font: textConfig.font || "Arial",
      fontSize: textConfig.fontSize || 24,
      color: textConfig.color || "#ffffff",
      backgroundColor: textConfig.backgroundColor || "transparent",
      align: textConfig.align || "center",
      zIndex: textConfig.zIndex || 0,
      opacity: textConfig.opacity || 100,
      rotation: textConfig.rotation || 0,
      fadeInDuration: textConfig.fadeInDuration,
      fadeOutDuration: textConfig.fadeOutDuration,
      animation: textConfig.animation || "none",
    };

    onAddText(newTextElement);
    // Reset form
    setTextConfig({
      text: "Example",
      positionStart: lastEnd,
      positionEnd: lastEnd + 10,
      x: 500,
      y: 600,
      fontSize: 200,
      color: "#ff0000",
      backgroundColor: "transparent",
      align: "center",
      zIndex: 0,
      opacity: 100,
      rotation: 0,
      animation: "none",
    });
    toast.success("Text added successfully.");
  };

  return (
    <div className="relative">
      {
        <div className="flex items-center justify-center z-50">
          <div className="p-3 rounded-lg w-full">
            <div className="space-y-3">
              {/* Text Content */}
              <div>
                <label className="text-sm font-medium mb-1 text-gray-200 block">
                  Text Content
                </label>
                <textarea
                  value={textConfig.text}
                  onChange={(e) =>
                    setTextConfig({ ...textConfig, text: e.target.value })
                  }
                  className="w-full p-2 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                />
              </div>

              {/* Start and End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Start Time (s)
                  </label>
                  <input
                    type="number"
                    value={textConfig.positionStart}
                    onChange={(e) =>
                      setTextConfig({
                        ...textConfig,
                        positionStart: Number(e.target.value),
                      })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    End Time (s)
                  </label>
                  <input
                    type="number"
                    value={textConfig.positionEnd}
                    onChange={(e) =>
                      setTextConfig({
                        ...textConfig,
                        positionEnd: Number(e.target.value),
                      })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                    min={0}
                  />
                </div>
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    X Position
                  </label>
                  <input
                    type="number"
                    value={textConfig.x}
                    onChange={(e) =>
                      setTextConfig({
                        ...textConfig,
                        x: Number(e.target.value),
                      })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Y Position
                  </label>
                  <input
                    type="number"
                    value={textConfig.y}
                    onChange={(e) =>
                      setTextConfig({
                        ...textConfig,
                        y: Number(e.target.value),
                      })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                  />
                </div>
              </div>

              {/* Font Size and Z-Index */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Font Size
                  </label>
                  <input
                    type="number"
                    value={textConfig.fontSize}
                    onChange={(e) =>
                      setTextConfig({
                        ...textConfig,
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Z-Index
                  </label>
                  <input
                    type="number"
                    value={textConfig.zIndex}
                    onChange={(e) =>
                      setTextConfig({
                        ...textConfig,
                        zIndex: Number(e.target.value),
                      })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                    min={0}
                  />
                </div>
              </div>

              {/* Font Type */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Font Type
                  </label>
                  <select
                    value={textConfig.font}
                    onChange={(e) =>
                      setTextConfig({ ...textConfig, font: e.target.value })
                    }
                    className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Inter">Inter</option>
                    <option value="Lato">Lato</option>
                  </select>
                </div>
              </div>

              {/* Text Color and Add Text Button */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={textConfig.color}
                    onChange={(e) =>
                      setTextConfig({ ...textConfig, color: e.target.value })
                    }
                    className="mt-1 block w-full h-8 bg-[#2A2A2A] rounded border-[#3F3F3F]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddText}
                    className="w-full px-3 py-1.5 bg-[#9333EA] text-white text-sm hover:bg-[#7E22CE] rounded transition-colors"
                  >
                    Add Text
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  );
}
