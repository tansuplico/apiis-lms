// src/components/admins/centers/AddStudentModal.tsx
import { toast } from "react-toastify";
import { Student } from "@/types/types";
import { useCenterStore } from "@/stores/useCenterStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useStudentListStore } from "@/stores/useStudentListStore";
import { useMemo, useState } from "react";
import StudentAvatar from "./StudentAvatar";

// ── Sub-component: StudentAvatar

interface AddStudentModalProps {
  centerTitle: string;
  centerId: number;
  onClose: () => void;
}

export default function AddStudentModal({
  centerTitle,
  centerId,
  onClose,
}: AddStudentModalProps) {
  // ── Store
  const { addStudent } = useCenterStore();
  const online = useOnlineStatus();
  const { students } = useStudentListStore();

  // ── State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived: students not currently in any center, excluding already-selected
  const availableStudents = useMemo(() => {
    return students.filter(
      (s) => s.currentCenter === null && !selectedIds.includes(s.id),
    );
  }, [students, selectedIds]);

  // ── Derived: search-filtered available list
  const matchingStudents = useMemo(() => {
    if (!searchTerm.trim()) return availableStudents.slice(0, 50);
    const lower = searchTerm.toLowerCase().trim();
    return availableStudents
      .filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(lower) ||
          s.idNumber.toLowerCase().includes(lower),
      )
      .slice(0, 50);
  }, [searchTerm, availableStudents]);

  // ── Derived: full Student objects for selected IDs (preserves selection order)
  const selectedStudents = useMemo(() => {
    return selectedIds
      .map((id) => students.find((s) => s.id === id))
      .filter((s): s is Student => Boolean(s));
  }, [selectedIds, students]);

  // ── Handlers
  const toggleSelect = (student: Student) => {
    setSelectedIds((prev) =>
      prev.includes(student.id)
        ? prev.filter((id) => id !== student.id)
        : [...prev, student.id],
    );
  };

  const removeSelected = (id: number) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  };

  const handleAddStudents = async () => {
    if (selectedIds.length === 0) return;

    if (!online) {
      toast.error("You're offline — connect to add students.");
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedStudents.map((s) => addStudent(centerId, s.id)),
      );

      let addedCount = 0;
      const failed: { name: string; reason: string }[] = [];

      results.forEach((result, i) => {
        const student = selectedStudents[i];
        const name = `${student.firstName} ${student.lastName}`;

        if (result.status === "fulfilled" && result.value === "success") {
          addedCount++;
        } else {
          const reason =
            result.status === "fulfilled"
              ? result.value === "already_in_center"
                ? "already in this center"
                : result.value === "in_other_center"
                  ? "already in another center"
                  : result.value === "no_permission"
                    ? "no permission"
                    : "unknown error"
              : "request failed";
          failed.push({ name, reason });
        }
      });

      if (addedCount > 0) {
        toast.success(
          `${addedCount} student${addedCount === 1 ? "" : "s"} added to ${centerTitle}!`,
          { position: "bottom-right" },
        );
      }

      if (failed.length > 0) {
        if (failed.length <= 3) {
          failed.forEach((f) => toast.warning(`${f.name}: ${f.reason}`));
        } else {
          toast.warning(`${failed.length} students could not be added.`);
        }
      }

      if (addedCount > 0) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Add Students to {centerTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddStudents();
          }}
          className="flex flex-col gap-4 min-h-0 flex-1"
        >
          {/* Selected summary / review toggle */}
          {selectedIds.length > 0 && (
            <div className="border border-green-200 dark:border-green-800 rounded-xl bg-green-50 dark:bg-green-900/30 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsReviewExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
              >
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {selectedIds.length} student
                  {selectedIds.length === 1 ? "" : "s"} selected
                </span>
                {isReviewExpanded ? (
                  <ChevronUp
                    size={18}
                    className="text-green-700 dark:text-green-300"
                  />
                ) : (
                  <ChevronDown
                    size={18}
                    className="text-green-700 dark:text-green-300"
                  />
                )}
              </button>

              {isReviewExpanded && (
                <div className="px-5 pb-4 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                  {selectedStudents.map((student) => (
                    <span
                      key={student.id}
                      className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-full pl-3 pr-2 py-1 text-sm text-gray-800 dark:text-gray-200"
                    >
                      {student.firstName} {student.lastName}
                      <button
                        type="button"
                        onClick={() => removeSelected(student.id)}
                        className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="space-y-2 shrink-0">
            <label
              htmlFor="studentSearch"
              className="block text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Search by Name or ID
            </label>
            <input
              id="studentSearch"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. Rylee Cambronero or 16-0234-02"
              className="w-full px-5 py-4 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          {/* Available students checklist */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-200 dark:divide-gray-700">
            {matchingStudents.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? `No available student found matching "${searchTerm}"`
                  : "No available students to add."}
              </div>
            ) : (
              matchingStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSelect(student)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
                  />
                  <StudentAvatar student={student} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {student.idNumber}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-2 shrink-0">
            <button
              type="submit"
              disabled={selectedIds.length === 0 || !online || isSubmitting}
              title={
                !online ? "You're offline — connect to make changes" : undefined
              }
              className={`flex-1 py-4 px-8 rounded-xl font-medium text-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 shadow-md ${
                selectedIds.length === 0 || !online || isSubmitting
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white cursor-pointer hover:shadow-lg"
              }`}
            >
              {isSubmitting
                ? "Adding..."
                : selectedIds.length > 0
                  ? `Add ${selectedIds.length} Student${selectedIds.length === 1 ? "" : "s"}`
                  : "Add Students"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-4 px-8 rounded-xl font-medium text-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
