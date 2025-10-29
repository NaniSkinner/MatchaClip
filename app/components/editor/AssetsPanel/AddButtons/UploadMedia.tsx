"use client";

import { useAppDispatch, useAppSelector } from "../../../../store";
import { setFilesID } from "../../../../store/slices/projectSlice";
import { storeFile } from "../../../../store";
import { validateVideoFile } from "../../../../lib/file-validation";
import toast from "react-hot-toast";
import { useState } from "react";

export default function AddMedia() {
  const { filesID } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();
  const [isValidating, setIsValidating] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    setIsValidating(true);
    const updatedFiles = [...(filesID || [])];
    let validCount = 0;
    let invalidCount = 0;

    for (const file of newFiles) {
      try {
        // Validate file
        const validationResult = await validateVideoFile(file);

        if (!validationResult.valid) {
          // Show error messages
          validationResult.errors.forEach((error) => {
            toast.error(`${file.name}: ${error}`);
          });
          invalidCount++;
          continue;
        }

        // Show warnings if any
        validationResult.warnings.forEach((warning) => {
          toast(`${file.name}: ${warning}`, {
            icon: "⚠️",
          });
        });

        // Store valid file
        const fileId = crypto.randomUUID();
        await storeFile(file, fileId);
        updatedFiles.push(fileId);
        validCount++;
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error(`Failed to process ${file.name}`);
        invalidCount++;
      }
    }

    dispatch(setFilesID(updatedFiles));
    setIsValidating(false);
    e.target.value = "";

    // Summary notification
    if (validCount > 0) {
      toast.success(
        `Successfully imported ${validCount} file${validCount > 1 ? "s" : ""}`
      );
    }
    if (invalidCount > 0) {
      toast.error(
        `${invalidCount} file${invalidCount > 1 ? "s were" : " was"} rejected`
      );
    }
  };

  return (
    <div>
      <label
        htmlFor="file-upload"
        className={`cursor-pointer rounded bg-[#9CCC65] border border-[#7CB342] transition-colors flex flex-row gap-2 items-center justify-center text-black hover:bg-[#7CB342] font-medium text-xs h-auto py-1.5 px-3 w-full ${
          isValidating ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isValidating ? (
          <div className="w-3 h-3 border-2 border-t-black border-r-black border-opacity-30 border-t-opacity-100 rounded-full animate-spin"></div>
        ) : (
          <span className="text-sm">+</span>
        )}
        <span className="text-xs font-medium">
          {isValidating ? "Validating..." : "Add Media"}
        </span>
      </label>
      <input
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={isValidating}
      />
    </div>
  );
}
