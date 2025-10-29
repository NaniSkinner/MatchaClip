"use client";
import { useEffect, useRef, useState, use } from "react";
import {
  getFile,
  storeProject,
  useAppDispatch,
  useAppSelector,
} from "../../../store";
import { getProject } from "../../../store";
import {
  setCurrentProject,
  updateProject,
} from "../../../store/slices/projectsSlice";
import { rehydrate, setMediaFiles } from "../../../store/slices/projectSlice";
import { setActiveSection } from "../../../store/slices/projectSlice";
import AddText from "../../../components/editor/AssetsPanel/tools-section/AddText";
import AddMedia from "../../../components/editor/AssetsPanel/AddButtons/UploadMedia";
import MediaList from "../../../components/editor/AssetsPanel/tools-section/MediaList";
import { useRouter } from "next/navigation";
import TextButton from "@/app/components/editor/AssetsPanel/SidebarButtons/TextButton";
import LibraryButton from "@/app/components/editor/AssetsPanel/SidebarButtons/LibraryButton";
import ExportButton from "@/app/components/editor/AssetsPanel/SidebarButtons/ExportButton";
import HomeButton from "@/app/components/editor/AssetsPanel/SidebarButtons/HomeButton";
import ShortcutsButton from "@/app/components/editor/AssetsPanel/SidebarButtons/ShortcutsButton";
import MediaProperties from "../../../components/editor/PropertiesSection/MediaProperties";
import TextProperties from "../../../components/editor/PropertiesSection/TextProperties";
import { Timeline } from "../../../components/editor/timeline/Timline";
import { PreviewPlayer } from "../../../components/editor/player/remotion/Player";
import { MediaFile } from "@/app/types";
import ExportList from "../../../components/editor/AssetsPanel/tools-section/ExportList";
import Image from "next/image";
import ProjectName from "../../../components/editor/player/ProjectName";
import { storeFile } from "@/app/store";
import toast from "react-hot-toast";
import { setFilesID } from "@/app/store/slices/projectSlice";
import { Video, Music, Image as ImageIcon, Type } from "lucide-react";

export default function ProjectClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const dispatch = useAppDispatch();
  const projectState = useAppSelector((state) => state.projectState);
  const { currentProjectId } = useAppSelector((state) => state.projects);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);

  const router = useRouter();
  const { activeSection, activeElement } = projectState;
  // when page is loaded set the project id if it exists
  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        setIsLoading(true);
        const project = await getProject(id);
        if (project) {
          dispatch(setCurrentProject(id));
          setIsLoading(false);
        } else {
          router.push("/404");
        }
      }
    };
    loadProject();
  }, [id, dispatch]);

  // set project state from with the current project id
  useEffect(() => {
    const loadProject = async () => {
      if (currentProjectId) {
        const project = await getProject(currentProjectId);
        if (project) {
          dispatch(rehydrate(project));

          dispatch(
            setMediaFiles(
              await Promise.all(
                project.mediaFiles.map(async (media: MediaFile) => {
                  const file = await getFile(media.fileId);
                  return { ...media, src: URL.createObjectURL(file) };
                })
              )
            )
          );
        }
      }
    };
    loadProject();
  }, [dispatch, currentProjectId]);

  // save
  useEffect(() => {
    const saveProject = async () => {
      if (!projectState || projectState.id != currentProjectId) return;
      await storeProject(projectState);
      dispatch(updateProject(projectState));
    };
    saveProject();
  }, [projectState, dispatch]);

  const handleFocus = (section: "media" | "text" | "export") => {
    dispatch(setActiveSection(section));
  };

  // Handle window-level drag and drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragOverWindow(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only hide if we're leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragOverWindow(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragOverWindow(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Validate and process files
      const validFiles: File[] = [];
      const validMimeTypes = ["video/mp4", "video/quicktime"];
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB

      Array.from(files).forEach((file) => {
        const extension = file.name
          .toLowerCase()
          .slice(file.name.lastIndexOf("."));
        if (
          validMimeTypes.includes(file.type) &&
          [".mp4", ".mov"].includes(extension) &&
          file.size <= maxSize
        ) {
          validFiles.push(file);
        }
      });

      if (validFiles.length === 0) {
        toast.error(
          "No valid video files found. Only MP4 and MOV files under 2GB are supported."
        );
        return;
      }

      // Store files
      const updatedFiles = [...(projectState.filesID || [])];
      let successCount = 0;

      for (const file of validFiles) {
        try {
          const fileId = crypto.randomUUID();
          await storeFile(file, fileId);
          updatedFiles.push(fileId);
          successCount++;
        } catch (error) {
          console.error("Error storing dropped file:", error);
        }
      }

      dispatch(setFilesID(updatedFiles));

      if (successCount > 0) {
        toast.success(
          `Imported ${successCount} file${successCount > 1 ? "s" : ""}`
        );
        // Switch to media section to show imported files
        dispatch(setActiveSection("media"));
      }

      if (successCount < validFiles.length) {
        toast.error(
          `Failed to import ${validFiles.length - successCount} file(s)`
        );
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [dispatch, projectState.filesID]);

  return (
    <div className="flex flex-col h-screen select-none">
      {/* Loading screen */}
      {isLoading ? (
        <div className="fixed inset-0 flex items-center bg-black bg-opacity-50 justify-center z-50">
          <div className="bg-black bg-opacity-70 p-6 rounded-lg flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-t-white border-r-white border-opacity-30 border-t-opacity-100 rounded-full animate-spin"></div>
            <p className="mt-4 text-white text-lg">Loading project...</p>
          </div>
        </div>
      ) : null}

      {/* Full-screen drag overlay */}
      {isDragOverWindow && !isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none">
          <div className="border-4 border-dashed border-[#D4E7C5] rounded-2xl p-16 bg-[#D4E7C5] bg-opacity-10">
            <div className="flex flex-col items-center space-y-4">
              <Image
                alt="Drop files"
                className="animate-bounce"
                height={80}
                width={80}
                src="https://www.svgrepo.com/show/514275/upload-cloud.svg"
              />
              <div className="text-center">
                <p className="text-white text-2xl font-bold">
                  Drop video files to import
                </p>
                <p className="text-gray-300 text-lg mt-2">
                  Supports MP4 and MOV files
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Buttons */}
        <div className="w-[50px] border-r border-[#3F3F3F] bg-bg-tertiary overflow-y-auto p-1.5">
          <div className="flex flex-col space-y-1.5">
            <HomeButton />
            <TextButton onClick={() => handleFocus("text")} />
            <LibraryButton onClick={() => handleFocus("media")} />
            <ExportButton onClick={() => handleFocus("export")} />
            {/* TODO: add shortcuts guide but in a better way */}
            {/* <ShortcutsButton onClick={() => handleFocus("export")} /> */}
          </div>
        </div>

        {/* Add media and text */}
        <div className="w-[240px] border-r border-[#3F3F3F] bg-bg-tertiary overflow-y-auto p-3">
          {activeSection === "media" && (
            <div>
              <h2 className="text-sm flex flex-row gap-2 items-center justify-center font-semibold mb-2 text-gray-200">
                <AddMedia />
              </h2>
              <MediaList />
            </div>
          )}
          {activeSection === "text" && (
            <div>
              <AddText />
            </div>
          )}
          {activeSection === "export" && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-200">
                Export
              </h2>
              <ExportList />
            </div>
          )}
        </div>

        {/* Center - Video Preview */}
        <div className="flex items-center justify-center flex-col flex-1 overflow-hidden">
          <ProjectName />
          <div className="w-full h-full flex items-center justify-center p-4">
            <div
              className="w-full"
              style={{ aspectRatio: "16/9", maxHeight: "100%" }}
            >
              <PreviewPlayer />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Element Properties */}
        <div className="w-[280px] border-l border-[#3F3F3F] bg-bg-tertiary overflow-y-auto p-3">
          {activeElement === "media" && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-200">
                Media Properties
              </h2>
              <MediaProperties />
            </div>
          )}
          {activeElement === "text" && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-gray-200">
                Text Properties
              </h2>
              <TextProperties />
            </div>
          )}
        </div>
      </div>
      {/* Timeline at bottom */}
      <div className="flex flex-row border-t border-[#3F3F3F]">
        <div className="w-[50px] bg-[#1E1D21] flex flex-col items-center justify-start pt-20">
          <div className="relative h-16 flex items-center justify-center">
            <Video size={20} className="text-gray-400" />
          </div>

          <div className="relative h-16 flex items-center justify-center">
            <Music size={20} className="text-gray-400" />
          </div>

          <div className="relative h-16 flex items-center justify-center">
            <ImageIcon size={20} className="text-gray-400" />
          </div>

          <div className="relative h-16 flex items-center justify-center">
            <Type size={20} className="text-gray-400" />
          </div>
        </div>
        <Timeline />
      </div>
    </div>
  );
}
