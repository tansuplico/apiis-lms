// src/components/shared/PreviewContents.tsx
import { useMemo, useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Course, CourseModule } from "@/types/types";
import { useCourseStore } from "@/stores/useCourseStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import DeleteConfirmModal from "@/components/shared/DeleteConfirmModal";
import WeightModal from "@/components/admins/courses/WeightModal";
import { buildModuleWeightsPayload } from "@/utils/moduleWeights";

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
  const { addModule, deleteModule, setModuleWeights } = useCourseStore();
  const online = useOnlineStatus();
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Memoised: WeightModal re-initialises its inputs whenever this array changes.
  const weightModules = useMemo(
    () =>
      course.modules.map((m) => ({
        id: m.id,
        number: m.number,
        title: m.title,
        weight: m.weight,
      })),
    [course.modules],
  );

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

  // Hits the server immediately, so it's applied to both the working copy and
  // the Cancel snapshot via the parent. The server refuses (409) when students
  // have progress on this module or a later one; the store shows that message.
  const handleDeleteModule = async () => {
    if (!moduleToDelete || isDeleting) return;
    const target = moduleToDelete;
    setIsDeleting(true);
    try {
      await deleteModule(course.id, target.id);
      // Mirror the server's renumbering of the remaining modules.
      onModulesPersisted?.((modules) =>
        modules
          .filter((m) => m.id !== target.id)
          .map((m, index) => ({ ...m, number: index + 1 })),
      );
      setEditingModuleIndex(null);
    } catch {
      // error toast handled by the store
    } finally {
      setIsDeleting(false);
      setModuleToDelete(null);
    }
  };

  // Saves every module's weight in one request, so it's applied to both the
  // working copy and the Cancel snapshot via the parent.
  const handleSaveWeights = async (weights: Record<number, string>) => {
    const payload = buildModuleWeightsPayload(course.modules, weights);
    await setModuleWeights(course.id, payload);

    const weightById = new Map(payload.map((p) => [p.moduleId, p.weight]));
    onModulesPersisted?.((modules) =>
      modules.map((m) =>
        weightById.has(m.id)
          ? { ...m, weight: weightById.get(m.id) ?? null }
          : m,
      ),
    );
    toast.success("Module weights saved.", { position: "bottom-right" });
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

              {isEditing && (
                <button
                  onClick={() => setModuleToDelete(module)}
                  disabled={!online}
                  title={!online ? "You're offline" : "Delete module"}
                  aria-label={`Delete module ${module.number}`}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} />
                </button>
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
          <button
            onClick={() => setShowWeightModal(true)}
            disabled={!online || course.modules.length === 0}
            title={!online ? "You're offline" : undefined}
            className="mt-3 w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scale size={18} />
            Set Module Weights
          </button>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            Adding, deleting or weighting modules takes effect immediately.
            Cancel won't undo it.
          </p>
        </div>
      )}

      <WeightModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        modules={weightModules}
        onSave={handleSaveWeights}
      />

      {moduleToDelete && (
        <DeleteConfirmModal
          title="Delete Module?"
          message="This will permanently delete the module and all its parts. Modules that students already have progress on can't be deleted. This action cannot be undone."
          itemName={moduleToDelete.title}
          onConfirm={handleDeleteModule}
          onCancel={() => setModuleToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </section>
  );
}
