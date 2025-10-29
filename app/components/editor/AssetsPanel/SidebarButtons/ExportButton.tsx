import { Upload } from "lucide-react";
import Tooltip from "../../Tooltip";

export default function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip content="Export">
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-bg-hover transition-colors rounded"
        aria-label="Export"
      >
        <Upload size={20} />
      </button>
    </Tooltip>
  );
}
