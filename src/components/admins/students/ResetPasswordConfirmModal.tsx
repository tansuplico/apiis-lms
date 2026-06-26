// src/components/admins/students/ResetPasswordConfirmModal.tsx
import { RefreshCw, Loader2 } from "lucide-react";
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

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <RefreshCw
              size={24}
              className="text-yellow-600 dark:text-yellow-400"
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Reset Password?
          </h3>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          This will generate a{" "}
          <span className="font-semibold">new temporary password</span> for{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {student.firstName} {student.lastName}
          </span>
          . The student will be required to change it on their next login.
        </p>

        <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
            <span className="text-base">⚠️</span>
            The old password will no longer work after reset.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isResetting || !online}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 disabled:bg-yellow-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isResetting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Generate New Password
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
