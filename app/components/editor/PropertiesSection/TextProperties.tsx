"use client";

import { useAppSelector } from "../../../store";
import { setTextElements } from "../../../store/slices/projectSlice";
import { TextElement } from "../../../types";
import { useAppDispatch } from "../../../store";

export default function TextProperties() {
  const { textElements, activeElementIndex } = useAppSelector(
    (state) => state.projectState
  );
  const textElement = textElements[activeElementIndex];
  const dispatch = useAppDispatch();

  const onUpdateText = (id: string, updates: Partial<TextElement>) => {
    dispatch(
      setTextElements(
        textElements.map((text) =>
          text.id === id ? { ...text, ...updates } : text
        )
      )
    );
  };

  if (!textElement) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {/* Text Content */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Text Content
          </h4>
          <div>
            <textarea
              value={textElement.text}
              onChange={(e) =>
                onUpdateText(textElement.id, { text: e.target.value })
              }
              className="w-full p-2 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              rows={3}
            />
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
                value={textElement.positionStart}
                min={0}
                readOnly={true}
                onChange={(e) =>
                  onUpdateText(textElement.id, {
                    positionStart: Number(e.target.value),
                    positionEnd:
                      Number(e.target.value) +
                      (textElement.positionEnd - textElement.positionStart),
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
                value={textElement.positionEnd}
                min={textElement.positionStart}
                onChange={(e) =>
                  onUpdateText(textElement.id, {
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
                value={textElement.x || 0}
                onChange={(e) =>
                  onUpdateText(textElement.id, { x: Number(e.target.value) })
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
                value={textElement.y || 0}
                onChange={(e) =>
                  onUpdateText(textElement.id, { y: Number(e.target.value) })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Font Size
              </label>
              <input
                type="number"
                step="5"
                value={textElement.fontSize || 24}
                onChange={(e) =>
                  onUpdateText(textElement.id, {
                    fontSize: Number(e.target.value),
                  })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
            </div>
            {/* Font Type */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Font Type
              </label>
              <select
                value={textElement.font}
                onChange={(e) =>
                  onUpdateText(textElement.id, { font: e.target.value })
                }
                className="w-full p-1.5 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              >
                <option value="Arial">Arial</option>
                <option value="Inter">Inter</option>
                <option value="Lato">Lato</option>
              </select>
            </div>
          </div>
        </div>
        {/* Style Properties */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Style Properties
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Text Color
              </label>
              <input
                type="color"
                value={textElement.color || "#ffffff"}
                onChange={(e) =>
                  onUpdateText(textElement.id, { color: e.target.value })
                }
                className="w-full h-8 bg-[#2A2A2A] border border-[#3F3F3F] rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Opacity ({textElement.opacity}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={textElement.opacity}
                onChange={(e) =>
                  onUpdateText(textElement.id, {
                    opacity: Number(e.target.value),
                  })
                }
                className="w-full h-1 bg-[#2A2A2A] border border-[#3F3F3F] rounded accent-[#9333EA] mt-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
