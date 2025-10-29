"use client";
import { Video } from "lucide-react";
import { useAppDispatch } from "../../../../store";
import { openPanel } from "../../../../store/slices/recordingSlice";
import Tooltip from "../../Tooltip";

/**
 * RecordButton Component
 *
 * Button in Assets Panel sidebar to open the Recording Panel
 */
export default function RecordButton() {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    dispatch(openPanel());
  };

  return (
    <Tooltip content="Record (⌘⇧R)">
      <button
        onClick={handleClick}
        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-bg-hover transition-colors rounded"
        aria-label="Record screen"
      >
        <Video size={20} />
      </button>
    </Tooltip>
  );
}
