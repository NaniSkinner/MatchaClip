import { Type } from "lucide-react";
import Tooltip from "../../Tooltip";

export default function TextButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip content="Text">
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-bg-hover transition-colors rounded"
        aria-label="Text"
      >
        <Type size={20} />
      </button>
    </Tooltip>
  );
}
