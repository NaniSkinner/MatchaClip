"use client";

import { getFile, useAppDispatch, useAppSelector } from "../../../../store";
import { setMediaFiles } from "../../../../store/slices/projectSlice";
import { storeFile } from "../../../../store";
import { categorizeFile } from "../../../../utils/utils";
import Image from "next/image";
import toast from "react-hot-toast";

export default function AddMedia({ fileId }: { fileId: string }) {
  const { mediaFiles } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();

  const handleFileChange = async () => {
    const updatedMedia = [...mediaFiles];

    const file = await getFile(fileId);
    const mediaId = crypto.randomUUID();

    if (fileId) {
      const relevantClips = mediaFiles.filter(
        (clip) => clip.type === categorizeFile(file.type)
      );
      const lastEnd =
        relevantClips.length > 0
          ? Math.max(...relevantClips.map((f) => f.positionEnd))
          : 0;

      // Extract actual duration for video/audio files
      let actualDuration = 30; // default fallback
      const fileType = categorizeFile(file.type);

      if (fileType === "video" || fileType === "audio") {
        try {
          const mediaElement = document.createElement(
            fileType === "video" ? "video" : "audio"
          );
          mediaElement.preload = "metadata";
          mediaElement.src = URL.createObjectURL(file);

          await new Promise<void>((resolve) => {
            mediaElement.onloadedmetadata = () => {
              actualDuration = mediaElement.duration || 30;
              URL.revokeObjectURL(mediaElement.src);
              resolve();
            };
            mediaElement.onerror = () => {
              URL.revokeObjectURL(mediaElement.src);
              resolve(); // Use fallback duration
            };
            setTimeout(() => {
              URL.revokeObjectURL(mediaElement.src);
              resolve(); // Timeout fallback
            }, 3000);
          });
        } catch (error) {
          console.warn(
            "Could not extract media duration, using default:",
            error
          );
        }
      }

      updatedMedia.push({
        id: mediaId,
        fileName: file.name,
        fileId: fileId,
        startTime: 0,
        endTime: actualDuration,
        duration: actualDuration,
        src: URL.createObjectURL(file),
        positionStart: lastEnd,
        positionEnd: lastEnd + actualDuration,
        includeInMerge: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
        opacity: 100,
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
        playbackSpeed: 1,
        volume: 100,
        type: fileType,
        zIndex: 0,
      });
    }
    dispatch(setMediaFiles(updatedMedia));
    toast.success("Media added successfully.");
  };

  return (
    <div>
      <label className="cursor-pointer rounded-full bg-white border border-solid border-transparent transition-colors flex flex-col items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] font-medium sm:text-base py-2 px-2">
        <Image
          alt="Add Project"
          className="Black"
          height={12}
          width={12}
          src="https://www.svgrepo.com/show/513803/add.svg"
        />
        {/* <span className="text-xs">Add Media</span> */}
        <button onClick={handleFileChange}></button>
      </label>
    </div>
  );
}
