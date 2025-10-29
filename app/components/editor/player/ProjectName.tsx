import { useState, useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/store";
import { setProjectName } from "../../../store/slices/projectSlice";
import { Edit3 } from "lucide-react";

export default function ProjectName() {
  const [isEditing, setIsEditing] = useState(false);
  const { projectName } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setProjectName(e.target.value));
  };

  return (
    <div className="relative">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={projectName}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-xl font-semibold mt-3 capitalize tracking-wide bg-black text-white w-full px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-primary"
          autoFocus
        />
      ) : (
        <p
          onClick={handleClick}
          className="text-xl font-semibold mt-3 capitalize tracking-wide cursor-pointer hover:bg-bg-secondary text-gray-100 px-2 py-1 rounded flex items-center transition-colors"
        >
          {projectName}
          <Edit3 size={14} className="ml-2 text-gray-500" />
        </p>
      )}
    </div>
  );
}
