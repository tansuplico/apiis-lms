// src/components/admins/students/ResetPasswordConfirmModal.tsx
import { Loader2 } from "lucide-react";
import { Student } from "@/types/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface Props {
  student: Student;
  isResetting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function ResetPasswordConfirmModal({
  student,
  isResetting,
  onConfirm,
  onCancel,
}: Props) {
  // ── Store
  const online = useOnlineStatus();

  const initials =
    `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1.5 bg-blue-600" />

        <div className="p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Reset password
              </p>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {student.firstName} {student.lastName}
              </h3>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            A new temporary password will be generated. The current one stops
            working immediately, and {student.firstName} will need to set a new
            password on their next login.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onConfirm}
              disabled={isResetting || !online}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Password"
              )}
            </button>
            <button
              onClick={onCancel}
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2.5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
