"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "./store";
import {
  addProject,
  deleteProject,
  rehydrateProjects,
  setCurrentProject,
} from "./store/slices/projectsSlice";
import {
  listProjects,
  storeProject,
  deleteProject as deleteProjectFromDB,
} from "./store";
import { ProjectState } from "./types";
import { toast } from "react-hot-toast";
import { Plus, Video, Trash2 } from "lucide-react";

export default function Page() {
  const dispatch = useAppDispatch();
  const { projects, currentProjectId } = useAppSelector(
    (state) => state.projects
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const storedProjects = await listProjects();
        dispatch(rehydrateProjects(storedProjects));
      } catch (error) {
        toast.error("Failed to load projects");
        console.error("Error loading projects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [dispatch]);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const newProject: ProjectState = {
      id: crypto.randomUUID(),
      projectName: newProjectName,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      mediaFiles: [],
      textElements: [],
      currentTime: 0,
      isPlaying: false,
      isMuted: false,
      duration: 0,
      activeSection: "media",
      activeElement: "text",
      activeElementIndex: 0,
      filesID: [],
      zoomLevel: 1,
      timelineZoom: 100,
      enableMarkerTracking: true,
      inPoint: null,
      outPoint: null,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      aspectRatio: "16:9",
      history: [],
      future: [],
      exportSettings: {
        resolution: "1080p",
        quality: "high",
        speed: "fastest",
        fps: 30,
        format: "mp4",
        includeSubtitles: false,
      },
    };

    await storeProject(newProject);
    dispatch(addProject(newProject));
    setNewProjectName("");
    setIsCreating(false);
    toast.success("Project created successfully");
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProjectFromDB(projectId);
    dispatch(deleteProject(projectId));
    const storedProjects = await listProjects();
    dispatch(rehydrateProjects(storedProjects));
    toast.success("Project deleted successfully");
  };

  return (
    <div>
      <div>
        <br />
        <br />
        <h2 className="mx-auto max-w-4xl text-center font-display text-5xl font-medium tracking-tight text-white-900 sm:text-4xl">
          <span className="inline-block">Projects</span>
        </h2>
        {isLoading ? (
          <div className="fixed inset-0 flex items-center bg-black bg-opacity-50 justify-center z-50">
            <div className="bg-black bg-opacity-70 p-6 rounded-lg flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-t-white border-r-white border-opacity-30 border-t-opacity-100 rounded-full animate-spin"></div>
              <p className="mt-4 text-white text-lg">Loading projects...</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="grid py-4 w-2/3 sm:w-1/2 md:w-1/3 lg:w-1/4 grid-cols-1 gap-4 lg:grid-cols-1 lg:gap-5">
              {/* Add Project Button */}
              <button onClick={() => setIsCreating(true)} className="group">
                <div className="flex flex-col gap-4 rounded-lg border border-[#3F3F3F] shadow-md p-4 transition-all transform group-hover:scale-105 group-hover:border-[#9333EA] group-hover:shadow-lg bg-bg-tertiary">
                  <figure className="flex items-center justify-between w-full rounded-full bg-[#2A2A2A] p-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex size-9 items-center justify-center rounded-full bg-[#9333EA]">
                        <Plus size={18} className="text-white" />
                      </div>
                      <h5 className="text-lg font-medium text-gray-200">
                        Add Project
                      </h5>
                    </div>
                  </figure>
                </div>
              </button>

              {/* List Projects */}
              {[...projects]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map(({ id, projectName, createdAt, lastModified }) => (
                  <div key={id}>
                    <Link
                      href={`/projects/${id}`}
                      onClick={() => dispatch(setCurrentProject(id))}
                      className="group block h-full"
                    >
                      <div className="flex flex-col gap-4 rounded-lg border border-[#3F3F3F] shadow-md p-4 transition-all transform group-hover:scale-105 group-hover:border-[#9CCC65] group-hover:shadow-lg bg-bg-tertiary">
                        <figure className="flex items-center justify-between w-full rounded-full bg-[#2A2A2A] p-2">
                          {/*  Project Name */}
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="shrink-0 flex size-9 items-center justify-center rounded-full bg-[#2A2A2A]">
                              <Video size={18} className="text-gray-300" />
                            </div>
                            <h5
                              className="truncate font-medium text-base sm:text-lg text-gray-200"
                              title={projectName}
                            >
                              {projectName}
                            </h5>
                          </div>
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteProject(id);
                            }}
                            className="shrink-0 ml-2 text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Delete project"
                          >
                            <Trash2 size={18} />
                          </button>
                        </figure>
                        <div className="flex flex-col items-start py-1 gap-1 text-sm">
                          <p className="text-gray-400">
                            <span className="font-medium">Created:</span>{" "}
                            {new Date(createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-gray-400">
                            <span className="font-medium">Last Modified:</span>{" "}
                            {new Date(lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <div className="container mx-auto px-4 py-8">
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-bg-tertiary border border-[#3F3F3F] p-6 rounded-lg w-96 shadow-xl">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">
                Create New Project
              </h3>
              <input
                type="text"
                ref={inputRef}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateProject();
                  } else if (e.key === "Escape") {
                    setIsCreating(false);
                  }
                }}
                placeholder="Project Name"
                className="w-full p-2.5 mb-4 bg-[#2A2A2A] border border-[#3F3F3F] text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-[#9333EA]"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-[#2A2A2A] border border-[#3F3F3F] hover:bg-[#3A3A3A] text-gray-200 text-sm rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-[#9333EA] text-white text-sm hover:bg-[#7E22CE] rounded transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
