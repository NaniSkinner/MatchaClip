"use client";

import { useState } from "react";
import Image from "next/image";
import { validateVideoFile } from "../../../lib/file-validation";
import toast from "react-hot-toast";

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  accept?: string[];
  maxSize?: number; // in bytes
  multiple?: boolean;
}

export default function DragDropZone({
  onFilesDropped,
  accept = [".mp4", ".mov"],
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB default
  multiple = true,
}: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  // Validate files
  const validateFiles = (
    fileList: FileList
  ): { valid: File[]; invalid: File[] } => {
    const files = Array.from(fileList);
    const valid: File[] = [];
    const invalid: File[] = [];

    files.forEach((file) => {
      // Check MIME type
      const validMimeTypes = ["video/mp4", "video/quicktime"];
      const isMimeValid = validMimeTypes.includes(file.type);

      // Check file extension
      const extension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."));
      const isExtensionValid = accept.some(
        (ext) => ext.toLowerCase() === extension
      );

      // Check file size
      const isSizeValid = file.size <= maxSize;

      if (isMimeValid && isExtensionValid && isSizeValid) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    return { valid, invalid };
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setIsInvalid(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsInvalid(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Basic validation first
    const { valid, invalid } = validateFiles(files);

    if (invalid.length > 0) {
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 2000);
      invalid.forEach((file) => {
        toast.error(`${file.name}: Invalid file type or size`);
      });
    }

    // Detailed validation for valid files
    if (valid.length > 0) {
      const validationPromises = valid.map((file) => validateVideoFile(file));
      const validationResults = await Promise.all(validationPromises);

      // Filter out files that failed detailed validation
      const detailedValidFiles: File[] = [];
      validationResults.forEach((result, index) => {
        if (result.valid) {
          detailedValidFiles.push(valid[index]);
          // Show warnings if any
          result.warnings.forEach((warning) => {
            toast(`${valid[index].name}: ${warning}`, { icon: "⚠️" });
          });
        } else {
          // Show errors
          result.errors.forEach((error) => {
            toast.error(`${valid[index].name}: ${error}`);
          });
        }
      });

      if (detailedValidFiles.length > 0) {
        onFilesDropped(detailedValidFiles);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative
        border-2 border-dashed rounded-lg p-8
        transition-all duration-200 ease-in-out
        cursor-pointer
        ${
          isInvalid
            ? "border-red-500 bg-red-500 bg-opacity-10"
            : isDragOver
            ? "border-[#D4E7C5] bg-[#D4E7C5] bg-opacity-10 scale-[1.02]"
            : "border-gray-600 hover:border-gray-500 hover:bg-gray-800 hover:bg-opacity-30"
        }
      `}
    >
      <div className="flex flex-col items-center justify-center space-y-3">
        <div
          className={`transition-transform duration-200 ${
            isDragOver ? "scale-110" : ""
          }`}
        >
          <Image
            alt="Upload"
            className={`${isDragOver || isInvalid ? "" : "invert"} opacity-60`}
            height={48}
            width={48}
            src="https://www.svgrepo.com/show/514275/upload-cloud.svg"
          />
        </div>

        {isInvalid ? (
          <div className="text-center">
            <p className="text-red-400 font-medium text-sm">
              Invalid file type or size
            </p>
            <p className="text-red-300 text-xs mt-1">
              Only MP4 and MOV files under 2GB
            </p>
          </div>
        ) : isDragOver ? (
          <div className="text-center">
            <p className="text-[#D4E7C5] font-medium text-sm">
              Drop files here
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-400 font-medium text-sm">
              Drag & drop video files here
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Supports MP4 and MOV • Max 2GB per file
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
