import { FolderOpen } from "lucide-react";
import Tooltip from "../../Tooltip";

export default function LibraryButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip content="Library">
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-bg-hover transition-colors rounded"
        aria-label="Library"
      >
        <FolderOpen size={20} />
      </button>
    </Tooltip>
  );
}
