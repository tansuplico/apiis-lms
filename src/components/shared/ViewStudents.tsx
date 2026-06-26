// src/components/shared/ViewStudents.tsx
import { Search, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Student } from "@/types/types";
import { useCenterStore } from "@/stores/useCenterStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { resolveProfilePicture } from "@/utils/imageUtils";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { useState } from "react";

interface ViewStudentsProps {
  filteredStudents: Student[];
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setShowAddStudentModal: React.Dispatch<React.SetStateAction<boolean>>;
  centerTitle: string;
  centerId: number;
}

export default function ViewStudents({
  filteredStudents,
  searchTerm,
  setSearchTerm,
  setShowAddStudentModal,
  centerTitle,
  centerId,
}: ViewStudentsProps) {
  // ── Store
  const { removeStudent } = useCenterStore();
  const online = useOnlineStatus();

  // ── State: remove modal
  const [showRemoveStudentModal, setShowRemoveStudentModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);

  // ── Handlers
  const handleConfirmRemove = async () => {
    if (!studentToRemove) return;
    await removeStudent(centerId, studentToRemove.id);
    toast.success(
      `${studentToRemove.firstName} ${studentToRemove.lastName} removed from ${centerTitle}.`,
      { position: "bottom-right" },
    );
    setShowRemoveStudentModal(false);
    setStudentToRemove(null);
  };

  const handleCancelRemove = () => {
    setShowRemoveStudentModal(false);
    setStudentToRemove(null);
  };

  // ── Render
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div className="w-full sm:w-96 flex items-center gap-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-5 py-3 rounded-lg transition-colors">
          <Search
            size={20}
            strokeWidth={1.5}
            className="text-gray-500 dark:text-gray-400"
          />
          <input
            type="text"
            placeholder="Search students by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <button
          onClick={() => setShowAddStudentModal(true)}
          disabled={!online}
          title={!online ? "You're offline" : "Add Student"}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg shadow-md text-md transition-all shrink-0 ${
            online
              ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white cursor-pointer"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus size={20} />
          Add Student
        </button>
      </div>

      {/* Student grid */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          No students found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 flex items-center gap-4 relative"
            >
              {student.profilePicture && online ? (
                <img
                  src={resolveProfilePicture(student.profilePicture) ?? ""}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.errored) {
                      img.dataset.errored = "1";
                      img.src = "";
                    }
                  }}
                />
              ) : (
                <div className="w-14 h-14 text-2xl rounded-full flex items-center justify-center text-white font-bold bg-blue-500">
                  {student.firstName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {student.firstName} {student.lastName}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {student.idNumber}
                </p>
              </div>

              <button
                onClick={() => {
                  setStudentToRemove(student);
                  setShowRemoveStudentModal(true);
                }}
                disabled={!online}
                className={`absolute top-3 right-3 p-2 rounded-full text-red-600 dark:text-red-400 ${!online ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                title="Remove student from center"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showRemoveStudentModal && studentToRemove && (
        <DeleteConfirmModal
          title="Remove Student?"
          message={`Are you sure you want to remove ${studentToRemove.firstName} ${studentToRemove.lastName} (${studentToRemove.idNumber}) from ${centerTitle}?`}
          itemName=""
          onConfirm={handleConfirmRemove}
          onCancel={handleCancelRemove}
          isDeleting={false}
        />
      )}
    </div>
  );
}
