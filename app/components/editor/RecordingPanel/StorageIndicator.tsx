"use client";
import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { getStorageUsage } from "../../../lib/recording-storage";

/**
 * StorageIndicator Component
 *
 * Displays storage usage and quota information
 */
export default function StorageIndicator() {
  const [storage, setStorage] = useState({
    usedBytes: 0,
    quotaBytes: 0,
    percentUsed: 0,
    available: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStorageUsage = async () => {
    try {
      const usage = await getStorageUsage();
      setStorage(usage);
    } catch (error) {
      console.error("Error fetching storage usage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageUsage();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStorageUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStorageColor = () => {
    if (storage.percentUsed >= 95) return "text-red-400";
    if (storage.percentUsed >= 80) return "text-orange-400";
    if (storage.percentUsed >= 60) return "text-yellow-400";
    return "text-green-400";
  };

  const getProgressBarColor = () => {
    if (storage.percentUsed >= 95) return "bg-red-500";
    if (storage.percentUsed >= 80) return "bg-orange-500";
    if (storage.percentUsed >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        Loading storage info...
      </div>
    );
  }

  if (storage.quotaBytes === 0) {
    return (
      <div className="text-xs text-gray-500 text-center py-2">
        Storage info unavailable
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HardDrive size={14} className="text-gray-500" />
          <span className="text-xs text-gray-400">Storage</span>
        </div>
        <span className={`text-xs font-medium ${getStorageColor()}`}>
          {storage.percentUsed.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
          style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
        />
      </div>

      {/* Usage Text */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBytes(storage.usedBytes)}</span>
        <span>{formatBytes(storage.quotaBytes)}</span>
      </div>

      {/* Warning */}
      {storage.percentUsed >= 80 && (
        <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400">
          {storage.percentUsed >= 95
            ? "Storage almost full! Delete old recordings."
            : "Storage getting full. Consider cleaning up."}
        </div>
      )}
    </div>
  );
}
