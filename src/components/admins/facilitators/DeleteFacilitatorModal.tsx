// src/components/admins/facilitators/DeleteFacilitatorModal.tsx
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  facilitatorName: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteFacilitatorModal({
  isOpen,
  facilitatorName,
  isDeleting,
  onConfirm,
  onCancel,
}: Props) {
  // ── Store
  const online = useOnlineStatus();

  // ── Guard: not open
  if (!isOpen) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Delete Facilitator?
          </h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Are you sure you want to permanently delete{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {facilitatorName}
          </span>
          ?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          This account has never been logged into and has no associated records.
          This action cannot be undone.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            disabled={isDeleting || !online}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 px-6 rounded-xl font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
