// src/components/shared/PreviewContents.tsx
import { useState } from "react";
import { Course } from "@/types/types";
import { useCourseStore } from "@/stores/useCourseStore";

interface PreviewContentsProps {
  course: Course;
  isEditing?: boolean;
  updateCourseField?: <K extends keyof Course>(
    field: K,
    value: Course[K],
  ) => void;
}

export default function PreviewContents({
  course,
  isEditing = false,
  updateCourseField,
}: PreviewContentsProps) {
  // ── Store
  const { updateModule } = useCourseStore();

  // ── State
  const [editingModuleIndex, setEditingModuleIndex] = useState<number | null>(
    null,
  );
  const [editingTitle, setEditingTitle] = useState("");

  // ── Handlers
  const saveModuleTitle = async (modIdx: number) => {
    if (!editingTitle.trim()) {
      setEditingModuleIndex(null);
      return;
    }

    const module = course.modules[modIdx];
    if (!module) return;

    try {
      await updateModule(course.id, module.id, { title: editingTitle.trim() });
      const updatedModules = [...course.modules];
      updatedModules[modIdx] = {
        ...updatedModules[modIdx],
        title: editingTitle.trim(),
      };
      updateCourseField?.("modules", updatedModules);
    } catch {
      // silent
    } finally {
      setEditingModuleIndex(null);
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
    </section>
  );
}
