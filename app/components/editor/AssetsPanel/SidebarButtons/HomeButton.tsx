"use client";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Tooltip from "../../Tooltip";

export default function HomeButton() {
  const router = useRouter();

  return (
    <Tooltip content="Home">
      <button
        onClick={() => router.push("/")}
        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:bg-bg-hover transition-colors rounded"
        aria-label="Home"
      >
        <Home size={20} />
      </button>
    </Tooltip>
  );
}
