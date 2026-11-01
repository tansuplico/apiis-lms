// src/components/shared/PreviewContents.tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { Course, CourseModule } from "@/types/types";
import { useCourseStore } from "@/stores/useCourseStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface PreviewContentsProps {
  course: Course;
  isEditing?: boolean;
  updateCourseField?: <K extends keyof Course>(
    field: K,
    value: Course[K],
  ) => void;
  onModulesPersisted?: (
    transform: (modules: CourseModule[]) => CourseModule[],
  ) => void;
}

export default function PreviewContents({
  course,
  isEditing = false,
  updateCourseField,
  onModulesPersisted,
}: PreviewContentsProps) {
  // ── Store
  const { addModule } = useCourseStore();
  const online = useOnlineStatus();
  const [isAddingModule, setIsAddingModule] = useState(false);

  // ── State
  const [editingModuleIndex, setEditingModuleIndex] = useState<number | null>(
    null,
  );
  const [editingTitle, setEditingTitle] = useState("");

  // ── Handlers
  const saveModuleTitle = (modIdx: number) => {
    const trimmed = editingTitle.trim();
    const module = course.modules[modIdx];

    if (!trimmed || !module || trimmed === module.title) {
      setEditingModuleIndex(null);
      return;
    }

    const updatedModules = [...course.modules];
    updatedModules[modIdx] = { ...module, title: trimmed };
    updateCourseField?.("modules", updatedModules);
    setEditingModuleIndex(null);
  };

  // Hits the server immediately (needs a real id), so it's applied to both the
  // working copy and the Cancel snapshot via the parent.
  const handleAddModule = async () => {
    if (isAddingModule || !online) return;
    setIsAddingModule(true);
    try {
      const created = await addModule(course.id);
      onModulesPersisted?.((modules) => [...modules, created]);
    } catch {
      // error toast handled by the store
    } finally {
      setIsAddingModule(false);
    }
  };

  // ── Render
  return (
    <section className="space-y-8">
      {course.modules?.length === 0 ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">
          No modules in this course yet.
        </div>
      ) : (
        course.modules.map((module, modIdx) => (
          <div
            key={modIdx}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Module Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900 dark:text-white shrink-0">
                {module.number}.
              </span>

              {isEditing && editingModuleIndex === modIdx ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => saveModuleTitle(modIdx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveModuleTitle(modIdx);
                    if (e.key === "Escape") setEditingModuleIndex(null);
                  }}
                  autoFocus
                  maxLength={50}
                  className="flex-1 text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                />
              ) : (
                <h2
                  className={`text-xl font-bold text-gray-900 dark:text-white flex-1 ${
                    isEditing
                      ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      : ""
                  }`}
                  onClick={() => {
                    if (!isEditing) return;
                    setEditingModuleIndex(modIdx);
                    setEditingTitle(module.title);
                  }}
                  title={isEditing ? "Click to edit title" : module.title}
                >
                  {module.title}
                  {isEditing && (
                    <span className="ml-2 text-sm font-normal text-blue-400 dark:text-blue-500">
                      (click to edit)
                    </span>
                  )}
                </h2>
              )}
            </div>

            {/* Parts List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {module.parts?.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No parts in this module.
                </div>
              ) : (
                module.parts.map((part) => (
                  <div key={part.slug} className="p-6 flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: part.coverColor }}
                    />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {part.name}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}

      {isEditing && (
        <div>
          <button
            onClick={handleAddModule}
            disabled={isAddingModule || !online}
            title={!online ? "You're offline" : undefined}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            {isAddingModule ? "Adding..." : "Add New Module"}
          </button>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            New modules are created immediately. Cancel won't remove them.
          </p>
        </div>
      )}
    </section>
  );
}
