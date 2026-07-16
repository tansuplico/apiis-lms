// src/components/admin/course/AddPartModal.tsx
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { X } from "lucide-react";

export interface PartOption {
  slug: "lessons" | "activities";
  name: string;
  color: string;
}

interface AddPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  partOptions: readonly PartOption[];
  moduleParts: Array<{ slug: string }>;
  onAddPart: (type: "lessons" | "activities") => Promise<void>;
}

export default function AddPartModal({
  isOpen,
  onClose,
  partOptions,
  moduleParts,
  onAddPart,
}: AddPartModalProps) {
  // ── Store
  const online = useOnlineStatus();

  // ── Guard: hidden when closed
  if (!isOpen) return null;

  // ── Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Add New Part
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Add as many Lessons or Activities parts as this module needs.{" "}
        </p>
        <div className="space-y-3">
          {partOptions.map((part) => {
            const existingCount = moduleParts.filter((p) =>
              p.slug.startsWith(part.slug),
            ).length;
            return (
              <button
                key={part.slug}
                onClick={() => onAddPart(part.slug)}
                disabled={!online}
                className={`w-full flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  !online
                    ? "border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: part.color }}
                  />
                  <p className="font-medium text-gray-900 dark:text-white">
                    {part.name}
                  </p>
                </div>
                {existingCount > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {existingCount} added
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-xl font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
